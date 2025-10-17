// models/salesStats.model.js
import mongoose from 'mongoose';

// Esquema para estadísticas diarias de ventas
const estadisticasDiariasSchema = new mongoose.Schema({
  fecha: { type: Date, required: true, unique: true },

  // Ventas generales
  totalPedidos: { type: Number, default: 0 },
  totalVentas: { type: Number, default: 0 }, // Suma de totales de pedidos
  totalProductosVendidos: { type: Number, default: 0 },

  // Ventas por canal
  ventasPorCanal: {
    b2c: { type: Number, default: 0 },
    mayorista: { type: Number, default: 0 },
    b2b: { type: Number, default: 0 }
  },

  // Ventas por método de pago
  ventasPorMetodoPago: {
    tarjeta_credito: { type: Number, default: 0 },
    tarjeta_debito: { type: Number, default: 0 },
    pse: { type: Number, default: 0 },
    transferencia: { type: Number, default: 0 },
    efectivo: { type: Number, default: 0 }
  },

  // Productos más vendidos (top 10)
  productosMasVendidos: [{
    productoId: { type: mongoose.Schema.Types.ObjectId, ref: 'Producto' },
    nombreProducto: { type: String },
    cantidadVendida: { type: Number, default: 0 },
    totalVendido: { type: Number, default: 0 }
  }],

  // Vendedores con mejor rendimiento
  rendimientoVendedores: [{
    vendedorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    nombreVendedor: { type: String },
    pedidosAtendidos: { type: Number, default: 0 },
    totalVendido: { type: Number, default: 0 },
    comisionesGeneradas: { type: Number, default: 0 }
  }],

  // Información de envíos
  pedidosEnviados: { type: Number, default: 0 },
  pedidosEntregados: { type: Number, default: 0 },
  tiempoPromedioEntrega: { type: Number, default: 0 }, // en horas

  // Cancelaciones y devoluciones
  pedidosCancelados: { type: Number, default: 0 },
  tasaCancelacion: { type: Number, default: 0 }, // porcentaje

  // Información financiera
  ingresosTotales: { type: Number, default: 0 },
  costoProductos: { type: Number, default: 0 }, // costo de inventario
  margenBruto: { type: Number, default: 0 },
  comisionesPagadas: { type: Number, default: 0 },

  // Metadata
  ultimaActualizacion: { type: Date, default: Date.now }
}, {
  timestamps: true
});

// Esquema para estadísticas mensuales (resumen)
const estadisticasMensualesSchema = new mongoose.Schema({
  anio: { type: Number, required: true },
  mes: { type: Number, required: true, min: 1, max: 12 },

  // Datos acumulados del mes
  totalPedidos: { type: Number, default: 0 },
  totalVentas: { type: Number, default: 0 },
  totalProductosVendidos: { type: Number, default: 0 },

  // Tendencias
  crecimientoVentas: { type: Number, default: 0 }, // porcentaje vs mes anterior
  crecimientoPedidos: { type: Number, default: 0 }, // porcentaje vs mes anterior

  // Métricas de rendimiento
  ticketPromedio: { type: Number, default: 0 },
  productosPorPedido: { type: Number, default: 0 },
  tasaConversion: { type: Number, default: 0 }, // porcentaje

  // Top productos del mes
  topProductos: [{
    productoId: { type: mongoose.Schema.Types.ObjectId, ref: 'Producto' },
    nombreProducto: { type: String },
    cantidadVendida: { type: Number, default: 0 },
    ingresosGenerados: { type: Number, default: 0 }
  }],

  // Top vendedores del mes
  topVendedores: [{
    vendedorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    nombreVendedor: { type: String },
    pedidosAtendidos: { type: Number, default: 0 },
    totalVendido: { type: Number, default: 0 },
    comisionesGanadas: { type: Number, default: 0 }
  }],

  // Metadata
  fechaCreacion: { type: Date, default: Date.now },
  ultimaActualizacion: { type: Date, default: Date.now }
}, {
  timestamps: true
});

// Índices
estadisticasDiariasSchema.index({ fecha: -1 });
estadisticasMensualesSchema.index({ anio: -1, mes: -1 });

