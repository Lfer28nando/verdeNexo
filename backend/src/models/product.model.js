//Imports:
import mongoose from "mongoose";


//Schemas:
 //Esquema para las variantes del producto (tamaño, color, etc.)
const varianteSchema = new mongoose.Schema({
    atributo: { type: String, required: true }, //ej "Color", "Tamaño"
    valor: { type: String, required: true }, //es el valor del atributo, ej "Rojo", "XL"
    precioAdicional: { type: Number, required: false, default: 0 }, //precio adicional por esta variante
    stock: { type: Number, required: true, default: 0 } //stock específico para esta variante
}, { _id: false });

 //Esquema para las listas de precios por canal de venta
const listaPreciosSchema = new mongoose.Schema({
    canal: { type: String, required: true }, //ej "Retail", "Mayorista"
    precio: { type: Number, required: true }, //precio para este canal
}, { _id: false });

 //Esquema para las calificaciones y reseñas de productos
const calificacionSchema = new mongoose.Schema({
  usuarioId: { type: mongoose.Schema.Types.ObjectId, ref: "Usuario" }, //referencia al usuario que hizo la reseña
  estrellas: { type: Number, min: 1, max: 5 }, //calificación de 1 a 5
  comentario: { type: String }, //comentario de la reseña
  fecha: { type: Date, default: Date.now } //fecha de la reseña
}, { _id: false });

    //Esquema principal de Producto
const productoSchema = new mongoose.Schema({
  nombre: { type: String, required: true }, //name del producto
  descripcion: { type: String }, //descripción detallada del producto
  precioBase: { type: Number, required: true }, //precio base sin variantes ni descuentos
  disponibilidad: { type: Boolean, default: true }, //si el producto está disponible para la venta
  stock: { type: Number, default: 0 }, //cantidad en inventario

  // RF-PROD-04
  imagenes: [{ type: String }], // nombre de la imagnen o URL
  fichaTecnica: { type: String }, // archivo PDF u otro

  // RF-PROD-05
  variantes: [varianteSchema], // array de variantes que lee el esquema definido arriba para variantes del producto (tamaño, color, etc.)

  // RF-PROD-06
  listasPrecios: [listaPreciosSchema], // array de listas de precios por canal de venta que lee el esquema definido arriba

  // RF-PROD-08 // sirve para SEO y URLs amigables, para ser usado en rutas tipo /producto/nombre-del-producto
  seo: {
    slug: { type: String, unique: true }, // URL amigable generado a partir del nombre
    metaTitulo: { type: String }, // título para SEO
    metaDescripcion: { type: String } // descripción para SEO
  },

  // RF-PROD-15
  calificaciones: [calificacionSchema], // array de calificaciones y reseñas que lee el esquema definido arriba

  // RF-PROD-16
  etiquetas: [{ type: String }], // ej: ['nuevo', 'oferta', 'popular']

  // RF-PROD-17
  canalesVisibilidad: [{ type: String }], // ej: ['web', 'app']

  // Extras para filtros y relaciones
  categoria: { type: String }, // categoría del producto
  relacionados: [{ type: mongoose.Schema.Types.ObjectId, ref: "Producto" }], // productos relacionados

  creadoEn: { type: Date, default: Date.now }, // fecha de creación
  actualizadoEn: { type: Date, default: Date.now }// fecha de última actualización
}, {
  timestamps: true
});

// Pre-save para slug (sirve para que  
productoSchema.pre("save", function(next) {
  if (!this.seo.slug && this.nombre) {
    this.seo.slug = this.nombre.toLowerCase()
      .normalize("NFD").replace(/[\u0300-\u036f]/g, "") // quitar acentos
      .replace(/\s+/g, "-"); // espacios por guiones
  }
  next();
});

// Indexaciones RF-10 y RF-11

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