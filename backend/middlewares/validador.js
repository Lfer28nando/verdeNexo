import { validationResult } from 'express-validator';

/**
 * Middleware para validar campos usando express-validator
 * @param {Request} req - Request object
 * @param {Response} res - Response object  
 * @param {Function} next - Next function
 */
export const validarCampos = (req, res, next) => {
  const errores = validationResult(req);
  
  if (!errores.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Errores de validación',
      errores: errores.array().map(error => ({
        campo: error.path || error.param,
        mensaje: error.msg,
        valor: error.value
      }))
    });
  }
  
  next();
};

/**
 * Middleware para validar que el usuario tenga ciertos roles
 * @param {Array} rolesPermitidos - Array de roles permitidos
 * @returns {Function} - Middleware function
 */
export const validarRoles = (rolesPermitidos = []) => {
  return (req, res, next) => {
    if (!req.usuario) {
      return res.status(401).json({
        success: false,
        message: 'Usuario no autenticado'
      });
    }
    
    const rolUsuario = req.usuario.rol;
    
    if (!rolesPermitidos.includes(rolUsuario)) {
      return res.status(403).json({
        success: false,
        message: `Acceso denegado. Roles permitidos: ${rolesPermitidos.join(', ')}`
      });
    }
    
    next();
  };
};

/**
 * Middleware para validar que el usuario sea admin
 */
export const validarAdmin = validarRoles(['admin']);

/**
 * Middleware para validar que el usuario sea vendedor o admin
 */
export const validarVendedor = validarRoles(['admin', 'vendedor']);

/**
 * Middleware para validar paginación
 * @param {Request} req - Request object
 * @param {Response} res - Response object
 * @param {Function} next - Next function
 */
export const validarPaginacion = (req, res, next) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 20;
  
  if (page < 1) {
    return res.status(400).json({
      success: false,
      message: 'El número de página debe ser mayor a 0'
    });
  }
  
  if (limit < 1 || limit > 100) {
    return res.status(400).json({
      success: false,
      message: 'El límite debe estar entre 1 y 100'
    });
  }
  
  // Agregar valores validados al request
  req.pagination = { page, limit };
  
  next();
};