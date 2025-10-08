// routes/carrito.routes.js
import { Router } from "express";
import {
  // RF-CARRO-01: Crear y mantener carrito
  obtenerCarrito,
  
  // RF-CARRO-02: Agregar productos
  agregarItem,
  
  // RF-CARRO-03: Modificar cantidades y eliminar
  actualizarCantidad,
  eliminarItem,
  vaciarCarrito,
  
  // RF-CARRO-04: Aplicar cupones
  aplicarCupon,
  removerCupon,
  
  // RF-CARRO-05: Calcular envío
  calcularEnvio,
  
  // RF-CARRO-06: Guardar para después
  guardarParaDespues,
  obtenerCarritosGuardados,
  
  // RF-CARRO-07: Validar límites
  validarLimitesCarrito,
  
  // RF-CARRO-08: Calcular totales
  recalcularTotales,
  
  // Funciones auxiliares
  obtenerEstadisticas
} from "../../controllers/carrito.controller.js";

// Middleware de autenticación (opcional para algunas rutas)
import { verificarToken } from "../middlewares/auth.js";

const router = Router();

// ============================
// RF-CARRO-01 - GESTIÓN BÁSICA DEL CARRITO
// ============================

// Obtener carrito por sessionId (crear si no existe)
// GET /api/carrito/:sessionId
router.get("/:sessionId", obtenerCarrito);

// Obtener estadísticas del carrito
// GET /api/carrito/:sessionId/estadisticas
router.get("/:sessionId/estadisticas", obtenerEstadisticas);

// ============================
// RF-CARRO-02 - GESTIÓN DE ITEMS
// ============================

// Agregar producto al carrito
// POST /api/carrito/item
// Body: { sessionId, productoId, cantidad, variante?, esCombos?, comboItems?, notas? }
router.post("/item", agregarItem);

// ============================
// RF-CARRO-03 - MODIFICAR Y ELIMINAR ITEMS
// ============================

// Actualizar cantidad de un item específico
// PUT /api/carrito/:sessionId/item/:itemId
// Body: { cantidad }
router.put("/:sessionId/item/:itemId", actualizarCantidad);

// Eliminar item específico del carrito
// DELETE /api/carrito/:sessionId/item/:itemId
router.delete("/:sessionId/item/:itemId", eliminarItem);

// Vaciar carrito completamente
// DELETE /api/carrito/:sessionId/vaciar
router.delete("/:sessionId/vaciar", vaciarCarrito);

// ============================
// RF-CARRO-04 - GESTIÓN DE CUPONES
// ============================

// Aplicar cupón de descuento
// POST /api/carrito/cupon
// Body: { sessionId, codigo }
router.post("/cupon", aplicarCupon);

// Remover cupón específico
// DELETE /api/carrito/:sessionId/cupon/:codigo
router.delete("/:sessionId/cupon/:codigo", removerCupon);

// ============================
// RF-CARRO-05 - CÁLCULO DE ENVÍO
// ============================

// Calcular costo de envío
// POST /api/carrito/envio
// Body: { sessionId, upz, barrio?, direccion? }
router.post("/envio", calcularEnvio);

// ============================
// RF-CARRO-06 - GUARDAR PARA DESPUÉS
// ============================

// Guardar carrito para después
// POST /api/carrito/:sessionId/guardar
// Body: { nombre?, notas? }
router.post("/:sessionId/guardar", guardarParaDespues);

// Obtener carritos guardados (requiere autenticación o sessionId)
// GET /api/carrito/guardados?sessionId=xxx
// o con token: GET /api/carrito/guardados
router.get("/guardados", obtenerCarritosGuardados);

// ============================
// RF-CARRO-07 - VALIDACIÓN DE LÍMITES
// ============================

// Validar límites y restricciones del carrito
// GET /api/carrito/:sessionId/validar
router.get("/:sessionId/validar", validarLimitesCarrito);

// ============================
// RF-CARRO-08 - CÁLCULO DE TOTALES
// ============================

// Recalcular totales manualmente
// POST /api/carrito/:sessionId/recalcular
router.post("/:sessionId/recalcular", recalcularTotales);

// ============================
// RUTAS ESPECIALES PARA ADMINISTRACIÓN
// ============================

// Rutas que requieren autenticación de administrador
// (Se pueden agregar middleware específicos después)

