import { ComisionVenta } from '../../models/pedidos/index.js';
import Usuario from '../../models/usuario/usuario.model.js';
import Pedido from '../../models/checkout/pedido.model.js';

class ComisionService {
  
  /**
   * Calcula comisión para un pedido específico
   * @param {String} pedidoId - ID del pedido
   * @param {String} vendedorId - ID del vendedor
   * @param {Object} configuracion - Configuración de comisión personalizada
   * @returns {Object} - Cálculo de comisión
   */
  async calcularComision(pedidoId, vendedorId, configuracion = null) {
    try {
      // Obtener datos del pedido
      const pedido = await Pedido.findById(pedidoId);
      if (!pedido) {
        throw new Error('Pedido no encontrado');
      }
      
      // Obtener datos del vendedor
      const vendedor = await Usuario.findById(vendedorId);
      if (!vendedor) {
        throw new Error('Vendedor no encontrado');
      }
      
      // Usar configuración personalizada o la del vendedor
      const config = configuracion || vendedor.configuracionComision || {
        tipo: 'porcentaje',
        porcentaje: 5,
        montoFijo: 0,
        aplicarAmbos: false
      };
      
      // Calcular base para comisión (sin costo de envío)
      const montoVentaBruto = pedido.totales.subtotal || 0;
      const descuentosAplicados = pedido.totales.descuento || 0;
      const montoVentaNeto = pedido.totales.total - (pedido.totales.costoEnvio || 0);
      
      let montoComision = 0;
      
      // Calcular según tipo de comisión
      switch (config.tipo) {
        case 'porcentaje':
          montoComision = (montoVentaNeto * config.porcentaje) / 100;
          break;
          
        case 'fijo':
          montoComision = config.montoFijo;
          break;
          
        case 'mixto':
          const comisionPorcentaje = (montoVentaNeto * config.porcentaje) / 100;
          if (config.aplicarAmbos) {
            montoComision = config.montoFijo + comisionPorcentaje;
          } else {
            montoComision = Math.max(config.montoFijo, comisionPorcentaje);
          }
          break;
          
        case 'escalonado':
          montoComision = this.calcularComisionEscalonada(montoVentaNeto, config.escalones);
          break;
          
        default:
          throw new Error(`Tipo de comisión no válido: ${config.tipo}`);
      }
      
      // Aplicar límites si están configurados
      if (config.montoMinimo && montoComision < config.montoMinimo) {
        montoComision = config.montoMinimo;
      }
      
      if (config.montoMaximo && montoComision > config.montoMaximo) {
        montoComision = config.montoMaximo;
      }
      
      return {
        pedidoId,
        vendedorId,
        vendedorNombre: vendedor.nombre,
        configuracion: config,
        calculo: {
          montoVentaBruto,
          descuentosAplicados,
          montoVentaNeto,
          baseCalculoComision: montoVentaNeto,
          montoComision: Math.round(montoComision * 100) / 100,
          porcentajeEfectivo: montoVentaNeto > 0 ? 
            Math.round((montoComision / montoVentaNeto) * 10000) / 100 : 0
        }
      };
      
    } catch (error) {
      console.error('Error al calcular comisión:', error);
      throw new Error(`Error en cálculo de comisión: ${error.message}`);
    }
  }
  
  /**
   * Calcula comisión escalonada basada en rangos de venta
   * @param {Number} montoVenta - Monto de la venta
   * @param {Array} escalones - Configuración de escalones
   * @returns {Number} - Monto de comisión calculado
   */
  calcularComisionEscalonada(montoVenta, escalones = []) {
    if (!escalones || escalones.length === 0) {
      return 0;
    }
    
    // Ordenar escalones por monto mínimo
    const escalonesOrdenados = escalones.sort((a, b) => a.montoMinimo - b.montoMinimo);
    
    let comisionTotal = 0;
    let montoRestante = montoVenta;
    
    for (let i = 0; i < escalonesOrdenados.length; i++) {
      const escalon = escalonesOrdenados[i];
      const siguienteEscalon = escalonesOrdenados[i + 1];
      
      if (montoRestante <= 0) break;
      
      const montoEscalon = siguienteEscalon ? 
        Math.min(montoRestante, siguienteEscalon.montoMinimo - escalon.montoMinimo) :
        montoRestante;
      
      if (montoVenta >= escalon.montoMinimo) {
        comisionTotal += (montoEscalon * escalon.porcentaje) / 100;
        montoRestante -= montoEscalon;
      }
    }
    
    return comisionTotal;
  }
  
