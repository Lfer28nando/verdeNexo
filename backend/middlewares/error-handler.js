// 404: Ruta no encontrada
export function notFound(req, res, next) {
  return res.status(404).json({
    ok: false,
    error: {
      code: 'NOT_FOUND',
      message: `Ruta no existente`
    }
  });
}

// Manejador global de errores (500 y otros)
export function errorHandler(err, req, res, next) {
  if (res.headersSent) return next(err);

  // Errores comunes de Mongoose
  if (err?.name === 'ValidationError') {
    return res.status(400).json({ ok: false, error: { code: 'VALIDATION_ERROR', message: err.message }});
  }
  if (err?.name === 'CastError') {
    return res.status(400).json({ ok: false, error: { code: 'BAD_ID_FORMAT', message: `ID inválido: ${err.value}` }});
  }
  if (err?.code === 11000) {
    return res.status(409).json({ ok: false, error: { code: 'DUPLICATE_KEY', message: 'Registro duplicado', details: err.keyValue }});
  }

  // Errores de JWT
  if (err?.name === 'JsonWebTokenError') {
    return res.status(401).json({ ok: false, error: { code: 'INVALID_TOKEN', message: 'Token inválido' }});
  }
  if (err?.name === 'TokenExpiredError') {
    return res.status(401).json({ ok: false, error: { code: 'TOKEN_EXPIRED', message: 'Token expirado' }});
  }

  // Errores personalizados de nuestra app (AppError)
  if (err?.status || err?.statusCode) {
    const status = err.status || err.statusCode || 500;
    const code = err.code || 'APP_ERROR';
    const message = err.message || 'Error de aplicación';
    return res.status(status).json({ ok: false, error: { code, message } });
  }

  // Fallback genérico
  const isProd = process.env.NODE_ENV === 'production';
  console.error('[ERROR]', err); // Más adelante puedes cambiar a Winston/Pino
  return res.status(500).json({
    ok: false,
    error: { code: 'INTERNAL_ERROR', message: 'Error interno del servidor' },
    ...(isProd ? {} : { stack: err?.stack })
  });
}