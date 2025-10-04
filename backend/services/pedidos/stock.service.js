import mongoose from 'mongoose';
import { Producto } from '../../models/producto/producto.model.js';
import { EstadoPedido } from '../../models/pedidos/index.js';

class StockService {
  
  /**
   * Valida si hay suficiente stock para todos los productos del pedido
   * @param {Array} items - Items del pedido con productoId y cantidad
   * @returns {Object} - Resultado de la validación
   */
  async validarStockDisponible(items) {
    try {
      const resultados = [];
      let stockSuficiente = true;
      
      for (const item of items) {
        const producto = await Producto.findById(item.productoId);
        
        if (!producto) {
          stockSuficiente = false;
          resultados.push({
            productoId: item.productoId,
            nombre: 'Producto no encontrado',
            cantidadSolicitada: item.cantidad,
            stockDisponible: 0,
            suficiente: false,
            error: 'Producto no existe'
          });
          continue;
        }
        
        const suficiente = producto.stock >= item.cantidad;
        if (!suficiente) stockSuficiente = false;
        
        resultados.push({
          productoId: item.productoId,
          nombre: producto.nombre,
          cantidadSolicitada: item.cantidad,
          stockDisponible: producto.stock,
          suficiente,
          diferencia: suficiente ? 0 : item.cantidad - producto.stock
        });
      }
      
      return {
        stockSuficiente,
        detalles: resultados,
        mensaje: stockSuficiente ? 'Stock suficiente para todos los productos' : 'Stock insuficiente para algunos productos'
      };
      
    } catch (error) {
      console.error('Error al validar stock:', error);
      throw new Error('Error al validar disponibilidad de stock');
    }
  }
  
  /**
   * Descuenta stock de productos tras confirmación de pedido
   * @param {String} pedidoId - ID del pedido
   * @param {Array} items - Items del pedido
   * @param {String} usuarioId - ID del usuario que realiza la operación
   * @returns {Object} - Resultado de la operación
   */
  async descontarStock(pedidoId, items, usuarioId) {
    const session = await mongoose.startSession();
    session.startTransaction();
    
    try {
      const movimientos = [];
      
      // Validar stock antes de descontar
      const validacion = await this.validarStockDisponible(items);
      if (!validacion.stockSuficiente) {
        await session.abortTransaction();
        return {
          success: false,
          message: 'Stock insuficiente',
          detalles: validacion.detalles
        };
      }
      
      // Descontar stock de cada producto
      for (const item of items) {
        const producto = await Producto.findById(item.productoId).session(session);
        
        const stockAnterior = producto.stock;
        const nuevoStock = stockAnterior - item.cantidad;
        
        // Actualizar stock y registrar movimiento
        await Producto.findByIdAndUpdate(
          item.productoId,
          { 
            stock: nuevoStock,
            $push: {
              movimientosStock: {
                tipo: 'venta',
                cantidad: -item.cantidad,
                stockAnterior,
                stockNuevo: nuevoStock,
                motivo: `Venta - Pedido ${pedidoId}`,
                fecha: new Date(),
                usuario: usuarioId,
                referencia: pedidoId,
                referenciaTipo: 'pedido'
              }
            }
          },
          { session }
        );
        
        movimientos.push({
          productoId: item.productoId,
          nombre: producto.nombre,
          cantidadDescontada: item.cantidad,
          stockAnterior,
          stockNuevo: nuevoStock
        });
      }
      
      await session.commitTransaction();
      
      return {
        success: true,
        message: 'Stock descontado exitosamente',
        movimientos
      };
      
    } catch (error) {
      await session.abortTransaction();
      console.error('Error al descontar stock:', error);
      throw new Error('Error al procesar descuento de stock');
    } finally {
      session.endSession();
    }
  }
  
  /**
   * Restaura stock cuando se cancela un pedido
   * @param {String} pedidoId - ID del pedido
   * @param {Array} items - Items del pedido
   * @param {String} usuarioId - ID del usuario que realiza la operación
   * @returns {Object} - Resultado de la operación
   */
  async restaurarStock(pedidoId, items, usuarioId) {
    const session = await mongoose.startSession();
    session.startTransaction();
    
    try {
      const movimientos = [];
      
      for (const item of items) {
        const producto = await Producto.findById(item.productoId).session(session);
        
        if (!producto) {
          console.warn(`Producto ${item.productoId} no encontrado para restaurar stock`);
          continue;
        }
        
        const stockAnterior = producto.stock;
        const nuevoStock = stockAnterior + item.cantidad;
        
        // Actualizar stock y registrar movimiento
        await Producto.findByIdAndUpdate(
          item.productoId,
          { 
            stock: nuevoStock,
            $push: {
              movimientosStock: {
                tipo: 'devolucion',
                cantidad: item.cantidad,
                stockAnterior,
                stockNuevo: nuevoStock,
                motivo: `Cancelación/Devolución - Pedido ${pedidoId}`,
                fecha: new Date(),
                usuario: usuarioId,
                referencia: pedidoId,
                referenciaTipo: 'pedido'
              }
            }
          },
          { session }
        );
        
        movimientos.push({
          productoId: item.productoId,
          nombre: producto.nombre,
          cantidadRestaurada: item.cantidad,
          stockAnterior,
          stockNuevo: nuevoStock
        });
      }
      
      await session.commitTransaction();
      
      return {
        success: true,
        message: 'Stock restaurado exitosamente',
        movimientos
      };
      
    } catch (error) {
      await session.abortTransaction();
      console.error('Error al restaurar stock:', error);
      throw new Error('Error al procesar restauración de stock');
    } finally {
      session.endSession();
    }
  }
  