  /**
   * Registra una comisión en la base de datos
   * @param {Object} datosComision - Datos de la comisión
   * @returns {Object} - Comisión registrada
   */
  async registrarComision(datosComision) {
    try {
      // Verificar si ya existe comisión para este pedido
      const comisionExistente = await ComisionVenta.findOne({ 
        pedidoId: datosComision.pedidoId 
      });
      
      if (comisionExistente) {
        throw new Error('Ya existe una comisión registrada para este pedido');
      }
      
      const comision = new ComisionVenta({
        pedidoId: datosComision.pedidoId,
        vendedorId: datosComision.vendedorId,
        tipoComision: datosComision.configuracion.tipo,
        configuracionComision: datosComision.configuracion,
        calculoComision: datosComision.calculo,
        estado: 'calculada',
        observaciones: datosComision.observaciones
      });
      
      await comision.save();
      
      return {
        success: true,
        comision: await ComisionVenta.findById(comision._id)
          .populate('vendedorId', 'nombre email')
          .populate('pedidoId', 'numeroPedido')
      };
      
    } catch (error) {
      console.error('Error al registrar comisión:', error);
      throw new Error(`Error al registrar comisión: ${error.message}`);
    }
  }
  
  /**
   * Aprueba una comisión calculada
   * @param {String} comisionId - ID de la comisión
   * @param {String} usuarioAprobadorId - ID del usuario que aprueba
   * @param {String} observaciones - Observaciones de la aprobación
   * @returns {Object} - Resultado de la aprobación
   */
  async aprobarComision(comisionId, usuarioAprobadorId, observaciones = '') {
    try {
      const comision = await ComisionVenta.findById(comisionId);
      
      if (!comision) {
        throw new Error('Comisión no encontrada');
      }
      
      if (comision.estado !== 'calculada') {
        throw new Error(`No se puede aprobar una comisión en estado: ${comision.estado}`);
      }
      
      comision.estado = 'aprobada';
      comision.fechaAprobacion = new Date();
      comision.usuarioAprobador = usuarioAprobadorId;
      comision.observaciones = observaciones;
      
      await comision.save();
      
      return {
        success: true,
        message: 'Comisión aprobada exitosamente',
        comision: await ComisionVenta.findById(comisionId)
          .populate('vendedorId', 'nombre email')
          .populate('usuarioAprobador', 'nombre')
      };
      
    } catch (error) {
      console.error('Error al aprobar comisión:', error);
      throw new Error(`Error al aprobar comisión: ${error.message}`);
    }
  }
  
  /**
   * Registra el pago de una comisión
   * @param {String} comisionId - ID de la comisión
   * @param {Object} detallesPago - Detalles del pago realizado
   * @returns {Object} - Resultado del registro de pago
   */
  async registrarPagoComision(comisionId, detallesPago) {
    try {
      const comision = await ComisionVenta.findById(comisionId);
      
      if (!comision) {
        throw new Error('Comisión no encontrada');
      }
      
      if (comision.estado !== 'aprobada') {
        throw new Error(`No se puede pagar una comisión en estado: ${comision.estado}`);
      }
      
      comision.estado = 'pagada';
      comision.fechaPago = new Date();
      comision.detallesPago = {
        metodoPago: detallesPago.metodoPago,
        numeroTransaccion: detallesPago.numeroTransaccion,
        cuentaDestino: detallesPago.cuentaDestino,
        comprobantePago: detallesPago.comprobantePago
      };
      
      await comision.save();
      
      return {
        success: true,
        message: 'Pago de comisión registrado exitosamente',
        comision: await ComisionVenta.findById(comisionId)
          .populate('vendedorId', 'nombre email')
      };
      
    } catch (error) {
      console.error('Error al registrar pago:', error);
      throw new Error(`Error al registrar pago: ${error.message}`);
    }
  }
  
