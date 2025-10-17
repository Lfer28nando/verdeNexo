import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import User from '../models/user.model.js';

dotenv.config({ path: './src/.env' });

export const guestOnly = (req, res, next) => {
     try {
    // Si usas cookie con nombre 'token' (ajusta el nombre)
    const token = req.cookies?.token;
    if (!token) return next(); // no autenticado -> puede continuar

    // Verifica token (usa la misma clave que para auth)
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    if (payload) {
      // Ya está autenticado -> redirigir o devolver JSON
      // Si quieres redirect (web pages):
      return res.redirect('/'); // o '/dashboard'
      // Si API JSON: return res.status(400).json({ ok: false, message: 'Already authenticated' });
    }
    // Si token inválido se deja pasar (o podrías clearCookie)
    return next();
  } catch (err) {
    // Token inválido o expirado -> permitir acceso al login/register
    return next();
  }
};

export const authRequired = async (req, res, next) => {
    try {
        const token = req.cookies?.token;
        if(!token) {
            return res.status(401).json({message:'No token, authorization denied'});
        }

        // 1. Verificar y decodificar el token
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        
        // 2. Buscar el usuario en la base de datos
        const user = await User.findById(decoded.id).select('-password');
        
        // 3. Verificar que el usuario existe
        if (!user) {
            return res.status(401).json({message:'Usuario no encontrado'});
        }
        
        // 4. Verificar que el usuario está activo
        if (!user.active) {
            return res.status(401).json({message:'Usuario inactivo'});
        }
        
        // 5. Asignar usuario completo a req.user
        req.user = user;
        next();
        
    } catch(err) { 
        return res.status(401).json({message:'Token inválido'}); 
    }
}

// Middleware especial para verificación de 2FA durante login
export const authRequiredFor2FA = async (req, res, next) => {
    try {
        // Primero intentar con token normal
        const token = req.cookies?.token;
        if (token) {
            try {
                const decoded = jwt.verify(token, process.env.JWT_SECRET);
                const user = await User.findById(decoded.id).select('-password');
                if (user && user.active) {
                    req.user = user;
                    return next();
                }
            } catch (err) {
                // Token normal inválido, continuar con token temporal
            }
        }

        // Intentar con token temporal de 2FA
        const tempToken = req.cookies?.temp_token;
        if (!tempToken) {
            return res.status(401).json({message:'No token, authorization denied'});
        }

        // Verificar token temporal
        const decoded = jwt.verify(tempToken, process.env.JWT_SECRET);
        
        // Verificar que es un token de 2FA
        if (!decoded.requires2FA) {
            return res.status(401).json({message:'Token inválido para 2FA'});
        }
        
        // Buscar el usuario
        const user = await User.findById(decoded.id).select('-password');
        
        if (!user) {
            return res.status(401).json({message:'Usuario no encontrado'});
        }
        
        if (!user.active) {
            return res.status(401).json({message:'Usuario inactivo'});
        }
        
        // Asignar usuario
        req.user = user;
        next();
        
    } catch(err) { 
        return res.status(401).json({message:'Token inválido'}); 
    }
}