import { Router } from "express";
import {login, logout, profile, register, editUser, changePassword, requestPasswordReset, resetPassword, requestEmailVerification, verifyEmail} from '../controllers/auth.controller.js'
import { authRequired } from "../middlewares/validateToken.middleware.js";
import { validateSchema } from "../middlewares/validator.middleware.js";
import { registerSchema, loginSchema, editUserSchema, changePasswordSchema, requestPasswordResetSchema, resetPasswordSchema, requestEmailVerificationSchema } from "../schemas/auth.schema.js";
import { 
    authLimiter, 
    passwordResetLimiter, 
    emailVerificationLimiter, 
    registerLimiter, 
    profileLimiter, 
    authSlowDown 
} from "../middlewares/rateLimiter.middleware.js";

const router = Router()

// Registro - máximo 3 por hora
router.post('/register', registerLimiter, validateSchema(registerSchema), register);

// Login - máximo 5 intentos por 15 min + slow down
router.post('/login', authLimiter, authSlowDown, validateSchema(loginSchema), login);

// Logout - sin límite estricto
router.post('/logout', logout);

// Perfil - límite moderado
router.get('/profile', profileLimiter, authRequired, profile);
router.put('/edit', profileLimiter, authRequired, validateSchema(editUserSchema), editUser);

// Cambio de contraseña - límite estricto
router.put('/changePassword', authLimiter, authRequired, validateSchema(changePasswordSchema), changePassword);

// Reset de contraseña - muy estricto (3 por 15 min)
router.post('/requestPasswordReset', passwordResetLimiter, validateSchema(requestPasswordResetSchema), requestPasswordReset);
router.post('/resetPassword', passwordResetLimiter, validateSchema(resetPasswordSchema), resetPassword);

// Verificación de email - estricto (3 por 5 min)
router.post('/requestEmailVerification', emailVerificationLimiter, authRequired, validateSchema(requestEmailVerificationSchema), requestEmailVerification);
router.post('/verifyEmail', emailVerificationLimiter, verifyEmail);

export default router;