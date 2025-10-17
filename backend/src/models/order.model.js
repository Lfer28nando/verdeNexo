// models/order.model.js
import mongoose from "mongoose";

// ============================
// ESQUEMA PARA ITEMS DEL PEDIDO (RF-CHE-01, RF-CHE-02, RF-CHE-03)
// ============================
const itemPedidoSchema = new mongoose.Schema({
  productoId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Producto",
    required: true
  },
  nombreProducto: { type: String, required: true },
  descripcion: { type: String },

  // Información al momento de la compra (para mantener consistencia)
  precioUnitario: {
    type: Number,
    required: true,
    min: 0
  },
  cantidad: {
    type: Number,
    required: true,
    min: 1,
    max: 100
  },

  // Variantes y características
  variante: {
    atributo: String,
    valor: String
  },

  // Subtotal del item
  subtotal: {
    type: Number,
    required: true,
    min: 0
  },

  // Para combos
  esCombo: { type: Boolean, default: false },
  comboItems: [{
    productoId: { type: mongoose.Schema.Types.ObjectId, ref: "Producto" },
    cantidad: { type: Number, default: 1 }
  }],

  // Notas especiales del cliente
  notas: { type: String }
}, { _id: true });

// ============================
// ESQUEMA PARA CUPONES APLICADOS AL PEDIDO
// ============================
const cuponPedidoSchema = new mongoose.Schema({
  codigo: { type: String, required: true },
  descripcion: { type: String },
  tipo: { type: String, enum: ['porcentaje', 'fijo'], required: true },
  valor: { type: Number, required: true },
  descuentoAplicado: { type: Number, required: true },
  fechaAplicado: { type: Date, default: Date.now }
}, { _id: false });

// ============================
// ESQUEMA PARA INFORMACIÓN DE FACTURACIÓN (RF-CHE-01)
// ============================
const facturacionSchema = new mongoose.Schema({
  tipoDocumento: {
    type: String,
    enum: ['cedula', 'nit', 'pasaporte', 'cedula_extranjeria'],
    required: true
  },
  numeroDocumento: {
    type: String,
    required: true,
    trim: true
  },
  nombreCompleto: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    trim: true,
    lowercase: true
  },
  telefono: {
    type: String,
    required: true,
    trim: true
  },

  // Dirección de facturación
  direccionFacturacion: {
    calle: { type: String, required: true },
    numero: { type: String }, // Opcional ya que puede estar incluido en calle
    complemento: { type: String },
    barrio: { type: String, required: true },
    ciudad: { type: String, required: true, default: "Bogotá" },
    departamento: { type: String, default: "Cundinamarca" },
    codigoPostal: { type: String }
  }
}, { _id: false });

// ============================
// ESQUEMA PARA INFORMACIÓN DE ENVÍO (RF-CHE-01, RF-CHE-06)
// ============================
const envioSchema = new mongoose.Schema({
  // Dirección de envío
  direccionEnvio: {
    calle: { type: String, required: true },
    numero: { type: String }, // Opcional ya que puede estar incluido en calle
    complemento: { type: String },
    barrio: { type: String, required: true },
    ciudad: { type: String, required: true, default: "Bogotá" },
    departamento: { type: String, default: "Cundinamarca" },
    codigoPostal: { type: String }
  },

  // Información de contacto para envío
  nombreDestinatario: { type: String, required: true },
  telefonoDestinatario: { type: String, required: true },
  emailDestinatario: { type: String },

  // Zona y costos de envío
  zonaEnvio: { type: String },
  costoEnvio: { type: Number, default: 0, min: 0 },

  // Información de despacho (RF-CHE-06)
  fechaEntregaEstimada: { type: Date },
  rangoHorarioEntrega: {
    inicio: { type: String }, // ej: "08:00"
    fin: { type: String }     // ej: "12:00"
  },
  instruccionesEspeciales: { type: String },

  // Estado del envío
  estadoEnvio: {
    type: String,
    enum: ['pendiente', 'en_preparacion', 'enviado', 'entregado', 'cancelado'],
    default: 'pendiente'
  },
  fechaEnvio: { type: Date },
  fechaEntrega: { type: Date },
  numeroGuia: { type: String },
  transportadora: { type: String }
}, { _id: false });

