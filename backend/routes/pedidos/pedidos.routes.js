import express from 'express';
import { body, param, query } from 'express-validator';
import PedidosController from '../../controllers/pedidos.controller.js';
import { verificarToken } from '../../middlewares/auth.js';
import { validarCampos } from '../../middlewares/validador.js';

const router = express.Router();

// Middleware de autenticación para todas las rutas de pedidos
router.use(verificarToken);

// ================================
// RF-PEDI-01: Confirmar Pedido
// ================================
router.post('/:pedidoId/confirmar',
  [
    param('pedidoId')
      .isMongoId()
      .withMessage('ID de pedido inválido'),
    body('motivoConfirmacion')
      .optional()
      .isString()
      .trim()
      .isLength({ max: 500 })
      .withMessage('Motivo de confirmación debe ser texto de máximo 500 caracteres'),
    body('notificarCliente')
      .optional()
      .isBoolean()
      .withMessage('notificarCliente debe ser un valor booleano')
  ],
  validarCampos,
  PedidosController.confirmarPedido
);

// ================================
// RF-PEDI-02: Registrar estado del pedido
// ================================
router.put('/:pedidoId/estado',
  [
    param('pedidoId')
      .isMongoId()
      .withMessage('ID de pedido inválido'),
    body('nuevoEstado')
      .isIn(['pendiente', 'confirmado', 'en_proceso', 'empacado', 'enviado', 'en_transito', 'entregado', 'cancelado', 'devuelto'])
      .withMessage('Estado del pedido inválido'),
    body('motivo')
      .optional()
      .isString()
      .trim()
      .isLength({ max: 500 })
      .withMessage('Motivo debe ser texto de máximo 500 caracteres'),
    body('comentarios')
      .optional()
      .isString()
      .trim()
      .isLength({ max: 1000 })
      .withMessage('Comentarios debe ser texto de máximo 1000 caracteres'),
    body('metadatos')
      .optional()
      .isObject()
      .withMessage('Metadatos debe ser un objeto'),
    body('notificarCliente')
      .optional()
      .isBoolean()
      .withMessage('notificarCliente debe ser un valor booleano')
  ],
  validarCampos,
  PedidosController.actualizarEstadoPedido
);

// ================================
// RF-PEDI-03: Actualizar stock
// ================================
router.post('/:pedidoId/stock',
  [
    param('pedidoId')
      .isMongoId()
      .withMessage('ID de pedido inválido'),
    body('operacion')
      .isIn(['descontar', 'restaurar'])
      .withMessage('Operación debe ser "descontar" o "restaurar"')
  ],
  validarCampos,
  PedidosController.actualizarStock
);

// ================================
// RF-PEDI-04: Registrar comisión de venta
// ================================
router.post('/:pedidoId/comision',
  [
    param('pedidoId')
      .isMongoId()
      .withMessage('ID de pedido inválido'),
    body('vendedorId')
      .isMongoId()
      .withMessage('ID de vendedor inválido'),
    body('configuracionComision')
      .isObject()
      .withMessage('Configuración de comisión requerida'),
    body('configuracionComision.tipo')
      .isIn(['porcentaje', 'fijo', 'mixto', 'escalonado'])
      .withMessage('Tipo de comisión inválido'),
    body('configuracionComision.porcentaje')
      .optional()
      .isFloat({ min: 0, max: 100 })
      .withMessage('Porcentaje debe ser entre 0 y 100'),
    body('configuracionComision.montoFijo')
      .optional()
      .isFloat({ min: 0 })
      .withMessage('Monto fijo debe ser mayor o igual a 0'),
    body('observaciones')
      .optional()
      .isString()
      .trim()
      .isLength({ max: 1000 })
      .withMessage('Observaciones debe ser texto de máximo 1000 caracteres')
  ],
  validarCampos,
  PedidosController.registrarComisionVenta
);

// ================================
// RF-PEDI-05: Emitir factura de venta
// ================================
router.post('/:pedidoId/factura',
  [
    param('pedidoId')
      .isMongoId()
      .withMessage('ID de pedido inválido'),
    body('datosCliente')
      .optional()
      .isObject()
      .withMessage('Datos del cliente debe ser un objeto'),
    body('datosCliente.tipoDocumento')
      .optional()
      .isIn(['CC', 'CE', 'NIT', 'PP'])
      .withMessage('Tipo de documento inválido'),
    body('datosCliente.numeroDocumento')
      .optional()
      .isString()
      .trim()
      .isLength({ min: 5, max: 20 })
      .withMessage('Número de documento debe tener entre 5 y 20 caracteres'),
    body('datosCliente.nombre')
      .optional()
      .isString()
      .trim()
      .isLength({ min: 2, max: 100 })
      .withMessage('Nombre debe tener entre 2 y 100 caracteres'),
    body('datosCliente.email')
      .optional()
      .isEmail()
      .normalizeEmail()
      .withMessage('Email inválido'),
    body('metodoPago')
      .optional()
      .isObject()
      .withMessage('Método de pago debe ser un objeto'),
    body('metodoPago.tipo')
      .optional()
      .isIn(['efectivo', 'tarjeta_credito', 'tarjeta_debito', 'transferencia', 'pse', 'contraentrega'])
      .withMessage('Tipo de método de pago inválido'),
    body('observaciones')
      .optional()
      .isString()
      .trim()
      .isLength({ max: 1000 })
      .withMessage('Observaciones debe ser texto de máximo 1000 caracteres'),
    body('enviarPorEmail')
      .optional()
      .isBoolean()
      .withMessage('enviarPorEmail debe ser un valor booleano')
  ],
  validarCampos,
  PedidosController.generarFactura
);

