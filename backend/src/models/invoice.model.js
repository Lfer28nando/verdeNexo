// models/invoice.model.js
import mongoose from 'mongoose';

// Esquema para detalles de factura
const detalleFacturaSchema = new mongoose.Schema({
  productoId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Producto',
    required: true
  },
  nombreProducto: { type: String, required: true },
  descripcion: { type: String },
  cantidad: { type: Number, required: true },
  precioUnitario: { type: Number, required: true },
  descuento: { type: Number, default: 0 },
  iva: { type: Number, default: 0 }, // IVA aplicado
  subtotal: { type: Number, required: true },
  variante: {
    atributo: { type: String },
    valor: { type: String }
  }
}, { _id: false });

// Esquema principal de Factura
const facturaSchema = new mongoose.Schema({
  // Referencias
  pedidoId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Pedido',
    required: true,
    unique: true // Una factura por pedido
  },
  usuarioId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },

  // Información de la factura
  numeroFactura: {
    type: String,
    required: true,
    unique: true
  },
  tipoFactura: {
    type: String,
    enum: ['venta', 'credito_fiscal', 'nota_credito', 'nota_debito'],
    default: 'venta'
  },

  // Fechas
  fechaEmision: { type: Date, default: Date.now },
  fechaVencimiento: { type: Date }, // Para facturas a crédito

  // Información del emisor (empresa)
  emisor: {
    nombreEmpresa: { type: String, required: true },
    nit: { type: String, required: true },
    direccion: { type: String, required: true },
    telefono: { type: String },
    email: { type: String },
    regimenTributario: { type: String, default: 'comun' }
  },

  // Información del receptor (cliente)
  receptor: {
    tipoDocumento: {
      type: String,
      enum: ['CC', 'CE', 'NIT', 'TI', 'PAS'],
      required: true
    },
    numeroDocumento: { type: String, required: true },
    nombreCompleto: { type: String, required: true },
    email: { type: String },
    telefono: { type: String },
    direccion: { type: String },
    tipoPersona: {
      type: String,
      enum: ['natural', 'juridica'],
      default: 'natural'
    }
  },

  // Detalles de la factura
  detalles: [detalleFacturaSchema],

  // Totales
  totales: {
    subtotal: { type: Number, required: true },
    descuentoTotal: { type: Number, default: 0 },
    ivaTotal: { type: Number, default: 0 },
    total: { type: Number, required: true }
  },

  // Información de pago
  metodoPago: {
    type: String,
    enum: ['efectivo', 'tarjeta_credito', 'tarjeta_debito', 'transferencia', 'cheque', 'credito'],
    required: true
  },
  estadoPago: {
    type: String,
    enum: ['pendiente', 'pagado', 'parcial', 'vencido'],
    default: 'pendiente'
  },

  // Información adicional
  notas: { type: String },
  terminosPago: { type: String }, // Ej: "Pago a 30 días"
  vendedorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },

  // Estado de la factura
  estado: {
    type: String,
    enum: ['borrador', 'emitida', 'enviada', 'pagada', 'vencida', 'anulada'],
    default: 'borrador'
  },

  // Archivos adjuntos (URLs o paths)
  archivos: {
    pdf: { type: String }, // URL del PDF generado
    xml: { type: String }  // URL del XML para facturación electrónica
  },

  // Metadata para DIAN (Colombia)
  dian: {
    cufe: { type: String }, // Código Único de Facturación Electrónica
    qrCode: { type: String }, // URL del código QR
    fechaValidacion: { type: Date },
    estadoValidacion: {
      type: String,
      enum: ['pendiente', 'validada', 'rechazada'],
      default: 'pendiente'
    }
  },

  // Información de envío
  envio: {
    transportadora: { type: String },
    numeroGuia: { type: String },
    fechaEnvio: { type: Date }
  }
}, {
  timestamps: true
});

// Índices para búsquedas eficientes
facturaSchema.index({ usuarioId: 1 });
facturaSchema.index({ 'receptor.numeroDocumento': 1 });
facturaSchema.index({ estado: 1 });
facturaSchema.index({ fechaEmision: -1 });
facturaSchema.index({ 'dian.estadoValidacion': 1 });

// Método para generar número de factura
facturaSchema.statics.generarNumeroFactura = async function() {
  const fecha = new Date();
  const anio = fecha.getFullYear();
  const mes = String(fecha.getMonth() + 1).padStart(2, '0');

  // Buscar el último número de factura del mes
  const ultimoFactura = await this.findOne({
    numeroFactura: new RegExp(`^${anio}${mes}`)
  }).sort({ numeroFactura: -1 });

  let numeroSecuencial = 1;
  if (ultimoFactura) {
    const ultimoNumero = parseInt(ultimoFactura.numeroFactura.slice(-4));
    numeroSecuencial = ultimoNumero + 1;
  }

  return `${anio}${mes}${String(numeroSecuencial).padStart(4, '0')}`;
};

// Método para calcular totales
facturaSchema.methods.calcularTotales = function() {
  let subtotal = 0;
  let descuentoTotal = 0;
  let ivaTotal = 0;

  this.detalles.forEach(detalle => {
    subtotal += detalle.subtotal;
    descuentoTotal += detalle.descuento;
    ivaTotal += detalle.iva;
  });

  this.totales.subtotal = subtotal;
  this.totales.descuentoTotal = descuentoTotal;
  this.totales.ivaTotal = ivaTotal;
  this.totales.total = subtotal - descuentoTotal + ivaTotal;

  return this.totales;
};

// Método para marcar como emitida
facturaSchema.methods.marcarComoEmitida = function() {
  this.estado = 'emitida';
  this.fechaEmision = new Date();
  return this.save();
};

// Método para anular factura
facturaSchema.methods.anularFactura = function(motivo) {
  this.estado = 'anulada';
  this.notas = (this.notas || '') + `\nAnulada: ${motivo}`;
  return this.save();
};

export const Factura = mongoose.model('Factura', facturaSchema);