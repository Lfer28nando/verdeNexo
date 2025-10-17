// models/carrito/cupon.model.js
import mongoose from "mongoose";

// ============================
// ESQUEMA PARA CONDICIONES DE APLICACIÓN (RF-CARRO-04)
// ============================
const condicionesSchema = new mongoose.Schema({
  // Monto mínimo de compra para aplicar el cupón
  montoMinimo: { 
    type: Number, 
    default: 0,
    min: 0
  },
  
  // Restricciones por categoría de productos del vivero
  categorias: [{ 
    type: String,
    enum: ['plantas', 'macetas', 'sustratos', 'combos', 'accesorios', 'herramientas']
  }], // Si está vacío, aplica a todas las categorías
  
  // Restricciones por segmento de usuario
  segmentos: [{ 
    type: String,
    enum: ['cliente_nuevo', 'premium', 'mayorista', 'frecuente', 'vip']
  }], // Si está vacío, aplica a todos los segmentos
  
  // Límites de uso del cupón
  maxUsos: { 
    type: Number,
    min: 1 
  }, // Total de usos permitidos (null = ilimitado)
  
  maxUsosPorUsuario: { 
    type: Number, 
    default: 1,
    min: 1
  },
  
  // Restricciones específicas de productos
  productosIncluidos: [{ 
    type: mongoose.Schema.Types.ObjectId, 
    ref: "Producto" 
  }], // Solo estos productos (si está vacío, todos)
  
  productosExcluidos: [{ 
    type: mongoose.Schema.Types.ObjectId, 
    ref: "Producto" 
  }], // Excluir estos productos específicos
  
  // Restricciones especiales para el vivero
  soloPlantasDelicadas: { type: Boolean, default: false },
  soloMacetasGrandes: { type: Boolean, default: false },
  soloCombos: { type: Boolean, default: false },
  
  // Solo para primeras compras
  soloPrimeraCompra: { type: Boolean, default: false },
  
  // Restricciones por zona de envío
  zonasEnvio: [{ type: String }], // ['norte', 'centro', 'sur']
  
  // Días de la semana válidos (0=domingo, 6=sábado)
  diasValidos: [{ 
    type: Number, 
    min: 0, 
    max: 6 
  }], // Si está vacío, todos los días
  
  // Horarios válidos
  horaInicio: { type: String }, // "09:00"
  horaFin: { type: String }     // "18:00"
}, { _id: false });

// ============================
// ESQUEMA PARA ESTADÍSTICAS DE USO
// ============================
const estadisticasUsoSchema = new mongoose.Schema({
  vecesUsado: { type: Number, default: 0 },
  montoTotalDescontado: { type: Number, default: 0 },
  ultimoUso: { type: Date },
  
  // Usuarios que han usado el cupón
  usuariosUsaron: [{ 
    usuarioId: { type: mongoose.Schema.Types.ObjectId, ref: "Usuario" },
    sessionId: { type: String }, // Para visitantes
    fecha: { type: Date, default: Date.now },
    montoDescontado: { type: Number },
    carritoId: { type: mongoose.Schema.Types.ObjectId, ref: "Carrito" }
  }],
  
  // Analytics por categoría
  usosPorCategoria: [{
    categoria: String,
    cantidad: { type: Number, default: 0 }
  }]
}, { _id: false });

