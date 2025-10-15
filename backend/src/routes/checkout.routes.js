// routes/checkout.routes.js
import express from 'express';
import {
  iniciarCheckout,
  guardarDatosCheckout,
  obtenerResumenPedido,
  confirmarPedido,
  enviarNotificacionPedido,
  procesarPedidoMayorista,
  actualizarInformacionDespacho,
  obtenerPedidosUsuario,
  obtenerDetallePedido,
  generarFacturaPedido,
  obtenerFacturaPorId,
  obtenerFacturasDelUsuario,
  anularFacturaPedido,
  obtenerDashboardEstados,
  obtenerEstadoPedidoDetallado,
  obtenerMetricasVentasTiempoReal,
  obtenerEstadisticasVentasPeriodo,
  obtenerTopProductos,
  obtenerRendimientoVendedoresEndpoint,
  generarReporteCompletoVentas,
  crearPreferenciaPago,
  webhookMercadoPago
} from '../controllers/checkout.controller.js';
import { authRequired as validateToken } from '../middlewares/validateToken.middleware.js';
import { validateRole } from '../middlewares/validateRole.middleware.js';
import { generalLimiter } from '../middlewares/rateLimiter.middleware.js';

const router = express.Router();

// Middleware común para todas las rutas
router.use(generalLimiter);

// ============================
// RUTAS PÚBLICAS (NO REQUIEREN AUTENTICACIÓN)
// ============================

/**
 * @route GET /api/checkout/iniciar
 * @desc Iniciar proceso de checkout
 * @access Public
 * @query {string} sessionId - ID de la sesión
 * @query {string} carritoId - ID del carrito (opcional)
 */
router.get('/iniciar', iniciarCheckout);

/**
 * @route POST /api/checkout/guardar-datos
 * @desc Guardar datos de facturación, envío y pago
 * @access Public
 * @body {
 *   sessionId: string,
 *   carritoId?: string,
 *   facturacion: {...},
 *   envio: {...},
 *   pago: {...},
 *   esPedidoMayorista?: boolean,
 *   informacionMayorista?: {...}
 * }
 */
router.post('/guardar-datos', guardarDatosCheckout);

/**
 * @route POST /api/checkout/crear-preferencia/:pedidoId
 * @desc Crear preferencia de pago con Mercado Pago
 * @access Public
 * @param {string} pedidoId - ID del pedido en borrador
 */
router.post('/crear-preferencia/:pedidoId', crearPreferenciaPago);

/**
 * @route GET /api/checkout/resumen/:pedidoId
 * @desc Obtener resumen del pedido
 * @access Public (con validación de propiedad)
 * @param {string} pedidoId - ID del pedido
 */
router.get('/resumen/:pedidoId', obtenerResumenPedido);

/**
 * @route POST /api/checkout/confirmar/:pedidoId
 * @desc Confirmar y generar pedido formal
 * @access Public (con validación de propiedad)
 * @param {string} pedidoId - ID del pedido
 * @body {string} notasAdicionales - Notas adicionales (opcional)
 */
router.post('/confirmar/:pedidoId', confirmarPedido);

// ============================
// RUTAS PROTEGIDAS (REQUIEREN AUTENTICACIÓN)
// ============================

/**
 * @route GET /api/checkout/mis-pedidos
 * @desc Obtener pedidos del usuario autenticado
 * @access Private
 * @query {string} estado - Filtrar por estado (opcional)
 * @query {number} pagina - Página para paginación (opcional, default: 1)
 * @query {number} limite - Límite de resultados por página (opcional, default: 10)
 */
router.get('/mis-pedidos', validateToken, obtenerPedidosUsuario);

/**
 * @route GET /api/checkout/detalle/:pedidoId
 * @desc Obtener detalle completo de un pedido
 * @access Private
 * @param {string} pedidoId - ID del pedido
 */
router.get('/detalle/:pedidoId', validateToken, obtenerDetallePedido);

/**
 * @route POST /api/checkout/notificar/:pedidoId
 * @desc Enviar notificación de pedido por email
 * @access Private
 * @param {string} pedidoId - ID del pedido
 */
router.post('/notificar/:pedidoId', validateToken, enviarNotificacionPedido);

// ============================
// RUTAS ADMINISTRATIVAS (REQUIEREN ROL ADMIN)
// ============================

/**
 * @route POST /api/checkout/mayorista/:pedidoId
 * @desc Procesar pedido mayorista con condiciones especiales
 * @access Admin
 * @param {string} pedidoId - ID del pedido
 * @body {
 *   descuentoEspecial?: number,
 *   plazoPagoEspecial?: string,
 *   terminosPago?: string,
 *   requiereFacturaEspecial?: boolean
 * }
 */
router.post('/mayorista/:pedidoId',
  validateToken,
  validateRole(['admin', 'vendedor']),
  procesarPedidoMayorista
);

/**
 * @route PUT /api/checkout/despacho/:pedidoId
 * @desc Actualizar información de despacho
 * @access Admin
 * @param {string} pedidoId - ID del pedido
 * @body {
 *   fechaEntregaEstimada?: Date,
 *   rangoHorarioEntrega?: string,
 *   instruccionesEspeciales?: string,
 *   transportadora?: string,
 *   numeroGuia?: string
 * }
 */
