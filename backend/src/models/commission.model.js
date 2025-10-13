// models/commission.model.js
import mongoose from 'mongoose';

// Esquema para comisiones de venta
const comisionSchema = new mongoose.Schema({
  // Referencias
  pedidoId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Pedido',
    required: true
  },
  vendedorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  productoId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Producto',
    required: true
  },

  // Información del producto vendido
  nombreProducto: { type: String, required: true },
  cantidadVendida: { type: Number, required: true },
  precioUnitario: { type: Number, required: true },
  subtotal: { type: Number, required: true },

  // Cálculo de comisión
  porcentajeComision: { type: Number, required: true }, // Porcentaje (ej: 5.5 para 5.5%)
  montoComision: { type: Number, required: true }, // Monto calculado

  // Estado de la comisión
  estado: {
    type: String,
    enum: ['pendiente', 'pagada', 'cancelada'],
    default: 'pendiente'
  },

  // Fechas
  fechaVenta: { type: Date, default: Date.now },
  fechaPagoComision: { type: Date },

  // Información adicional
  tipoVenta: {
    type: String,
    enum: ['b2c', 'mayorista', 'b2b'],
    default: 'b2c'
  },
  canalVenta: {
    type: String,
    enum: ['web', 'app', 'telefono', 'presencial'],
    default: 'web'
  },

  // Notas y observaciones
  notas: { type: String },

  // Metadata
  metadata: {
    userAgent: { type: String },
    ip: { type: String },
    sessionId: { type: String }
  }
}, {
  timestamps: true
});

// Índices para búsquedas eficientes
comisionSchema.index({ vendedorId: 1, estado: 1 });
comisionSchema.index({ pedidoId: 1 });
comisionSchema.index({ fechaVenta: -1 });
comisionSchema.index({ estado: 1, fechaPagoComision: 1 });

// Método estático para calcular comisiones pendientes por vendedor
comisionSchema.statics.calcularComisionesPendientes = async function(vendedorId) {
  const resultado = await this.aggregate([
    {
      $match: {
        vendedorId: mongoose.Types.ObjectId(vendedorId),
        estado: 'pendiente'
      }
    },
    {
      $group: {
        _id: null,
        totalComisiones: { $sum: '$montoComision' },
        cantidadVentas: { $sum: 1 }
      }
    }
  ]);

  return resultado.length > 0 ? resultado[0] : { totalComisiones: 0, cantidadVentas: 0 };
};

// Método estático para obtener resumen de comisiones por período
comisionSchema.statics.resumenComisionesPorPeriodo = async function(vendedorId, fechaInicio, fechaFin) {
  return await this.aggregate([
    {
      $match: {
        vendedorId: mongoose.Types.ObjectId(vendedorId),
        fechaVenta: {
          $gte: fechaInicio,
          $lte: fechaFin
        }
      }
    },
    {
      $group: {
        _id: {
          estado: '$estado',
          mes: { $month: '$fechaVenta' },
          anio: { $year: '$fechaVenta' }
        },
        totalComisiones: { $sum: '$montoComision' },
        cantidadVentas: { $sum: 1 },
        totalVendido: { $sum: '$subtotal' }
      }
    },
    {
      $sort: { '_id.anio': -1, '_id.mes': -1 }
    }
  ]);
};

// Método para marcar comisión como pagada
comisionSchema.methods.marcarComoPagada = function(fechaPago = new Date()) {
  this.estado = 'pagada';
  this.fechaPagoComision = fechaPago;
  return this.save();
};

// Método para cancelar comisión
comisionSchema.methods.cancelarComision = function(motivo) {
  this.estado = 'cancelada';
  this.notas = (this.notas || '') + `\nCancelada: ${motivo}`;
  return this.save();
};

export const Comision = mongoose.model('Comision', comisionSchema);