// ============================
// ESQUEMA PRINCIPAL DE CUPÓN
// ============================
const cuponSchema = new mongoose.Schema({
  // Identificación del cupón
  codigo: { 
    type: String, 
    required: true, 
    unique: true,
    uppercase: true,
    trim: true,
    minlength: 3,
    maxlength: 20,
    match: /^[A-Z0-9_-]+$/ // Solo letras mayúsculas, números, guiones y guiones bajos
  },
  
  nombre: {
    type: String,
    required: true,
    trim: true
  }, // "Descuento Plantas Nuevas", "Black Friday Macetas"
  
  descripcion: { 
    type: String, 
    required: true,
    trim: true
  },
  
  // Tipo y valor del descuento
  tipo: { 
    type: String, 
    enum: ['porcentaje', 'fijo'], 
    required: true 
  },
  
  valor: { 
    type: Number, 
    required: true,
    min: 0
  }, // Para porcentaje: 0-100, para fijo: monto en pesos
  
  // Para descuentos porcentuales, límite máximo de descuento
  descuentoMaximo: { 
    type: Number,
    min: 0
  }, // Ej: 20% de descuento máximo $50.000
  
  // Condiciones de aplicación
  condiciones: condicionesSchema,
  
  // Vigencia del cupón
  fechaInicio: { 
    type: Date, 
    default: Date.now 
  },
  
  fechaVencimiento: { 
    type: Date, 
    required: true 
  },
  
  // Estado del cupón
  activo: { type: Boolean, default: true },
  
  // Razón de desactivación
  motivoDesactivacion: {
    type: String,
    enum: ['expirado', 'agotado', 'cancelado', 'fraude', 'otro']
  },
  
  // Prioridad para aplicación múltiple
  prioridad: {
    type: Number,
    default: 1,
    min: 1,
    max: 10
  }, // 1 = baja prioridad, 10 = alta prioridad
  
  // Configuración de combinación con otros cupones
  combinableConOtros: { type: Boolean, default: false },
  
  // Estadísticas de uso
  estadisticas: estadisticasUsoSchema,
  
  // Metadatos administrativos
  creadoPor: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: "Usuario" 
  },
  
  // Campaña o promoción asociada
  campana: {
    nombre: String,
    tipo: { type: String, enum: ['black_friday', 'navidad', 'dia_madre', 'apertura', 'fidelizacion', 'otro'] },
    objetivo: String // "Incrementar ventas plantas", "Liquidar inventario macetas"
  },
  
  // Para cupones automáticos del sistema
  esAutomatico: { type: Boolean, default: false },
  
  // Notas internas para el equipo
  notasInternas: { type: String },
  
  // Fechas de auditoría
  fechaCreacion: { type: Date, default: Date.now },
  fechaActualizacion: { type: Date, default: Date.now }
}, {
  timestamps: true
});

// ============================
// ÍNDICES PARA OPTIMIZACIÓN
// ============================
// El campo codigo ya tiene unique: true que crea índice automático
cuponSchema.index({ activo: 1, fechaVencimiento: 1 });
cuponSchema.index({ fechaInicio: 1, fechaVencimiento: 1 });
cuponSchema.index({ 'condiciones.categorias': 1 });
cuponSchema.index({ 'condiciones.segmentos': 1 });
cuponSchema.index({ prioridad: -1 }); // Para ordenar por prioridad
cuponSchema.index({ 'campana.tipo': 1 });

// ============================
// MIDDLEWARE PRE-SAVE
// ============================
cuponSchema.pre('save', function(next) {
  this.fechaActualizacion = new Date();
  
  // Convertir código a mayúsculas
  if (this.codigo) {
    this.codigo = this.codigo.toUpperCase();
  }
  
  // Validar que fechaVencimiento sea posterior a fechaInicio
  if (this.fechaVencimiento <= this.fechaInicio) {
    const error = new Error('La fecha de vencimiento debe ser posterior a la fecha de inicio');
    return next(error);
  }
  
  // Desactivar automáticamente si ha expirado
  if (this.fechaVencimiento < new Date() && this.activo) {
    this.activo = false;
    this.motivoDesactivacion = 'expirado';
  }
  
  next();
});

// ============================
// MÉTODOS DEL ESQUEMA
// ============================

// Verificar si el cupón es válido para un carrito específico
cuponSchema.methods.esValidoParaCarrito = function(carrito, usuario = null) {
  const errores = [];
  
  // Verificar si está activo
  if (!this.activo) {
    errores.push('El cupón no está activo');
  }
  
  // Verificar vigencia
  const ahora = new Date();
  if (ahora < this.fechaInicio) {
    errores.push('El cupón aún no está vigente');
  }
  if (ahora > this.fechaVencimiento) {
    errores.push('El cupón ha expirado');
  }
  
  // Verificar límite de usos
  if (this.condiciones.maxUsos && this.estadisticas.vecesUsado >= this.condiciones.maxUsos) {
    errores.push('El cupón ha alcanzado su límite de usos');
  }
  
  // Verificar monto mínimo
  if (carrito.totales.subtotal < this.condiciones.montoMinimo) {
    errores.push(`Monto mínimo requerido: $${this.condiciones.montoMinimo.toLocaleString()}`);
  }
  
  // Verificar categorías permitidas
  if (this.condiciones.categorias && this.condiciones.categorias.length > 0) {
    const categoriasCarrito = new Set();
    carrito.items.forEach(item => {
      if (item.productoId.categoria) {
        categoriasCarrito.add(item.productoId.categoria);
      }
    });
    
    const tieneCategoriasValidas = [...categoriasCarrito].some(cat => 
      this.condiciones.categorias.includes(cat)
    );
    
    if (!tieneCategoriasValidas) {
      errores.push(`Solo válido para: ${this.condiciones.categorias.join(', ')}`);
    }
  }
  
  // Verificar uso por usuario
  if (usuario && this.condiciones.maxUsosPorUsuario) {
    const usosUsuario = this.estadisticas.usuariosUsaron.filter(uso => 
      uso.usuarioId && uso.usuarioId.toString() === usuario._id.toString()
    ).length;
    
    if (usosUsuario >= this.condiciones.maxUsosPorUsuario) {
      errores.push('Ya has usado este cupón el máximo de veces permitidas');
    }
  }
  
  return errores;
};

