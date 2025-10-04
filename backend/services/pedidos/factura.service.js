import { FacturaVenta } from '../../models/pedidos/index.js';
import Pedido from '../../models/checkout/pedido.model.js';
import emailService from '../../utils/email.service.js';
import FacturaPDFGenerator from '../../utils/pdf/factura.generator.js';

class FacturaService {
  
  /**
   * Genera una factura para un pedido específico
   * @param {String} pedidoId - ID del pedido
   * @param {Object} opciones - Opciones de generación
   * @returns {Object} - Factura generada
   */
  async generarFactura(pedidoId, opciones = {}) {
    try {
      // Verificar si ya existe factura para este pedido
      const facturaExistente = await FacturaVenta.findOne({ pedidoId });
      if (facturaExistente && !opciones.forzarNueva) {
        throw new Error(`Ya existe la factura ${facturaExistente.numeroFactura} para este pedido`);
      }
      
      // Obtener datos del pedido
      const pedido = await Pedido.findById(pedidoId)
        .populate('items.productoId', 'nombre descripcion precio categoria')
        .populate('clienteId', 'nombre email telefono numeroDocumento tipoDocumento');
      
      if (!pedido) {
        throw new Error('Pedido no encontrado');
      }
      
      // Generar número de factura
      const numeroFactura = await FacturaVenta.generarNumeroFactura();
      
      // Preparar datos del cliente
      const datosCliente = this.prepararDatosCliente(pedido, opciones.datosCliente);
      
      // Preparar detalle de productos
      const detalleProductos = this.prepararDetalleProductos(pedido.items, opciones.configuracionIVA);
      
      // Crear factura
      const factura = new FacturaVenta({
        numeroFactura,
        pedidoId,
        clienteId: pedido.clienteId,
        datosCliente,
        detalleProductos,
        totales: {
          subtotal: 0, // Se calculará automáticamente
          descuentoTotal: pedido.totales.descuento || 0,
          ivaTotal: 0,
          costoEnvio: pedido.totales.costoEnvio || 0,
          total: 0
        },
        metodoPago: opciones.metodoPago || {
          tipo: 'pendiente',
          detalle: 'Por definir'
        },
        observaciones: opciones.observaciones,
        usuarioGenerador: opciones.usuarioGeneradorId
      });
      
      await factura.save();
      
      return {
        success: true,
        factura: await FacturaVenta.findById(factura._id)
          .populate('clienteId', 'nombre email')
          .populate('usuarioGenerador', 'nombre')
      };
      
    } catch (error) {
      console.error('Error al generar factura:', error);
      throw new Error(`Error al generar factura: ${error.message}`);
    }
  }
  
  /**
   * Prepara los datos del cliente para la factura
   * @param {Object} pedido - Objeto del pedido
   * @param {Object} datosPersonalizados - Datos personalizados del cliente
   * @returns {Object} - Datos del cliente estructurados
   */
  prepararDatosCliente(pedido, datosPersonalizados = {}) {
    // Priorizar datos personalizados, luego del cliente registrado, luego del pedido
    const cliente = pedido.clienteId;
    const datosCliente = pedido.datosCliente || {};
    
    return {
      tipoDocumento: datosPersonalizados.tipoDocumento || 
                    cliente?.tipoDocumento || 
                    datosCliente.tipoDocumento || 'CC',
      numeroDocumento: datosPersonalizados.numeroDocumento || 
                      cliente?.numeroDocumento || 
                      datosCliente.numeroDocumento || 'N/A',
      nombre: datosPersonalizados.nombre || 
              cliente?.nombre || 
              datosCliente.nombre || 'Cliente',
      email: datosPersonalizados.email || 
             cliente?.email || 
             datosCliente.email || 'cliente@email.com',
      telefono: datosPersonalizados.telefono || 
                cliente?.telefono || 
                datosCliente.telefono || '',
      direccion: datosPersonalizados.direccion || 
                pedido.direccionEntrega || {
                  calle: 'Dirección no especificada',
                  ciudad: 'Ciudad',
                  departamento: 'Departamento',
                  codigoPostal: ''
                }
    };
  }
  
  /**
   * Prepara el detalle de productos para la factura
   * @param {Array} items - Items del pedido
   * @param {Object} configuracionIVA - Configuración de IVA por categoría
   * @returns {Array} - Detalle de productos estructurado
   */
  prepararDetalleProductos(items, configuracionIVA = {}) {
    return items.map(item => {
      const producto = item.productoId;
      const categoria = producto.categoria?.toString();
      const porcentajeIVA = configuracionIVA[categoria] || 19; // 19% por defecto
      
      const subtotal = (item.cantidad * item.precioUnitario) - (item.descuento || 0);
      const valorIVA = (subtotal * porcentajeIVA) / 100;
      
      return {
        productoId: producto._id,
        nombre: producto.nombre,
        descripcion: producto.descripcion || '',
        cantidad: item.cantidad,
        precioUnitario: item.precioUnitario,
        descuento: item.descuento || 0,
        subtotal,
        iva: {
          porcentaje: porcentajeIVA,
          valor: Math.round(valorIVA * 100) / 100
        }
      };
    });
  }
  