// ============================
// ESQUEMA PARA INFORMACIÓN DE PAGO (RF-CHE-01)
// ============================
const pagoSchema = new mongoose.Schema({
  metodoPago: {
    type: String,
    enum: ['mercadopago'],
    required: true
  },
  estadoPago: {
    type: String,
    enum: ['pendiente', 'procesando', 'aprobado', 'rechazado', 'reembolsado', 'cancelado'],
    default: 'pendiente'
  },
  montoTotal: { type: Number, required: true, min: 0 },
  montoPagado: { type: Number, default: 0, min: 0 },
  referenciaPago: { type: String },
  idTransaccion: { type: String },
  fechaPago: { type: Date }
}, { _id: false });

// ============================
// ESQUEMA PARA TOTALES DEL PEDIDO (RF-CHE-02, RF-CHE-03)
// ============================
const totalesPedidoSchema = new mongoose.Schema({
  subtotal: { type: Number, required: true, min: 0 },
  descuentoCupones: { type: Number, default: 0, min: 0 },
  costoEnvio: { type: Number, default: 0, min: 0 },
  impuestos: { type: Number, default: 0, min: 0 },
  total: { type: Number, required: true, min: 0 },

  // Desglose detallado
  detalleCalculos: {
    subtotalItems: { type: Number },
    descuentosDetalle: [{
      codigo: String,
      monto: Number
    }],
    envioDetalle: {
      tarifaBase: Number,
      recargos: Number,
      descuentosEnvio: Number
    },
    impuestosDetalle: {
      iva: Number,
      otros: Number
    }
  }
}, { _id: false });

// ============================
// ESQUEMA PARA PEDIDOS MAYORISTAS (RF-CHE-05)
// ============================
const mayoristaSchema = new mongoose.Schema({
  esPedidoMayorista: { type: Boolean, default: false },

  // Información de la empresa
  informacionEmpresa: {
    nombreEmpresa: { type: String },
    nit: { type: String },
    sector: { type: String },
    tamanoEmpresa: { type: String, enum: ['micro', 'pequena', 'mediana', 'grande'] }
  },

  // Condiciones especiales
  condicionesEspeciales: {
    descuentoMayorista: { type: Number, default: 0, min: 0, max: 100 }, // porcentaje
    plazoPagoEspecial: { type: Number, default: 0 }, // días adicionales
    terminosPago: { type: String, enum: ['contado', 'credito_30', 'credito_60', 'credito_90'] },
    requiereFacturaEspecial: { type: Boolean, default: false }
  },

  // Información de contacto comercial
  contactoComercial: {
    nombre: { type: String },
    cargo: { type: String },
    email: { type: String },
    telefono: { type: String }
  }
}, { _id: false });

// ============================
// ESQUEMA PARA HISTORIAL DE CAMBIOS
// ============================
const historialPedidoSchema = new mongoose.Schema({
  fecha: { type: Date, default: Date.now },
  accion: {
    type: String,
    enum: ['creado', 'confirmado', 'pagado', 'enviado', 'entregado', 'cancelado', 'reembolsado', 'modificado'],
    required: true
  },
  descripcion: { type: String, required: true },
  usuario: { type: String }, // ID del usuario o "sistema"
  metadata: { type: mongoose.Schema.Types.Mixed } // Información adicional
}, { _id: true });