// ================================
// RF-PEDI-06: Mostrar estado del pedido
// ================================
router.get('/:pedidoId/estado',
  [
    param('pedidoId')
      .isMongoId()
      .withMessage('ID de pedido inválido')
  ],
  validarCampos,
  PedidosController.consultarEstadoPedido
);

// ================================
// RF-PEDI-07: Guardar información de venta
// ================================
router.post('/:pedidoId/venta',
  [
    param('pedidoId')
      .isMongoId()
      .withMessage('ID de pedido inválido')
  ],
  validarCampos,
  PedidosController.registrarVenta
);

// ================================
// RUTAS ADICIONALES PARA GESTIÓN
// ================================

// Obtener historial de estados de un pedido
router.get('/:pedidoId/historial-estados',
  [
    param('pedidoId')
      .isMongoId()
      .withMessage('ID de pedido inválido')
  ],
  validarCampos,
  async (req, res) => {
    try {
      const { EstadoPedido } = await import('../models/pedidos/index.js');
      const historial = await EstadoPedido.obtenerHistorialPedido(req.params.pedidoId);
      
      res.status(200).json({
        success: true,
        message: 'Historial de estados obtenido exitosamente',
        data: historial
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error al obtener historial de estados',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
);

// Obtener comisiones de un vendedor
router.get('/comisiones/vendedor/:vendedorId',
  [
    param('vendedorId')
      .isMongoId()
      .withMessage('ID de vendedor inválido'),
    query('estado')
      .optional()
      .isIn(['pendiente', 'calculada', 'aprobada', 'pagada', 'cancelada'])
      .withMessage('Estado de comisión inválido'),
    query('fechaInicio')
      .optional()
      .isISO8601()
      .withMessage('Fecha de inicio inválida'),
    query('fechaFin')
      .optional()
      .isISO8601()
      .withMessage('Fecha de fin inválida')
  ],
  validarCampos,
  async (req, res) => {
    try {
      const { ComisionService } = await import('../services/pedidos/index.js');
      const { vendedorId } = req.params;
      const filtros = req.query;
      
      const resumen = await ComisionService.obtenerResumenComisionesPorVendedor(vendedorId, filtros);
      
      res.status(200).json({
        success: true,
        message: 'Resumen de comisiones obtenido exitosamente',
        data: resumen
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error al obtener comisiones del vendedor',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
);

// Aprobar comisión
router.put('/comisiones/:comisionId/aprobar',
  [
    param('comisionId')
      .isMongoId()
      .withMessage('ID de comisión inválido'),
    body('observaciones')
      .optional()
      .isString()
      .trim()
      .isLength({ max: 1000 })
      .withMessage('Observaciones debe ser texto de máximo 1000 caracteres')
  ],
  validarCampos,
  async (req, res) => {
    try {
      const { ComisionService } = await import('../services/pedidos/index.js');
      const { comisionId } = req.params;
      const { observaciones } = req.body;
      
      const resultado = await ComisionService.aprobarComision(
        comisionId, 
        req.usuario._id, 
        observaciones
      );
      
      res.status(200).json({
        success: true,
        message: 'Comisión aprobada exitosamente',
        data: resultado
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error al aprobar comisión',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
);

// Registrar pago de comisión
router.post('/comisiones/:comisionId/pagar',
  [
    param('comisionId')
      .isMongoId()
      .withMessage('ID de comisión inválido'),
    body('metodoPago')
      .isIn(['transferencia', 'cheque', 'efectivo', 'nomina'])
      .withMessage('Método de pago inválido'),
    body('numeroTransaccion')
      .optional()
      .isString()
      .trim()
      .isLength({ max: 100 })
      .withMessage('Número de transacción debe ser texto de máximo 100 caracteres'),
    body('cuentaDestino')
      .optional()
      .isString()
      .trim()
      .isLength({ max: 100 })
      .withMessage('Cuenta destino debe ser texto de máximo 100 caracteres'),
    body('comprobantePago')
      .optional()
      .isURL()
      .withMessage('Comprobante de pago debe ser una URL válida')
  ],
  validarCampos,
  async (req, res) => {
    try {
      const { ComisionService } = await import('../services/pedidos/index.js');
      const { comisionId } = req.params;
      const detallesPago = req.body;
      
      const resultado = await ComisionService.registrarPagoComision(comisionId, detallesPago);
      
      res.status(200).json({
        success: true,
        message: 'Pago de comisión registrado exitosamente',
        data: resultado
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error al registrar pago de comisión',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
);

// Buscar facturas
router.get('/facturas/buscar',
  [
    query('numeroFactura')
      .optional()
      .isString()
      .trim()
      .withMessage('Número de factura debe ser texto'),
    query('estado')
      .optional()
      .isIn(['borrador', 'generada', 'enviada', 'pagada', 'anulada'])
      .withMessage('Estado de factura inválido'),
    query('clienteEmail')
      .optional()
      .isEmail()
      .normalizeEmail()
      .withMessage('Email del cliente inválido'),
    query('fechaInicio')
      .optional()
      .isISO8601()
      .withMessage('Fecha de inicio inválida'),
    query('fechaFin')
      .optional()
      .isISO8601()
      .withMessage('Fecha de fin inválida'),
    query('page')
      .optional()
      .isInt({ min: 1 })
      .withMessage('Página debe ser un número entero mayor a 0'),
    query('limit')
      .optional()
      .isInt({ min: 1, max: 100 })
      .withMessage('Límite debe ser un número entre 1 y 100')
  ],
  validarCampos,
  async (req, res) => {
    try {
      const { FacturaService } = await import('../services/pedidos/index.js');
      const criterios = req.query;
      const opciones = {
        page: parseInt(req.query.page) || 1,
        limit: parseInt(req.query.limit) || 20,
        sortBy: req.query.sortBy || 'fechaGeneracion',
        sortOrder: req.query.sortOrder || 'desc'
      };
      
      const resultado = await FacturaService.buscarFacturas(criterios, opciones);
      
      res.status(200).json({
        success: true,
        message: 'Búsqueda de facturas completada',
        data: resultado
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error al buscar facturas',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
);

// Actualizar estado de factura
router.put('/facturas/:facturaId/estado',
  [
    param('facturaId')
      .isMongoId()
      .withMessage('ID de factura inválido'),
    body('nuevoEstado')
      .isIn(['borrador', 'generada', 'enviada', 'pagada', 'anulada'])
      .withMessage('Estado de factura inválido'),
    body('metodoPago')
      .optional()
      .isObject()
      .withMessage('Método de pago debe ser un objeto'),
    body('motivoAnulacion')
      .optional()
      .isString()
      .trim()
      .isLength({ max: 500 })
      .withMessage('Motivo de anulación debe ser texto de máximo 500 caracteres')
  ],
  validarCampos,
  async (req, res) => {
    try {
      const { FacturaService } = await import('../services/pedidos/index.js');
      const { facturaId } = req.params;
      const { nuevoEstado, ...datosAdicionales } = req.body;
      
      const resultado = await FacturaService.actualizarEstadoFactura(
        facturaId, 
        nuevoEstado, 
        datosAdicionales
      );
      
      res.status(200).json({
        success: true,
        message: 'Estado de factura actualizado exitosamente',
        data: resultado
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error al actualizar estado de factura',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
);

// Enviar factura por email
router.post('/facturas/:facturaId/enviar',
  [
    param('facturaId')
      .isMongoId()
      .withMessage('ID de factura inválido'),
    body('email')
      .optional()
      .isEmail()
      .normalizeEmail()
      .withMessage('Email inválido')
  ],
  validarCampos,
  async (req, res) => {
    try {
      const { FacturaService } = await import('../services/pedidos/index.js');
      const { facturaId } = req.params;
      const opciones = req.body;
      
      const resultado = await FacturaService.enviarFacturaPorEmail(facturaId, opciones);
      
      res.status(200).json({
        success: true,
        message: 'Factura enviada por email exitosamente',
        data: resultado
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error al enviar factura por email',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
);

// Verificar stock bajo
router.get('/stock/verificar-bajo',
  [
    query('umbralMinimo')
      .optional()
      .isInt({ min: 0 })
      .withMessage('Umbral mínimo debe ser un número entero positivo')
  ],
  validarCampos,
  async (req, res) => {
    try {
      const { StockService } = await import('../services/pedidos/index.js');
      const umbralMinimo = parseInt(req.query.umbralMinimo) || 5;
      
      const productosStockBajo = await StockService.verificarStockBajo(umbralMinimo);
      
      res.status(200).json({
        success: true,
        message: 'Verificación de stock bajo completada',
        data: {
          umbralMinimo,
          cantidadProductos: productosStockBajo.length,
          productos: productosStockBajo
        }
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error al verificar stock bajo',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
);

export default router;