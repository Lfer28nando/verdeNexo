// utils/salesStatsService.js
import { EstadisticasDiarias, EstadisticasMensuales } from '../models/salesStats.model.js';
import { Pedido } from '../models/order.model.js';
import { Comision } from '../models/commission.model.js';

/**
 * Actualizar estadísticas de venta cuando se confirma un pedido
 * @param {Object} pedido - Objeto del pedido confirmado
 */
export const actualizarEstadisticasVenta = async (pedido) => {
  try {
    // Actualizar estadísticas diarias
    await EstadisticasDiarias.actualizarEstadisticasDiarias(pedido.fechaConfirmacion || new Date());

    // Si es fin de mes, generar estadísticas mensuales
    const fecha = pedido.fechaConfirmacion || new Date();
    const ultimoDiaMes = new Date(fecha.getFullYear(), fecha.getMonth() + 1, 0).getDate();
    if (fecha.getDate() === ultimoDiaMes) {
      await EstadisticasMensuales.generarEstadisticasMensuales(
        fecha.getFullYear(),
        fecha.getMonth() + 1
      );
    }

  } catch (error) {
    console.error('Error actualizando estadísticas de venta:', error);
    // No fallar el proceso de confirmación por error en estadísticas
  }
};

/**
 * Obtener estadísticas de ventas por período
 * @param {Date} fechaInicio - Fecha de inicio
 * @param {Date} fechaFin - Fecha de fin
 * @returns {Promise<Object>} Estadísticas del período
 */
export const obtenerEstadisticasVentas = async (fechaInicio, fechaFin) => {
  const estadisticasDiarias = await EstadisticasDiarias.find({
    fecha: { $gte: fechaInicio, $lte: fechaFin }
  }).sort({ fecha: 1 });

  // Calcular totales del período
  const totales = estadisticasDiarias.reduce((acc, dia) => ({
    totalPedidos: acc.totalPedidos + dia.totalPedidos,
    totalVentas: acc.totalVentas + dia.totalVentas,
    totalProductosVendidos: acc.totalProductosVendidos + dia.totalProductosVendidos,
    pedidosEnviados: acc.pedidosEnviados + dia.pedidosEnviados,
    pedidosEntregados: acc.pedidosEntregados + dia.pedidosEntregados,
    pedidosCancelados: acc.pedidosCancelados + dia.pedidosCancelados
  }), {
    totalPedidos: 0,
    totalVentas: 0,
    totalProductosVendidos: 0,
    pedidosEnviados: 0,
    pedidosEntregados: 0,
    pedidosCancelados: 0
  });

  // Calcular métricas adicionales
  const metricas = {
    ...totales,
    ticketPromedio: totales.totalPedidos > 0 ? totales.totalVentas / totales.totalPedidos : 0,
    productosPorPedido: totales.totalPedidos > 0 ? totales.totalProductosVendidos / totales.totalPedidos : 0,
    tasaCancelacion: totales.totalPedidos > 0 ? (totales.pedidosCancelados / totales.totalPedidos) * 100 : 0,
    tasaEntrega: totales.pedidosEnviados > 0 ? (totales.pedidosEntregados / totales.pedidosEnviados) * 100 : 0
  };

  return {
    periodo: {
      fechaInicio,
      fechaFin,
      dias: estadisticasDiarias.length
    },
    metricas,
    detalleDiario: estadisticasDiarias
  };
};

/**
 * Obtener top productos más vendidos
 * @param {Date} fechaInicio - Fecha de inicio
 * @param {Date} fechaFin - Fecha de fin
 * @param {number} limite - Número máximo de productos
 * @returns {Promise<Array>} Lista de productos más vendidos
 */
export const obtenerTopProductosVendidos = async (fechaInicio, fechaFin, limite = 10) => {
  const resultado = await Pedido.aggregate([
    {
      $match: {
        fechaCreacion: { $gte: fechaInicio, $lte: fechaFin },
        estado: { $nin: ['borrador', 'cancelado'] }
      }
    },
    { $unwind: '$items' },
    {
      $group: {
        _id: '$items.productoId',
        nombreProducto: { $first: '$items.nombreProducto' },
        cantidadVendida: { $sum: '$items.cantidad' },
        totalVendido: { $sum: '$items.subtotal' },
        pedidosDondeAparece: { $addToSet: '$_id' }
      }
    },
    {
      $project: {
        productoId: '$_id',
        nombreProducto: 1,
        cantidadVendida: 1,
        totalVendido: 1,
        numeroPedidos: { $size: '$pedidosDondeAparece' }
      }
    },
    { $sort: { totalVendido: -1 } },
    { $limit: limite }
  ]);

  return resultado;
};

