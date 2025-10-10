// Middleware simple para validar API Key fija
export const validateApiKey = (req, res, next) => {
  const apiKey = req.headers['x-api-key'];
  const validApiKey = process.env.API_KEY || 'verdenexo-secret-key-2024';
  
  if (!apiKey || apiKey !== validApiKey) {
    return res.status(401).json({ message: 'API Key inválida o faltante' });
  }
  
  next();
};