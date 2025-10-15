import { Router } from "express";
import multer from "multer";
import fs from "fs";
import path from "path";
import { getAllProducts, createProduct, editProduct, deleteProduct, configureVariants, updatePrices, verifyAvailability, updateSEO,downloadTechnicalSheet, searchProducts, filterProducts, getRelatedProducts, combineProducts, addProductTags, setProductVisibilityChannels, getProductById, uploadProductImage, sortProducts, rateProduct, uploadTechnicalSheet, deleteTechnicalSheet, getFeaturedProducts } from "../controllers/product.controller.js";
import { authRequired } from "../middlewares/validateToken.middleware.js";
const router = Router();

//Multer
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    if (file.mimetype === "application/pdf") {
      const dest = "uploads/fichas/";
      fs.mkdirSync(dest, { recursive: true });
      cb(null, dest);
    } else {
      const dest = "uploads/imagenes/";
      fs.mkdirSync(dest, { recursive: true });
      cb(null, dest);
    }
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname));
  }
});

const upload = multer({ storage });
//Rutas de productos

// Obtener todos los productos
router.get("/", getAllProducts);
// Rutas estáticas antes de la dinámica /:id (evita que "/search" sea capturado por ":id")
// Buscar productos
router.get("/search", searchProducts); //T
// Filtrar productos
router.get("/filter", filterProducts); //T
// Ordenar productos
router.get("/sort", sortProducts); //T
// Combinar productos
router.post("/combine", combineProducts); //T
// Obtener productos destacados
router.get("/featured", getFeaturedProducts);

// Operaciones que usan ID
// Obtener un producto por ID
router.get("/:id", getProductById); //T
// Crear un nuevo producto
router.post("/", upload.fields([
  { name: "imagenes", maxCount: 10 },
  { name: "fichaTecnica", maxCount: 1 }
]), createProduct); //T
// Editar un producto existente
router.put("/edit/:id", upload.fields([
  { name: "imagenes", maxCount: 10 },
  { name: "fichaTecnica", maxCount: 1 }
]), editProduct); //T
// Eliminar un producto
router.delete("/delete/:id", deleteProduct); //T
// Subir imagen
router.post("/:id/images", upload.single("image"), uploadProductImage); //T
// Configurar variantes
router.put("/:id/variants", configureVariants); //T
// Configurar precio base y listas de precios
router.put("/:id/prices", updatePrices); //T
// Verificar disponibilidad y stock
router.get("/:id/availability", verifyAvailability);  //T
// Actualizar SEO
router.put("/:id/seo", updateSEO); //T
// Descargar ficha técnica
router.get("/:id/technical-sheet", downloadTechnicalSheet); //T
// Subir ficha técnica (PDF)
router.post("/:id/technical-sheet", upload.single('file'), uploadTechnicalSheet);   //T
// Eliminar ficha técnica
router.delete("/:id/technical-sheet", deleteTechnicalSheet); //T
router.get("/:id/related", getRelatedProducts);
// Calificar
router.post("/:id/rate", authRequired, rateProduct); //T
// Agregar etiquetas
router.post("/:id/tags", addProductTags); //T
// Configurar canales de visibilidad
router.post("/:id/visibility", setProductVisibilityChannels); //T

//Exportar router
export default router;
