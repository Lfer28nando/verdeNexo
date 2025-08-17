//Importaciones:
import multer from 'multer';
import express from 'express';
import { ProductosController } from '../controllers/productos.controller.js';
import { verificarToken, soloAdmin } from '../middlewares/auth.js';

//Instancia de Entrutador:
const router = express.Router();

// Configuración de multer:
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/');
  },
  filename: function (req, file, cb) {
    const uniqueName = Date.now() + '-' + file.originalname;
    cb(null, uniqueName);
  }
});
const upload = multer({ storage: storage });

//Ruta publica: Productos
router.get('/', ProductosController.obtenerProductos);

//Ruta publica: producto por ID
router.get('/:id', ProductosController.obtenerProductoPorId);

// Ruta Privada: Crear producto: requiere token + rol admin
router.post('/', verificarToken, soloAdmin, upload.single('imagen'), ProductosController.crearProducto);

// Ruta Privada: Editar producto: requiere token + rol admin
router.put('/:id', verificarToken, soloAdmin, upload.single('imagen'), ProductosController.actualizarProducto);

// Ruta Privada: Eliminar producto: requiere token + rol admin
router.delete('/:id', verificarToken, soloAdmin, ProductosController.eliminarProducto);

export default router;