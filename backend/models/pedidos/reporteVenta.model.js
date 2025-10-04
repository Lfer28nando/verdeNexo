import mongoose from 'mongoose';

const reporteVentaSchema = new mongoose.Schema({
  periodo: {
    fechaInicio: {
      type: Date,
      required: true,
      index: true
    },
    fechaFin: {
      type: Date,
      required: true,
      index: true
    },
    tipo: {
      type: String,
      enum: ['diario', 'semanal', 'mensual', 'trimestral', 'anual', 'personalizado'],
      required: true
    }
  },
  resumenVentas: {
    cantidadPedidos: {
      type: Number,
      required: true,
      min: 0
    },
    cantidadFacturas: {
      type: Number,
      required: true,
      min: 0
    },
    ventasBrutas: {
      type: Number,
      required: true,
      min: 0
    },
    descuentosAplicados: {
      type: Number,
      default: 0,
      min: 0
    },
    ventasNetas: {
      type: Number,
      required: true,
      min: 0
    },
    ivaRecaudado: {
      type: Number,
      default: 0,
      min: 0
    },
    costosEnvio: {
      type: Number,
      default: 0,
      min: 0
    },
    comisionesTotales: {
      type: Number,
      default: 0,
      min: 0
    }
  },
  detallesPorCategoria: [{
    categoriaId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Categoria'
    },
    nombreCategoria: {
      type: String,
      required: true
    },
    cantidadVendida: {
      type: Number,
      required: true,
      min: 0
    },
    ventasCategoria: {
      type: Number,
      required: true,
      min: 0
    },
    porcentajeVentas: {
      type: Number,
      min: 0,
      max: 100
    }
  }],
  detallesPorVendedor: [{
    vendedorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Usuario'
    },
    nombreVendedor: {
      type: String,
      required: true
    },
    cantidadPedidos: {
      type: Number,
      required: true,
      min: 0
    },
    ventasVendedor: {
      type: Number,
      required: true,
      min: 0
    },
    comisionesGeneradas: {
      type: Number,
      default: 0,
      min: 0
    },
    porcentajeVentas: {
      type: Number,
      min: 0,
      max: 100
    }
  }],
  detallesPorProducto: [{
    productoId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Producto'
    },
    nombreProducto: {
      type: String,
      required: true
    },
    cantidadVendida: {
      type: Number,
      required: true,
      min: 0
    },
    ventasProducto: {
      type: Number,
      required: true,
      min: 0
    },
    stockActual: {
      type: Number,
      min: 0
    },
    rotacion: {
      type: Number,
      min: 0
    }
  }],
  metricas: {
    ticketPromedio: {
      type: Number,
      min: 0
    },
    clientesUnicos: {
      type: Number,
      min: 0
    },
    clientesNuevos: {
      type: Number,
      min: 0
    },
    clientesRecurrentes: {
      type: Number,
      min: 0
    },
    tasaConversion: {
      type: Number,
      min: 0,
      max: 100
    },
    margenPromedio: {
      type: Number,
      min: 0,
      max: 100
    }
  },
  comparativoPeriodoAnterior: {
    ventasAnterior: {
      type: Number,
      min: 0
    },
    crecimientoVentas: {
      type: Number
    },
    crecimientoPorcentaje: {
      type: Number
    },
    pedidosAnterior: {
      type: Number,
      min: 0
    },
    crecimientoPedidos: {
      type: Number
    }
  },
  estado: {
    type: String,
    enum: ['generando', 'completo', 'error'],
    default: 'generando',
    required: true
  },
  archivoReporte: {
    type: String, // URL del archivo PDF/Excel generado
    trim: true
  },
  usuarioGenerador: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Usuario',
    required: true
  },
  fechaGeneracion: {
    type: Date,
    default: Date.now,
    required: true
  },
  parametrosFiltro: {
    categorias: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Categoria'
    }],
    vendedores: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Usuario'
    }],
    productos: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Producto'
    }],
    estadosPedido: [{
      type: String,
      enum: ['pendiente', 'confirmado', 'en_proceso', 'empacado', 'enviado', 'entregado', 'cancelado']
    }]
  },
  configuracion: {
    incluirGraficos: {
      type: Boolean,
      default: true
    },
    formatoSalida: {
      type: String,
      enum: ['pdf', 'excel', 'json'],
      default: 'pdf'
    },
    enviarPorEmail: {
      type: Boolean,
      default: false
    },
    destinatarios: [{
      type: String,
      trim: true,
      lowercase: true
    }]
  }
}, {
  timestamps: true,
  collection: 'reportes_venta'
});