// ============================
// ESQUEMA PRINCIPAL DEL PEDIDO
// ============================
const pedidoSchema = new mongoose.Schema({
  // Identificación del pedido
  numeroPedido: {
    type: String,
    unique: true,
    required: true
  },

  // Relaciones
  usuarioId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Usuario",
    required: false // null para pedidos de invitados
  },

  carritoId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Carrito",
    required: false // null si viene de localStorage
  },

  // Estado del pedido (RF-CHE-03, RF-CHE-04)
  estado: {
    type: String,
    enum: [
      'borrador',      // Pedido creado pero no confirmado
      'confirmado',    // Pedido confirmado por el cliente
      'pagado',        // Pago aprobado
      'en_preparacion', // Preparando para envío
      'enviado',       // Enviado al cliente
      'entregado',     // Entregado exitosamente
      'cancelado',     // Cancelado
      'reembolsado'    // Reembolsado
    ],
    default: 'borrador',
    index: true
  },

  // Origen del pedido
  origen: {
    type: String,
    enum: ['web', 'mobile', 'api', 'migracion'],
    default: 'web'
  },
  canalVenta: {
    type: String,
    enum: ['b2c', 'b2b', 'mayorista'],
    default: 'b2c'
  },

  // Items del pedido (RF-CHE-02, RF-CHE-03)
  items: [itemPedidoSchema],

  // Cupones aplicados
  cupones: [cuponPedidoSchema],

  // Información del cliente (RF-CHE-01)
  facturacion: facturacionSchema,
  envio: envioSchema,
  pago: pagoSchema,

  // Totales calculados (RF-CHE-02)
  totales: totalesPedidoSchema,

  // Pedidos mayoristas (RF-CHE-05)
  mayorista: mayoristaSchema,

  // Fechas importantes
  fechaCreacion: { type: Date, default: Date.now },
  fechaConfirmacion: { type: Date },
  fechaPago: { type: Date },
  fechaEnvio: { type: Date },
  fechaEntrega: { type: Date },
  fechaCancelacion: { type: Date },

  // Historial de cambios
  historial: [historialPedidoSchema],

  // Notificaciones (RF-CHE-04)
  notificaciones: {
    emailEnviado: { type: Boolean, default: false },
    smsEnviado: { type: Boolean, default: false },
    whatsappEnviado: { type: Boolean, default: false },
    fechaUltimaNotificacion: { type: Date }
  },

  // Metadatos
  notasInternas: { type: String },
  prioridad: {
    type: String,
    enum: ['baja', 'normal', 'alta', 'urgente'],
    default: 'normal'
  },

  // Información del dispositivo/origen
  metadata: {
    userAgent: String,
    ip: String,
    sessionId: String,
    urlOrigen: String
  }
}, {
  timestamps: true
});

// ============================
// ÍNDICES PARA OPTIMIZACIÓN
// ============================
pedidoSchema.index({ usuarioId: 1, estado: 1 });
pedidoSchema.index({ estado: 1, fechaCreacion: -1 });
pedidoSchema.index({ 'facturacion.email': 1 });
pedidoSchema.index({ fechaCreacion: -1 });
pedidoSchema.index({ 'mayorista.esPedidoMayorista': 1 });

// ============================
// MIDDLEWARE PRE-SAVE
// ============================
pedidoSchema.pre('save', function(next) {
  // Generar número de pedido si no existe
  if (!this.numeroPedido) {
    this.numeroPedido = this.generarNumeroPedido();
  }

  // Actualizar fechas según estado
  const now = new Date();
  if (this.isModified('estado')) {
    switch (this.estado) {
      case 'confirmado':
        if (!this.fechaConfirmacion) this.fechaConfirmacion = now;
        break;
      case 'pagado':
        if (!this.fechaPago) this.fechaPago = now;
        break;
      case 'enviado':
        if (!this.fechaEnvio) this.fechaEnvio = now;
        break;
      case 'entregado':
        if (!this.fechaEntrega) this.fechaEntrega = now;
        break;
      case 'cancelado':
        if (!this.fechaCancelacion) this.fechaCancelacion = now;
        break;
    }
  }

  next();
});

// ============================
// MÉTODOS DEL ESQUEMA
// ============================

