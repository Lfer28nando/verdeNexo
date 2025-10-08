import express from 'express';
import checkoutController from '../../controllers/checkout.controller.js';
import auth from '../../middlewares/auth.js';
import { body, param, query, validationResult } from 'express-validator';

const router = express.Router();

// Middleware para manejar errores de validación
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Errores de validación',
      errors: errors.array()
    });
  }
  next();
};

// Middleware para verificar sesión de checkout
const verificarSesionCheckout = (req, res, next) => {
  if (!req.session || !req.session.checkout) {
    return res.status(400).json({
      success: false,
      message: 'No hay una sesión de checkout activa. Inicie el proceso desde el carrito.'
    });
  }
  
  // Verificar expiración
  const sesion = req.session.checkout;
  if (sesion.expiracion && new Date() > new Date(sesion.expiracion)) {
    delete req.session.checkout;
    return res.status(400).json({
      success: false,
      message: 'La sesión de checkout ha expirado. Inicie el proceso nuevamente.'
    });
  }
  
  next();
};

// ===============================
// RUTAS DEL PROCESO DE CHECKOUT
// ===============================

// RF-CHECK-01: Ingresar datos de compra
router.post('/datos-compra', [
  auth,
  body('datosPersonales.nombre')
    .notEmpty()
    .withMessage('Nombre es requerido')
    .isLength({ max: 50 })
    .withMessage('Nombre no puede exceder 50 caracteres'),
  body('datosPersonales.apellido')
    .notEmpty()
    .withMessage('Apellido es requerido')
    .isLength({ max: 50 })
    .withMessage('Apellido no puede exceder 50 caracteres'),
  body('datosPersonales.email')
    .isEmail()
    .withMessage('Email debe ser válido')
    .normalizeEmail(),
  body('datosPersonales.telefono')
    .matches(/^[\+]?[0-9\s\-\(\)]{7,15}$/)
    .withMessage('Teléfono debe ser válido'),
  body('datosPersonales.documento.tipo')
    .isIn(['cedula', 'pasaporte', 'cedula_extranjeria'])
    .withMessage('Tipo de documento inválido'),
  body('datosPersonales.documento.numero')
    .notEmpty()
    .withMessage('Número de documento requerido'),
  body('tipoCliente')
    .optional()
    .isIn(['particular', 'mayorista'])
    .withMessage('Tipo de cliente inválido'),
  
  // Validaciones para mayoristas
  body('datosEmpresa.razonSocial')
    .if(body('tipoCliente').equals('mayorista'))
    .notEmpty()
    .withMessage('Razón social es requerida para mayoristas'),
  body('datosEmpresa.nit')
    .if(body('tipoCliente').equals('mayorista'))
    .matches(/^[0-9]{8,11}-[0-9]$/)
    .withMessage('NIT debe tener formato válido (123456789-0)'),
  body('datosEmpresa.representanteLegal')
    .if(body('tipoCliente').equals('mayorista'))
    .notEmpty()
    .withMessage('Representante legal es requerido para mayoristas'),
  
  handleValidationErrors
], checkoutController.ingresarDatosCompra);

// ===============================
// GESTIÓN DE DIRECCIONES
// ===============================

// RF-CHECK-02: Guardar direcciones
router.post('/direcciones', [
  auth,
  body('alias')
    .notEmpty()
    .withMessage('Alias es requerido')
    .isLength({ max: 50 })
    .withMessage('Alias no puede exceder 50 caracteres'),
  body('nombreCompleto')
    .notEmpty()
    .withMessage('Nombre completo es requerido')
    .isLength({ max: 100 })
    .withMessage('Nombre completo no puede exceder 100 caracteres'),
  body('telefono')
    .matches(/^[\+]?[0-9\s\-\(\)]{7,15}$/)
    .withMessage('Teléfono debe ser válido'),
  body('direccion')
    .notEmpty()
    .withMessage('Dirección es requerida')
    .isLength({ max: 200 })
    .withMessage('Dirección no puede exceder 200 caracteres'),
  body('ciudad')
    .notEmpty()
    .withMessage('Ciudad es requerida')
    .isLength({ max: 50 })
    .withMessage('Ciudad no puede exceder 50 caracteres'),
  body('departamento')
    .notEmpty()
    .withMessage('Departamento es requerido')
    .isLength({ max: 50 })
    .withMessage('Departamento no puede exceder 50 caracteres'),
  body('tipoVivienda')
    .optional()
    .isIn(['casa', 'apartamento', 'oficina', 'local_comercial', 'bodega', 'otro'])
    .withMessage('Tipo de vivienda inválido'),
  
  handleValidationErrors
], checkoutController.guardarDireccion);

