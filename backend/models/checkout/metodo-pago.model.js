import mongoose from 'mongoose';

// Esquema para configuración de métodos de pago
const metodoPagoSchema = new mongoose.Schema({
  nombre: {
    type: String,
    required: true,
    trim: true,
    maxlength: 50
  },
  tipo: {
    type: String,
    required: true,
    enum: ['efectivo', 'tarjeta', 'transferencia', 'pse', 'daviplata', 'nequi', 'bancolombia', 'otro']
  },
  descripcion: {
    type: String,
    trim: true,
    maxlength: 200
  },
  activo: {
    type: Boolean,
    default: true
  },
  disponiblePara: {
    type: [String],
    enum: ['particular', 'mayorista'],
    default: ['particular', 'mayorista']
  },
  configuracion: {
    // Para métodos con pasarela de pago
    apiKey: String,
    secretKey: String,
    merchantId: String,
    urlWebhook: String,
    
    // Para transferencias/efectivo
    cuentaBancaria: {
      banco: String,
      numeroCuenta: String,
      tipoCuenta: {
        type: String,
        enum: ['ahorros', 'corriente']
      },
      titular: String,
      documento: String
    },
    
    // Configuraciones específicas
    requiereVerificacion: {
      type: Boolean,
      default: false
    },
    tiempoExpiracion: {
      type: Number, // en minutos
      default: 30
    },
    montoMinimo: {
      type: Number,
      default: 0
    },
    montoMaximo: Number,
    
    // Comisiones
    comision: {
      tipo: {
        type: String,
        enum: ['fijo', 'porcentaje'],
        default: 'fijo'
      },
      valor: {
        type: Number,
        default: 0
      }
    }
  },
  instrucciones: {
    type: String,
    trim: true,
    maxlength: 500
  },
  orden: {
    type: Number,
    default: 0
  },
  estadisticas: {
    vecesUsado: {
      type: Number,
      default: 0
    },
    montoTotal: {
      type: Number,
      default: 0
    },
    ultimoUso: Date
  }
}, {
  timestamps: true,
  collection: 'metodos_pago'
});

// Esquema para transacciones de pago
const transaccionPagoSchema = new mongoose.Schema({
  pedido: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Pedido',
    required: true
  },
  metodoPago: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'MetodoPago',
    required: true
  },
  usuario: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Usuario',
    required: true
  },
  numeroTransaccion: {
    type: String,
    required: true,
    trim: true
  },
  referenciaPago: {
    type: String,
    trim: true
  },
  estado: {
    type: String,
    enum: [
      'pendiente',
      'procesando',
      'aprobado',
      'rechazado',
      'cancelado',
      'reembolsado',
      'expirado'
    ],
    default: 'pendiente'
  },
  monto: {
    type: Number,
    required: true,
    min: 0
  },
  comision: {
    type: Number,
    default: 0,
    min: 0
  },
  montoNeto: {
    type: Number,
    required: true,
    min: 0
  },
  moneda: {
    type: String,
    default: 'COP',
    enum: ['COP', 'USD']
  },
  detallesPago: {
    // Para tarjetas
    ultimosCuatroDigitos: String,
    tipoTarjeta: String,
    banco: String,
    
    // Para transferencias
    cuentaOrigen: String,
    bancoOrigen: String,
    
    // Para PSE
    bancoSeleccionado: String,
    
    // Para billeteras digitales
    telefonoBilletera: String,
    
    // Datos adicionales
    codigoAprobacion: String,
    codigoAutorizacion: String,
    tokenTransaccion: String
  },
  fechaTransaccion: {
    type: Date,
    default: Date.now
  },
  fechaVencimiento: Date,
  fechaAprobacion: Date,
  fechaRechazo: Date,
  respuestaPasarela: {
    codigo: String,
    mensaje: String,
    datos: mongoose.Schema.Types.Mixed
  },
  intentos: {
    type: Number,
    default: 1,
    min: 1
  },
  observaciones: {
    type: String,
    trim: true,
    maxlength: 500
  },
  historialEstados: [{
    estado: String,
    fecha: {
      type: Date,
      default: Date.now
    },
    observacion: String,
    usuario: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Usuario'
    }
  }]
}, {
  timestamps: true,
  collection: 'transacciones_pago'
});

// Índices para método de pago
metodoPagoSchema.index({ tipo: 1, activo: 1 });
metodoPagoSchema.index({ orden: 1 });

// Índices para transacciones
transaccionPagoSchema.index({ pedido: 1 });
transaccionPagoSchema.index({ usuario: 1 });
transaccionPagoSchema.index({ numeroTransaccion: 1 });
transaccionPagoSchema.index({ estado: 1 });
transaccionPagoSchema.index({ fechaTransaccion: -1 });