// Generar número de pedido único
pedidoSchema.methods.generarNumeroPedido = function() {
  const fecha = new Date();
  const year = fecha.getFullYear();
  const month = String(fecha.getMonth() + 1).padStart(2, '0');
  const day = String(fecha.getDate()).padStart(2, '0');
  const timestamp = Date.now().toString().slice(-4);
  const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');

  return `PED-${year}${month}${day}-${timestamp}${random}`;
};

// Calcular totales del pedido
pedidoSchema.methods.calcularTotales = function() {
  let subtotal = 0;

  // Calcular subtotal de items
  this.items.forEach(item => {
    subtotal += item.precioUnitario * item.cantidad;
  });

  // Aplicar descuentos de cupones
  let descuentoTotal = 0;
  this.cupones.forEach(cupon => {
    descuentoTotal += cupon.descuentoAplicado;
  });

  // Calcular total
  const costoEnvio = this.envio?.costoEnvio || 0;
  const impuestos = this.calcularImpuestos(subtotal - descuentoTotal);
  const total = subtotal - descuentoTotal + costoEnvio + impuestos;

  // Actualizar objeto totales
  this.totales = {
    subtotal,
    descuentoCupones: descuentoTotal,
    costoEnvio,
    impuestos,
    total: Math.max(0, total),
    detalleCalculos: {
      subtotalItems: subtotal,
      descuentosDetalle: this.cupones.map(c => ({
        codigo: c.codigo,
        monto: c.descuentoAplicado
      })),
      envioDetalle: {
        tarifaBase: costoEnvio,
        recargos: 0,
        descuentosEnvio: 0
      },
      impuestosDetalle: {
        iva: impuestos,
        otros: 0
      }
    }
  };

  return this.totales;
};

// Calcular impuestos (simplificado - IVA 19% en Colombia)
pedidoSchema.methods.calcularImpuestos = function(baseImponible) {
  // IVA 19% para productos gravados
  // Esto debería ser más complejo según las reglas fiscales
  return Math.round(baseImponible * 0.19);
};

// Agregar entrada al historial
pedidoSchema.methods.agregarAlHistorial = function(accion, descripcion, usuario = 'sistema', metadata = {}) {
  this.historial.push({
    accion,
    descripcion,
    usuario,
    metadata,
    fecha: new Date()
  });
};

// Verificar si el pedido puede ser modificado
pedidoSchema.methods.puedeSerModificado = function() {
  return ['borrador', 'confirmado'].includes(this.estado);
};

// Verificar si el pedido puede ser cancelado
pedidoSchema.methods.puedeSerCancelado = function() {
  return ['borrador', 'confirmado', 'pagado', 'en_preparacion'].includes(this.estado);
};

// ============================
// MÉTODOS ESTÁTICOS
// ============================

// Buscar pedidos por usuario
pedidoSchema.statics.buscarPorUsuario = function(usuarioId, filtros = {}) {
  const query = { usuarioId };

  if (filtros.estado) query.estado = filtros.estado;
  if (filtros.fechaDesde) query.fechaCreacion = { $gte: filtros.fechaDesde };
  if (filtros.fechaHasta) query.fechaCreacion = { ...query.fechaCreacion, $lte: filtros.fechaHasta };

  return this.find(query).sort({ fechaCreacion: -1 });
};

// Generar reporte de ventas
pedidoSchema.statics.generarReporteVentas = function(fechaInicio, fechaFin) {
  return this.aggregate([
    {
      $match: {
        fechaCreacion: { $gte: fechaInicio, $lte: fechaFin },
        estado: { $in: ['pagado', 'enviado', 'entregado'] }
      }
    },
    {
      $group: {
        _id: null,
        totalPedidos: { $sum: 1 },
        totalVentas: { $sum: '$totales.total' },
        promedioPedido: { $avg: '$totales.total' },
        totalItems: { $sum: { $size: '$items' } }
      }
    }
  ]);
};

export const Pedido = mongoose.model("Pedido", pedidoSchema);