// Obtener direcciones del usuario
router.get('/direcciones', auth, checkoutController.obtenerDirecciones);

// Establecer dirección principal
router.put('/direcciones/:direccionId/principal', [
  auth,
  param('direccionId').isMongoId().withMessage('ID de dirección inválido'),
  handleValidationErrors
], checkoutController.establecerDireccionPrincipal);

// ===============================
// MÉTODOS DE ENVÍO Y ENTREGA
// ===============================

// RF-CHECK-03: Seleccionar método de envío
router.get('/metodos-envio', [
  auth,
  verificarSesionCheckout,
  query('direccionId').isMongoId().withMessage('ID de dirección requerido'),
  handleValidationErrors
], checkoutController.obtenerMetodosEnvio);

// RF-CHECK-10: Programar entrega - Obtener ventanas disponibles
router.get('/ventanas-entrega', [
  auth,
  verificarSesionCheckout,
  query('direccionId').isMongoId().withMessage('ID de dirección requerido'),
  query('metodoEnvio').notEmpty().withMessage('Método de envío requerido'),
  handleValidationErrors
], checkoutController.obtenerVentanasEntrega);

// ===============================
// RESUMEN Y VALIDACIONES
// ===============================

// RF-CHECK-04: Resumir compra
router.post('/resumen', [
  auth,
  verificarSesionCheckout,
  body('direccionId').isMongoId().withMessage('ID de dirección requerido'),
  body('metodoEnvio')
    .isIn(['domicilio', 'punto_recogida', 'tienda'])
    .withMessage('Método de envío inválido'),
  body('metodoPagoId').isMongoId().withMessage('ID de método de pago requerido'),
  body('slotEntregaId')
    .optional()
    .isMongoId()
    .withMessage('ID de slot de entrega inválido'),
  
  handleValidationErrors
], checkoutController.obtenerResumenCompra);

// RF-CHECK-06: Validar stock y precios
router.get('/validar-productos', [
  auth,
  verificarSesionCheckout
], checkoutController.validarStockPrecios);

// RF-CHECK-09: Validar pedido mayorista
router.post('/validar-mayorista', [
  auth,
  body('datosEmpresa.nit')
    .matches(/^[0-9]{8,11}-[0-9]$/)
    .withMessage('NIT debe tener formato válido'),
  body('datosEmpresa.razonSocial')
    .notEmpty()
    .withMessage('Razón social es requerida'),
  body('items')
    .isArray({ min: 1 })
    .withMessage('Debe incluir al menos un producto'),
  body('items.*.productoId')
    .isMongoId()
    .withMessage('ID de producto inválido'),
  body('items.*.cantidad')
    .isInt({ min: 1 })
    .withMessage('Cantidad debe ser mayor a 0'),
  body('items.*.precio')
    .isFloat({ min: 0 })
    .withMessage('Precio debe ser mayor o igual a 0'),
  
  handleValidationErrors
], checkoutController.validarPedidoMayorista);

// ===============================
// GENERACIÓN DE PEDIDO
// ===============================

// RF-CHECK-05: Generar pedido
router.post('/generar-pedido', [
  auth,
  verificarSesionCheckout,
  body('terminosAceptados')
    .equals('true')
    .withMessage('Debe aceptar los términos y condiciones'),
  
  handleValidationErrors
], checkoutController.generarPedido);

// ===============================
// NOTIFICACIONES
// ===============================

// RF-CHECK-07: Enviar notificación de pedido
router.post('/pedidos/:pedidoId/notificar', [
  auth,
  param('pedidoId').isMongoId().withMessage('ID de pedido inválido'),
  body('tipo')
    .optional()
    .isIn(['email', 'whatsapp', 'sms'])
    .withMessage('Tipo de notificación inválido'),
  
  handleValidationErrors
], checkoutController.enviarNotificacionPedido);