  /**
   * Obtiene el historial de movimientos de stock para un pedido específico
   * @param {String} pedidoId - ID del pedido
   * @returns {Array} - Movimientos de stock relacionados
   */
  async obtenerMovimientosPorPedido(pedidoId) {
    try {
      const productos = await Producto.find(
        { 'movimientosStock.referencia': pedidoId },
        { 
          _id: 1,
          nombre: 1,
          'movimientosStock.$': 1 
        }
      );
      
      return productos.map(producto => ({
        productoId: producto._id,
        nombre: producto.nombre,
        movimientos: producto.movimientosStock.filter(
          mov => mov.referencia.toString() === pedidoId
        )
      }));
      
    } catch (error) {
      console.error('Error al obtener movimientos:', error);
      throw new Error('Error al consultar movimientos de stock');
    }
  }
  
  /**
   * Verifica stock bajo y genera alertas
   * @param {Number} umbralMinimo - Stock mínimo para generar alerta
   * @returns {Array} - Productos con stock bajo
   */
  async verificarStockBajo(umbralMinimo = 5) {
    try {
      const productosStockBajo = await Producto.find(
        { 
          stock: { $lte: umbralMinimo },
          activo: true 
        },
        { 
          _id: 1,
          nombre: 1,
          stock: 1,
          categoria: 1,
          precio: 1
        }
      ).populate('categoria', 'nombre');
      
      return productosStockBajo.map(producto => ({
        productoId: producto._id,
        nombre: producto.nombre,
        stockActual: producto.stock,
        categoria: producto.categoria?.nombre,
        precio: producto.precio,
        nivelCritico: producto.stock === 0 ? 'agotado' : 'bajo'
      }));
      
    } catch (error) {
      console.error('Error al verificar stock bajo:', error);
      throw new Error('Error al verificar niveles de stock');
    }
  }
  
  /**
   * Calcula la rotación de inventario por producto
   * @param {String} productoId - ID del producto (opcional)
   * @param {Number} diasPeriodo - Período en días para el cálculo
   * @returns {Array} - Datos de rotación
   */
  async calcularRotacionInventario(productoId = null, diasPeriodo = 30) {
    try {
      const fechaInicio = new Date();
      fechaInicio.setDate(fechaInicio.getDate() - diasPeriodo);
      
      const filtro = { activo: true };
      if (productoId) {
        filtro._id = productoId;
      }
      
      const productos = await Producto.find(filtro);
      
      const rotaciones = [];
      
      for (const producto of productos) {
        // Calcular ventas en el período
        const movimientosVenta = producto.movimientosStock.filter(
          mov => mov.tipo === 'venta' && 
                 mov.fecha >= fechaInicio && 
                 mov.cantidad < 0
        );
        
        const totalVendido = movimientosVenta.reduce(
          (sum, mov) => sum + Math.abs(mov.cantidad), 0
        );
        
        const stockPromedio = (producto.stock + totalVendido) / 2;
        const rotacion = stockPromedio > 0 ? totalVendido / stockPromedio : 0;
        
        rotaciones.push({
          productoId: producto._id,
          nombre: producto.nombre,
          stockActual: producto.stock,
          ventasPeriodo: totalVendido,
          stockPromedio: Math.round(stockPromedio * 100) / 100,
          rotacion: Math.round(rotacion * 100) / 100,
          diasInventario: rotacion > 0 ? Math.round(diasPeriodo / rotacion) : null
        });
      }
      
      return rotaciones.sort((a, b) => b.rotacion - a.rotacion);
      
    } catch (error) {
      console.error('Error al calcular rotación:', error);
      throw new Error('Error al calcular rotación de inventario');
    }
  }
  
  /**
   * Genera reporte de stock por categoría
   * @returns {Array} - Resumen por categoría
   */
  async generarReporteStockPorCategoria() {
    try {
      const pipeline = [
        {
          $match: { activo: true }
        },
        {
          $lookup: {
            from: 'categorias',
            localField: 'categoria',
            foreignField: '_id',
            as: 'categoriaInfo'
          }
        },
        {
          $unwind: {
            path: '$categoriaInfo',
            preserveNullAndEmptyArrays: true
          }
        },
        {
          $group: {
            _id: '$categoria',
            nombreCategoria: { $first: '$categoriaInfo.nombre' },
            totalProductos: { $sum: 1 },
            stockTotal: { $sum: '$stock' },
            valorInventario: { $sum: { $multiply: ['$stock', '$precio'] } },
            stockPromedio: { $avg: '$stock' },
            productosStockBajo: {
              $sum: { $cond: [{ $lte: ['$stock', 5] }, 1, 0] }
            },
            productosAgotados: {
              $sum: { $cond: [{ $eq: ['$stock', 0] }, 1, 0] }
            }
          }
        },
        {
          $sort: { valorInventario: -1 }
        }
      ];
      
      return await Producto.aggregate(pipeline);
      
    } catch (error) {
      console.error('Error al generar reporte por categoría:', error);
      throw new Error('Error al generar reporte de stock');
    }
  }
}

export default new StockService();