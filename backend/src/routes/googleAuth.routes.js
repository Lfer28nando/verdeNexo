import { Router } from "express";
import passport from "../config/googleAuth.js";
import { setAuthCookie } from "../config/googleAuth.js";
import { authRequired } from "../middlewares/validateToken.middleware.js";
import User from "../models/user.model.js";

const router = Router();

/**
 * Ruta: GET /auth/google
 * Descripción: Inicia el flujo de autenticación con Google OAuth 2.0
 * Scopes: profile, email
 */
router.get('/google', passport.authenticate('google', { 
    scope: ['profile', 'email'],
    session: false // Usamos JWT en lugar de sesiones
}));

/**
 * Ruta: GET /auth/google/callback
 * Descripción: Callback de Google OAuth que maneja la respuesta
 * Retorna: JWT en cookie HttpOnly y respuesta JSON con user y token
 */
router.get('/google/callback', 
    passport.authenticate('google', { 
        session: false,
        failureRedirect: '/auth/google/failure'
    }),
    async (req, res) => {
        try {
            // req.user contiene el usuario autenticado por la estrategia
            const user = req.user;

            if (!user) {
                return res.status(400).json({ 
                    ok: false, 
                    message: 'Error en la autenticación con Google' 
                });
            }

            // Generar JWT y configurar cookie
            const token = await setAuthCookie(res, user);

            // Respuesta exitosa
            res.json({
                ok: true,
                message: 'Autenticación exitosa con Google',
                user: {
                    id: user._id,
                    username: user.username,
                    email: user.email,
                    role: user.role,
                    avatar: user.avatar,
                    provider: user.provider,
                    verifiedEmail: user.verifiedEmail,
                    createdAt: user.createdAt,
                    updatedAt: user.updatedAt
                },
                token: token
            });

        } catch (error) {
            console.error('Error en Google OAuth callback:', error);
            res.status(500).json({ 
                ok: false, 
                message: 'Error interno del servidor' 
            });
        }
    }
);

/**
 * Ruta: GET /auth/google/failure
 * Descripción: Maneja errores en el flujo de autenticación con Google
 */
router.get('/google/failure', (req, res) => {
    res.status(401).json({
        ok: false,
        message: 'Error en la autenticación con Google',
        error: 'authentication_failed'
    });
});

/**
 * Ruta: GET /auth/logout
 * Descripción: Cierra sesión eliminando el token de la cookie
 */
router.get('/logout', (req, res) => {
    // Limpiar la cookie con las mismas opciones para que el navegador la sobrescriba
    res.cookie("token", "", {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        expires: new Date(0)
    });

    res.json({
        ok: true,
        message: 'Sesión cerrada correctamente'
    });
});

/**
 * Ruta: GET /auth/me
 * Descripción: Obtiene los datos del usuario autenticado
 * Requiere: Token JWT válido
 */
router.get('/me', authRequired, async (req, res) => {
    try {
        const userFound = await User.findById(req.user.id).select('-password');

        if (!userFound) {
            return res.status(404).json({
                ok: false,
                message: "Usuario no encontrado"
            });
        }

        if (!userFound.active) {
            return res.status(403).json({
                ok: false,
                message: "Usuario inactivo. Contacte al administrador"
            });
        }

        res.json({
            ok: true,
            user: {
                id: userFound._id,
                username: userFound.username,
                email: userFound.email,
                role: userFound.role,
                avatar: userFound.avatar,
                provider: userFound.provider,
                cellphone: userFound.cellphone,
                document: userFound.document,
                address: userFound.address,
                active: userFound.active,
                verifiedEmail: userFound.verifiedEmail,
                twoFactorEnabled: userFound.twoFactorEnabled,
                lastLogin: userFound.lastLogin,
                createdAt: userFound.createdAt,
                updatedAt: userFound.updatedAt,
                paidMethods: userFound.paidMethods
            }
        });

    } catch (error) {
        console.error('Error en /auth/me:', error);
        res.status(500).json({
            ok: false,
            message: 'Error interno del servidor'
        });
    }
});

export default router;