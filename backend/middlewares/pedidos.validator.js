import { body, param, query } from 'express-validator';

// Validaciones comunes para pedidos
export const validarPedidoId = [
  param('pedidoId')
    .isMongoId()
    .withMessage('ID de pedido inválido')
];

export const validarEstadoPedido = [
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
    .withMessage('Comentarios debe ser texto de máximo 1000 caracteres')
];

export const validarDatosCliente = [
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
    .withMessage('Email inválido')
];

export const validarComision = [
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
    .withMessage('Monto fijo debe ser mayor o igual a 0')
];

export const validarFactura = [
  ...validarDatosCliente,
  body('metodoPago.tipo')
    .optional()
    .isIn(['efectivo', 'tarjeta_credito', 'tarjeta_debito', 'transferencia', 'pse', 'contraentrega'])
    .withMessage('Tipo de método de pago inválido'),
  body('observaciones')
    .optional()
    .isString()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Observaciones debe ser texto de máximo 1000 caracteres')
];

export const validarBusquedaFacturas = [
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
    .withMessage('Fecha de fin inválida')
];

export const validarPaginacion = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Página debe ser un número entero mayor a 0'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Límite debe ser un número entre 1 y 100')
];