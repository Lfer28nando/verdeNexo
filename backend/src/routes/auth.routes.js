import { Router } from "express";
import {login, logout, profile, register, editUser, changePassword, requestPasswordReset, resetPassword, requestEmailVerification, verifyEmail, setup2FA, verifyAndEnable2FA, disable2FA, verify2FA, requestEmailChange, confirmEmailChange, unsubscribe} from '../controllers/auth.controller.js'
import { authRequired, guestOnly, authRequiredFor2FA } from "../middlewares/validateToken.middleware.js";
import { validateSchema } from "../middlewares/validator.middleware.js";
import { registerSchema, loginSchema, editUserSchema, changePasswordSchema, requestPasswordResetSchema, resetPasswordSchema, requestEmailVerificationSchema, setup2FASchema, verifyAndEnable2FASchema, disable2FASchema, verify2FASchema, requestEmailChangeSchema, confirmEmailChangeSchema } from "../schemas/auth.schema.js";
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
router.post('/register', registerLimiter, guestOnly,  validateSchema(registerSchema), register);

// Login - máximo 5 intentos por 15 min + slow down
router.post('/login', guestOnly,authLimiter, authSlowDown, validateSchema(loginSchema), login);

// Logout - sin límite estricto
router.get('/logout', logout);

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

// Two-Factor Authentication
router.post('/setup2FA', profileLimiter, authRequired, validateSchema(setup2FASchema), setup2FA);
router.post('/verify2FA', profileLimiter, authRequired, validateSchema(verifyAndEnable2FASchema), verifyAndEnable2FA);
router.post('/disable2FA', profileLimiter, authRequired, validateSchema(disable2FASchema), disable2FA);
router.post('/verify2FACode', profileLimiter, authRequiredFor2FA, validateSchema(verify2FASchema), verify2FA);

// Cambio de email
router.post('/requestEmailChange', profileLimiter, authRequired, validateSchema(requestEmailChangeSchema), requestEmailChange);
router.post('/confirmEmailChange', profileLimiter, authRequired, validateSchema(confirmEmailChangeSchema), confirmEmailChange);

// Eliminar cuenta
router.post('/unsubscribe', authLimiter, authRequired, unsubscribe);

export default router;