// models/carrito/zona-envio.model.js
import mongoose from "mongoose";

// ============================
// ESQUEMA PARA RESTRICCIONES ESPECÍFICAS (RF-CARRO-07)
// ============================
const restriccionSchema = new mongoose.Schema({
  tipo: { 
    type: String, 
    required: true,
    enum: [
      'peso_maximo',
      'volumen_maximo', 
      'macetas_grandes_limite',
      'plantas_delicadas_separadas',
      'productos_fragiles_limite',
      'distancia_maxima',
      'horario_restringido',
      'dia_semana_restringido'
    ]
  },
  
  limite: { 
    type: Number, 
    required: true 
  }, // Valor numérico del límite
  
  unidad: { 
    type: String, 
    enum: ['kg', 'gramos', 'unidades', 'cm3', 'litros', 'km', 'horas', 'dias'],
    required: true
  },
  
  descripcion: { 
    type: String, 
    required: true 
  }, // "Máximo 3 macetas grandes por envío", "No plantas delicadas con otros productos"
  
  accion: { 
    type: String, 
    enum: ['bloquear', 'envio_separado', 'cargo_adicional', 'confirmar_telefono'],
    default: 'bloquear'
  },
  
  cargoAdicional: { 
    type: Number, 
    default: 0 
  }, // Monto extra si la acción es 'cargo_adicional'
  
  activa: { 
    type: Boolean, 
    default: true 
  }
}, { _id: false });

// ============================
// ESQUEMA PARA TARIFAS POR TIPO DE PRODUCTO
// ============================
const tarifaProductoSchema = new mongoose.Schema({
  categoria: { 
    type: String, 
    required: true,
    enum: ['plantas', 'macetas', 'sustratos', 'combos', 'accesorios', 'herramientas']
  },
  
  tarifaBase: { 
    type: Number, 
    required: true,
    min: 0
  },
  
  tarifaPorKg: { 
    type: Number, 
    default: 0 
  },
  
  tarifaPorUnidad: { 
    type: Number, 
    default: 0 
  },
  
  // Recargos especiales para esta categoría
  recargoFragil: { 
    type: Number, 
    default: 0 
  }, // Para plantas delicadas, macetas de barro
  
  recargoVoluminoso: { 
    type: Number, 
    default: 0 
  }, // Para macetas grandes, sustratos
  
  // Descuentos por cantidad
  descuentosPorCantidad: [{
    cantidadMinima: { type: Number, required: true },
    porcentajeDescuento: { type: Number, required: true, min: 0, max: 100 }
  }]
}, { _id: false });

// ============================
// ESQUEMA PARA HORARIOS DE ENTREGA
// ============================
const horarioEntregaSchema = new mongoose.Schema({
  dia: { 
    type: Number, 
    required: true, 
    min: 0, 
    max: 6 
  }, // 0=domingo, 6=sábado
  
  horaInicio: { 
    type: String, 
    required: true,
    match: /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/ // HH:MM format
  },
  
  horaFin: { 
    type: String, 
    required: true,
    match: /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/
  },
  
  capacidadMaxima: { 
    type: Number, 
    default: 10 
  }, // Máximo de entregas en este horario
  
  recargoHorario: { 
    type: Number, 
    default: 0 
  } // Recargo por horario especial
}, { _id: false });

