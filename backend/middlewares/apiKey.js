// middleware para proteger todas las rutas con API Key
export function verificarApiKey(req, res, next) {
  // deja pasar el preflight CORS
  if (req.method === 'OPTIONS') return next();

  const provided =
    req.get('x-api-key') ||
    req.headers['x-api-key'] ||
    req.query.api_key; // opcional: ?api_key=...

  const valid = process.env.API_KEY;

  if (!valid) {
    console.error('Falta API_KEY en .env');
    return res.status(500).json({ mensaje: 'Configuración del servidor incompleta' });
  }
  if (!provided || provided !== valid) {
    return res.status(401).json({ mensaje: 'API key inválida o ausente' });
  }
  next();
}
