import { Unauthorized } from '../utils/error.js';

// Wrapper para middlewares async
const asyncMiddleware = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

// middleware para proteger todas las rutas con API Key
function verificarApiKey(req, res, next) {
  // deja pasar el preflight CORS
  if (req.method === 'OPTIONS') return next();

  const provided =
    req.get('x-api-key') ||
    req.headers['x-api-key'] ||
    req.query.api_key; // opcional: ?api_key=...

  const valid = process.env.API_KEY;

  if (!valid) {
    console.error('Falta API_KEY en .env');
    throw Unauthorized('Configuración del servidor incompleta');
  }
  if (!provided || provided !== valid) {
    throw Unauthorized('API key inválida o ausente');
  }
  next();
}

// Exportar middleware con wrapper
const verificarApiKeyWrapped = asyncMiddleware(verificarApiKey);

export { verificarApiKeyWrapped as verificarApiKey };