// ============================
// ESQUEMA PRINCIPAL DE ZONA DE ENVÍO
// ============================
const zonaEnvioSchema = new mongoose.Schema({
  // Identificación de la zona
  nombre: { 
    type: String, 
    required: true,
    unique: true,
    trim: true
  }, // "Norte Bogotá", "Centro Histórico", "Chapinero"
  
  codigo: {
    type: String,
    required: true,
    unique: true,
    uppercase: true,
    trim: true
  }, // "NORTE_BOG", "CENTRO_HIST", "CHAP"
  
  descripcion: { 
    type: String,
    trim: true
  },
  
  // Cobertura geográfica
  upzs: [{ 
    type: String,
    trim: true
  }], // ['Chapinero', 'Zona Rosa', 'Chicó', 'El Retiro']
  
  barrios: [{ 
    type: String,
    trim: true
  }], // Para cobertura más específica
  
  // Coordenadas del polígono de cobertura (para futuro)
  poligono: [{
    lat: { type: Number, required: true },
    lng: { type: Number, required: true }
  }],
  
  // Centro de la zona (para cálculos de distancia)
  centroGeografico: {
    lat: { type: Number, required: true },
    lng: { type: Number, required: true }
  },
  
  // ============================
  // TARIFAS BASE (RF-CARRO-05)
  // ============================
  tarifaBase: { 
    type: Number, 
    required: true,
    min: 0
  }, // Tarifa base sin importar el peso
  
  tarifaPorKg: { 
    type: Number, 
    default: 0 
  }, // Tarifa adicional por kilogramo
  
  tarifaPorKm: { 
    type: Number, 
    default: 0 
  }, // Tarifa por distancia desde el centro
  
  // Tarifas específicas por tipo de producto
  tarifasProductos: [tarifaProductoSchema],
  
  // ============================
  // RECARGOS ESPECIALES
  // ============================
  recargoFragiles: { 
    type: Number, 
    default: 0 
  }, // Para plantas delicadas, macetas de barro
  
  recargoVoluminosos: { 
    type: Number, 
    default: 0 
  }, // Para macetas grandes, sustratos
  
  recargoUrgente: { 
    type: Number, 
    default: 0 
  }, // Para entregas el mismo día
  
  recargoFinDeSemana: { 
    type: Number, 
    default: 0 
  },
  
  // ============================
  // LÍMITES GENERALES (RF-CARRO-07)
  // ============================
  pesoMaximo: { 
    type: Number, 
    default: 50000 
  }, // en gramos (50kg por defecto)
  
  volumenMaximo: { 
    type: Number, 
    default: 1000000 
  }, // en cm³ (1m³ por defecto)
  
  distanciaMaxima: {
    type: Number,
    default: 50
  }, // en kilómetros desde el centro
  
  // ============================
  // RESTRICCIONES ESPECÍFICAS (RF-CARRO-07)
  // ============================
  restricciones: [restriccionSchema],
  
  // ============================
  // CONFIGURACIÓN DE ENTREGA
  // ============================
  tiempoEntregaMin: { 
    type: Number, 
    default: 1 
  }, // días mínimos
  
  tiempoEntregaMax: { 
    type: Number, 
    default: 3 
  }, // días máximos
  
  entregaMismoDia: {
    disponible: { type: Boolean, default: false },
    horarioLimite: { type: String }, // "14:00" - Hora límite para pedidos mismo día
    recargo: { type: Number, default: 0 }
  },
  
  // Horarios de entrega disponibles
  horariosEntrega: [horarioEntregaSchema],
  
  // ============================
  // CONFIGURACIÓN AVANZADA
  // ============================
  
  // Envío gratuito por monto mínimo
  envioGratisPor: {
    montoMinimo: { type: Number },
    soloParaCategorias: [{ type: String }] // Solo para ciertas categorías
  },
  
  // Configuración para productos especiales
  manejoEspecial: {
    plantasDelicadas: {
      requiereEmpaqueEspecial: { type: Boolean, default: true },
      costoEmpaque: { type: Number, default: 0 },
      tiempoAdicional: { type: Number, default: 0 } // días adicionales
    },
    
    macetasGrandes: {
      maximoPorEnvio: { type: Number, default: 3 },
      requiereConfirmacion: { type: Boolean, default: true },
      costoManejo: { type: Number, default: 0 }
    },
    
    sustratos: {
      maximoKgPorEnvio: { type: Number, default: 100 },
      tarifaEspecialPorKg: { type: Number, default: 0 }
    }
  },
  
  // ============================
  // ESTADO Y METADATOS
  // ============================
  activa: { 
    type: Boolean, 
    default: true 
  },
  
  prioridad: {
    type: Number,
    default: 1,
    min: 1,
    max: 10
  }, // Para ordenar zonas en caso de solapamiento
  
  // Estadísticas de uso
  estadisticas: {
    totalEnvios: { type: Number, default: 0 },
    tiempoPromedioEntrega: { type: Number, default: 0 }, // en horas
    satisfaccionPromedio: { type: Number, default: 0 }, // 1-5 estrellas
    ultimoEnvio: { type: Date }
  },
  
  // Configuración temporal (promociones, etc.)
  promocionTemporal: {
    activa: { type: Boolean, default: false },
    descripcion: { type: String },
    descuentoPorcentaje: { type: Number, min: 0, max: 100 },
    fechaInicio: { type: Date },
    fechaFin: { type: Date }
  },
  
  // Metadatos administrativos
  creadoPor: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: "Usuario" 
  },
  
  notasInternas: { type: String },
  
  fechaCreacion: { type: Date, default: Date.now },
  fechaActualizacion: { type: Date, default: Date.now }
}, {
  timestamps: true
});

