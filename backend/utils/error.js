// Helpers para lanzar errores específicos que el middleware capturará

class AppError extends Error {
  constructor(message, status = 500, code = 'APP_ERROR') {
    super(message);
    this.name = 'AppError';
    this.status = status;
    this.code = code;
    Error.captureStackTrace?.(this, this.constructor);
  }
}

// Helpers para errores comunes
export const BadRequest = (message, code = 'BAD_REQUEST') => {
  throw new AppError(message, 400, code);
};

export const Unauthorized = (message, code = 'UNAUTHORIZED') => {
  throw new AppError(message, 401, code);
};

export const Forbidden = (message, code = 'FORBIDDEN') => {
  throw new AppError(message, 403, code);
};

export const NotFound = (message, code = 'NOT_FOUND') => {
  throw new AppError(message, 404, code);
};

export const Conflict = (message, code = 'CONFLICT') => {
  throw new AppError(message, 409, code);
};

export const ValidationError = (message, code = 'VALIDATION_ERROR') => {
  throw new AppError(message, 422, code);
};

export default AppError;