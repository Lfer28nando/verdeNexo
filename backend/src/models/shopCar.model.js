// models/carrito/carrito.model.js
import mongoose from "mongoose";

// ============================
// ESQUEMA PARA ITEMS DEL CARRITO (RF-CARRO-02, RF-CARRO-03)
// ============================
const itemCarritoSchema = new mongoose.Schema({
  productoId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: "Producto", 
    required: true 
  },
  cantidad: { 
    type: Number, 
    required: true, 
    min: 1,
    max: 100 // Límite máximo por item
  },
  
  // Para variantes de producto (tallas, colores, materiales de macetas)
  variante: {
    atributo: { type: String }, // ej: "talla", "material", "color"
    valor: { type: String }     // ej: "grande", "barro", "terracota"
  },
  
  // Precio al momento de agregar (para mantener consistencia si cambian precios)
  precioUnitario: { 
    type: Number, 
    required: true,
    min: 0
  },
  
  // Para combos planta+maceta (RF-CARRO-02)
  esCombos: { 
    type: Boolean, 
    default: false 
  },
  
  // Si es combo, qué productos incluye
  comboItems: [{
    productoId: { type: mongoose.Schema.Types.ObjectId, ref: "Producto" },
    cantidad: { type: Number, default: 1 },
    tipo: { type: String, enum: ['planta', 'maceta', 'sustrato', 'accesorio'] }
  }],
  
  // Metadatos del item
  fechaAgregado: { type: Date, default: Date.now },
  notas: { type: String } // Notas especiales del cliente
}, { _id: true });

// ============================
// ESQUEMA PARA CUPONES APLICADOS (RF-CARRO-04)
// ============================
const cuponAplicadoSchema = new mongoose.Schema({
  codigo: { type: String, required: true },
  descripcion: { type: String },
  tipo: { type: String, enum: ['porcentaje', 'fijo'], required: true },
  valor: { type: Number, required: true }, // Valor original del cupón
  descuentoAplicado: { type: Number, required: true }, // Monto real descontado
  fechaAplicado: { type: Date, default: Date.now },
  
  // Para auditoría
  aplicadoPor: { type: String, enum: ['cliente', 'vendedor', 'sistema'], default: 'cliente' }
}, { _id: false });

// ============================
// ESQUEMA PARA INFORMACIÓN DE ENVÍO (RF-CARRO-05)
// ============================
const envioSchema = new mongoose.Schema({
  zona: { type: String }, // Zona de envío (ej: "Norte", "Centro")
  upz: { type: String },  // UPZ específica (ej: "Chapinero", "Zona Rosa")
  direccion: { 
    calle: String,
    numero: String,
    complemento: String,
    barrio: String,
    ciudad: { type: String, default: "Bogotá" },
    coordenadas: {
      lat: Number,
      lng: Number
    }
  },
  
  // Cálculos de envío
  costoEstimado: { type: Number, default: 0 },
  pesoTotal: { type: Number, default: 0 }, // en gramos
  volumenTotal: { type: Number, default: 0 }, // en cm³
  
  // Para productos especiales (RF-CARRO-07)
  tieneFragiles: { type: Boolean, default: false }, // plantas delicadas, macetas de barro
  tieneVoluminosos: { type: Boolean, default: false }, // macetas grandes
  
  // Restricciones aplicables
  restricciones: [{ 
    tipo: String, // 'peso_excedido', 'macetas_grandes_limite', 'plantas_delicadas'
    descripcion: String,
    bloqueante: { type: Boolean, default: false }
  }],
  
  // Tiempo estimado de entrega
  tiempoEntregaMin: { type: Number }, // días mínimos
  tiempoEntregaMax: { type: Number }  // días máximos
}, { _id: false });

// ============================
// ESQUEMA PARA TOTALES CALCULADOS (RF-CARRO-08)
// ============================
const totalesSchema = new mongoose.Schema({
  subtotal: { type: Number, default: 0 },
  descuentoCupones: { type: Number, default: 0 },
  costoEnvio: { type: Number, default: 0 },
  impuestos: { type: Number, default: 0 }, // Para futuro
  total: { type: Number, default: 0 },
  
  // Para auditoría y debugging
  fechaCalculo: { type: Date, default: Date.now },
  detalleCalculos: {
    subtotalItems: Number,
    descuentosDetalle: [{
      codigo: String,
      monto: Number
    }],
    envioDetalle: {
      tarifaBase: Number,
      recargos: Number,
      descuentosEnvio: Number
    }
  }
}, { _id: false });

