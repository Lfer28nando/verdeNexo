import { ERROR_CODES } from './errorCodes.js';

// Esta clase es para crear errores más organizados y útiles
// En lugar de tener errores raros por toda la app.
export class AppError extends Error {
    constructor(errorCode, additionalInfo = {}) {
        // Busco el error en mi diccionario de códigos
        const errorDef = ERROR_CODES[errorCode];
        
        // Si se me olvidó agregar el código al diccionario, que me avise
        if (!errorDef) {
            throw new Error(`Error code '${errorCode}' does not exist in ERROR_CODES. Please add it!`);
        }
        
        // Esto es para que funcione como un Error normal de JavaScript
        super(errorDef.devMessage);
        
        // Aquí guardo toda la info útil del error
        this.name = 'AppError';
        this.code = errorDef.code;                    // El código tipo "AUTH_001"
        this.userMessage = errorDef.userMessage;      // Lo que ve el usuario
        this.devMessage = errorDef.devMessage;        // Lo que veo yo
        this.httpStatus = errorDef.httpStatus;        // 404, 401, 500, etc.
        this.additionalInfo = additionalInfo;         // Info extra como email, ID, etc.
        this.timestamp = new Date().toISOString();    // Para saber cuándo pasó
        this.isOperational = true;                    // Para saber que es un error que yo controlo
        
        Error.captureStackTrace(this, AppError);
    }
}

// Función para crear errores más fácil
// En vez de escribir "new AppError(...)" todo el tiempo
export const createError = (errorCode, additionalInfo = {}) => {
    return new AppError(errorCode, additionalInfo);
};

// Para verificar si un error es de los míos o viene de otro lado
export const isAppError = (error) => {
    return error instanceof AppError;
};

// Esta función convierte errores raros de MongoDB, JWT, etc. a mi estructura de errores
// Así no tengo que estar manejando 50 tipos de errores diferentes
export const convertToAppError = (error) => {
    // Si ya es uno de mis errores, lo dejo como está
    if (isAppError(error)) {
        return error;
    }
    
    // Error cuando el ID de MongoDB está mal formateado
    if (error.name === 'CastError') {
        return createError('VAL_INVALID_OBJECT_ID', { 
            originalError: error.message 
        });
    }
    
    // Error cuando intentas crear algo que ya existe (email duplicado)
    if (error.code === 11000) {
        const field = Object.keys(error.keyValue || {})[0];
        if (field === 'email') {
            return createError('VAL_EMAIL_ALREADY_EXISTS', { 
                email: error.keyValue.email 
            });
        }
        return createError('VAL_INVALID_OBJECT_ID', { 
            field,
            value: error.keyValue[field] 
        });
    }
    
    // Errores de validación de Mongoose (cuando los datos están mal)
    if (error.name === 'ValidationError') {
        const firstError = Object.values(error.errors)[0];
        return createError('SRV_DATABASE_ERROR', { 
            validationError: firstError.message 
        });
    }
    
    // Token JWT malformado o inválido
    if (error.name === 'JsonWebTokenError') {
        return createError('AUTH_TOKEN_INVALID');
    }
    
    // Token JWT expirado
    if (error.name === 'TokenExpiredError') {
        return createError('AUTH_TOKEN_EXPIRED');
    }
    
    // Si llego aquí, es un error que no conozco
    // Lo convierto en error genérico pero guardo la info original
    return createError('SRV_INTERNAL_ERROR', { 
        originalError: error.message,
        stack: error.stack 
    });
};
