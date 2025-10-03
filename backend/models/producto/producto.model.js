// models/producto/producto.model.js
import mongoose from "mongoose";

const varianteSchema = new mongoose.Schema({
  atributo: { type: String, required: true }, // ej: talla, color
  valor: { type: String, required: true },    // ej: M, rojo
  precio: { type: Number, default: 0 },
  stock: { type: Number, default: 0 }
}, { _id: false });

const listaPrecioSchema = new mongoose.Schema({
  canal: { type: String, required: true }, // ej: web, app, marketplace
  precio: { type: Number, required: true }
}, { _id: false });

const calificacionSchema = new mongoose.Schema({
  usuarioId: { type: mongoose.Schema.Types.ObjectId, ref: "Usuario" },
  estrellas: { type: Number, min: 1, max: 5 },
  comentario: { type: String },
  fecha: { type: Date, default: Date.now }
}, { _id: false });

const productoSchema = new mongoose.Schema({
  nombre: { type: String, required: true },
  descripcion: { type: String },
  precioBase: { type: Number, required: true },
  disponibilidad: { type: Boolean, default: true },

  // RF-PROD-04
  imagenes: [{ type: String }], // nombre de archivo
  fichaTecnica: { type: String }, // archivo PDF u otro

  // RF-PROD-05
  variantes: [varianteSchema],

  // RF-PROD-06
  listasPrecios: [listaPrecioSchema],

  // RF-PROD-08
  seo: {
    slug: { type: String, unique: true },
    metaTitulo: { type: String },
    metaDescripcion: { type: String }
  },

  // RF-PROD-15
  calificaciones: [calificacionSchema],

  // RF-PROD-16
  etiquetas: [{ type: String }],

  // RF-PROD-17
  canalesVisibilidad: [{ type: String }], // ej: ['web', 'app']

  // Extras para filtros y relaciones
  categoria: { type: String },
  relacionados: [{ type: mongoose.Schema.Types.ObjectId, ref: "Producto" }],

  creadoEn: { type: Date, default: Date.now },
  actualizadoEn: { type: Date, default: Date.now }
}, {
  timestamps: true
});

// ============================
// Pre-save para slug
// ============================
productoSchema.pre("save", function(next) {
  if (!this.seo.slug && this.nombre) {
    this.seo.slug = this.nombre.toLowerCase()
      .normalize("NFD").replace(/[\u0300-\u036f]/g, "") // quitar acentos
      .replace(/\s+/g, "-"); // espacios por guiones
  }
  next();
});

// ============================
// Indexaciones RF-10 y RF-11
// ============================

// RF-10: búsqueda de texto
productoSchema.index({
  nombre: "text",
  descripcion: "text",
  categoria: "text",
  "seo.metaTitulo": "text",
  "seo.metaDescripcion": "text"
});

// RF-11: filtros comunes
productoSchema.index({ categoria: 1 });
productoSchema.index({ disponibilidad: 1 });
productoSchema.index({ precioBase: 1 });

export const Producto = mongoose.model("Producto", productoSchema);