// Calcular el descuento que aplicaría a un carrito
cuponSchema.methods.calcularDescuento = function(carrito) {
  let montoElegible = 0;
  
  // Calcular monto elegible según condiciones
  carrito.items.forEach(item => {
    let itemElegible = true;
    
    // Verificar categorías incluidas
    if (this.condiciones.categorias && this.condiciones.categorias.length > 0) {
      if (!this.condiciones.categorias.includes(item.productoId.categoria)) {
        itemElegible = false;
      }
    }
    
    // Verificar productos excluidos
    if (this.condiciones.productosExcluidos && this.condiciones.productosExcluidos.length > 0) {
      if (this.condiciones.productosExcluidos.includes(item.productoId._id)) {
        itemElegible = false;
      }
    }
    
    // Verificar productos incluidos específicamente
    if (this.condiciones.productosIncluidos && this.condiciones.productosIncluidos.length > 0) {
      if (!this.condiciones.productosIncluidos.includes(item.productoId._id)) {
        itemElegible = false;
      }
    }
    
    if (itemElegible) {
      montoElegible += item.precioUnitario * item.cantidad;
    }
  });
  
  // Calcular descuento
  let descuento = 0;
  if (this.tipo === 'porcentaje') {
    descuento = (montoElegible * this.valor) / 100;
    
    // Aplicar límite máximo si existe
    if (this.descuentoMaximo && descuento > this.descuentoMaximo) {
      descuento = this.descuentoMaximo;
    }
  } else if (this.tipo === 'fijo') {
    descuento = Math.min(this.valor, montoElegible);
  }
  
  return Math.round(descuento); // Redondear a entero
};

// Registrar uso del cupón
cuponSchema.methods.registrarUso = function(carrito, usuario = null, montoDescontado) {
  this.estadisticas.vecesUsado += 1;
  this.estadisticas.montoTotalDescontado += montoDescontado;
  this.estadisticas.ultimoUso = new Date();
  
  // Registrar usuario que lo usó
  this.estadisticas.usuariosUsaron.push({
    usuarioId: usuario?._id,
    sessionId: carrito.sessionId,
    fecha: new Date(),
    montoDescontado,
    carritoId: carrito._id
  });
  
  // Actualizar estadísticas por categoría
  const categoriasUsadas = new Set();
  carrito.items.forEach(item => {
    if (item.productoId.categoria) {
      categoriasUsadas.add(item.productoId.categoria);
    }
  });
  
  categoriasUsadas.forEach(categoria => {
    const estatCategoria = this.estadisticas.usosPorCategoria.find(
      u => u.categoria === categoria
    );
    if (estatCategoria) {
      estatCategoria.cantidad += 1;
    } else {
      this.estadisticas.usosPorCategoria.push({
        categoria,
        cantidad: 1
      });
    }
  });
  
  return this.save();
};

// Método estático para buscar cupones válidos para un carrito
cuponSchema.statics.buscarValidosParaCarrito = function(carrito, usuario = null) {
  const filtros = {
    activo: true,
    fechaInicio: { $lte: new Date() },
    fechaVencimiento: { $gt: new Date() }
  };
  
  return this.find(filtros)
    .sort({ prioridad: -1, fechaCreacion: -1 })
    .populate('condiciones.productosIncluidos condiciones.productosExcluidos');
};

export const Cupon = mongoose.model("Cupon", cuponSchema);