  /**
   * Actualiza el estado de una factura
   * @param {String} facturaId - ID de la factura
   * @param {String} nuevoEstado - Nuevo estado de la factura
   * @param {Object} datosAdicionales - Datos adicionales según el estado
   * @returns {Object} - Resultado de la actualización
   */
  async actualizarEstadoFactura(facturaId, nuevoEstado, datosAdicionales = {}) {
    try {
      const factura = await FacturaVenta.findById(facturaId);
      
      if (!factura) {
        throw new Error('Factura no encontrada');
      }
      
      const estadosValidos = ['borrador', 'generada', 'enviada', 'pagada', 'anulada'];
      if (!estadosValidos.includes(nuevoEstado)) {
        throw new Error(`Estado inválido: ${nuevoEstado}`);
      }
      
      // Validar transiciones de estado
      const transicionesValidas = {
        'borrador': ['generada', 'anulada'],
        'generada': ['enviada', 'pagada', 'anulada'],
        'enviada': ['pagada', 'anulada'],
        'pagada': ['anulada'], // Solo se puede anular si es necesario
        'anulada': [] // Estado final
      };
      
      if (!transicionesValidas[factura.estado].includes(nuevoEstado)) {
        throw new Error(`No se puede cambiar de ${factura.estado} a ${nuevoEstado}`);
      }
      
      // Actualizar estado y datos específicos
      factura.estado = nuevoEstado;
      
      switch (nuevoEstado) {
        case 'enviada':
          factura.fechaEnvio = new Date();
          if (datosAdicionales.comprobanteEnvio) {
            factura.archivos.comprobanteEnvio = datosAdicionales.comprobanteEnvio;
          }
          break;
          
        case 'pagada':
          factura.fechaPago = new Date();
          if (datosAdicionales.metodoPago) {
            factura.metodoPago = datosAdicionales.metodoPago;
          }
          break;
          
        case 'anulada':
          if (datosAdicionales.motivoAnulacion) {
            factura.observaciones = (factura.observaciones || '') + 
              `\nAnulada: ${datosAdicionales.motivoAnulacion}`;
          }
          break;
      }
      
      await factura.save();
      
      return {
        success: true,
        message: `Factura ${nuevoEstado} exitosamente`,
        factura
      };
      
    } catch (error) {
      console.error('Error al actualizar estado de factura:', error);
      throw new Error(`Error al actualizar factura: ${error.message}`);
    }
  }
  
  /**
   * Envía factura por email al cliente
   * @param {String} facturaId - ID de la factura
   * @param {Object} opciones - Opciones de envío
   * @returns {Object} - Resultado del envío
   */
  async enviarFacturaPorEmail(facturaId, opciones = {}) {
    try {
      const factura = await FacturaVenta.findById(facturaId)
        .populate('pedidoId', 'numeroPedido')
        .populate('clienteId', 'nombre email');
      
      if (!factura) {
        throw new Error('Factura no encontrada');
      }
      
      if (factura.estado === 'anulada') {
        throw new Error('No se puede enviar una factura anulada');
      }
      
      const destinatario = opciones.email || factura.datosCliente.email;
      if (!destinatario) {
        throw new Error('Email del cliente no especificado');
      }
      
      // Generar PDF de la factura si no existe
      let urlPDF = factura.archivos?.facturaPDF;
      if (!urlPDF) {
        urlPDF = await this.generarPDFFactura(facturaId);
      }
      
      // Preparar datos para el email
      const datosEmail = {
        destinatario,
        asunto: `Factura ${factura.numeroFactura} - VerdeNexo`,
        plantilla: 'factura-venta',
        datos: {
          nombreCliente: factura.datosCliente.nombre,
          numeroFactura: factura.numeroFactura,
          numeroPedido: factura.pedidoId.numeroPedido,
          fechaFactura: factura.fechaGeneracion,
          total: factura.totales.total,
          empresaNombre: factura.datosEmpresa.nombre
        },
        adjuntos: [{
          filename: `Factura-${factura.numeroFactura}.pdf`,
          path: urlPDF
        }]
      };
      
      // Enviar email
      const resultadoEnvio = await emailService.enviarEmail(datosEmail);
      
      if (resultadoEnvio.success) {
        // Actualizar estado de la factura
        await this.actualizarEstadoFactura(facturaId, 'enviada', {
          comprobanteEnvio: resultadoEnvio.messageId
        });
      }
      
      return {
        success: resultadoEnvio.success,
        message: resultadoEnvio.success ? 
          'Factura enviada exitosamente por email' : 
          'Error al enviar factura por email',
        detalles: resultadoEnvio
      };
      
    } catch (error) {
      console.error('Error al enviar factura:', error);
      throw new Error(`Error al enviar factura: ${error.message}`);
    }
  }
  