/**
 * Obtener rendimiento de vendedores
 * @param {Date} fechaInicio - Fecha de inicio
 * @param {Date} fechaFin - Fecha de fin
 * @param {number} limite - Número máximo de vendedores
 * @returns {Promise<Array>} Lista de rendimiento de vendedores
 */
export const obtenerRendimientoVendedores = async (fechaInicio, fechaFin, limite = 10) => {
  const resultado = await Comision.aggregate([
    {
      $match: {
        fechaVenta: { $gte: fechaInicio, $lte: fechaFin },
        estado: 'pagada'
      }
    },
    {
      $group: {
        _id: '$vendedorId',
        nombreVendedor: { $first: '$nombreProducto' }, // Esto debería ser del usuario, corregir
        pedidosAtendidos: { $addToSet: '$pedidoId' },
        totalVendido: { $sum: '$subtotal' },
        comisionesGanadas: { $sum: '$montoComision' },
        productosVendidos: { $sum: '$cantidadVendida' }
      }
    },
    {
      $project: {
        vendedorId: '$_id',
        nombreVendedor: 1,
        pedidosAtendidos: { $size: '$pedidosDondeAparece' },
        totalVendido: 1,
        comisionesGanadas: 1,
        productosVendidos: 1,
        comisionPromedio: {
          $cond: {
            if: { $gt: ['$pedidosAtendidos', 0] },
            then: { $divide: ['$comisionesGanadas', '$pedidosAtendidos'] },
            else: 0
          }
        }
      }
    },
    { $sort: { totalVendido: -1 } },
    { $limit: limite }
  ]);

  return resultado;
};

/**
 * Generar reporte completo de ventas
 * @param {Date} fechaInicio - Fecha de inicio
 * @param {Date} fechaFin - Fecha de fin
 * @returns {Promise<Object>} Reporte completo
 */
export const generarReporteVentas = async (fechaInicio, fechaFin) => {
  const [estadisticas, topProductos, rendimientoVendedores] = await Promise.all([
    obtenerEstadisticasVentas(fechaInicio, fechaFin),
    obtenerTopProductosVendidos(fechaInicio, fechaFin, 20),
    obtenerRendimientoVendedores(fechaInicio, fechaFin, 20)
  ]);

  // Obtener distribución por estados de pedido
  const distribucionEstados = await Pedido.aggregate([
    {
      $match: {
        fechaCreacion: { $gte: fechaInicio, $lte: fechaFin }
      }
    },
    {
      $group: {
        _id: '$estado',
        cantidad: { $sum: 1 },
        totalValor: { $sum: '$totales.total' }
      }
    },
    { $sort: { cantidad: -1 } }
  ]);

  // Obtener distribución por canales de venta
  const distribucionCanales = await Pedido.aggregate([
    {
      $match: {
        fechaCreacion: { $gte: fechaInicio, $lte: fechaFin },
        estado: { $ne: 'borrador' }
      }
    },
    {
      $group: {
        _id: '$canalVenta',
        cantidad: { $sum: 1 },
        totalValor: { $sum: '$totales.total' }
      }
    },
    { $sort: { totalValor: -1 } }
  ]);

  return {
    periodo: estadisticas.periodo,
    resumen: estadisticas.metricas,
    distribucionEstados,
    distribucionCanales,
    topProductos,
    rendimientoVendedores,
    generadoEn: new Date()
  };
};

/**
 * Obtener métricas de ventas en tiempo real
 * @returns {Promise<Object>} Métricas actuales
 */
export const obtenerMetricasTiempoReal = async () => {
  const hoy = new Date();
  const inicioHoy = new Date(hoy);
  inicioHoy.setHours(0, 0, 0, 0);

  const finHoy = new Date(hoy);
  finHoy.setHours(23, 59, 59, 999);

  // Pedidos de hoy
  const pedidosHoy = await Pedido.find({
    fechaCreacion: { $gte: inicioHoy, $lte: finHoy }
  });

  // Pedidos pendientes
  const pedidosPendientes = await Pedido.countDocuments({
    estado: { $in: ['confirmado', 'pagado', 'en_preparacion'] }
  });

  // Ventas del mes actual
  const inicioMes = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
  const ventasMes = await Pedido.aggregate([
    {
      $match: {
        fechaCreacion: { $gte: inicioMes },
        estado: { $ne: 'borrador' }
      }
    },
    {
      $group: {
        _id: null,
        total: { $sum: '$totales.total' },
        cantidad: { $sum: 1 }
      }
    }
  ]);

  return {
    pedidosHoy: pedidosHoy.length,
    ventasHoy: pedidosHoy.reduce((sum, p) => sum + p.totales.total, 0),
    pedidosPendientes,
    ventasMes: ventasMes.length > 0 ? ventasMes[0].total : 0,
    pedidosMes: ventasMes.length > 0 ? ventasMes[0].cantidad : 0,
    ultimaActualizacion: new Date()
  };
};