// Importaciones:
import { productoModel } from '../models/producto.model.js';

export class ProductosController {
    // Obtener todos los productos
  static async obtenerProductos(req, res) {
    try {
      const productos = await productoModel.getAll();
      res.status(200).json({
        success: true,
        data: productos,
        message: 'Productos obtenidos exitosamente'
      });
    } catch (error) {
      console.error('Error al obtener productos:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        error: error.message
      });
    }
  }

  // Obtener producto por ID
  static async obtenerProductoPorId(req, res) {
    try {
      const { id } = req.params;
      const producto = await productoModel.getById(id);
      res.status(200).json({
        success: true,
        data: producto,
        message: 'Producto obtenido exitosamente'
      });
    } catch (error) {
      console.error('Error al obtener producto:', error);
      const statusCode = error.message.includes('no válido') || error.message.includes('no encontrado') ? 404 : 500;
      res.status(statusCode).json({
        success: false,
        message: error.message
      });
    }
  }

  // Crear nuevo producto
  static async crearProducto(req, res) {
    try {
      const { nombre, precio, disponibilidad } = req.body;
      const imagen = req.file ? req.file.filename : null;

      // Validaciones básicas
      if (!nombre || !precio) {
        return res.status(400).json({
          success: false,
          message: 'Nombre y precio son campos obligatorios'
        });
      }

      const nuevoProducto = await productoModel.create({
        nombre,
        precio: Number(precio),
        disponibilidad: disponibilidad === 'true' || disponibilidad === true,
        imagen
      });

      res.status(201).json({
        success: true,
        data: nuevoProducto,
        message: 'Producto creado exitosamente'
      });
    } catch (error) {
      console.error('Error al crear producto:', error);
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  }

  // Actualizar producto
  static async actualizarProducto(req, res) {
    try {
      const { id } = req.params;
      const data = { ...req.body };
      
      // Convertir tipos de datos
      if (data.precio) data.precio = Number(data.precio);
      if (data.disponibilidad !== undefined) {
        data.disponibilidad = data.disponibilidad === 'true' || data.disponibilidad === true;
      }

      // Si hay nueva imagen, agregarla a los datos
      if (req.file) {
        data.imagen = req.file.filename;
      }

      const productoActualizado = await productoModel.update(id, data);
      
      res.status(200).json({
        success: true,
        data: productoActualizado,
        message: 'Producto actualizado exitosamente'
      });
    } catch (error) {
      console.error('Error al actualizar producto:', error);
      const statusCode = error.message.includes('no válido') || error.message.includes('no encontrado') ? 404 : 400;
      res.status(statusCode).json({
        success: false,
        message: error.message
      });
    }
  }

  // Eliminar producto
  static async eliminarProducto(req, res) {
    try {
      const { id } = req.params;
      await productoModel.delete(id);
      
      res.status(200).json({
        success: true,
        message: 'Producto eliminado exitosamente'
      });
    } catch (error) {
      console.error('Error al eliminar producto:', error);
      const statusCode = error.message.includes('no válido') || error.message.includes('no encontrado') ? 404 : 500;
      res.status(statusCode).json({
        success: false,
        message: error.message
      });
    }
  }
}