router.put('/despacho/:pedidoId',
  validateToken,
  validateRole(['admin', 'logistica']),
  actualizarInformacionDespacho
);

// ============================
// RUTAS DE FACTURACIÓN
// ============================

/**
 * @route POST /api/checkout/factura/generar/:pedidoId
 * @desc Generar factura para un pedido confirmado
 * @access Admin
 * @param {string} pedidoId - ID del pedido
 */
router.post('/factura/generar/:pedidoId',
  validateToken,
  validateRole(['admin', 'vendedor']),
  generarFacturaPedido
);

/**
 * @route GET /api/checkout/factura/:facturaId
 * @desc Obtener factura por ID
 * @access Private (propietario o admin)
 * @param {string} facturaId - ID de la factura
 */
router.get('/factura/:facturaId', validateToken, obtenerFacturaPorId);

/**
 * @route GET /api/checkout/facturas
 * @desc Obtener facturas del usuario autenticado
 * @access Private
 * @query {string} estado - Filtrar por estado (opcional)
 * @query {string} fechaInicio - Fecha inicio (YYYY-MM-DD)
 * @query {string} fechaFin - Fecha fin (YYYY-MM-DD)
 * @query {number} pagina - Página (opcional, default: 1)
 * @query {number} limite - Límite por página (opcional, default: 10)
 */
router.get('/facturas', validateToken, obtenerFacturasDelUsuario);

/**
 * @route PUT /api/checkout/factura/anular/:facturaId
 * @desc Anular factura
 * @access Admin
 * @param {string} facturaId - ID de la factura
 * @body {string} motivo - Motivo de la anulación
 */
router.put('/factura/anular/:facturaId',
  validateToken,
  validateRole(['admin']),
  anularFacturaPedido
);

// ============================
// RUTAS DE DASHBOARD DE ESTADOS
// ============================

/**
 * @route GET /api/checkout/dashboard/estados
 * @desc Obtener dashboard de estados de pedidos
 * @access Private
 * @query {string} fechaInicio - Fecha inicio (YYYY-MM-DD, opcional)
 * @query {string} fechaFin - Fecha fin (YYYY-MM-DD, opcional)
 */
router.get('/dashboard/estados', validateToken, obtenerDashboardEstados);

/**
 * @route GET /api/checkout/estado/detallado/:pedidoId
 * @desc Obtener estado detallado de un pedido específico
 * @access Private (propietario del pedido)
 * @param {string} pedidoId - ID del pedido
 */
router.get('/estado/detallado/:pedidoId', validateToken, obtenerEstadoPedidoDetallado);

// ============================
// RUTAS DE ESTADÍSTICAS DE VENTA
// ============================

/**
 * @route GET /api/checkout/estadisticas/tiempo-real
 * @desc Obtener métricas de ventas en tiempo real
 * @access Admin
 */
router.get('/estadisticas/tiempo-real',
  validateToken,
  validateRole(['admin', 'vendedor']),
  obtenerMetricasVentasTiempoReal
);

/**
 * @route GET /api/checkout/estadisticas/periodo
 * @desc Obtener estadísticas de ventas por período
 * @access Admin
 * @query {string} fechaInicio - Fecha inicio (YYYY-MM-DD)
 * @query {string} fechaFin - Fecha fin (YYYY-MM-DD)
 */
router.get('/estadisticas/periodo',
  validateToken,
  validateRole(['admin', 'vendedor']),
  obtenerEstadisticasVentasPeriodo
);

/**
 * @route GET /api/checkout/estadisticas/top-productos
 * @desc Obtener top productos más vendidos
 * @access Admin
 * @query {string} fechaInicio - Fecha inicio (YYYY-MM-DD)
 * @query {string} fechaFin - Fecha fin (YYYY-MM-DD)
 * @query {number} limite - Límite de resultados (opcional, default: 10)
 */
router.get('/estadisticas/top-productos',
  validateToken,
  validateRole(['admin', 'vendedor']),
  obtenerTopProductos
);

/**
 * @route GET /api/checkout/estadisticas/rendimiento-vendedores
 * @desc Obtener rendimiento de vendedores
 * @access Admin
 * @query {string} fechaInicio - Fecha inicio (YYYY-MM-DD)
 * @query {string} fechaFin - Fecha fin (YYYY-MM-DD)
 * @query {number} limite - Límite de resultados (opcional, default: 10)
 */
router.get('/estadisticas/rendimiento-vendedores',
  validateToken,
  validateRole(['admin', 'vendedor']),
  obtenerRendimientoVendedoresEndpoint
);

/**
 * @route GET /api/checkout/estadisticas/reporte-completo
 * @desc Generar reporte completo de ventas
 * @access Admin
 * @query {string} fechaInicio - Fecha inicio (YYYY-MM-DD)
 * @query {string} fechaFin - Fecha fin (YYYY-MM-DD)
 */
router.get('/estadisticas/reporte-completo',
  validateToken,
  validateRole(['admin']),
  generarReporteCompletoVentas
);

// ============================
// RUTAS DE WEBHOOKS
// ============================

/**
 * @route POST /api/checkout/webhooks/mercadopago
 * @desc Webhook para notificaciones de Mercado Pago
 * @access Public (desde Mercado Pago)
 */
router.post('/webhooks/mercadopago', webhookMercadoPago);

export default router;