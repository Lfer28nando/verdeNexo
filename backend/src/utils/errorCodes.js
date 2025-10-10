export const ERROR_CODES = {
    // ERRORES DE AUTENTICACIÓN (AUTH_xxx)
    AUTH_USER_NOT_FOUND: {
        code: 'AUTH_001',
        userMessage: 'Usuario no encontrado',
        devMessage: 'User not found in database',
        httpStatus: 404
    },
    AUTH_INVALID_PASSWORD: {
        code: 'AUTH_002',
        userMessage: 'Contraseña incorrecta',
        devMessage: 'Password does not match stored hash',
        httpStatus: 401
    },
    AUTH_USER_INACTIVE: {
        code: 'AUTH_003',
        userMessage: 'Tu cuenta está desactivada. Contacta al administrador',
        devMessage: 'User account is marked as inactive',
        httpStatus: 403
    },
    AUTH_TOKEN_INVALID: {
        code: 'AUTH_004',
        userMessage: 'Token inválido. Inicia sesión nuevamente',
        devMessage: 'JWT token is invalid or malformed',
        httpStatus: 401
    },
    AUTH_TOKEN_EXPIRED: {
        code: 'AUTH_005',
        userMessage: 'Tu sesión expiró. Inicia sesión nuevamente',
        devMessage: 'JWT token has expired',
        httpStatus: 401
    },
    AUTH_TOKEN_MISSING: {
        code: 'AUTH_006',
        userMessage: 'Acceso denegado. Inicia sesión',
        devMessage: 'No authentication token provided',
        httpStatus: 401
    },
    AUTH_INSUFFICIENT_PERMISSIONS: {
        code: 'AUTH_007',
        userMessage: 'No tienes permisos para realizar esta acción',
        devMessage: 'User role does not have required permissions',
        httpStatus: 403
    },
    AUTH_EMAIL_ALREADY_VERIFIED: {
        code: 'AUTH_008',
        userMessage: 'Tu email ya está verificado',
        devMessage: 'User email is already verified',
        httpStatus: 400
    },
    AUTH_INVALID_VERIFICATION_CODE: {
        code: 'AUTH_009',
        userMessage: 'Código de verificación inválido o expirado',
        devMessage: 'Email verification code is invalid or expired',
        httpStatus: 400
    },
    AUTH_INVALID_RESET_CODE: {
        code: 'AUTH_010',
        userMessage: 'Código de reset inválido o expirado',
        devMessage: 'Password reset code is invalid or expired',
        httpStatus: 400
    },
    AUTH_PASSWORD_SAME_AS_CURRENT: {
        code: 'AUTH_011',
        userMessage: 'La nueva contraseña debe ser diferente a la actual',
        devMessage: 'New password is the same as current password',
        httpStatus: 400
    },
    AUTH_GOOGLE_ERROR: {
        code: 'AUTH_012',
        userMessage: 'Error en la autenticación con Google. Intenta nuevamente',
        devMessage: 'Google OAuth authentication failed',
        httpStatus: 400
    },

    // ERRORES DE VALIDACIÓN (VAL_xxx)
    VAL_EMAIL_REQUIRED: {
        code: 'VAL_001',
        userMessage: 'El email es obligatorio',
        devMessage: 'Email field is required',
        httpStatus: 400
    },
    VAL_EMAIL_INVALID: {
        code: 'VAL_002',
        userMessage: 'El formato del email es inválido',
        devMessage: 'Email format is invalid',
        httpStatus: 400
    },
    VAL_EMAIL_ALREADY_EXISTS: {
        code: 'VAL_003',
        userMessage: 'Ya existe una cuenta con este email',
        devMessage: 'Email address is already registered',
        httpStatus: 409
    },
    VAL_PASSWORD_REQUIRED: {
        code: 'VAL_004',
        userMessage: 'La contraseña es obligatoria',
        devMessage: 'Password field is required',
        httpStatus: 400
    },
    VAL_PASSWORD_TOO_SHORT: {
        code: 'VAL_005',
        userMessage: 'La contraseña debe tener al menos 6 caracteres',
        devMessage: 'Password must be at least 6 characters long',
        httpStatus: 400
    },
    VAL_USERNAME_REQUIRED: {
        code: 'VAL_006',
        userMessage: 'El nombre de usuario es obligatorio',
        devMessage: 'Username field is required',
        httpStatus: 400
    },
    VAL_USERNAME_TOO_SHORT: {
        code: 'VAL_007',
        userMessage: 'El nombre de usuario debe tener al menos 3 caracteres',
        devMessage: 'Username must be at least 3 characters long',
        httpStatus: 400
    },
    VAL_USERNAME_TOO_LONG: {
        code: 'VAL_008',
        userMessage: 'El nombre de usuario no puede tener más de 30 caracteres',
        devMessage: 'Username cannot exceed 30 characters',
        httpStatus: 400
    },
    VAL_PHONE_INVALID: {
        code: 'VAL_009',
        userMessage: 'El formato del teléfono es inválido',
        devMessage: 'Phone number format is invalid',
        httpStatus: 400
    },
    VAL_DOCUMENT_INVALID: {
        code: 'VAL_010',
        userMessage: 'El formato del documento es inválido',
        devMessage: 'Document format is invalid',
        httpStatus: 400
    },
    VAL_NO_FIELDS_TO_UPDATE: {
        code: 'VAL_011',
        userMessage: 'No se proporcionaron campos válidos para actualizar',
        devMessage: 'No valid fields provided for update',
        httpStatus: 400
    },
    VAL_INVALID_OBJECT_ID: {
        code: 'VAL_012',
        userMessage: 'ID inválido',
        devMessage: 'Invalid MongoDB ObjectId format',
        httpStatus: 400
    },
    VAL_VERIFICATION_CODE_REQUIRED: {
        code: 'VAL_013',
        userMessage: 'El código de verificación es obligatorio',
        devMessage: 'Verification code is required',
        httpStatus: 400
    },
    VAL_VERIFICATION_CODE_INVALID_LENGTH: {
        code: 'VAL_014',
        userMessage: 'El código de verificación debe tener 6 dígitos',
        devMessage: 'Verification code must be 6 digits long',
        httpStatus: 400
    },

    // ERRORES DEL SERVIDOR (SRV_xxx)
    SRV_DATABASE_ERROR: {
        code: 'SRV_001',
        userMessage: 'Error temporal del servidor. Intenta más tarde',
        devMessage: 'Database operation failed',
        httpStatus: 500
    },
    SRV_DATABASE_CONNECTION_FAILED: {
        code: 'SRV_002',
        userMessage: 'Servicio temporalmente no disponible',
        devMessage: 'Failed to connect to database',
        httpStatus: 503
    },
    SRV_EMAIL_SEND_FAILED: {
        code: 'SRV_003',
        userMessage: 'No pudimos enviar el email. Intenta más tarde',
        devMessage: 'Email service failed to send message',
        httpStatus: 500
    },
    SRV_JWT_GENERATION_FAILED: {
        code: 'SRV_004',
        userMessage: 'Error al generar sesión. Intenta nuevamente',
        devMessage: 'Failed to generate JWT token',
        httpStatus: 500
    },
    SRV_PASSWORD_HASH_FAILED: {
        code: 'SRV_005',
        userMessage: 'Error al procesar contraseña. Intenta nuevamente',
        devMessage: 'Failed to hash password',
        httpStatus: 500
    },
    SRV_INTERNAL_ERROR: {
        code: 'SRV_999',
        userMessage: 'Error interno del servidor',
        devMessage: 'Unhandled internal server error',
        httpStatus: 500
    },

    // ERRORES DE LÍMITES (LMT_xxx)
    LMT_TOO_MANY_REQUESTS: {
        code: 'LMT_001',
        userMessage: 'Demasiados intentos. Espera un momento antes de intentar nuevamente',
        devMessage: 'Rate limit exceeded',
        httpStatus: 429
    },
    LMT_PASSWORD_RESET_LIMIT: {
        code: 'LMT_002',
        userMessage: 'Solo puedes solicitar un código de reset cada 15 minutos',
        devMessage: 'Password reset request limit exceeded',
        httpStatus: 429
    },
    LMT_EMAIL_VERIFICATION_LIMIT: {
        code: 'LMT_003',
        userMessage: 'Solo puedes solicitar un código de verificación cada 5 minutos',
        devMessage: 'Email verification request limit exceeded',
        httpStatus: 429
    },
    LMT_REGISTRATION_LIMIT: {
        code: 'LMT_004',
        userMessage: 'Máximo 3 registros por hora. Intenta más tarde',
        devMessage: 'Registration limit exceeded - max 3 per hour',
        httpStatus: 429
    },
    LMT_AUTH_ATTEMPTS_LIMIT: {
        code: 'LMT_005',
        userMessage: 'Demasiados intentos de autenticación. Espera 15 minutos',
        devMessage: 'Authentication attempts limit exceeded',
        httpStatus: 429
    },
    LMT_PROFILE_REQUESTS_LIMIT: {
        code: 'LMT_006',
        userMessage: 'Demasiadas peticiones a perfil. Intenta en unos minutos',
        devMessage: 'Profile requests limit exceeded',
        httpStatus: 429
    },

    // ERRORES DE API (API_xxx)
    API_KEY_MISSING: {
        code: 'API_001',
        userMessage: 'Acceso no autorizado',
        devMessage: 'API key is missing from request headers',
        httpStatus: 401
    },
    API_KEY_INVALID: {
        code: 'API_002',
        userMessage: 'Acceso no autorizado',
        devMessage: 'API key is invalid',
        httpStatus: 401
    },
    API_ENDPOINT_NOT_FOUND: {
        code: 'API_003',
        userMessage: 'Recurso no encontrado',
        devMessage: 'API endpoint does not exist',
        httpStatus: 404
    },
    API_METHOD_NOT_ALLOWED: {
        code: 'API_004',
        userMessage: 'Método no permitido',
        devMessage: 'HTTP method not allowed for this endpoint',
        httpStatus: 405
    }
};

