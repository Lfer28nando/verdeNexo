import mongoose from 'mongoose';

// Esquema para configuración de ventanas de entrega
const ventanaEntregaSchema = new mongoose.Schema({
  nombre: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100
  },
  descripcion: {
    type: String,
    trim: true,
    maxlength: 200
  },
  zona: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ZonaEnvio',
    required: true
  },
  diasSemana: [{
    type: String,
    enum: ['lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado', 'domingo'],
    required: true
  }],
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
  capacidadMaxima: {
    type: Number,
    required: true,
    min: 1,
    default: 10
  },
  tiempoEntrega: {
    type: Number, // en horas
    required: true,
    min: 1
  },
  costoAdicional: {
    type: Number,
    default: 0,
    min: 0
  },
  activa: {
    type: Boolean,
    default: true
  },
  fechaInicioVigencia: {
    type: Date,
    default: Date.now
  },
  fechaFinVigencia: Date,
  restricciones: {
    tiposProducto: [String], // Si solo aplica para ciertos tipos
    montoMinimo: {
      type: Number,
      default: 0
    },
    montoMaximo: Number,
    tiposCliente: {
      type: [String],
      enum: ['particular', 'mayorista'],
      default: ['particular', 'mayorista']
    }
  },
  configuracionEspecial: {
    requierePreparacionExtra: {
      type: Boolean,
      default: false
    },
    horasPreparacion: {
      type: Number,
      default: 0
    },
    mensajeEspecial: String,
    disponibleFestivos: {
      type: Boolean,
      default: false
    }
  }
}, {
  timestamps: true,
  collection: 'ventanas_entrega'
});

// Esquema para slots de entrega específicos
const slotEntregaSchema = new mongoose.Schema({
  ventanaEntrega: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'VentanaEntrega',
    required: true
  },
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
  capacidadDisponible: {
    type: Number,
    required: true,
    min: 0
  },
  pedidosReservados: [{
    pedido: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Pedido'
    },
    fechaReserva: {
      type: Date,
      default: Date.now
    },
    observaciones: String
  }],
  estado: {
    type: String,
    enum: ['disponible', 'lleno', 'cancelado', 'bloqueado'],
    default: 'disponible'
  },
  motivoCancelacion: String,
  repartidor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Usuario'
  },
  ruta: {
    orden: Number,
    tiempoEstimado: Number,
    observaciones: String
  }
}, {
  timestamps: true,
  collection: 'slots_entrega'
});

// Índices para ventanas de entrega
ventanaEntregaSchema.index({ zona: 1, activa: 1 });
ventanaEntregaSchema.index({ diasSemana: 1 });
ventanaEntregaSchema.index({ fechaInicioVigencia: 1, fechaFinVigencia: 1 });

// Índices para slots
slotEntregaSchema.index({ ventanaEntrega: 1, fecha: 1 });
slotEntregaSchema.index({ fecha: 1, estado: 1 });
slotEntregaSchema.index({ repartidor: 1, fecha: 1 });

// Middleware pre-save para ventanas
ventanaEntregaSchema.pre('save', function(next) {
  // Validar que hora fin sea mayor que hora inicio
  const inicio = this.horaInicio.split(':').map(Number);
  const fin = this.horaFin.split(':').map(Number);
  
  const minutosInicio = inicio[0] * 60 + inicio[1];
  const minutosFin = fin[0] * 60 + fin[1];
  
  if (minutosFin <= minutosInicio) {
    return next(new Error('La hora de fin debe ser mayor que la hora de inicio'));
  }
  
  next();
});

// Middleware pre-save para slots
slotEntregaSchema.pre('save', async function(next) {
  // Actualizar estado según capacidad
  if (this.capacidadDisponible <= 0) {
    this.estado = 'lleno';
  } else if (this.estado === 'lleno' && this.capacidadDisponible > 0) {
    this.estado = 'disponible';
  }
  
  next();
});