// Middleware pre-save para transacciones
transaccionPagoSchema.pre('save', async function(next) {
  if (this.isNew && !this.numeroTransaccion) {
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    this.numeroTransaccion = `TXN-${timestamp}-${random}`;
  }
  
  // Calcular monto neto
  this.montoNeto = this.monto - this.comision;
  
  // Agregar al historial de estados si cambió
  if (this.isModified('estado')) {
    this.historialEstados.push({
      estado: this.estado,
      fecha: new Date(),
      observacion: `Estado cambiado a ${this.estado}`
    });
    
    // Actualizar fechas según el estado
    switch (this.estado) {
      case 'aprobado':
        this.fechaAprobacion = new Date();
        break;
      case 'rechazado':
      case 'cancelado':
        this.fechaRechazo = new Date();
        break;
    }
  }
  
  // Establecer fecha de vencimiento si no existe
  if (this.isNew && !this.fechaVencimiento) {
    const metodoPago = await mongoose.model('MetodoPago').findById(this.metodoPago);
    if (metodoPago && metodoPago.configuracion.tiempoExpiracion) {
      this.fechaVencimiento = new Date(Date.now() + metodoPago.configuracion.tiempoExpiracion * 60 * 1000);
    }
  }
  
  next();
});

// Métodos para método de pago
metodoPagoSchema.methods.calcularComision = function(monto) {
  const config = this.configuracion;
  if (!config || !config.comision) return 0;
  
  if (config.comision.tipo === 'porcentaje') {
    return monto * (config.comision.valor / 100);
  } else {
    return config.comision.valor;
  }
};

metodoPagoSchema.methods.esDisponiblePara = function(tipoCliente, monto = 0) {
  if (!this.activo) return false;
  if (!this.disponiblePara.includes(tipoCliente)) return false;
  
  const config = this.configuracion;
  if (config.montoMinimo && monto < config.montoMinimo) return false;
  if (config.montoMaximo && monto > config.montoMaximo) return false;
  
  return true;
};

metodoPagoSchema.methods.actualizarEstadisticas = function(monto) {
  this.estadisticas.vecesUsado += 1;
  this.estadisticas.montoTotal += monto;
  this.estadisticas.ultimoUso = new Date();
  return this.save();
};

// Métodos para transacciones
transaccionPagoSchema.methods.cambiarEstado = function(nuevoEstado, observacion = '', usuario = null) {
  const estadosValidos = [
    'pendiente', 'procesando', 'aprobado', 'rechazado', 
    'cancelado', 'reembolsado', 'expirado'
  ];
  
  if (!estadosValidos.includes(nuevoEstado)) {
    throw new Error('Estado no válido para transacción');
  }
  
  this.estado = nuevoEstado;
  this.historialEstados.push({
    estado: nuevoEstado,
    fecha: new Date(),
    observacion: observacion || `Estado cambiado a ${nuevoEstado}`,
    usuario
  });
  
  return this.save();
};

transaccionPagoSchema.methods.marcarComoExpirada = function() {
  if (this.estado === 'pendiente' && this.fechaVencimiento && new Date() > this.fechaVencimiento) {
    this.estado = 'expirado';
    this.historialEstados.push({
      estado: 'expirado',
      fecha: new Date(),
      observacion: 'Transacción expirada por tiempo límite'
    });
    return this.save();
  }
  return false;
};

transaccionPagoSchema.methods.procesarRespuestaPasarela = function(respuesta) {
  this.respuestaPasarela = {
    codigo: respuesta.codigo || respuesta.code,
    mensaje: respuesta.mensaje || respuesta.message,
    datos: respuesta
  };
  
  // Actualizar estado según respuesta
  if (respuesta.exitoso || respuesta.success) {
    this.estado = 'aprobado';
    this.codigoAprobacion = respuesta.codigoAprobacion || respuesta.approvalCode;
  } else {
    this.estado = 'rechazado';
  }
  
  return this.save();
};

// Statics
metodoPagoSchema.statics.obtenerActivos = function(tipoCliente = null) {
  const filtro = { activo: true };
  if (tipoCliente) {
    filtro.disponiblePara = { $in: [tipoCliente] };
  }
  return this.find(filtro).sort({ orden: 1, nombre: 1 });
};

transaccionPagoSchema.statics.buscarPorReferencia = function(referencia) {
  return this.findOne({
    $or: [
      { numeroTransaccion: referencia },
      { referenciaPago: referencia },
      { 'detallesPago.codigoAprobacion': referencia }
    ]
  });
};

transaccionPagoSchema.statics.marcarExpiradas = function() {
  const ahora = new Date();
  return this.updateMany(
    {
      estado: 'pendiente',
      fechaVencimiento: { $lt: ahora }
    },
    {
      $set: { estado: 'expirado' },
      $push: {
        historialEstados: {
          estado: 'expirado',
          fecha: ahora,
          observacion: 'Transacción expirada automáticamente'
        }
      }
    }
  );
};

// Exportar modelos
export const MetodoPago = mongoose.model('MetodoPago', metodoPagoSchema);
export const TransaccionPago = mongoose.model('TransaccionPago', transaccionPagoSchema);