  /**
   * Genera PDF de la factura
   * @param {String} facturaId - ID de la factura
   * @returns {String} - URL del archivo PDF generado
   */
  async generarPDFFactura(facturaId) {
    try {
      const factura = await FacturaVenta.findById(facturaId);
      
      if (!factura) {
        throw new Error('Factura no encontrada');
      }
      
      // Generar PDF usando el generador
      const urlPDF = await FacturaPDFGenerator.generarFacturaPDF(factura);
      
      // Actualizar la factura con la URL del PDF
      await FacturaVenta.findByIdAndUpdate(facturaId, {
        'archivos.facturaPDF': urlPDF
      });
      
      return urlPDF;
      
    } catch (error) {
      console.error('Error al generar PDF:', error);
      throw new Error('Error al generar PDF de la factura');
    }
  }
  
  /**
   * Obtiene facturas por criterios de búsqueda
   * @param {Object} criterios - Criterios de búsqueda
   * @param {Object} opciones - Opciones de paginación y ordenamiento
   * @returns {Object} - Resultado de la búsqueda
   */
  async buscarFacturas(criterios = {}, opciones = {}) {
    try {
      const {
        page = 1,
        limit = 20,
        sortBy = 'fechaGeneracion',
        sortOrder = 'desc'
      } = opciones;
      
      const filtros = { activa: true };
      
      // Aplicar criterios de búsqueda
      if (criterios.numeroFactura) {
        filtros.numeroFactura = new RegExp(criterios.numeroFactura, 'i');
      }
      
      if (criterios.estado) {
        filtros.estado = criterios.estado;
      }
      
      if (criterios.clienteEmail) {
        filtros['datosCliente.email'] = new RegExp(criterios.clienteEmail, 'i');
      }
      
      if (criterios.clienteNombre) {
        filtros['datosCliente.nombre'] = new RegExp(criterios.clienteNombre, 'i');
      }
      
      if (criterios.fechaInicio && criterios.fechaFin) {
        filtros.fechaGeneracion = {
          $gte: new Date(criterios.fechaInicio),
          $lte: new Date(criterios.fechaFin)
        };
      }
      
      if (criterios.montoMinimo || criterios.montoMaximo) {
        filtros['totales.total'] = {};
        if (criterios.montoMinimo) {
          filtros['totales.total'].$gte = criterios.montoMinimo;
        }
        if (criterios.montoMaximo) {
          filtros['totales.total'].$lte = criterios.montoMaximo;
        }
      }
      
      // Ejecutar búsqueda con paginación
      const skip = (page - 1) * limit;
      const sort = { [sortBy]: sortOrder === 'desc' ? -1 : 1 };
      
      const [facturas, total] = await Promise.all([
        FacturaVenta.find(filtros)
          .populate('clienteId', 'nombre email')
          .populate('pedidoId', 'numeroPedido')
          .populate('usuarioGenerador', 'nombre')
          .sort(sort)
          .skip(skip)
          .limit(limit)
          .lean(),
        FacturaVenta.countDocuments(filtros)
      ]);
      
      return {
        facturas,
        paginacion: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit),
          hasNext: page < Math.ceil(total / limit),
          hasPrev: page > 1
        }
      };
      
    } catch (error) {
      console.error('Error al buscar facturas:', error);
      throw new Error('Error al buscar facturas');
    }
  }
  
  /**
   * Obtiene resumen de facturación por período
   * @param {Date} fechaInicio - Fecha de inicio
   * @param {Date} fechaFin - Fecha de fin
   * @returns {Object} - Resumen de facturación
   */
  async obtenerResumenFacturacion(fechaInicio, fechaFin) {
    try {
      const pipeline = [
        {
          $match: {
            fechaGeneracion: { $gte: fechaInicio, $lte: fechaFin },
            activa: true,
            estado: { $ne: 'anulada' }
          }
        },
        {
          $group: {
            _id: '$estado',
            cantidad: { $sum: 1 },
            montoTotal: { $sum: '$totales.total' },
            montoPromedio: { $avg: '$totales.total' },
            ivaTotal: { $sum: '$totales.ivaTotal' }
          }
        }
      ];
      
      const resumenPorEstado = await FacturaVenta.aggregate(pipeline);
      
      // Calcular totales generales
      const totalesGenerales = await FacturaVenta.aggregate([
        {
          $match: {
            fechaGeneracion: { $gte: fechaInicio, $lte: fechaFin },
            activa: true,
            estado: { $ne: 'anulada' }
          }
        },
        {
          $group: {
            _id: null,
            totalFacturas: { $sum: 1 },
            ventasTotal: { $sum: '$totales.total' },
            ivaTotal: { $sum: '$totales.ivaTotal' },
            promedioFactura: { $avg: '$totales.total' }
          }
        }
      ]);
      
      return {
        periodo: { fechaInicio, fechaFin },
        resumenPorEstado,
        totales: totalesGenerales[0] || {
          totalFacturas: 0,
          ventasTotal: 0,
          ivaTotal: 0,
          promedioFactura: 0
        },
        fechaGeneracion: new Date()
      };
      
    } catch (error) {
      console.error('Error al obtener resumen:', error);
      throw new Error('Error al obtener resumen de facturación');
    }
  }
}

export default new FacturaService();