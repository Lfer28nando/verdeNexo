import mongoose from 'mongoose';

// Esquema para direcciones de entrega del usuario
const direccionEntregaSchema = new mongoose.Schema({
  usuario: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Usuario',
    required: true
  },
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
  coordenadas: {
    latitud: {
      type: Number,
      min: -90,
      max: 90
    },
    longitud: {
      type: Number,
      min: -180,
      max: 180
    }
  },
  esPrincipal: {
    type: Boolean,
    default: false
  },
  esActiva: {
    type: Boolean,
    default: true
  },
  tipoVivienda: {
    type: String,
    enum: ['casa', 'apartamento', 'oficina', 'local_comercial', 'bodega', 'otro'],
    default: 'casa'
  },
  instruccionesEspeciales: {
    type: String,
    trim: true,
    maxlength: 300
  },
  zonaEnvio: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ZonaEnvio'
  },
  validada: {
    type: Boolean,
    default: false
  },
  fechaValidacion: Date,
  vecesUsada: {
    type: Number,
    default: 0,
    min: 0
  },
  ultimoUso: Date
}, {
  timestamps: true,
  collection: 'direcciones_entrega'
});

// Índices
direccionEntregaSchema.index({ usuario: 1 });
direccionEntregaSchema.index({ usuario: 1, esPrincipal: 1 });
direccionEntregaSchema.index({ usuario: 1, esActiva: 1 });
direccionEntregaSchema.index({ ciudad: 1, departamento: 1 });
direccionEntregaSchema.index({ 'coordenadas.latitud': 1, 'coordenadas.longitud': 1 });

// Middleware pre-save
direccionEntregaSchema.pre('save', async function(next) {
  // Si se marca como principal, desmarcar las demás direcciones del usuario
  if (this.esPrincipal && this.isModified('esPrincipal')) {
    await this.constructor.updateMany(
      { 
        usuario: this.usuario, 
        _id: { $ne: this._id } 
      },
      { esPrincipal: false }
    );
  }
  
  // Si es la primera dirección del usuario, marcarla como principal
  if (this.isNew) {
    const count = await this.constructor.countDocuments({ 
      usuario: this.usuario,
      esActiva: true 
    });
    
    if (count === 0) {
      this.esPrincipal = true;
    }
  }
  
  next();
});

// Métodos del esquema
direccionEntregaSchema.methods.marcarComoPrincipal = async function() {
  // Desmarcar todas las demás direcciones del usuario
  await this.constructor.updateMany(
    { 
      usuario: this.usuario, 
      _id: { $ne: this._id } 
    },
    { esPrincipal: false }
  );
  
  // Marcar esta como principal
  this.esPrincipal = true;
  await this.save();
  
  return this;
};

direccionEntregaSchema.methods.incrementarUso = function() {
  this.vecesUsada += 1;
  this.ultimoUso = new Date();
  return this.save();
};

direccionEntregaSchema.methods.validarDireccion = function() {
  this.validada = true;
  this.fechaValidacion = new Date();
  return this.save();
};

direccionEntregaSchema.methods.calcularZonaEnvio = async function() {
  const ZonaEnvio = mongoose.model('ZonaEnvio');
  
  // Buscar zona por ciudad y departamento
  let zona = await ZonaEnvio.findOne({
    ciudades: {
      $elemMatch: {
        nombre: { $regex: new RegExp(this.ciudad, 'i') },
        departamento: { $regex: new RegExp(this.departamento, 'i') }
      }
    },
    activa: true
  });
  
  // Si no encuentra zona específica, buscar zona por departamento
  if (!zona) {
    zona = await ZonaEnvio.findOne({
      departamentos: { $in: [new RegExp(this.departamento, 'i')] },
      activa: true
    });
  }
  
  // Si tiene coordenadas, buscar por proximidad
  if (!zona && this.coordenadas && this.coordenadas.latitud && this.coordenadas.longitud) {
    zona = await ZonaEnvio.findOne({
      cobertura: {
        $geoIntersects: {
          $geometry: {
            type: 'Point',
            coordinates: [this.coordenadas.longitud, this.coordenadas.latitud]
          }
        }
      },
      activa: true
    });
  }
  
  if (zona) {
    this.zonaEnvio = zona._id;
    await this.save();
  }
  
  return zona;
};

direccionEntregaSchema.methods.obtenerResumen = function() {
  return {
    id: this._id,
    alias: this.alias,
    nombreCompleto: this.nombreCompleto,
    direccionCompleta: `${this.direccion}, ${this.ciudad}, ${this.departamento}`,
    telefono: this.telefono,
    esPrincipal: this.esPrincipal,
    validada: this.validada,
    tipoVivienda: this.tipoVivienda
  };
};

// Statics
direccionEntregaSchema.statics.obtenerPrincipal = function(usuarioId) {
  return this.findOne({ 
    usuario: usuarioId, 
    esPrincipal: true, 
    esActiva: true 
  });
};

direccionEntregaSchema.statics.obtenerTodasDelUsuario = function(usuarioId, soloActivas = true) {
  const filtro = { usuario: usuarioId };
  if (soloActivas) {
    filtro.esActiva = true;
  }
  
  return this.find(filtro).sort({ esPrincipal: -1, ultimoUso: -1 });
};

direccionEntregaSchema.statics.buscarPorAlias = function(usuarioId, alias) {
  return this.findOne({ 
    usuario: usuarioId, 
    alias: { $regex: new RegExp(alias, 'i') },
    esActiva: true 
  });
};

direccionEntregaSchema.statics.validarLimitePorUsuario = async function(usuarioId) {
  const LIMITE_DIRECCIONES = 10;
  const count = await this.countDocuments({ 
    usuario: usuarioId, 
    esActiva: true 
  });
  
  return {
    valido: count < LIMITE_DIRECCIONES,
    actual: count,
    limite: LIMITE_DIRECCIONES,
    disponibles: LIMITE_DIRECCIONES - count
  };
};

export default mongoose.model('DireccionEntrega', direccionEntregaSchema);