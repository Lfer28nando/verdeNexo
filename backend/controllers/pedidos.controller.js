import mongoose from 'mongoose';
import { 
  EstadoPedido, 
  ComisionVenta, 
  FacturaVenta, 
  ReporteVenta 
} from '../models/pedidos/index.js';
import Pedido from '../models/checkout/pedido.model.js';
import { Producto } from '../models/producto/producto.model.js';
import Usuario from '../models/usuario/usuario.model.js';

class PedidosController {
  
  // RF-PEDI-01: Confirmar Pedido
  async confirmarPedido(req, res) {
    const session = await mongoose.startSession();
    session.startTransaction();
    
    try {
      const { pedidoId } = req.params;
      const { motivoConfirmacion, notificarCliente = true } = req.body;
      
      // Verificar que el pedido existe y está en estado pendiente
      const pedido = await Pedido.findById(pedidoId).session(session);
      if (!pedido) {
        await session.abortTransaction();
        return res.status(404).json({
          success: false,
          message: 'Pedido no encontrado'
        });
      }
      
      // Verificar estado actual
      const estadoActual = await EstadoPedido.obtenerEstadoActual(pedidoId);
      if (estadoActual && estadoActual.estadoNuevo !== 'pendiente') {
        await session.abortTransaction();
        return res.status(400).json({
          success: false,
          message: `No se puede confirmar un pedido en estado: ${estadoActual.estadoNuevo}`
        });
      }
      
      // Verificar stock disponible antes de confirmar
      for (const item of pedido.items) {
        const producto = await Producto.findById(item.productoId).session(session);
        if (!producto) {
          await session.abortTransaction();
          return res.status(400).json({
            success: false,
            message: `Producto ${item.productoId} no encontrado`
          });
        }
        
        if (producto.stock < item.cantidad) {
          await session.abortTransaction();
          return res.status(400).json({
            success: false,
            message: `Stock insuficiente para ${producto.nombre}. Disponible: ${producto.stock}, Requerido: ${item.cantidad}`
          });
        }
      }
      
      // Actualizar estado del pedido
      const nuevoEstado = new EstadoPedido({
        pedidoId: pedido._id,
        estadoAnterior: estadoActual?.estadoNuevo || null,
        estadoNuevo: 'confirmado',
        motivo: motivoConfirmacion || 'Confirmación automática del pedido',
        usuarioResponsable: req.usuario._id,
        notificacionEnviada: false
      });
      
      await nuevoEstado.save({ session });
      
      // Actualizar estado en el pedido principal
      pedido.estado = 'confirmado';
      pedido.fechaConfirmacion = new Date();
      await pedido.save({ session });
      
      await session.commitTransaction();
      
      // Respuesta exitosa
      res.status(200).json({
        success: true,
        message: 'Pedido confirmado exitosamente',
        data: {
          pedidoId: pedido._id,
          numeroPedido: pedido.numeroPedido,
          estadoAnterior: estadoActual?.estadoNuevo || 'pendiente',
          estadoNuevo: 'confirmado',
          fechaConfirmacion: pedido.fechaConfirmacion
        }
      });
      
      // Procesos asíncronos después de la confirmación
      this.procesarPostConfirmacion(pedido._id, notificarCliente);
      
    } catch (error) {
      await session.abortTransaction();
      console.error('Error al confirmar pedido:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    } finally {
      session.endSession();
    }
  }
  
  // RF-PEDI-02: Registrar estado del pedido
  async actualizarEstadoPedido(req, res) {
    try {
      const { pedidoId } = req.params;
      const { 
        nuevoEstado, 
        motivo, 
        comentarios, 
        metadatos = {},
        notificarCliente = true 
      } = req.body;
      
      // Validar que el nuevo estado es válido
      const estadosValidos = [
        'pendiente', 'confirmado', 'en_proceso', 'empacado', 
        'enviado', 'en_transito', 'entregado', 'cancelado', 'devuelto'
      ];
      
      if (!estadosValidos.includes(nuevoEstado)) {
        return res.status(400).json({
          success: false,
          message: `Estado inválido: ${nuevoEstado}`
        });
      }
      
      // Obtener estado actual
      const estadoActual = await EstadoPedido.obtenerEstadoActual(pedidoId);
      
      // Crear nuevo registro de estado
      const registroEstado = new EstadoPedido({
        pedidoId,
        estadoAnterior: estadoActual?.estadoNuevo || null,
        estadoNuevo: nuevoEstado,
        motivo,
        comentarios,
        usuarioResponsable: req.usuario._id,
        metadatos
      });
      
      await registroEstado.save();
      
      // Actualizar estado en el pedido principal
      await Pedido.findByIdAndUpdate(pedidoId, { estado: nuevoEstado });
      
      res.status(200).json({
        success: true,
        message: 'Estado del pedido actualizado exitosamente',
        data: {
          pedidoId,
          estadoAnterior: estadoActual?.estadoNuevo || null,
          estadoNuevo: nuevoEstado,
          fechaCambio: registroEstado.fechaCambio
        }
      });
      
      // Procesar notificaciones si es necesario
      if (notificarCliente) {
        this.enviarNotificacionCambioEstado(pedidoId, estadoActual?.estadoNuevo, nuevoEstado);
      }
      
    } catch (error) {
      console.error('Error al actualizar estado del pedido:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
  
  // RF-PEDI-03: Actualizar stock
  async actualizarStock(req, res) {
    const session = await mongoose.startSession();
    session.startTransaction();
    
    try {
      const { pedidoId } = req.params;
      const { operacion = 'descontar' } = req.body; // 'descontar' o 'restaurar'
      
      const pedido = await Pedido.findById(pedidoId).session(session);
      if (!pedido) {
        await session.abortTransaction();
        return res.status(404).json({
          success: false,
          message: 'Pedido no encontrado'
        });
      }
      
      const movimientosStock = [];
      
      for (const item of pedido.items) {
        const producto = await Producto.findById(item.productoId).session(session);
        if (!producto) {
          await session.abortTransaction();
          return res.status(400).json({
            success: false,
            message: `Producto ${item.productoId} no encontrado`
          });
        }
        
        let nuevoStock;
        if (operacion === 'descontar') {
          nuevoStock = producto.stock - item.cantidad;
          if (nuevoStock < 0) {
            await session.abortTransaction();
            return res.status(400).json({
              success: false,
              message: `Stock insuficiente para ${producto.nombre}`
            });
          }
        } else {
          nuevoStock = producto.stock + item.cantidad;
        }
        
        // Actualizar stock del producto
        await Producto.findByIdAndUpdate(
          item.productoId,
          { 
            stock: nuevoStock,
            $push: {
              movimientosStock: {
                tipo: operacion === 'descontar' ? 'venta' : 'devolucion',
                cantidad: operacion === 'descontar' ? -item.cantidad : item.cantidad,
                motivo: `${operacion === 'descontar' ? 'Venta' : 'Devolución'} - Pedido ${pedido.numeroPedido}`,
                fecha: new Date(),
                referencia: pedido._id
              }
            }
          },
          { session }
        );
        
        movimientosStock.push({
          productoId: item.productoId,
          nombre: producto.nombre,
          stockAnterior: producto.stock,
          cantidadMovimiento: operacion === 'descontar' ? -item.cantidad : item.cantidad,
          stockNuevo: nuevoStock
        });
      }
      
      await session.commitTransaction();
      
      res.status(200).json({
        success: true,
        message: `Stock ${operacion === 'descontar' ? 'descontado' : 'restaurado'} exitosamente`,
        data: {
          pedidoId,
          operacion,
          movimientos: movimientosStock
        }
      });
      
    } catch (error) {
      await session.abortTransaction();
      console.error('Error al actualizar stock:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    } finally {
      session.endSession();
    }
  }
  
  // RF-PEDI-04: Registrar comisión de venta
  async registrarComisionVenta(req, res) {
    try {
      const { pedidoId } = req.params;
      const { 
        vendedorId, 
        configuracionComision,
        observaciones 
      } = req.body;
      
      // Verificar si ya existe una comisión para este pedido
      const comisionExistente = await ComisionVenta.findOne({ pedidoId });
      if (comisionExistente) {
        return res.status(400).json({
          success: false,
          message: 'Ya existe una comisión registrada para este pedido'
        });
      }
      
      // Obtener datos del pedido
      const pedido = await Pedido.findById(pedidoId);
      if (!pedido) {
        return res.status(404).json({
          success: false,
          message: 'Pedido no encontrado'
        });
      }
      
      // Verificar que el vendedor existe
      const vendedor = await Usuario.findById(vendedorId);
      if (!vendedor) {
        return res.status(404).json({
          success: false,
          message: 'Vendedor no encontrado'
        });
      }
      
      // Crear registro de comisión
      const comision = new ComisionVenta({
        pedidoId,
        vendedorId,
        tipoComision: configuracionComision.tipo || 'porcentaje',
        configuracionComision: {
          porcentaje: configuracionComision.porcentaje || 0,
          montoFijo: configuracionComision.montoFijo || 0,
          aplicarAmbos: configuracionComision.aplicarAmbos || false
        },
        calculoComision: {
          montoVentaBruto: pedido.totales.subtotal,
          descuentosAplicados: pedido.totales.descuento || 0,
          montoVentaNeto: pedido.totales.total - (pedido.totales.costoEnvio || 0)
        },
        observaciones
      });
      
      await comision.save();
      
      res.status(201).json({
        success: true,
        message: 'Comisión de venta registrada exitosamente',
        data: {
          comisionId: comision._id,
          vendedor: vendedor.nombre,
          pedidoNumero: pedido.numeroPedido,
          montoComision: comision.calculoComision.montoComision,
          estado: comision.estado
        }
      });
      
    } catch (error) {
      console.error('Error al registrar comisión:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
  
  // RF-PEDI-05: Emitir factura de venta
  async generarFactura(req, res) {
    try {
      const { pedidoId } = req.params;
      const { 
        datosCliente,
        metodoPago,
        observaciones,
        enviarPorEmail = true 
      } = req.body;
      
      // Obtener datos del pedido
      const pedido = await Pedido.findById(pedidoId).populate('items.productoId');
      if (!pedido) {
        return res.status(404).json({
          success: false,
          message: 'Pedido no encontrado'
        });
      }
      
      // Verificar si ya existe una factura para este pedido
      const facturaExistente = await FacturaVenta.findOne({ pedidoId });
      if (facturaExistente) {
        return res.status(400).json({
          success: false,
          message: 'Ya existe una factura para este pedido',
          data: { numeroFactura: facturaExistente.numeroFactura }
        });
      }
      
      // Generar número de factura
      const numeroFactura = await FacturaVenta.generarNumeroFactura();
      
      // Preparar detalle de productos
      const detalleProductos = pedido.items.map(item => ({
        productoId: item.productoId._id,
        nombre: item.productoId.nombre,
        descripcion: item.productoId.descripcion,
        cantidad: item.cantidad,
        precioUnitario: item.precioUnitario,
        descuento: item.descuento || 0,
        subtotal: (item.cantidad * item.precioUnitario) - (item.descuento || 0),
        iva: {
          porcentaje: 19, // IVA por defecto en Colombia
          valor: 0 // Se calculará automáticamente
        }
      }));
      
      // Crear factura
      const factura = new FacturaVenta({
        numeroFactura,
        pedidoId,
        clienteId: pedido.clienteId,
        datosCliente: datosCliente || {
          tipoDocumento: 'CC',
          numeroDocumento: 'N/A',
          nombre: pedido.datosCliente?.nombre || 'Cliente',
          email: pedido.datosCliente?.email || 'cliente@email.com',
          telefono: pedido.datosCliente?.telefono || '',
          direccion: pedido.direccionEntrega || {}
        },
        detalleProductos,
        totales: {
          subtotal: 0, // Se calculará automáticamente
          descuentoTotal: 0,
          ivaTotal: 0,
          costoEnvio: pedido.totales.costoEnvio || 0,
          total: 0
        },
        metodoPago,
        observaciones,
        usuarioGenerador: req.usuario._id
      });
      
      await factura.save();
      
      res.status(201).json({
        success: true,
        message: 'Factura generada exitosamente',
        data: {
          facturaId: factura._id,
          numeroFactura: factura.numeroFactura,
          total: factura.totales.total,
          fechaGeneracion: factura.fechaGeneracion,
          fechaVencimiento: factura.fechaVencimiento
        }
      });
      
      // Procesar envío de factura por email si es necesario
      if (enviarPorEmail) {
        this.enviarFacturaPorEmail(factura._id);
      }
      
    } catch (error) {
      console.error('Error al generar factura:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
  
  // RF-PEDI-06: Mostrar estado del pedido
  async consultarEstadoPedido(req, res) {
    try {
      const { pedidoId } = req.params;
      
      // Obtener datos básicos del pedido
      const pedido = await Pedido.findById(pedidoId)
        .populate('clienteId', 'nombre email telefono')
        .populate('items.productoId', 'nombre imagen precio');
      
      if (!pedido) {
        return res.status(404).json({
          success: false,
          message: 'Pedido no encontrado'
        });
      }
      
      // Obtener historial completo de estados
      const historialEstados = await EstadoPedido.obtenerHistorialPedido(pedidoId);
      
      // Obtener estado actual
      const estadoActual = await EstadoPedido.obtenerEstadoActual(pedidoId);
      
      // Obtener factura si existe
      const factura = await FacturaVenta.findOne({ pedidoId }, 'numeroFactura estado fechaGeneracion totales.total');
      
      // Obtener comisión si existe
      const comision = await ComisionVenta.findOne({ pedidoId }, 'vendedorId estado calculoComision.montoComision')
        .populate('vendedorId', 'nombre');
      
      res.status(200).json({
        success: true,
        message: 'Estado del pedido obtenido exitosamente',
        data: {
          pedido: {
            _id: pedido._id,
            numeroPedido: pedido.numeroPedido,
            fechaPedido: pedido.createdAt,
            cliente: pedido.clienteId || pedido.datosCliente,
            items: pedido.items,
            totales: pedido.totales,
            direccionEntrega: pedido.direccionEntrega
          },
          estado: {
            actual: estadoActual?.estadoNuevo || 'pendiente',
            fechaUltimoCambio: estadoActual?.fechaCambio,
            historial: historialEstados
          },
          factura: factura ? {
            numero: factura.numeroFactura,
            estado: factura.estado,
            fechaGeneracion: factura.fechaGeneracion,
            total: factura.totales.total
          } : null,
          comision: comision ? {
            vendedor: comision.vendedorId?.nombre,
            estado: comision.estado,
            monto: comision.calculoComision.montoComision
          } : null
        }
      });
      
    } catch (error) {
      console.error('Error al consultar estado del pedido:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
  
  // RF-PEDI-07: Guardar información de venta
  async registrarVenta(req, res) {
    try {
      const { pedidoId } = req.params;
      
      // Obtener información completa del pedido
      const pedido = await Pedido.findById(pedidoId)
        .populate('items.productoId', 'nombre categoria precio costo');
      
      if (!pedido) {
        return res.status(404).json({
          success: false,
          message: 'Pedido no encontrado'
        });
      }
      
      // Obtener factura asociada
      const factura = await FacturaVenta.findOne({ pedidoId });
      
      // Obtener comisión asociada
      const comision = await ComisionVenta.findOne({ pedidoId });
      
      // Registrar en tabla de ventas (esto podría ser una nueva colección o actualizar pedido)
      const registroVenta = {
        fecha: new Date(),
        pedidoId: pedido._id,
        numeroPedido: pedido.numeroPedido,
        clienteId: pedido.clienteId,
        datosCliente: pedido.datosCliente,
        items: pedido.items.map(item => ({
          productoId: item.productoId._id,
          nombre: item.productoId.nombre,
          categoria: item.productoId.categoria,
          cantidad: item.cantidad,
          precioVenta: item.precioUnitario,
          costoProducto: item.productoId.costo || 0,
          margen: item.precioUnitario - (item.productoId.costo || 0),
          totalItem: item.cantidad * item.precioUnitario
        })),
        totales: pedido.totales,
        factura: factura ? {
          numeroFactura: factura.numeroFactura,
          fechaFactura: factura.fechaGeneracion
        } : null,
        comision: comision ? {
          vendedorId: comision.vendedorId,
          montoComision: comision.calculoComision.montoComision
        } : null,
        registradoPor: req.usuario._id
      };
      
      // Actualizar el pedido con información de venta registrada
      await Pedido.findByIdAndUpdate(pedidoId, {
        ventaRegistrada: true,
        fechaRegistroVenta: new Date(),
        registroVenta: registroVenta
      });
      
      res.status(200).json({
        success: true,
        message: 'Información de venta registrada exitosamente',
        data: {
          pedidoId,
          numeroVenta: registroVenta.numeroPedido,
          fechaRegistro: registroVenta.fecha,
          totalVenta: registroVenta.totales.total,
          comisionGenerada: registroVenta.comision?.montoComision || 0
        }
      });
      
    } catch (error) {
      console.error('Error al registrar venta:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
  
  // Métodos auxiliares
  
  async procesarPostConfirmacion(pedidoId, notificarCliente) {
    try {
      // Descontar stock automáticamente
      await this.descontarStockAutomatico(pedidoId);
      
      // Generar comisión si hay vendedor asignado
      const pedido = await Pedido.findById(pedidoId);
      if (pedido.vendedorId) {
        await this.generarComisionAutomatica(pedidoId, pedido.vendedorId);
      }
      
      // Enviar notificación al cliente
      if (notificarCliente) {
        await this.enviarNotificacionConfirmacion(pedidoId);
      }
      
    } catch (error) {
      console.error('Error en procesamiento post-confirmación:', error);
    }
  }
  
  async descontarStockAutomatico(pedidoId) {
    const session = await mongoose.startSession();
    session.startTransaction();
    
    try {
      const pedido = await Pedido.findById(pedidoId).session(session);
      
      for (const item of pedido.items) {
        await Producto.findByIdAndUpdate(
          item.productoId,
          { 
            $inc: { stock: -item.cantidad },
            $push: {
              movimientosStock: {
                tipo: 'venta',
                cantidad: -item.cantidad,
                motivo: `Venta automática - Pedido ${pedido.numeroPedido}`,
                fecha: new Date(),
                referencia: pedido._id
              }
            }
          },
          { session }
        );
      }
      
      await session.commitTransaction();
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  }
  
  async generarComisionAutomatica(pedidoId, vendedorId) {
    try {
      const pedido = await Pedido.findById(pedidoId);
      const vendedor = await Usuario.findById(vendedorId);
      
      // Configuración de comisión por defecto (debería venir de configuración)
      const configuracionComision = {
        tipo: 'porcentaje',
        porcentaje: vendedor.configuracionComision?.porcentaje || 5,
        montoFijo: vendedor.configuracionComision?.montoFijo || 0
      };
      
      const comision = new ComisionVenta({
        pedidoId,
        vendedorId,
        tipoComision: configuracionComision.tipo,
        configuracionComision,
        calculoComision: {
          montoVentaBruto: pedido.totales.subtotal,
          descuentosAplicados: pedido.totales.descuento || 0,
          montoVentaNeto: pedido.totales.total - (pedido.totales.costoEnvio || 0)
        }
      });
      
      await comision.save();
    } catch (error) {
      console.error('Error al generar comisión automática:', error);
    }
  }
  
  async enviarNotificacionConfirmacion(pedidoId) {
    // Implementar lógica de notificación por email/SMS
    console.log(`Enviando notificación de confirmación para pedido ${pedidoId}`);
  }
  
  async enviarNotificacionCambioEstado(pedidoId, estadoAnterior, estadoNuevo) {
    // Implementar lógica de notificación de cambio de estado
    console.log(`Enviando notificación de cambio de estado: ${estadoAnterior} -> ${estadoNuevo} para pedido ${pedidoId}`);
  }
  
  async enviarFacturaPorEmail(facturaId) {
    // Implementar lógica para enviar factura por email
    console.log(`Enviando factura ${facturaId} por email`);
  }
}

export default new PedidosController();