// Obtener todos los carritos abandonados (para admins)
// GET /api/carrito/admin/abandonados
router.get("/admin/abandonados", verificarToken, async (req, res) => {
  try {
    // Solo admins pueden ver carritos abandonados
    if (req.usuario.rol !== 'admin') {
      return res.status(403).json({
        ok: false,
        error: "Acceso denegado. Solo administradores."
      });
    }

    const { Carrito } = await import("../models/carrito/index.js");
    
    const carritosAbandonados = await Carrito.find({
      estado: 'abandonado',
      ultimaActividad: { 
        $lt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) // 7 días atrás
      }
    })
    .populate('items.productoId')
    .sort({ ultimaActividad: -1 })
    .limit(100);

    res.json({
      ok: true,
      data: carritosAbandonados,
      total: carritosAbandonados.length
    });

  } catch (error) {
    res.status(400).json({
      ok: false,
      error: error.message
    });
  }
});

// Estadísticas generales de carritos (para admins)
// GET /api/carrito/admin/estadisticas
router.get("/admin/estadisticas", verificarToken, async (req, res) => {
  try {
    // Solo admins pueden ver estadísticas generales
    if (req.usuario.rol !== 'admin') {
      return res.status(403).json({
        ok: false,
        error: "Acceso denegado. Solo administradores."
      });
    }

    const { Carrito } = await import("../models/carrito/index.js");
    
    const ahora = new Date();
    const hace24h = new Date(ahora.getTime() - 24 * 60 * 60 * 1000);
    const hace7d = new Date(ahora.getTime() - 7 * 24 * 60 * 60 * 1000);

    const estadisticas = await Promise.all([
      // Carritos activos
      Carrito.countDocuments({ estado: 'activo' }),
      
      // Carritos creados en las últimas 24h
      Carrito.countDocuments({ 
        fechaCreacion: { $gte: hace24h },
        estado: 'activo'
      }),
      
      // Carritos abandonados (sin actividad en 7 días)
      Carrito.countDocuments({
        ultimaActividad: { $lt: hace7d },
        estado: 'activo'
      }),
      
      // Carritos guardados
      Carrito.countDocuments({ estado: 'guardado' }),
      
      // Carritos convertidos (completados)
      Carrito.countDocuments({ estado: 'convertido' }),
      
      // Valor promedio de carritos activos
      Carrito.aggregate([
        { $match: { estado: 'activo', 'totales.total': { $gt: 0 } } },
        { $group: { _id: null, promedio: { $avg: '$totales.total' } } }
      ])
    ]);

    const [
      carritosActivos,
      carritosNuevos24h,
      carritosAbandonados,
      carritosGuardados,
      carritosConvertidos,
      valorPromedio
    ] = estadisticas;

    res.json({
      ok: true,
      data: {
        carritosActivos,
        carritosNuevos24h,
        carritosAbandonados,
        carritosGuardados,
        carritosConvertidos,
        valorPromedioCarrito: valorPromedio[0]?.promedio || 0,
        tasaAbandonoPorcentaje: carritosActivos > 0 
          ? Math.round((carritosAbandonados / carritosActivos) * 100) 
          : 0
      }
    });

  } catch (error) {
    res.status(400).json({
      ok: false,
      error: error.message
    });
  }
});

// Limpiar carritos abandonados (tarea de mantenimiento)
// POST /api/carrito/admin/limpiar-abandonados
router.post("/admin/limpiar-abandonados", verificarToken, async (req, res) => {
  try {
    // Solo admins pueden ejecutar tareas de limpieza
    if (req.usuario.rol !== 'admin') {
      return res.status(403).json({
        ok: false,
        error: "Acceso denegado. Solo administradores."
      });
    }

    const { diasAbandonado = 30 } = req.body;
    const { Carrito } = await import("../models/carrito/index.js");
    
    const resultado = await Carrito.limpiarAbandonados(diasAbandonado);

    res.json({
      ok: true,
      data: {
        carritosActualizados: resultado.modifiedCount,
        mensaje: `${resultado.modifiedCount} carritos marcados como abandonados`
      }
    });

  } catch (error) {
    res.status(400).json({
      ok: false,
      error: error.message
    });
  }
});

// ============================
// MIDDLEWARE DE ERROR ESPECÍFICO PARA CARRITOS
// ============================

// Middleware para manejar errores específicos del carrito
router.use((error, req, res, next) => {
  console.error('Error en rutas de carrito:', error);

  // Errores específicos del carrito
  if (error.name === 'ValidationError') {
    return res.status(400).json({
      ok: false,
      error: 'Datos de carrito inválidos',
      detalles: error.message
    });
  }

  if (error.name === 'CastError') {
    return res.status(400).json({
      ok: false,
      error: 'ID de carrito o item inválido'
    });
  }

  // Error genérico
  res.status(500).json({
    ok: false,
    error: 'Error interno del servidor en módulo de carrito',
    mensaje: process.env.NODE_ENV === 'development' ? error.message : 'Error interno'
  });
});

export default router;