import { Router } from "express";
import multer from "multer";
import path from "path";
import { Producto } from "../models/producto/index.js";
import {
  obtenerProductos,
  crearProducto,
  editarProducto,
  eliminarProducto,
  subirImagen,
  agregarVariante,
  actualizarPrecios,
  verificarDisponibilidad,
  actualizarSEO,
  descargarFichaTecnica,
  buscarProductos,
  filtrarProductos,
  ordenarProductos,
  obtenerRelacionados,
  combinarProductos,
  calificarProducto,
  agregarEtiqueta,
  actualizarVisibilidad
} from "../controllers/productos.controller.js";

const router = Router();

// ============================
// Configuración de Multer (subida de archivos)
// ============================
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    if (file.mimetype === "application/pdf") {
      cb(null, "uploads/fichas/");
    } else {
      cb(null, "uploads/imagenes/");
    }
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname));
  }
});

const upload = multer({ storage });

// ============================
// Rutas de productos
// ============================

// RF-PROD-00 - Obtener todos los productos
router.get("/", obtenerProductos);

// RF-PROD-00B - Obtener producto por ID
router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const producto = await Producto.findById(id);
    
    if (!producto) {
      return res.status(404).json({
        ok: false,
        error: 'Producto no encontrado'
      });
    }

    res.json({
      ok: true,
      data: producto
    });
  } catch (error) {
    res.status(500).json({
      ok: false,
      error: error.message
    });
  }
});

// RF-PROD-01 - Registrar
router.post("/", crearProducto);

// RF-PROD-02 - Editar
router.put("/:id", editarProducto);

// RF-PROD-03 - Eliminar
router.delete("/:id", eliminarProducto);

// RF-PROD-04 - Cargar imágenes
router.post("/:id/imagenes", upload.single("imagen"), subirImagen);

// RF-PROD-05 - Variantes
router.post("/:id/variantes", agregarVariante);

// RF-PROD-06 - Precio base y listas
router.put("/:id/precios", actualizarPrecios);

// RF-PROD-07 - Disponibilidad
router.get("/:id/disponibilidad", verificarDisponibilidad);

// RF-PROD-08 - SEO
router.put("/:id/seo", actualizarSEO);

// RF-PROD-09 - Descargar ficha técnica
router.get("/:id/ficha", descargarFichaTecnica);

// RF-PROD-10 - Búsqueda
router.get("/buscar", buscarProductos);

// RF-PROD-11 - Filtros
router.get("/filtrar", filtrarProductos);

// RF-PROD-12 - Ordenar
router.get("/ordenar", ordenarProductos);

// RF-PROD-13 - Relacionados
router.get("/:id/relacionados", obtenerRelacionados);

// RF-PROD-14 - Combinar productos
router.post("/combinar", combinarProductos);

// RF-PROD-15 - Calificar
router.post("/:id/calificar", calificarProducto);

// RF-PROD-16 - Etiquetas
router.post("/:id/etiquetas", agregarEtiqueta);

// RF-PROD-17 - Visibilidad por canal
router.put("/:id/visibilidad", actualizarVisibilidad);

export default router;