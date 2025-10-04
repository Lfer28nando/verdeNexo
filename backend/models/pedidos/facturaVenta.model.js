import mongoose from 'mongoose';

const facturaVentaSchema = new mongoose.Schema({
  numeroFactura: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  pedidoId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Pedido',
    required: true,
    index: true
  },
  clienteId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Usuario',
    required: false // Puede ser cliente invitado
  },
  datosCliente: {
    tipoDocumento: {
      type: String,
      enum: ['CC', 'CE', 'NIT', 'PP'],
      required: true
    },
    numeroDocumento: {
      type: String,
      required: true,
      trim: true
    },
    nombre: {
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
      trim: true
    },
    direccion: {
      calle: { type: String, required: true, trim: true },
      ciudad: { type: String, required: true, trim: true },
      departamento: { type: String, required: true, trim: true },
      codigoPostal: { type: String, trim: true }
    }
  },
  datosEmpresa: {
    nombre: {
      type: String,
      required: true,
      default: 'VerdeNexo'
    },
    nit: {
      type: String,
      required: true,
      default: '900123456-1'
    },
    direccion: {
      type: String,
      required: true,
      default: 'Carrera 50 #45-30, Medellín, Antioquia'
    },
    telefono: {
      type: String,
      required: true,
      default: '(604) 555-0123'
    },
    email: {
      type: String,
      required: true,
      default: 'facturacion@verdenexo.com'
    }
  },
  detalleProductos: [{
    productoId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Producto',
      required: true
    },
    nombre: {
      type: String,
      required: true,
      trim: true
    },
    descripcion: {
      type: String,
      trim: true
    },
    cantidad: {
      type: Number,
      required: true,
      min: 1
    },
    precioUnitario: {
      type: Number,
      required: true,
      min: 0
    },
    descuento: {
      type: Number,
      default: 0,
      min: 0
    },
    subtotal: {
      type: Number,
      required: true,
      min: 0
    },
    iva: {
      porcentaje: {
        type: Number,
        default: 19,
        min: 0
      },
      valor: {
        type: Number,
        default: 0,
        min: 0
      }
    }
  }],
  totales: {
    subtotal: {
      type: Number,
      required: true,
      min: 0
    },
    descuentoTotal: {
      type: Number,
      default: 0,
      min: 0
    },
    ivaTotal: {
      type: Number,
      default: 0,
      min: 0
    },
    costoEnvio: {
      type: Number,
      default: 0,
      min: 0
    },
    total: {
      type: Number,
      required: true,
      min: 0
    }
  },
  estado: {
    type: String,
    enum: ['borrador', 'generada', 'enviada', 'pagada', 'anulada'],
    default: 'generada',
    required: true
  },
  fechaGeneracion: {
    type: Date,
    default: Date.now,
    required: true
  },
  fechaVencimiento: {
    type: Date,
    required: true
  },
  fechaEnvio: {
    type: Date
  },
  fechaPago: {
    type: Date
  },
  metodoPago: {
    tipo: {
      type: String,
      enum: ['efectivo', 'tarjeta_credito', 'tarjeta_debito', 'transferencia', 'pse', 'contraentrega'],
      required: true
    },
    detalle: {
      type: String,
      trim: true
    },
    numeroTransaccion: {
      type: String,
      trim: true
    }
  },
  archivos: {
    facturaPDF: {
      type: String, // URL del archivo PDF
      trim: true
    },
    comprobanteEnvio: {
      type: String, // URL del comprobante de envío por email
      trim: true
    }
  },
  observaciones: {
    type: String,
    trim: true,
    maxlength: 1000
  },
  usuarioGenerador: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Usuario',
    required: true
  },
  activa: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true,
  collection: 'facturas_venta'
});

// Índices compuestos para consultas frecuentes
facturaVentaSchema.index({ numeroFactura: 1 }, { unique: true });
facturaVentaSchema.index({ 'datosCliente.numeroDocumento': 1, fechaGeneracion: -1 });
facturaVentaSchema.index({ estado: 1, fechaGeneracion: -1 });
facturaVentaSchema.index({ fechaVencimiento: 1, estado: 1 });

// Middleware para calcular totales antes de guardar
facturaVentaSchema.pre('save', function(next) {
  if (this.isModified('detalleProductos')) {
    this.calcularTotales();
  }
  
  // Establecer fecha de vencimiento si no está definida (30 días por defecto)
  if (!this.fechaVencimiento) {
    this.fechaVencimiento = new Date(this.fechaGeneracion.getTime() + (30 * 24 * 60 * 60 * 1000));
  }
  
  next();
});

// Método para calcular totales automáticamente
facturaVentaSchema.methods.calcularTotales = function() {
  let subtotal = 0;
  let descuentoTotal = 0;
  let ivaTotal = 0;
  
  this.detalleProductos.forEach(item => {
    // Calcular subtotal del item
    item.subtotal = (item.cantidad * item.precioUnitario) - item.descuento;
    
    // Calcular IVA del item
    item.iva.valor = (item.subtotal * item.iva.porcentaje) / 100;
    
    // Sumar a totales
    subtotal += item.subtotal;
    descuentoTotal += item.descuento;
    ivaTotal += item.iva.valor;
  });
  
  this.totales.subtotal = Math.round(subtotal * 100) / 100;
  this.totales.descuentoTotal = Math.round(descuentoTotal * 100) / 100;
  this.totales.ivaTotal = Math.round(ivaTotal * 100) / 100;
  this.totales.total = Math.round((subtotal + ivaTotal + this.totales.costoEnvio) * 100) / 100;
};

// Método para generar número de factura automático
facturaVentaSchema.statics.generarNumeroFactura = async function() {
  const year = new Date().getFullYear();
  const prefix = `FV${year}`;
  
  // Buscar la última factura del año
  const ultimaFactura = await this.findOne(
    { numeroFactura: new RegExp(`^${prefix}`) },
    {},
    { sort: { numeroFactura: -1 } }
  );
  
  let siguienteNumero = 1;
  if (ultimaFactura) {
    const ultimoNumero = parseInt(ultimaFactura.numeroFactura.replace(prefix, ''));
    siguienteNumero = ultimoNumero + 1;
  }
  
  return `${prefix}${siguienteNumero.toString().padStart(6, '0')}`;
};

// Método estático para obtener facturas vencidas
facturaVentaSchema.statics.obtenerFacturasVencidas = async function() {
  const hoy = new Date();
  return await this.find({
    fechaVencimiento: { $lt: hoy },
    estado: { $in: ['generada', 'enviada'] },
    activa: true
  }).populate('clienteId', 'nombre email telefono').lean();
};

// Método estático para obtener reporte de ventas por período
facturaVentaSchema.statics.obtenerReporteVentas = async function(fechaInicio, fechaFin) {
  const pipeline = [
    {
      $match: {
        fechaGeneracion: { $gte: fechaInicio, $lte: fechaFin },
        estado: { $ne: 'anulada' },
        activa: true
      }
    },
    {
      $group: {
        _id: {
          $dateToString: { format: "%Y-%m-%d", date: "$fechaGeneracion" }
        },
        cantidadFacturas: { $sum: 1 },
        totalVentas: { $sum: '$totales.total' },
        totalIVA: { $sum: '$totales.ivaTotal' },
        promedioVenta: { $avg: '$totales.total' }
      }
    },
    {
      $sort: { '_id': 1 }
    }
  ];
  
  return await this.aggregate(pipeline);
};

export default mongoose.model('FacturaVenta', facturaVentaSchema);