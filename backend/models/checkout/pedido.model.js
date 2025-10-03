import mongoose from 'mongoose';

// Esquema para direcciones de entrega
const direccionEntregaSchema = new mongoose.Schema({
  alias: {
    type: String,
    required: true,
    trim: true,
    maxlength: 50
  },
  nombreCompleto: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100
  },
  telefono: {
    type: String,
    required: true,
    trim: true,
    match: /^[\+]?[0-9\s\-\(\)]{7,15}$/
  },
  direccion: {
    type: String,
    required: true,
    trim: true,
    maxlength: 200
  },
  ciudad: {
    type: String,
    required: true,
    trim: true,
    maxlength: 50
  },
  departamento: {
    type: String,
    required: true,
    trim: true,
    maxlength: 50
  },
  codigoPostal: {
    type: String,
    trim: true,
    maxlength: 10
  },
  referencia: {
    type: String,
    trim: true,
    maxlength: 200
  },
  esPrincipal: {
    type: Boolean,
    default: false
  }
}, { _id: true });

// Esquema para ventanas de entrega
const ventanaEntregaSchema = new mongoose.Schema({
  fecha: {
    type: Date,
    required: true
  },
  horaInicio: {
    type: String,
    required: true,
    match: /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/
  },
  horaFin: {
    type: String,
    required: true,
    match: /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/
  },
  disponible: {
    type: Boolean,
    default: true
  },
  capacidadMaxima: {
    type: Number,
    default: 10,
    min: 1
  },
  pedidosReservados: {
    type: Number,
    default: 0,
    min: 0
  }
}, { _id: false });

// Esquema para métodos de pago
const metodoPagoSchema = new mongoose.Schema({
  tipo: {
    type: String,
    required: true,
    enum: ['efectivo', 'tarjeta', 'transferencia', 'pse', 'daviplata', 'nequi']
  },
  detalle: {
    type: String,
    trim: true
  },
  referencia: {
    type: String,
    trim: true
  },
  estado: {
    type: String,
    enum: ['pendiente', 'procesando', 'aprobado', 'rechazado'],
    default: 'pendiente'
  }
}, { _id: false });

// Esquema para items del pedido
const itemPedidoSchema = new mongoose.Schema({
  producto: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Producto',
    required: true
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
  precioTotal: {
    type: Number,
    required: true,
    min: 0
  },
  descuento: {
    type: Number,
    default: 0,
    min: 0
  },
  estadoItem: {
    type: String,
    enum: ['disponible', 'agotado', 'cancelado'],
    default: 'disponible'
  }
}, { _id: false });

// Esquema para datos de empresa (mayoristas)
const datosEmpresaSchema = new mongoose.Schema({
  razonSocial: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100
  },
  nit: {
    type: String,
    required: true,
    trim: true,
    match: /^[0-9]{8,11}-[0-9]$/
  },
  representanteLegal: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100
  },
  telefono: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    trim: true,
    lowercase: true,
    match: /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  }
}, { _id: false });

// Esquema principal del pedido
const pedidoSchema = new mongoose.Schema({
  numeroPedido: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  usuario: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Usuario',
    required: true
  },
  carrito: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Carrito',
    required: true
  },
  items: [itemPedidoSchema],
  
  // Datos del cliente
  datosPersonales: {
    nombre: {
      type: String,
      required: true,
      trim: true,
      maxlength: 50
    },
    apellido: {
      type: String,
      required: true,
      trim: true,
      maxlength: 50
    },
    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      match: /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    },
    telefono: {
      type: String,
      required: true,
      trim: true,
      match: /^[\+]?[0-9\s\-\(\)]{7,15}$/
    },
    documento: {
      tipo: {
        type: String,
        required: true,
        enum: ['cedula', 'pasaporte', 'cedula_extranjeria']
      },
      numero: {
        type: String,
        required: true,
        trim: true
      }
    }
  },
  
  // Dirección de entrega
  direccionEntrega: direccionEntregaSchema,
  
  // Método de envío y entrega
  metodoEnvio: {
    tipo: {
      type: String,
      required: true,
      enum: ['domicilio', 'punto_recogida', 'tienda']
    },
    nombre: String,
    precio: {
      type: Number,
      default: 0,
      min: 0
    },
    tiempoEstimado: String,
    zona: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ZonaEnvio'
    }
  },
  
  // Programación de entrega
  ventanaEntrega: ventanaEntregaSchema,
  
  // Método de pago
  metodoPago: metodoPagoSchema,
  
  // Datos de empresa (para mayoristas)
  datosEmpresa: {
    type: datosEmpresaSchema,
    required: function() {
      return this.tipoCliente === 'mayorista';
    }
  },
  
  // Tipo de cliente
  tipoCliente: {
    type: String,
    enum: ['particular', 'mayorista'],
    default: 'particular'
  },
  
  // Totales
  totales: {
    subtotal: {
      type: Number,
      required: true,
      min: 0
    },
    descuentos: {
      type: Number,
      default: 0,
      min: 0
    },
    envio: {
      type: Number,
      default: 0,
      min: 0
    },
    impuestos: {
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
  
  // Cupones aplicados
  cuponesAplicados: [{
    cupon: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Cupon'
    },
    codigo: String,
    descuento: Number
  }],
  
  // Estado del pedido
  estado: {
    type: String,
    enum: [
      'pendiente',
      'confirmado',
      'procesando',
      'empacado',
      'enviado',
      'en_transito',
      'entregado',
      'cancelado',
      'devuelto'
    ],
    default: 'pendiente'
  },
  
  // Historial de estados
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
  }],
  
  // Observaciones
  observaciones: {
    type: String,
    trim: true,
    maxlength: 500
  },
  
  // Términos y condiciones
  terminosAceptados: {
    type: Boolean,
    required: true,
    validate: {
      validator: function(v) {
        return v === true;
      },
      message: 'Debe aceptar los términos y condiciones'
    }
  },
  
  // Fechas importantes
  fechaPedido: {
    type: Date,
    default: Date.now
  },
  fechaEntregaEstimada: Date,
  fechaEntregaReal: Date,
  
  // Notificaciones
  notificaciones: {
    emailEnviado: {
      type: Boolean,
      default: false
    },
    whatsappEnviado: {
      type: Boolean,
      default: false
    },
    fechaUltimaNotificacion: Date
  }
}, {
  timestamps: true,
  collection: 'pedidos'
});