// ============================
// ESQUEMA PRINCIPAL DEL CARRITO
// ============================
const carritoSchema = new mongoose.Schema({
  // RF-CARRO-01: Identificación del carrito
  usuarioId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: "Usuario", 
    required: false, // null para visitantes no registrados
    index: true
  },
  
  sessionId: { 
    type: String, 
    required: true,
    index: true, // Para búsquedas rápidas por sesión
    unique: true // Cada sesión tiene un carrito único
  },
  
  // RF-CARRO-02 y RF-CARRO-03: Items del carrito
  items: [itemCarritoSchema],
  
  // RF-CARRO-04: Cupones aplicados
  cupones: [cuponAplicadoSchema],
  
  // RF-CARRO-05: Información de envío
  envio: envioSchema,
  
  // RF-CARRO-08: Totales calculados
  totales: totalesSchema,
  
  // RF-CARRO-06: Estado del carrito
  estado: { 
    type: String, 
    enum: ['activo', 'guardado', 'abandonado', 'convertido'], 
    default: 'activo',
    index: true
  },
  
  // Para carritos guardados (RF-CARRO-06)
  fechaGuardado: { type: Date },
  notasGuardado: { type: String },
  nombreCarritoGuardado: { type: String }, // "Mi lista de jardinería", "Pedido oficina"
  
  // Metadatos y auditoría
  fechaCreacion: { type: Date, default: Date.now },
  fechaActualizacion: { type: Date, default: Date.now },
  ultimaActividad: { type: Date, default: Date.now },
  
  // Para analytics y abandono
  origen: { type: String, enum: ['web', 'mobile', 'api'], default: 'web' },
  deviceInfo: {
    userAgent: String,
    ip: String
  }
}, {
  timestamps: true
});

// ============================
// ÍNDICES PARA OPTIMIZACIÓN
// ============================
carritoSchema.index({ usuarioId: 1, estado: 1 });
// El campo sessionId ya tiene index: true y unique: true que crean índices automáticos
carritoSchema.index({ fechaActualizacion: 1 });
carritoSchema.index({ ultimaActividad: 1 }); // Para detectar carritos abandonados
carritoSchema.index({ estado: 1, fechaCreacion: -1 });

// ============================
// MIDDLEWARE PRE-SAVE
// ============================
carritoSchema.pre('save', function(next) {
  // Actualizar fechas
  this.fechaActualizacion = new Date();
  this.ultimaActividad = new Date();
  
  // Recalcular totales automáticamente si hay cambios en items
  if (this.isModified('items') || this.isModified('cupones')) {
    this.calcularTotales();
  }
  
  next();
});

// ============================
// MÉTODOS DEL ESQUEMA
// ============================

// Método para calcular totales (RF-CARRO-08)
carritoSchema.methods.calcularTotales = function() {
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
  const total = subtotal - descuentoTotal + (this.envio?.costoEstimado || 0);
  
  // Actualizar objeto totales
  this.totales = {
    subtotal,
    descuentoCupones: descuentoTotal,
    costoEnvio: this.envio?.costoEstimado || 0,
    total: Math.max(0, total), // No permitir totales negativos
    fechaCalculo: new Date()
  };
  
  return this.totales;
};

// Método para verificar límites (RF-CARRO-07)
carritoSchema.methods.validarLimites = function() {
  const errores = [];
  let pesoTotal = 0;
  let macetasGrandes = 0;
  let plantasDelicadas = 0;
  let cantidadTotalProductos = 0;
  
  this.items.forEach(item => {
    // Calcular cantidad total de productos
    cantidadTotalProductos += item.cantidad;
    
    // Simular peso (esto debería venir del producto)
    pesoTotal += 500 * item.cantidad; // 500g promedio por item
    
    // Contar macetas grandes y plantas delicadas
    // (esto requeriría información del producto)
    if (item.notas?.includes('maceta grande')) macetasGrandes += item.cantidad;
    if (item.notas?.includes('planta delicada')) plantasDelicadas += item.cantidad;
  });
  
  // Validar límite máximo de productos (50)
  if (cantidadTotalProductos > 50) {
    errores.push(`El carrito no puede tener más de 50 productos. Actualmente tiene ${cantidadTotalProductos}`);
  }
  
  // Validar límites de peso
  if (pesoTotal > 50000) { // 50kg máximo
    errores.push('El peso total excede el límite de 50kg');
  }
  
  // Validar límites específicos
  if (macetasGrandes > 3) {
    errores.push('Máximo 3 macetas grandes por envío');
  }
  
  if (plantasDelicadas > 0 && this.items.length > plantasDelicadas) {
    errores.push('Las plantas delicadas deben enviarse por separado');
  }
  
  return errores;
};

// Método estático para limpiar carritos abandonados
carritoSchema.statics.limpiarAbandonados = function(diasAbandonado = 30) {
  const fechaLimite = new Date();
  fechaLimite.setDate(fechaLimite.getDate() - diasAbandonado);
  
  return this.updateMany(
    {
      ultimaActividad: { $lt: fechaLimite },
      estado: 'activo'
    },
    {
      estado: 'abandonado'
    }
  );
};

export const Carrito = mongoose.model("Carrito", carritoSchema);