// ===============================
// MÉTODOS DE PAGO
// ===============================

// Obtener métodos de pago disponibles
router.get('/metodos-pago', [
  auth,
  query('tipoCliente')
    .optional()
    .isIn(['particular', 'mayorista'])
    .withMessage('Tipo de cliente inválido'),
  
  handleValidationErrors
], async (req, res) => {
  try {
    const { MetodoPago } = require('../../models/checkout/metodo-pago.model');
    const tipoCliente = req.query.tipoCliente || 'particular';
    
    const metodos = await MetodoPago.obtenerActivos(tipoCliente);
    
    res.json({
      success: true,
      data: metodos.map(metodo => ({
        id: metodo._id,
        nombre: metodo.nombre,
        tipo: metodo.tipo,
        descripcion: metodo.descripcion,
        instrucciones: metodo.instrucciones,
        configuracion: {
          montoMinimo: metodo.configuracion?.montoMinimo || 0,
          montoMaximo: metodo.configuracion?.montoMaximo,
          tiempoExpiracion: metodo.configuracion?.tiempoExpiracion || 30
        }
      }))
    });
    
  } catch (error) {
    console.error('Error al obtener métodos de pago:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
});

// ===============================
// UTILIDADES Y CONSULTAS
// ===============================

// Obtener estado de sesión de checkout
router.get('/sesion', auth, (req, res) => {
  const sesion = req.session?.checkout;
  
  if (!sesion) {
    return res.json({
      success: true,
      data: {
        activa: false,
        mensaje: 'No hay sesión de checkout activa'
      }
    });
  }
  
  const tiempoRestante = sesion.expiracion ? 
    Math.max(0, new Date(sesion.expiracion) - new Date()) : null;
  
  res.json({
    success: true,
    data: {
      activa: true,
      paso: sesion.paso,
      tipoCliente: sesion.tipoCliente,
      expiraEn: tiempoRestante ? Math.ceil(tiempoRestante / 1000 / 60) : null, // minutos
      progreso: {
        datosCompra: !!sesion.datosPersonales,
        direccion: !!sesion.direccionId,
        metodosEnvio: !!sesion.metodoEnvio,
        resumen: !!sesion.resumen
      }
    }
  });
});

// Cancelar sesión de checkout
router.delete('/sesion', auth, (req, res) => {
  if (req.session?.checkout) {
    delete req.session.checkout;
  }
  
  res.json({
    success: true,
    message: 'Sesión de checkout cancelada'
  });
});

// Renovar sesión de checkout
router.post('/sesion/renovar', [
  auth,
  verificarSesionCheckout
], (req, res) => {
  req.session.checkout.expiracion = new Date(Date.now() + 30 * 60 * 1000);
  
  res.json({
    success: true,
    message: 'Sesión renovada por 30 minutos adicionales',
    data: {
      nuevaExpiracion: req.session.checkout.expiracion
    }
  });
});

// ===============================
// GESTIÓN DE ERRORES GLOBALES
// ===============================

// Middleware de manejo de errores específico para checkout
router.use((error, req, res, next) => {
  console.error('Error en rutas de checkout:', error);
  
  // Errores de validación de Mongoose
  if (error.name === 'ValidationError') {
    const errors = Object.values(error.errors).map(err => ({
      field: err.path,
      message: err.message
    }));
    
    return res.status(400).json({
      success: false,
      message: 'Error de validación',
      errors
    });
  }
  
  // Errores de cast (IDs inválidos)
  if (error.name === 'CastError') {
    return res.status(400).json({
      success: false,
      message: 'ID inválido proporcionado'
    });
  }
  
  // Error de sesión
  if (error.message.includes('sesión')) {
    return res.status(400).json({
      success: false,
      message: error.message
    });
  }
  
  // Error genérico
  res.status(500).json({
    success: false,
    message: 'Error interno del servidor',
    error: process.env.NODE_ENV === 'development' ? error.message : undefined
  });
});

export default router;