// ============================
// ÍNDICES PARA OPTIMIZACIÓN
// ============================
zonaEnvioSchema.index({ activa: 1 });
zonaEnvioSchema.index({ upzs: 1 });
zonaEnvioSchema.index({ barrios: 1 });
// El campo codigo ya tiene unique: true que crea índice automático
zonaEnvioSchema.index({ prioridad: -1 });
zonaEnvioSchema.index({ 'centroGeografico.lat': 1, 'centroGeografico.lng': 1 });

// ============================
// MIDDLEWARE PRE-SAVE
// ============================
zonaEnvioSchema.pre('save', function(next) {
  this.fechaActualizacion = new Date();
  
  // Convertir código a mayúsculas
  if (this.codigo) {
    this.codigo = this.codigo.toUpperCase();
  }
  
  next();
});

// ============================
// MÉTODOS DEL ESQUEMA
// ============================

// Calcular costo de envío para un carrito específico (RF-CARRO-05)
zonaEnvioSchema.methods.calcularCostoEnvio = function(carrito, direccion = null) {
  console.log('--- CALCULO ENVIO ---');
  console.log('tarifaBase:', this.tarifaBase);
  console.log('tarifaPorKg:', this.tarifaPorKg);
  console.log('recargoFragiles:', this.recargoFragiles);
  console.log('recargoVoluminosos:', this.recargoVoluminosos);
  console.log('carrito subtotal:', carrito.totales?.subtotal);
  console.log('carrito items:', carrito.items?.length);
  if (!this.activa) {
    throw new Error('La zona de envío no está activa');
  }
  
  let costoTotal = this.tarifaBase;
  let detalleCalculo = {
    tarifaBase: this.tarifaBase,
    recargos: [],
    descuentos: [],
    costoFinal: 0
  };
  
  // Calcular peso y volumen total
  let pesoTotal = 0;
  let volumenTotal = 0;
  let tieneFragiles = false;
  let tieneVoluminosos = false;
  
  const categorias = new Map();
  
  carrito.items.forEach(item => {
    // Simular peso y volumen (idealmente vendría del producto)
    const pesoItem = 500 * item.cantidad; // 500g por item
    const volumenItem = 1000 * item.cantidad; // 1000cm³ por item
    
    pesoTotal += pesoItem;
    volumenTotal += volumenItem;
    
    // Contar por categorías
    const categoria = item.productoId?.categoria || 'otros';
    categorias.set(categoria, (categorias.get(categoria) || 0) + item.cantidad);
    
    // Detectar productos especiales
    if (item.notas?.includes('frágil') || categoria === 'plantas') {
      tieneFragiles = true;
    }
    if (item.notas?.includes('voluminoso') || categoria === 'macetas') {
      tieneVoluminosos = true;
    }
  });
  
  // Aplicar tarifa por peso
  if (this.tarifaPorKg > 0) {
    const cargoKg = (pesoTotal / 1000) * this.tarifaPorKg;
    costoTotal += cargoKg;
    detalleCalculo.recargos.push({
      concepto: 'Peso',
      valor: cargoKg,
      detalle: `${(pesoTotal/1000).toFixed(2)}kg x $${this.tarifaPorKg}`
    });
  }
  
  // Aplicar recargos especiales
  if (tieneFragiles && this.recargoFragiles > 0) {
    costoTotal += this.recargoFragiles;
    detalleCalculo.recargos.push({
      concepto: 'Productos frágiles',
      valor: this.recargoFragiles
    });
  }
  
  if (tieneVoluminosos && this.recargoVoluminosos > 0) {
    costoTotal += this.recargoVoluminosos;
    detalleCalculo.recargos.push({
      concepto: 'Productos voluminosos',
      valor: this.recargoVoluminosos
    });
  }
  
  // Verificar envío gratuito
  if (this.envioGratisPor?.montoMinimo && carrito.totales.subtotal >= this.envioGratisPor.montoMinimo) {
    let esElegible = true;
    
    if (this.envioGratisPor.soloParaCategorias && this.envioGratisPor.soloParaCategorias.length > 0) {
      esElegible = [...categorias.keys()].some(cat => 
        this.envioGratisPor.soloParaCategorias.includes(cat)
      );
    }
    
    if (esElegible) {
      detalleCalculo.descuentos.push({
        concepto: 'Envío gratis',
        valor: costoTotal,
        detalle: `Compra mínima $${this.envioGratisPor.montoMinimo.toLocaleString()}`
      });
      costoTotal = 0;
    }
  }
  
  // Aplicar promoción temporal si está activa
  if (this.promocionTemporal.activa) {
    const ahora = new Date();
    if (ahora >= this.promocionTemporal.fechaInicio && ahora <= this.promocionTemporal.fechaFin) {
      const descuentoPromo = (costoTotal * this.promocionTemporal.descuentoPorcentaje) / 100;
      costoTotal -= descuentoPromo;
      detalleCalculo.descuentos.push({
        concepto: this.promocionTemporal.descripcion,
        valor: descuentoPromo
      });
    }
  }
  
  detalleCalculo.costoFinal = Math.max(0, Math.round(costoTotal));
  
  return {
    costo: detalleCalculo.costoFinal,
    pesoTotal,
    volumenTotal,
    tieneFragiles,
    tieneVoluminosos,
    detalleCalculo,
    tiempoEntregaMin: this.tiempoEntregaMin,
    tiempoEntregaMax: this.tiempoEntregaMax
  };
};

