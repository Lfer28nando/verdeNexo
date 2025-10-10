import { isAppError, convertToAppError } from '../utils/customError.js';

// Este middleware es como el "guardia de seguridad" de la app
// Captura TODOS los errores que ocurren y los convierte en respuestas JSON bonitas
// Tiene que ir AL FINAL de todos los middlewares en app.js
export const errorHandler = (err, req, res, next) => {
    // Primero convierto cualquier error raro a mi formato
    let error = convertToAppError(err);
    
    // Log del error para que yo pueda debuggear después
    // En producción no quiero mostrar el stack trace al usuario
    console.error('🚨 Error capturado:', {
        code: error.code,
        message: error.userMessage,
        url: req.originalUrl,
        method: req.method,
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        timestamp: error.timestamp,
        // Solo en desarrollo muestro info sensible
        ...(process.env.NODE_ENV === 'development' && {
            stack: error.stack,
            additionalInfo: error.additionalInfo
        })
    });

    // Crear la respuesta base que siempre voy a enviar
    const response = {
        success: false,
        error: {
            code: error.code,
            message: error.userMessage,
            timestamp: error.timestamp
        }
    };

    // Si estoy en desarrollo, agrego info extra para debuggear
    if (process.env.NODE_ENV === 'development') {
        response.devInfo = {
            devMessage: error.devMessage,
            stack: error.stack,
            additionalInfo: error.additionalInfo,
            originalUrl: req.originalUrl,
            method: req.method
        };
    }

    // Enviar la respuesta con el código HTTP correcto
    res.status(error.httpStatus).json(response);
};

// Middleware para capturar rutas que no existen (404)
// Este va ANTES del errorHandler en app.js
export const notFoundHandler = (req, res, next) => {
    const error = convertToAppError({
        name: 'NotFoundError',
        message: `Ruta ${req.originalUrl} no encontrada`
    });
    
    // Le cambio el código a uno más específico
    error.code = 'API_003';
    error.userMessage = 'Recurso no encontrado';
    error.httpStatus = 404;
    
    next(error);
};

// Middleware para capturar errores asíncronos que se me olvide manejar
// Wrapper para funciones async que previene que la app se crashee
export const asyncHandler = (fn) => (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
};

// Función para logs más organizados en producción
// En desarrollo uso console.error, en producción podría usar Winston o similar
const logError = (error, req) => {
    const logData = {
        timestamp: new Date().toISOString(),
        level: 'ERROR',
        code: error.code || 'UNKNOWN',
        message: error.userMessage || error.message,
        url: req.originalUrl,
        method: req.method,
        ip: req.ip,
        userAgent: req.get('User-Agent')
    };

    // En producción aquí podría enviar a un servicio de logging
    if (process.env.NODE_ENV === 'production') {
        // TODO: Integrar con Winston, Sentry, CloudWatch, etc.
        console.error(JSON.stringify(logData));
    } else {
        console.error('🐛 Error de desarrollo:', logData);
    }
};
