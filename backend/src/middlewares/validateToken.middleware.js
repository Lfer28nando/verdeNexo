import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import User from '../models/user.model.js';

dotenv.config({ path: './src/.env' });

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