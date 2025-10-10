import rateLimit from 'express-rate-limit';
import slowDown from 'express-slow-down';
import { createError } from '../utils/customError.js';

// Función para crear respuesta de error personalizada
const createLimitReached = (req, res) => {
    const error = createError('LMT_TOO_MANY_REQUESTS', {
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        endpoint: req.originalUrl
    });
    
    res.status(error.httpStatus).json({
        success: false,
        error: {
            code: error.code,
            message: error.userMessage,
            timestamp: error.timestamp,
            retryAfter: Math.ceil(req.rateLimit.resetTime / 1000)
        }
    });
};

//LIMITADOR ESTRICTO PARA AUTENTICACIÓN
// Desarrollo: 50 intentos por 15 min | Producción: 5 intentos por 15 min
export const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutos
    max: process.env.NODE_ENV === 'development' ? 50 : 5, // más intentos en desarrollo
    message: {
        success: false,
        error: {
            code: 'LMT_001',
            message: process.env.NODE_ENV === 'development' 
                ? 'Demasiados intentos de autenticación (dev: 50/15min). Intenta en unos minutos'
                : 'Demasiados intentos de autenticación. Intenta en 15 minutos',
            timestamp: new Date().toISOString()
        }
    },
    handler: createLimitReached,
    standardHeaders: true, // Retorna rate limit info en los headers `RateLimit-*`
    legacyHeaders: false, // Deshabilita los headers `X-RateLimit-*`
    skip: (req) => {
        // Solo skip para localhost en desarrollo
        return process.env.NODE_ENV === 'development' && 
               (req.ip === '127.0.0.1' || req.ip === '::1' || req.ip === 'localhost');
    }
});

// LIMITADOR PARA RESET DE CONTRASEÑA
// Desarrollo: 10 intentos por 15 min | Producción: 3 intentos por 15 min
export const passwordResetLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutos
    max: process.env.NODE_ENV === 'development' ? 10 : 3, // más intentos en desarrollo
    message: {
        success: false,
        error: {
            code: 'LMT_002',
            message: process.env.NODE_ENV === 'development'
                ? 'Límite de reset alcanzado (dev: 10/15min). Espera un poco'
                : 'Solo puedes solicitar un reset cada 15 minutos',
            timestamp: new Date().toISOString()
        }
    },
    handler: createLimitReached,
    standardHeaders: true,
    legacyHeaders: false,
    skip: (req) => {
        return process.env.NODE_ENV === 'development' && 
               (req.ip === '127.0.0.1' || req.ip === '::1' || req.ip === 'localhost');
    }
});

// LIMITADOR PARA VERIFICACIÓN DE EMAIL
// Desarrollo: 15 intentos por 5 min | Producción: 3 intentos por 5 min
export const emailVerificationLimiter = rateLimit({
    windowMs: 5 * 60 * 1000, // 5 minutos
    max: process.env.NODE_ENV === 'development' ? 15 : 3, // más intentos en desarrollo
    message: {
        success: false,
        error: {
            code: 'LMT_003',
            message: process.env.NODE_ENV === 'development'
                ? 'Límite de verificación alcanzado (dev: 15/5min). Espera un poco'
                : 'Solo puedes solicitar verificación cada 5 minutos',
            timestamp: new Date().toISOString()
        }
    },
    handler: createLimitReached,
    standardHeaders: true,
    legacyHeaders: false,
    skip: (req) => {
        return process.env.NODE_ENV === 'development' && 
               (req.ip === '127.0.0.1' || req.ip === '::1' || req.ip === 'localhost');
    }
});