// Índices compuestos para consultas frecuentes
reporteVentaSchema.index({ 'periodo.fechaInicio': 1, 'periodo.fechaFin': 1 });
reporteVentaSchema.index({ 'periodo.tipo': 1, estado: 1, fechaGeneracion: -1 });
reporteVentaSchema.index({ usuarioGenerador: 1, fechaGeneracion: -1 });

// Método estático para generar reporte automático
reporteVentaSchema.statics.generarReporte = async function(parametros) {
  const {
    fechaInicio,
    fechaFin,
    tipo = 'personalizado',
    usuarioGenerador,
    filtros = {},
    configuracion = {}
  } = parametros;

  // Crear documento de reporte
  const reporte = new this({
    periodo: { fechaInicio, fechaFin, tipo },
    usuarioGenerador,
    parametrosFiltro: filtros,
    configuracion: { 
      incluirGraficos: true, 
      formatoSalida: 'pdf', 
      enviarPorEmail: false,
      ...configuracion 
    },
    estado: 'generando'
  });

  try {
    // Generar datos del reporte
    await reporte.generarDatos();
    reporte.estado = 'completo';
    await reporte.save();
    
    return reporte;
  } catch (error) {
    reporte.estado = 'error';
    await reporte.save();
    throw error;
  }
};

// Método para generar los datos del reporte
reporteVentaSchema.methods.generarDatos = async function() {
  const FacturaVenta = mongoose.model('FacturaVenta');
  const ComisionVenta = mongoose.model('ComisionVenta');
  const Pedido = mongoose.model('Pedido');

  // Consulta base para facturas en el período
  const filtroFacturas = {
    fechaGeneracion: { 
      $gte: this.periodo.fechaInicio, 
      $lte: this.periodo.fechaFin 
    },
    estado: { $ne: 'anulada' },
    activa: true
  };

  // Obtener facturas del período
  const facturas = await FacturaVenta.find(filtroFacturas).lean();
  
  // Calcular resumen de ventas
  this.resumenVentas = {
    cantidadFacturas: facturas.length,
    cantidadPedidos: facturas.length, // Asumiendo 1 factura por pedido
    ventasBrutas: facturas.reduce((sum, f) => sum + f.totales.subtotal + f.totales.descuentoTotal, 0),
    descuentosAplicados: facturas.reduce((sum, f) => sum + f.totales.descuentoTotal, 0),
    ventasNetas: facturas.reduce((sum, f) => sum + f.totales.total, 0),
    ivaRecaudado: facturas.reduce((sum, f) => sum + f.totales.ivaTotal, 0),
    costosEnvio: facturas.reduce((sum, f) => sum + f.totales.costoEnvio, 0),
    comisionesTotales: 0 // Se calculará con las comisiones
  };

  // Obtener comisiones del período
  const comisiones = await ComisionVenta.find({
    fechaCalculo: {
      $gte: this.periodo.fechaInicio,
      $lte: this.periodo.fechaFin
    },
    activo: true
  }).lean();

  this.resumenVentas.comisionesTotales = comisiones.reduce(
    (sum, c) => sum + c.calculoComision.montoComision, 0
  );

  // Calcular métricas
  this.metricas = {
    ticketPromedio: this.resumenVentas.cantidadFacturas > 0 ? 
      this.resumenVentas.ventasNetas / this.resumenVentas.cantidadFacturas : 0,
    clientesUnicos: new Set(facturas.map(f => f.clienteId?.toString()).filter(Boolean)).size,
    clientesNuevos: 0, // Se calcularía comparando con períodos anteriores
    clientesRecurrentes: 0, // Se calcularía comparando con períodos anteriores
    tasaConversion: 0, // Requiere datos de visitas/carritos abandonados
    margenPromedio: 0 // Requiere datos de costos de productos
  };

  // Redondear valores numéricos
  Object.keys(this.resumenVentas).forEach(key => {
    if (typeof this.resumenVentas[key] === 'number') {
      this.resumenVentas[key] = Math.round(this.resumenVentas[key] * 100) / 100;
    }
  });

  Object.keys(this.metricas).forEach(key => {
    if (typeof this.metricas[key] === 'number') {
      this.metricas[key] = Math.round(this.metricas[key] * 100) / 100;
    }
  });
};

// Método para obtener reportes recientes
reporteVentaSchema.statics.obtenerReportesRecientes = async function(limite = 10) {
  return await this.find({ estado: 'completo' })
    .populate('usuarioGenerador', 'nombre email')
    .sort({ fechaGeneracion: -1 })
    .limit(limite)
    .lean();
};

export default mongoose.model('ReporteVenta', reporteVentaSchema);