  /**
   * Obtiene resumen de comisiones por vendedor
   * @param {String} vendedorId - ID del vendedor
   * @param {Object} filtros - Filtros adicionales
   * @returns {Object} - Resumen de comisiones
   */
  async obtenerResumenComisionesPorVendedor(vendedorId, filtros = {}) {
    try {
      const matchFilter = { vendedorId, activo: true, ...filtros };
      
      if (filtros.fechaInicio && filtros.fechaFin) {
        matchFilter.fechaCalculo = {
          $gte: new Date(filtros.fechaInicio),
          $lte: new Date(filtros.fechaFin)
        };
        delete matchFilter.fechaInicio;
        delete matchFilter.fechaFin;
      }
      
      const pipeline = [
        { $match: matchFilter },
        {
          $group: {
            _id: '$estado',
            cantidad: { $sum: 1 },
            montoTotal: { $sum: '$calculoComision.montoComision' },
            montoPromedio: { $avg: '$calculoComision.montoComision' }
          }
        }
      ];
      
      const resumenPorEstado = await ComisionVenta.aggregate(pipeline);
      
      // Calcular totales generales
      const totalComisiones = await ComisionVenta.countDocuments(matchFilter);
      const totalMonto = await ComisionVenta.aggregate([
        { $match: matchFilter },
        { $group: { _id: null, total: { $sum: '$calculoComision.montoComision' } } }
      ]);
      
      return {
        vendedorId,
        totalComisiones,
        montoTotal: totalMonto[0]?.total || 0,
        resumenPorEstado,
        periodoConsultado: {
          fechaInicio: filtros.fechaInicio,
          fechaFin: filtros.fechaFin
        }
      };
      
    } catch (error) {
      console.error('Error al obtener resumen:', error);
      throw new Error('Error al obtener resumen de comisiones');
    }
  }
  
  /**
   * Obtiene comisiones pendientes de pago
   * @param {Object} filtros - Filtros adicionales
   * @returns {Array} - Lista de comisiones pendientes
   */
  async obtenerComisionesPendientesPago(filtros = {}) {
    try {
      const matchFilter = { 
        estado: 'aprobada', 
        activo: true,
        ...filtros 
      };
      
      const comisionesPendientes = await ComisionVenta.find(matchFilter)
        .populate('vendedorId', 'nombre email telefono cuentaBancaria')
        .populate('pedidoId', 'numeroPedido fechaPedido')
        .sort({ fechaAprobacion: 1 })
        .lean();
      
      const resumen = {
        cantidad: comisionesPendientes.length,
        montoTotal: comisionesPendientes.reduce(
          (sum, c) => sum + c.calculoComision.montoComision, 0
        ),
        comisiones: comisionesPendientes
      };
      
      return resumen;
      
    } catch (error) {
      console.error('Error al obtener comisiones pendientes:', error);
      throw new Error('Error al consultar comisiones pendientes');
    }
  }
  
  /**
   * Genera reporte de comisiones por período
   * @param {Date} fechaInicio - Fecha de inicio
   * @param {Date} fechaFin - Fecha de fin
   * @returns {Object} - Reporte detallado
   */
  async generarReporteComisiones(fechaInicio, fechaFin) {
    try {
      const pipeline = [
        {
          $match: {
            fechaCalculo: { $gte: fechaInicio, $lte: fechaFin },
            activo: true
          }
        },
        {
          $lookup: {
            from: 'usuarios',
            localField: 'vendedorId',
            foreignField: '_id',
            as: 'vendedor'
          }
        },
        {
          $unwind: '$vendedor'
        },
        {
          $group: {
            _id: {
              vendedorId: '$vendedorId',
              vendedorNombre: '$vendedor.nombre',
              estado: '$estado'
            },
            cantidad: { $sum: 1 },
            montoTotal: { $sum: '$calculoComision.montoComision' },
            montoPromedio: { $avg: '$calculoComision.montoComision' }
          }
        },
        {
          $group: {
            _id: '$_id.vendedorId',
            vendedorNombre: { $first: '$_id.vendedorNombre' },
            estados: {
              $push: {
                estado: '$_id.estado',
                cantidad: '$cantidad',
                montoTotal: '$montoTotal',
                montoPromedio: '$montoPromedio'
              }
            },
            totalComisiones: { $sum: '$cantidad' },
            montoTotalGeneral: { $sum: '$montoTotal' }
          }
        },
        {
          $sort: { montoTotalGeneral: -1 }
        }
      ];
      
      const reportePorVendedor = await ComisionVenta.aggregate(pipeline);
      
      // Calcular totales generales del período
      const totalesGenerales = await ComisionVenta.aggregate([
        {
          $match: {
            fechaCalculo: { $gte: fechaInicio, $lte: fechaFin },
            activo: true
          }
        },
        {
          $group: {
            _id: '$estado',
            cantidad: { $sum: 1 },
            montoTotal: { $sum: '$calculoComision.montoComision' }
          }
        }
      ]);
      
      return {
        periodo: { fechaInicio, fechaFin },
        reportePorVendedor,
        totalesGenerales,
        fechaGeneracion: new Date()
      };
      
    } catch (error) {
      console.error('Error al generar reporte:', error);
      throw new Error('Error al generar reporte de comisiones');
    }
  }
}

export default new ComisionService();