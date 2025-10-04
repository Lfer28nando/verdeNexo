import mongoose from 'mongoose';

const comisionVentaSchema = new mongoose.Schema({
  pedidoId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Pedido',
    required: true,
    unique: true,
    index: true
  },
  vendedorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Usuario',
    required: true,
    index: true
  },
  tipoComision: {
    type: String,
    enum: ['porcentaje', 'fijo', 'mixto'],
    required: true,
    default: 'porcentaje'
  },
  configuracionComision: {
    porcentaje: {
      type: Number,
      min: 0,
      max: 100,
      default: 0
    },
    montoFijo: {
      type: Number,
      min: 0,
      default: 0
    },
    // Para comisión mixta: monto fijo + porcentaje
    aplicarAmbos: {
      type: Boolean,
      default: false
    }
  },
  calculoComision: {
    montoVentaBruto: {
      type: Number,
      required: true,
      min: 0
    },
    descuentosAplicados: {
      type: Number,
      default: 0,
      min: 0
    },
    montoVentaNeto: {
      type: Number,
      required: true,
      min: 0
    },
    baseCalculoComision: {
      type: Number,
      required: true,
      min: 0
    },
    montoComision: {
      type: Number,
      required: true,
      min: 0
    }
  },
  estado: {
    type: String,
    enum: ['pendiente', 'calculada', 'aprobada', 'pagada', 'cancelada'],
    default: 'calculada',
    required: true
  },
  fechaCalculo: {
    type: Date,
    default: Date.now,
    required: true
  },
  fechaAprobacion: {
    type: Date
  },
  fechaPago: {
    type: Date
  },
  usuarioAprobador: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Usuario'
  },
  detallesPago: {
    metodoPago: {
      type: String,
      enum: ['transferencia', 'cheque', 'efectivo', 'nomina'],
      default: 'transferencia'
    },
    numeroTransaccion: {
      type: String,
      trim: true
    },
    cuentaDestino: {
      type: String,
      trim: true
    },
    comprobantePago: {
      type: String, // URL del archivo
      trim: true
    }
  },
  observaciones: {
    type: String,
    trim: true,
    maxlength: 1000
  },
  activo: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true,
  collection: 'comisiones_venta'
});

// Índices compuestos para consultas frecuentes
comisionVentaSchema.index({ vendedorId: 1, estado: 1, fechaCalculo: -1 });
comisionVentaSchema.index({ estado: 1, fechaCalculo: -1 });
comisionVentaSchema.index({ fechaPago: -1 }, { sparse: true });

// Calcular automáticamente los montos antes de guardar
comisionVentaSchema.pre('save', function(next) {
  if (this.isModified('configuracionComision') || this.isModified('calculoComision.montoVentaNeto')) {
    this.calcularComision();
  }
  next();
});

// Método para calcular la comisión
comisionVentaSchema.methods.calcularComision = function() {
  const { montoVentaNeto } = this.calculoComision;
  const { tipoComision, configuracionComision } = this;
  
  let montoComision = 0;
  
  switch (tipoComision) {
    case 'porcentaje':
      montoComision = (montoVentaNeto * configuracionComision.porcentaje) / 100;
      break;
    case 'fijo':
      montoComision = configuracionComision.montoFijo;
      break;
    case 'mixto':
      if (configuracionComision.aplicarAmbos) {
        montoComision = configuracionComision.montoFijo + 
                       ((montoVentaNeto * configuracionComision.porcentaje) / 100);
      } else {
        // Aplicar el mayor de los dos
        const comisionPorcentaje = (montoVentaNeto * configuracionComision.porcentaje) / 100;
        montoComision = Math.max(configuracionComision.montoFijo, comisionPorcentaje);
      }
      break;
  }
  
  this.calculoComision.baseCalculoComision = montoVentaNeto;
  this.calculoComision.montoComision = Math.round(montoComision * 100) / 100; // Redondear a 2 decimales
};

// Método estático para obtener comisiones por vendedor
comisionVentaSchema.statics.obtenerComisionesPorVendedor = async function(vendedorId, filtros = {}) {
  const pipeline = [
    { $match: { vendedorId: mongoose.Types.ObjectId(vendedorId), activo: true, ...filtros } },
    {
      $group: {
        _id: '$estado',
        totalComisiones: { $sum: '$calculoComision.montoComision' },
        cantidadPedidos: { $sum: 1 },
        promedioComision: { $avg: '$calculoComision.montoComision' }
      }
    }
  ];
  
  return await this.aggregate(pipeline);
};

// Método estático para obtener resumen de comisiones por período
comisionVentaSchema.statics.obtenerResumenPorPeriodo = async function(fechaInicio, fechaFin) {
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
          nombreVendedor: '$vendedor.nombre',
          estado: '$estado'
        },
        totalComisiones: { $sum: '$calculoComision.montoComision' },
        cantidadPedidos: { $sum: 1 }
      }
    },
    {
      $sort: { 'totalComisiones': -1 }
    }
  ];
  
  return await this.aggregate(pipeline);
};

export default mongoose.model('ComisionVenta', comisionVentaSchema);