// Método para actualizar estadísticas diarias
estadisticasDiariasSchema.statics.actualizarEstadisticasDiarias = async function(fecha = new Date()) {
  const fechaInicio = new Date(fecha);
  fechaInicio.setHours(0, 0, 0, 0);

  const fechaFin = new Date(fecha);
  fechaFin.setHours(23, 59, 59, 999);

  // Buscar o crear estadística del día
  let estadistica = await this.findOne({ fecha: fechaInicio });
  if (!estadistica) {
    estadistica = new this({ fecha: fechaInicio });
  }

  // Calcular estadísticas desde pedidos
  const pedidosDelDia = await mongoose.model('Pedido').find({
    fechaCreacion: { $gte: fechaInicio, $lte: fechaFin },
    estado: { $ne: 'borrador' }
  });

  // Estadísticas básicas
  estadistica.totalPedidos = pedidosDelDia.length;
  estadistica.totalVentas = pedidosDelDia.reduce((sum, pedido) => sum + pedido.totales.total, 0);
  estadistica.totalProductosVendidos = pedidosDelDia.reduce((sum, pedido) =>
    sum + pedido.items.reduce((itemSum, item) => itemSum + item.cantidad, 0), 0
  );

  // Ventas por canal
  estadistica.ventasPorCanal = {
    b2c: pedidosDelDia.filter(p => p.canalVenta === 'b2c').reduce((sum, p) => sum + p.totales.total, 0),
    mayorista: pedidosDelDia.filter(p => p.canalVenta === 'mayorista').reduce((sum, p) => sum + p.totales.total, 0),
    b2b: pedidosDelDia.filter(p => p.canalVenta === 'b2b').reduce((sum, p) => sum + p.totales.total, 0)
  };

  // Ventas por método de pago
  const metodosPago = {};
  pedidosDelDia.forEach(pedido => {
    const metodo = pedido.pago.metodoPago;
    metodosPago[metodo] = (metodosPago[metodo] || 0) + pedido.totales.total;
  });
  estadistica.ventasPorMetodoPago = metodosPago;

  // Productos más vendidos
  const productosVendidos = {};
  pedidosDelDia.forEach(pedido => {
    pedido.items.forEach(item => {
      const key = item.productoId.toString();
      if (!productosVendidos[key]) {
        productosVendidos[key] = {
          productoId: item.productoId,
          nombreProducto: item.nombreProducto,
          cantidadVendida: 0,
          totalVendido: 0
        };
      }
      productosVendidos[key].cantidadVendida += item.cantidad;
      productosVendidos[key].totalVendido += item.subtotal;
    });
  });

  estadistica.productosMasVendidos = Object.values(productosVendidos)
    .sort((a, b) => b.totalVendido - a.totalVendido)
    .slice(0, 10);

  // Estadísticas de envíos
  const pedidosEnviados = pedidosDelDia.filter(p => p.estado === 'enviado').length;
  const pedidosEntregados = pedidosDelDia.filter(p => p.estado === 'entregado').length;
  estadistica.pedidosEnviados = pedidosEnviados;
  estadistica.pedidosEntregados = pedidosEntregados;

  // Cancelaciones
  estadistica.pedidosCancelados = pedidosDelDia.filter(p => p.estado === 'cancelado').length;
  estadistica.tasaCancelacion = estadistica.totalPedidos > 0 ?
    (estadistica.pedidosCancelados / estadistica.totalPedidos) * 100 : 0;

  estadistica.ultimaActualizacion = new Date();
  await estadistica.save();

  return estadistica;
};

// Método para generar estadísticas mensuales
estadisticasMensualesSchema.statics.generarEstadisticasMensuales = async function(anio, mes) {
  const fechaInicio = new Date(anio, mes - 1, 1);
  const fechaFin = new Date(anio, mes, 0, 23, 59, 59, 999);

  // Buscar estadísticas diarias del mes
  const estadisticasDiarias = await mongoose.model('EstadisticasDiarias').find({
    fecha: { $gte: fechaInicio, $lte: fechaFin }
  });

  if (estadisticasDiarias.length === 0) {
    throw new Error('No hay estadísticas diarias para generar el resumen mensual');
  }

  // Calcular totales del mes
  const estadisticaMensual = {
    anio,
    mes,
    totalPedidos: estadisticasDiarias.reduce((sum, d) => sum + d.totalPedidos, 0),
    totalVentas: estadisticasDiarias.reduce((sum, d) => sum + d.totalVentas, 0),
    totalProductosVendidos: estadisticasDiarias.reduce((sum, d) => sum + d.totalProductosVendidos, 0),
    ticketPromedio: 0,
    productosPorPedido: 0
  };

  // Calcular métricas
  if (estadisticaMensual.totalPedidos > 0) {
    estadisticaMensual.ticketPromedio = estadisticaMensual.totalVentas / estadisticaMensual.totalPedidos;
    estadisticaMensual.productosPorPedido = estadisticaMensual.totalProductosVendidos / estadisticaMensual.totalPedidos;
  }

  // Buscar estadística del mes anterior para calcular crecimiento
  const mesAnterior = mes === 1 ? 12 : mes - 1;
  const anioAnterior = mes === 1 ? anio - 1 : anio;

  const estadisticaMesAnterior = await this.findOne({ anio: anioAnterior, mes: mesAnterior });
  if (estadisticaMesAnterior) {
    if (estadisticaMesAnterior.totalVentas > 0) {
      estadisticaMensual.crecimientoVentas =
        ((estadisticaMensual.totalVentas - estadisticaMesAnterior.totalVentas) /
         estadisticaMesAnterior.totalVentas) * 100;
    }
    if (estadisticaMesAnterior.totalPedidos > 0) {
      estadisticaMensual.crecimientoPedidos =
        ((estadisticaMensual.totalPedidos - estadisticaMesAnterior.totalPedidos) /
         estadisticaMesAnterior.totalPedidos) * 100;
    }
  }

  // Buscar o crear estadística mensual
  let mensual = await this.findOne({ anio, mes });
  if (!mensual) {
    mensual = new this(estadisticaMensual);
  } else {
    Object.assign(mensual, estadisticaMensual);
  }

  mensual.ultimaActualizacion = new Date();
  await mensual.save();

  return mensual;
};

export const EstadisticasDiarias = mongoose.model('EstadisticasDiarias', estadisticasDiariasSchema);
export const EstadisticasMensuales = mongoose.model('EstadisticasMensuales', estadisticasMensualesSchema);