// Índices
pedidoSchema.index({ usuario: 1 });
pedidoSchema.index({ estado: 1 });
pedidoSchema.index({ fechaPedido: -1 });
pedidoSchema.index({ 'datosPersonales.email': 1 });
pedidoSchema.index({ 'datosEmpresa.nit': 1 });

// Middleware pre-save para generar número de pedido
pedidoSchema.pre('save', async function(next) {
  if (this.isNew && !this.numeroPedido) {
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    this.numeroPedido = `VN-${timestamp}-${random}`;
  }
  
  // Agregar al historial de estados
  if (this.isModified('estado')) {
    this.historialEstados.push({
      estado: this.estado,
      fecha: new Date(),
      observacion: `Estado cambiado a ${this.estado}`
    });
  }
  
  next();
});

// Métodos del esquema
pedidoSchema.methods.calcularTotales = function() {
  this.totales.subtotal = this.items.reduce((sum, item) => sum + item.precioTotal, 0);
  
  // Calcular descuentos de cupones
  this.totales.descuentos = this.cuponesAplicados.reduce((sum, cupon) => sum + cupon.descuento, 0);
  
  // Calcular total
  this.totales.total = this.totales.subtotal - this.totales.descuentos + this.totales.envio + this.totales.impuestos;
  
  return this.totales;
};

pedidoSchema.methods.validarStockDisponible = async function() {
  const Producto = mongoose.model('Producto');
  const validaciones = [];
  
  for (const item of this.items) {
    const producto = await Producto.findById(item.producto);
    if (!producto) {
      validaciones.push({
        producto: item.producto,
        valido: false,
        razon: 'Producto no encontrado'
      });
      continue;
    }
    
    if (producto.stock < item.cantidad) {
      validaciones.push({
        producto: item.producto,
        valido: false,
        razon: `Stock insuficiente. Disponible: ${producto.stock}, Solicitado: ${item.cantidad}`
      });
    } else {
      validaciones.push({
        producto: item.producto,
        valido: true,
        stockDisponible: producto.stock
      });
    }
  }
  
  return validaciones;
};

pedidoSchema.methods.validarPedidoMayorista = function() {
  if (this.tipoCliente !== 'mayorista') {
    return { valido: true };
  }
  
  const minimoMayorista = 500000; // $500,000 COP mínimo
  
  if (this.totales.subtotal < minimoMayorista) {
    return {
      valido: false,
      razon: `El pedido mayorista debe superar los $${minimoMayorista.toLocaleString()}`
    };
  }
  
  if (!this.datosEmpresa || !this.datosEmpresa.nit) {
    return {
      valido: false,
      razon: 'Debe proporcionar datos de empresa válidos para pedidos mayoristas'
    };
  }
  
  return { valido: true };
};

pedidoSchema.methods.cambiarEstado = function(nuevoEstado, observacion = '', usuario = null) {
  const estadosValidos = [
    'pendiente', 'confirmado', 'procesando', 'empacado', 
    'enviado', 'en_transito', 'entregado', 'cancelado', 'devuelto'
  ];
  
  if (!estadosValidos.includes(nuevoEstado)) {
    throw new Error('Estado no válido');
  }
  
  this.estado = nuevoEstado;
  this.historialEstados.push({
    estado: nuevoEstado,
    fecha: new Date(),
    observacion: observacion || `Estado cambiado a ${nuevoEstado}`,
    usuario
  });
  
  if (nuevoEstado === 'entregado' && !this.fechaEntregaReal) {
    this.fechaEntregaReal = new Date();
  }
};

export default mongoose.model('Pedido', pedidoSchema);