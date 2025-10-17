import { Router } from "express";
import {
  obtenerCarrito,
  agregarItem,
  actualizarCantidad,
  eliminarItem,
  vaciarCarrito,
  aplicarCupon,
  removerCupon,
  calcularEnvio,
  guardarParaDespues,
  obtenerCarritosGuardados,
  validarLimitesCarrito,
  recalcularTotales,
  obtenerEstadisticas,
  ejecutarLimpiezaCarritos,
  validarCarritoLocalStorage,
  migrarCarritoLocalStorage
} from "../controllers/shopCar.controller.js";
import { authRequired } from "../middlewares/validateToken.middleware.js";
import { generalLimiter } from "../middlewares/rateLimiter.middleware.js";

const router = Router();

// Aplicar rate limiter general a todas las rutas del carrito
router.use(generalLimiter);

// ============================
// RUTAS DEL CARRITO DE COMPRAS
// ============================

// RF-CARRO-01 - Obtener o crear carrito
router.get('/:sessionId', obtenerCarrito);

// RF-CARRO-02 - Agregar productos al carrito
router.post('/item', agregarItem);

// RF-CARRO-03 - Actualizar cantidad de un item
router.put('/item/:sessionId/:itemId', actualizarCantidad);

// RF-CARRO-03 - Eliminar item del carrito
router.delete('/item/:sessionId/:itemId', eliminarItem);

// RF-CARRO-03 - Vaciar carrito completamente
router.delete('/:sessionId', vaciarCarrito);

// RF-CARRO-04 - Aplicar cupón
router.post('/coupon', aplicarCupon);

// RF-CARRO-04 - Remover cupón
router.delete('/coupon/:sessionId/:codigo', removerCupon);

// RF-CARRO-05 - Calcular precio de envío
router.post('/shipping', calcularEnvio);

// RF-CARRO-06 - Guardar carrito para después (requiere autenticación)
router.post('/:sessionId/save', authRequired, guardarParaDespues);

// RF-CARRO-06 - Obtener carritos guardados (requiere autenticación)
router.get('/saved/list', authRequired, obtenerCarritosGuardados);

// RF-CARRO-07 - Validar límites del carrito
router.get('/:sessionId/validate', validarLimitesCarrito);

// RF-CARRO-08 - Recalcular totales
router.post('/:sessionId/recalculate', recalcularTotales);

// FUNCIONES AUXILIARES - Estadísticas del carrito
router.get('/:sessionId/stats', obtenerEstadisticas);

// CARRITOS DE USUARIOS ANÓNIMOS
// Validar carrito desde localStorage (sin guardar en BD)
router.post('/validate-localstorage', validarCarritoLocalStorage);

// Migrar carrito desde localStorage a BD (requiere autenticación)
router.post('/migrate-localstorage', authRequired, migrarCarritoLocalStorage);

// ADMINISTRACIÓN - Limpieza de carritos abandonados (requiere autenticación)
router.post('/admin/cleanup-abandoned', authRequired, ejecutarLimpiezaCarritos);

export default router;