// Métodos para ventanas de entrega
ventanaEntregaSchema.methods.esDisponiblePara = function(tipoCliente, monto = 0, tiposProducto = []) {
  if (!this.activa) return false;
  
  // Verificar vigencia
  const ahora = new Date();
  if (this.fechaInicioVigencia > ahora) return false;
  if (this.fechaFinVigencia && this.fechaFinVigencia < ahora) return false;
  
  // Verificar restricciones
  const restricciones = this.restricciones;
  if (restricciones.tiposCliente && !restricciones.tiposCliente.includes(tipoCliente)) {
    return false;
  }
  if (restricciones.montoMinimo && monto < restricciones.montoMinimo) {
    return false;
  }
  if (restricciones.montoMaximo && monto > restricciones.montoMaximo) {
    return false;
  }
  if (restricciones.tiposProducto && restricciones.tiposProducto.length > 0) {
    const tieneProductoValido = tiposProducto.some(tipo => 
      restricciones.tiposProducto.includes(tipo)
    );
    if (!tieneProductoValido) return false;
  }
  
  return true;
};

ventanaEntregaSchema.methods.calcularFechaEntrega = function(fechaPedido = new Date()) {
  const fecha = new Date(fechaPedido);
  fecha.setHours(fecha.getHours() + this.tiempoEntrega);
  
  // Si requiere preparación extra, agregar esas horas
  if (this.configuracionEspecial.requierePreparacionExtra) {
    fecha.setHours(fecha.getHours() + this.configuracionEspecial.horasPreparacion);
  }
  
  return fecha;
};

ventanaEntregaSchema.methods.generarSlotsParaSemana = async function(fechaInicio) {
  const SlotEntrega = mongoose.model('SlotEntrega');
  const slots = [];
  
  const fecha = new Date(fechaInicio);
  fecha.setHours(0, 0, 0, 0);
  
  for (let i = 0; i < 7; i++) {
    const diaSemana = ['domingo', 'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado'][fecha.getDay()];
    
    if (this.diasSemana.includes(diaSemana)) {
      // Verificar si es festivo y si está disponible en festivos
      const esFestivo = await this.esFestivo(fecha);
      if (esFestivo && !this.configuracionEspecial.disponibleFestivos) {
        fecha.setDate(fecha.getDate() + 1);
        continue;
      }
      
      // Verificar si ya existe un slot para esta fecha
      const slotExistente = await SlotEntrega.findOne({
        ventanaEntrega: this._id,
        fecha: {
          $gte: new Date(fecha.getFullYear(), fecha.getMonth(), fecha.getDate()),
          $lt: new Date(fecha.getFullYear(), fecha.getMonth(), fecha.getDate() + 1)
        }
      });
      
      if (!slotExistente) {
        const nuevoSlot = new SlotEntrega({
          ventanaEntrega: this._id,
          fecha: new Date(fecha),
          horaInicio: this.horaInicio,
          horaFin: this.horaFin,
          capacidadDisponible: this.capacidadMaxima
        });
        
        slots.push(nuevoSlot);
      }
    }
    
    fecha.setDate(fecha.getDate() + 1);
  }
  
  if (slots.length > 0) {
    await SlotEntrega.insertMany(slots);
  }
  
  return slots;
};

ventanaEntregaSchema.methods.esFestivo = async function(fecha) {
  // Aquí podrías conectar con una API de festivos colombianos
  // Por ahora, implementación básica con festivos fijos
  const festivos2024 = [
    '2024-01-01', '2024-01-08', '2024-03-25', '2024-03-28', '2024-03-29',
    '2024-05-01', '2024-05-13', '2024-06-03', '2024-06-10', '2024-07-01',
    '2024-07-20', '2024-08-07', '2024-08-19', '2024-10-14', '2024-11-04',
    '2024-11-11', '2024-12-08', '2024-12-25'
  ];
  
  const fechaStr = fecha.toISOString().split('T')[0];
  return festivos2024.includes(fechaStr);
};