// Validar restricciones para un carrito (RF-CARRO-07)
zonaEnvioSchema.methods.validarRestricciones = function(carrito, direccion = null) {
  const errores = [];
  const advertencias = [];
  
  // Calcular métricas del carrito
  let pesoTotal = 0;
  let volumenTotal = 0;
  let macetasGrandes = 0;
  let plantasDelicadas = 0;
  
  carrito.items.forEach(item => {
    pesoTotal += 500 * item.cantidad; // Simular peso
    volumenTotal += 1000 * item.cantidad; // Simular volumen
    
    if (item.notas?.includes('maceta grande')) macetasGrandes += item.cantidad;
    if (item.notas?.includes('planta delicada')) plantasDelicadas += item.cantidad;
  });
  
  // Validar restricciones configuradas
  this.restricciones.forEach(restriccion => {
    if (!restriccion.activa) return;
    
    let valorActual = 0;
    
    switch (restriccion.tipo) {
      case 'peso_maximo':
        valorActual = pesoTotal;
        break;
      case 'volumen_maximo':
        valorActual = volumenTotal;
        break;
      case 'macetas_grandes_limite':
        valorActual = macetasGrandes;
        break;
      case 'plantas_delicadas_separadas':
        if (plantasDelicadas > 0 && carrito.items.length > plantasDelicadas) {
          if (restriccion.accion === 'bloquear') {
            errores.push(restriccion.descripcion);
          } else {
            advertencias.push(restriccion.descripcion);
          }
        }
        return;
    }
    
    if (valorActual > restriccion.limite) {
      const mensaje = `${restriccion.descripcion} (Actual: ${valorActual} ${restriccion.unidad}, Límite: ${restriccion.limite} ${restriccion.unidad})`;
      
      if (restriccion.accion === 'bloquear') {
        errores.push(mensaje);
      } else {
        advertencias.push(mensaje);
      }
    }
  });
  
  return { errores, advertencias };
};

// Método estático para buscar zona por UPZ o barrio
zonaEnvioSchema.statics.buscarPorUbicacion = function(upz = null, barrio = null) {
  const filtros = { activa: true };
  
  if (upz) {
    filtros.upzs = { $in: [upz] };
  }
  
  if (barrio) {
    filtros.barrios = { $in: [barrio] };
  }
  
  return this.find(filtros).sort({ prioridad: -1 });
};

// Método estático para obtener zonas por coordenadas (futuro)
zonaEnvioSchema.statics.buscarPorCoordenadas = function(lat, lng, radioKm = 50) {
  // Implementación futura para búsqueda geoespacial
  return this.find({ activa: true }).sort({ prioridad: -1 });
};

export const ZonaEnvio = mongoose.model("ZonaEnvio", zonaEnvioSchema);