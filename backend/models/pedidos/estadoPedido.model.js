import mongoose from 'mongoose';

const estadoPedidoSchema = new mongoose.Schema({
  pedidoId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Pedido',
    required: true,
    index: true
  },
  estadoAnterior: {
    type: String,
    enum: ['pendiente', 'confirmado', 'en_proceso', 'empacado', 'enviado', 'en_transito', 'entregado', 'cancelado', 'devuelto'],
    default: null
  },
  estadoNuevo: {
    type: String,
    enum: ['pendiente', 'confirmado', 'en_proceso', 'empacado', 'enviado', 'en_transito', 'entregado', 'cancelado', 'devuelto'],
    required: true
  },
  fechaCambio: {
    type: Date,
    default: Date.now,
    required: true
  },
  motivo: {
    type: String,
    trim: true,
    maxlength: 500
  },
  comentarios: {
    type: String,
    trim: true,
    maxlength: 1000
  },
  usuarioResponsable: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Usuario',
    required: false // Puede ser cambio automático del sistema
  },
  notificacionEnviada: {
    type: Boolean,
    default: false
  },
  metadatos: {
    ubicacionActual: {
      type: String,
      trim: true
    },
    transportadora: {
      type: String,
      trim: true
    },
    numeroGuia: {
      type: String,
      trim: true
    },
    fechaEstimadaEntrega: {
      type: Date
    }
  }
}, {
  timestamps: true,
  collection: 'estados_pedidos'
});

// Índices compuestos para consultas frecuentes
estadoPedidoSchema.index({ pedidoId: 1, fechaCambio: -1 });
estadoPedidoSchema.index({ estadoNuevo: 1, fechaCambio: -1 });

// Método para obtener el historial completo de un pedido
estadoPedidoSchema.statics.obtenerHistorialPedido = async function(pedidoId) {
  return await this.find({ pedidoId })
    .populate('usuarioResponsable', 'nombre email')
    .sort({ fechaCambio: 1 })
    .lean();
};

// Método para obtener el estado actual de un pedido
estadoPedidoSchema.statics.obtenerEstadoActual = async function(pedidoId) {
  return await this.findOne({ pedidoId })
    .populate('usuarioResponsable', 'nombre email')
    .sort({ fechaCambio: -1 })
    .lean();
};

// Validación de transiciones de estado válidas
estadoPedidoSchema.pre('save', function(next) {
  const transicionesValidas = {
    'pendiente': ['confirmado', 'cancelado'],
    'confirmado': ['en_proceso', 'cancelado'],
    'en_proceso': ['empacado', 'cancelado'],
    'empacado': ['enviado', 'cancelado'],
    'enviado': ['en_transito', 'entregado', 'devuelto'],
    'en_transito': ['entregado', 'devuelto'],
    'entregado': ['devuelto'],
    'cancelado': [],
    'devuelto': []
  };

  if (this.estadoAnterior && transicionesValidas[this.estadoAnterior]) {
    if (!transicionesValidas[this.estadoAnterior].includes(this.estadoNuevo)) {
      return next(new Error(`Transición de estado inválida: ${this.estadoAnterior} -> ${this.estadoNuevo}`));
    }
  }

  next();
});

export default mongoose.model('EstadoPedido', estadoPedidoSchema);