// LIMITADOR GENERAL PARA TODA LA API
// Desarrollo: 500 requests por 15 min | Producción: 100 requests por 15 min
export const generalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutos
    max: process.env.NODE_ENV === 'development' ? 500 : 100, // mucho más permisivo en desarrollo
    message: {
        success: false,
        error: {
            code: 'LMT_001',
            message: process.env.NODE_ENV === 'development'
                ? 'Límite general alcanzado (dev: 500/15min). Espera un poco'
                : 'Demasiadas peticiones. Intenta más tarde',
            timestamp: new Date().toISOString()
        }
    },
    handler: createLimitReached,
    standardHeaders: true,
    legacyHeaders: false,
    skip: (req) => {
        // Skip para desarrollo y para rutas de salud/estado
        return (process.env.NODE_ENV === 'development' && 
                (req.ip === '127.0.0.1' || req.ip === '::1' || req.ip === 'localhost')) ||
               req.path === '/health' || 
               req.path === '/status';
    }
});

//SLOW DOWN PARA RUTAS SENSIBLES
// Más permisivo en desarrollo
export const authSlowDown = slowDown({
    windowMs: 15 * 60 * 1000, // 15 minutos
    delayAfter: process.env.NODE_ENV === 'development' ? 10 : 2, // más requests sin delay en desarrollo
    delayMs: process.env.NODE_ENV === 'development' ? 100 : 500, // menos delay en desarrollo
    maxDelayMs: process.env.NODE_ENV === 'development' ? 1000 : 5000, // menor delay máximo en desarrollo
    skip: (req) => {
        return process.env.NODE_ENV === 'development' && 
               (req.ip === '127.0.0.1' || req.ip === '::1' || req.ip === 'localhost');
    }
});

// LIMITADOR PARA REGISTRO (más permisivo pero controlado)
// Desarrollo: 10 registros por hora | Producción: 3 registros por hora
export const registerLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hora
    max: process.env.NODE_ENV === 'development' ? 10 : 3, // más registros en desarrollo
    message: {
        success: false,
        error: {
            code: 'LMT_004',
            message: process.env.NODE_ENV === 'development'
                ? 'Límite de registro alcanzado (dev: 10/hora). Espera un poco'
                : 'Máximo 3 registros por hora. Intenta más tarde',
            timestamp: new Date().toISOString()
        }
    },
    handler: createLimitReached,
    standardHeaders: true,
    legacyHeaders: false,
    skip: (req) => {
        return process.env.NODE_ENV === 'development' && 
               (req.ip === '127.0.0.1' || req.ip === '::1' || req.ip === 'localhost');
    }
});

// LIMITADOR PARA RUTAS DE PERFIL (más permisivo)
// Desarrollo: 100 requests por 15 min | Producción: 30 requests por 15 min
export const profileLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutos
    max: process.env.NODE_ENV === 'development' ? 100 : 30, // más requests en desarrollo
    message: {
        success: false,
        error: {
            code: 'LMT_001',
            message: process.env.NODE_ENV === 'development'
                ? 'Límite de perfil alcanzado (dev: 100/15min). Espera un poco'
                : 'Demasiadas peticiones a perfil. Intenta en unos minutos',
            timestamp: new Date().toISOString()
        }
    },
    handler: createLimitReached,
    standardHeaders: true,
    legacyHeaders: false,
    skip: (req) => {
        return process.env.NODE_ENV === 'development' && 
               (req.ip === '127.0.0.1' || req.ip === '::1' || req.ip === 'localhost');
    }
});

// MIDDLEWARE PARA TRUST PROXY (importante para producción)
export const trustProxyMiddleware = (app) => {
    // Configurar Express para confiar en proxies (Nginx, Cloudflare, etc.)
    if (process.env.NODE_ENV === 'production') {
        app.set('trust proxy', 1); // trust first proxy
    }
};

// FUNCIÓN HELPER PARA LOGGING DE RATE LIMITS
export const logRateLimit = (req, res, next) => {
    if (req.rateLimit) {
        console.log(`Rate Limit Info:`, {
            ip: req.ip,
            endpoint: req.originalUrl,
            remaining: req.rateLimit.remaining,
            resetTime: new Date(req.rateLimit.resetTime),
            userAgent: req.get('User-Agent')
        });
    }
    next();
};