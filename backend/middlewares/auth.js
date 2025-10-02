// Importaciones;
import jwt from 'jsonwebtoken';
import { Unauthorized, Forbidden } from '../utils/error.js';

// Wrapper para middlewares async
const asyncMiddleware = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

function verificarToken(req, res, next) {
  const token = req.cookies.token;

  if (!token) {
    throw Unauthorized('Token requerido');
  }

  try {
    const decodigod = jwt.verify(token, process.env.JWT_SECRET);
    console.log('Token decodificado:', decodigod); // debug
    req.usuario = decodigod;
    next();
  } catch (error) {
    throw Unauthorized('Token inválido');
  }
}

function soloAdmin(req, res, next) {
  if (req.usuario.rol !== 'admin') {
    throw Forbidden('Acceso denegado');
  }
  next();
}

// Exportar middlewares con wrapper
const verificarTokenWrapped = asyncMiddleware(verificarToken);
const soloAdminWrapped = asyncMiddleware(soloAdmin);

export {
  verificarTokenWrapped as verificarToken,
  soloAdminWrapped as soloAdmin
};
