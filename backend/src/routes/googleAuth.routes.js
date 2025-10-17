import { Router } from "express";
import passport from "../config/googleAuth.js";
import { setAuthCookie, setTemp2FACookie } from "../config/googleAuth.js";
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
        failureRedirect: '/login?error=google_failed'
    }),
    async (req, res) => {
        try {
            const user = req.user;

            if (!user) {
                return res.redirect('/login?error=google_auth_failed');
            }

            // Validar FRONTEND_URL
            if (!process.env.FRONTEND_URL || process.env.FRONTEND_URL.trim() === '') {
                return res.status(500).send(`
                    <html>
                        <head><title>Error de configuración</title></head>
                        <body>
                            <h2>FRONTEND_URL no está definida en las variables de entorno.</h2>
                            <p>Configúrala en tu archivo .env o en Render.</p>
                        </body>
                    </html>
                `);
            }
            const frontendUrlBase = process.env.FRONTEND_URL.trim();
            // Si tiene 2FA activado
            if (user.twoFactorEnabled) {
                await setTemp2FACookie(res, user);
                return res.send(`
                    <html>
                        <head><title>Verificación 2FA</title></head>
                        <body>
                            <script>
                                const frontendUrl = '${frontendUrlBase}/login?requires2fa=true';
                                if (window.opener) {
                                    window.opener.location = frontendUrl;
                                    window.close();
                                } else {
                                    window.location = frontendUrl;
                                }
                            </script>
                            <p>Redirigiendo...</p>
                        </body>
                    </html>
                `);
            }

            // Si NO tiene 2FA → genera cookie de sesión y redirige normal
            await setAuthCookie(res, user);
            const frontendUrl = `${frontendUrlBase}/?login=success`;
            return res.send(`
                <html>
                    <head><title>Inicio de sesión exitoso</title></head>
                    <body>
                        <script>
                            if (window.opener) {
                                window.opener.location = '${frontendUrl}';
                                window.close();
                            } else {
                                window.location = '${frontendUrl}';
                            }
                        </script>
                        <p>Inicio de sesión exitoso. Redirigiendo...</p>
                    </body>
                </html>
            `);

        } catch (error) {
            console.error("Error en callback de Google:", error);
            res.status(500).json({
                success: false,
                error: {
                    code: "SRV_999",
                    message: "Error interno del servidor",
                    timestamp: new Date().toISOString()
                }
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
        secure: true,
        sameSite: 'None',
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