// Métodos para slots de entrega
slotEntregaSchema.methods.reservarPedido = function(pedidoId, observaciones = '') {
  if (this.capacidadDisponible <= 0) {
    throw new Error('No hay capacidad disponible en este slot');
  }
  
  // Verificar que el pedido no esté ya reservado
  const yaReservado = this.pedidosReservados.some(
    reserva => reserva.pedido.toString() === pedidoId.toString()
  );
  
  if (yaReservado) {
    throw new Error('El pedido ya está reservado en este slot');
  }
  
  this.pedidosReservados.push({
    pedido: pedidoId,
    fechaReserva: new Date(),
    observaciones
  });
  
  this.capacidadDisponible -= 1;
  
  return this.save();
};

slotEntregaSchema.methods.liberarPedido = function(pedidoId) {
  const index = this.pedidosReservados.findIndex(
    reserva => reserva.pedido.toString() === pedidoId.toString()
  );
  
  if (index === -1) {
    throw new Error('El pedido no está reservado en este slot');
  }
  
  this.pedidosReservados.splice(index, 1);
  this.capacidadDisponible += 1;
  
  return this.save();
};

slotEntregaSchema.methods.asignarRepartidor = function(repartidorId, orden = null, tiempoEstimado = null) {
  this.repartidor = repartidorId;
  
  if (orden !== null || tiempoEstimado !== null) {
    this.ruta = {
      orden: orden || this.ruta?.orden || 1,
      tiempoEstimado: tiempoEstimado || this.ruta?.tiempoEstimado || 60,
      observaciones: this.ruta?.observaciones || ''
    };
  }
  
  return this.save();
};

// Statics
ventanaEntregaSchema.statics.obtenerDisponiblesPorZona = function(zonaId, tipoCliente = 'particular') {
  return this.find({
    zona: zonaId,
    activa: true,
    'restricciones.tiposCliente': { $in: [tipoCliente] },
    $or: [
      { fechaFinVigencia: { $exists: false } },
      { fechaFinVigencia: null },
      { fechaFinVigencia: { $gt: new Date() } }
    ]
  }).sort({ horaInicio: 1 });
};

slotEntregaSchema.statics.obtenerDisponiblesPorFecha = function(fecha, zonaId = null) {
  const inicioDia = new Date(fecha.getFullYear(), fecha.getMonth(), fecha.getDate());
  const finDia = new Date(fecha.getFullYear(), fecha.getMonth(), fecha.getDate() + 1);
  
  const filtro = {
    fecha: { $gte: inicioDia, $lt: finDia },
    estado: 'disponible',
    capacidadDisponible: { $gt: 0 }
  };
  
  const pipeline = [
    { $match: filtro },
    {
      $lookup: {
        from: 'ventanas_entrega',
        localField: 'ventanaEntrega',
        foreignField: '_id',
        as: 'ventana'
      }
    },
    { $unwind: '$ventana' },
    { $match: { 'ventana.activa': true } }
  ];
  
  if (zonaId) {
    pipeline.push({ $match: { 'ventana.zona': mongoose.Types.ObjectId(zonaId) } });
  }
  
  pipeline.push({ $sort: { horaInicio: 1 } });
  
  return this.aggregate(pipeline);
};

slotEntregaSchema.statics.limpiarSlotsVencidos = function() {
  const hace24Horas = new Date(Date.now() - 24 * 60 * 60 * 1000);
  
  return this.deleteMany({
    fecha: { $lt: hace24Horas },
    estado: { $in: ['disponible', 'cancelado'] },
    'pedidosReservados.0': { $exists: false } // Sin reservas
  });
};

// Exportar modelos
export const VentanaEntrega = mongoose.model('VentanaEntrega', ventanaEntregaSchema);
export const SlotEntrega = mongoose.model('SlotEntrega', slotEntregaSchema);