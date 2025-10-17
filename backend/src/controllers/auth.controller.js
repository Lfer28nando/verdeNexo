import User from "../models/user.model.js";
import dotenv from "dotenv";
dotenv.config({ path: './src/.env' });
import bcrypt from "bcryptjs";
import { createAccessToken } from "../libs/jwt.js";
import { sendPasswordResetEmail, sendEmailVerificationCode, sendEmailChangeNotification } from "../config/email.js";
import { createError } from "../utils/customError.js";
import speakeasy from "speakeasy";
import qrcode from "qrcode";
import jwt from "jsonwebtoken";

const cookieDomain = process.env.COOKIE_DOMAIN || undefined;

// 01- Registrar usuario.
export const register = async (req, res, next) => {
    try {
        const { username, email, password, cellphone } = req.body;

        // Verificar si el email ya existe
        const existingUser = await User.findOne({ email: email.toLowerCase() });
        if (existingUser) {
            throw createError('VAL_EMAIL_ALREADY_EXISTS', { email });
        }

        // Hash de la contraseña
        const passwordHash = await bcrypt.hash(password, 10);
        
        // Crear nuevo usuario
        const newUser = new User({
            username: username.trim(),
            email: email.toLowerCase().trim(),
            password: passwordHash,
            cellphone: cellphone?.trim()
        });

        const userSaved = await newUser.save();
        const token = await createAccessToken({ id: userSaved._id });
        
        res.cookie("token", token, {
            httpOnly: true,
            secure: true,
            sameSite: 'none',
            domain: cookieDomain,
            maxAge: 24 * 60 * 60 * 1000
        });

        res.status(201).json({
            success: true,
            message: 'Usuario registrado exitosamente',
            user: {
                id: userSaved._id,
                username: userSaved.username,
                email: userSaved.email,
                cellphone: userSaved.cellphone,
                role: userSaved.role,
                verifiedEmail: userSaved.verifiedEmail,
                createdAt: userSaved.createdAt,
                updatedAt: userSaved.updatedAt
            }
        });
        
    } catch (error) {
        next(error);
    }
};

// 02- Loggear usuario.
export const login = async (req, res, next) => {
    try {
        const { email, password } = req.body;

        const userFound = await User.findOne({ email: email.toLowerCase().trim() });
        if (!userFound) {
            throw createError('AUTH_USER_NOT_FOUND', { email });
        }

        if (!userFound.active) {
            throw createError('AUTH_USER_INACTIVE', { userId: userFound._id });
        }

        const passwordIsMatch = await bcrypt.compare(password, userFound.password);
        if (!passwordIsMatch) {
            throw createError('AUTH_INVALID_PASSWORD', { email });
        }

        // Actualizar último login
        userFound.lastLogin = new Date();
        await userFound.save();

        // Verificar si el usuario tiene 2FA activado
        if (userFound.twoFactorEnabled) {
            // Crear token temporal para el proceso de 2FA (válido por 5 minutos)
            const tempToken = await createAccessToken({ 
                id: userFound._id, 
                requires2FA: true 
            });

            res.cookie("temp_token", tempToken, {
                httpOnly: true,
                secure: true,
                sameSite: 'None',
                maxAge: 5 * 60 * 1000 // 5 minutos
            });

            return res.json({
                success: true,
                requires2FA: true,
                message: 'Se requiere verificación de dos factores',
                user: {
                    id: userFound._id,
                    username: userFound.username,
                    email: userFound.email
                }
            });
        }

        // Login normal sin 2FA
        const token = await createAccessToken({ id: userFound._id });
        
        res.cookie("token", token, {
            httpOnly: true,
            secure: true,
            sameSite: 'none',
            domain: cookieDomain,
            maxAge: 24 * 60 * 60 * 1000
        });

        res.json({
            success: true,
            message: 'Login exitoso',
            user: {
                id: userFound._id,
                username: userFound.username,
                email: userFound.email,
                role: userFound.role,
                avatar: userFound.avatar,
                verifiedEmail: userFound.verifiedEmail,
                lastLogin: userFound.lastLogin,
                createdAt: userFound.createdAt,
                updatedAt: userFound.updatedAt
            }
        });
        
    } catch (error) {
        next(error);
    }
};

// 03- Cerrar sesion.
export const logout = (req, res) => {
    res.cookie("token", "", {
        httpOnly: true,
        secure: true,
        sameSite: 'None',
        expires: new Date(0)
    });
    
    res.json({
        success: true,
        message: 'Sesión cerrada correctamente'
    });
};

// 04 - Perfil de usuario.
export const profile = (req, res) => {
    res.json({
        success: true,
        user: {
            id: req.user._id,
            username: req.user.username,
            email: req.user.email,
            cellphone: req.user.cellphone,
            document: req.user.document,
            documentType: req.user.documentType,
            address: req.user.address,
            role: req.user.role,
            active: req.user.active,
            verifiedEmail: req.user.verifiedEmail,
            twoFactorEnabled: req.user.twoFactorEnabled,
            avatar: req.user.avatar,
            provider: req.user.provider,
            lastLogin: req.user.lastLogin,
            createdAt: req.user.createdAt,
            updatedAt: req.user.updatedAt,
            paidMethods: req.user.paidMethods
        }
    });
};

// 05 - Editar perfil de usuario.
export const editUser = async (req, res, next) => {
    try {
        const allowedFields = ['username', 'cellphone', 'document', 'documentType', 'address'];
        const updates = {};
        
        for (const key of Object.keys(req.body || {})) {
            if (allowedFields.includes(key) && req.body[key] !== undefined) {
                updates[key] = req.body[key].toString().trim();
            }
        }

        if (Object.keys(updates).length === 0) {
            throw createError('VAL_NO_FIELDS_TO_UPDATE');
        }

        const userFound = await User.findByIdAndUpdate(
            req.user._id, 
            updates, 
            { new: true, runValidators: true }
        ).select('-password -__v');

        if (!userFound) {
            throw createError('AUTH_USER_NOT_FOUND', { userId: req.user._id });
        }

        res.json({
            success: true,
            message: 'Perfil actualizado correctamente',
            user: {
                id: userFound._id,
                username: userFound.username,
                email: userFound.email,
                cellphone: userFound.cellphone,
                document: userFound.document,
                documentType: userFound.documentType,
                address: userFound.address,
                role: userFound.role,
                active: userFound.active,
                verifiedEmail: userFound.verifiedEmail,
                twoFactorEnabled: userFound.twoFactorEnabled,
                createdAt: userFound.createdAt,
                updatedAt: userFound.updatedAt,
                paidMethods: userFound.paidMethods
            }
        });
        
    } catch (error) {
        next(error);
    }
};

// 06 - Cambiar contraseña.
export const changePassword = async (req, res, next) => {
    try {
        const { currentPassword, newPassword } = req.body;

        // Verificar que la nueva contraseña sea diferente
        const isSamePassword = await bcrypt.compare(newPassword, req.user.password);
        if (isSamePassword) {
            throw createError('AUTH_PASSWORD_SAME_AS_CURRENT');
        }

        const userFound = await User.findById(req.user._id);
        if (!userFound) {
            throw createError('AUTH_USER_NOT_FOUND', { userId: req.user._id });
        }

        const isValidPassword = await bcrypt.compare(currentPassword, userFound.password);
        if (!isValidPassword) {
            throw createError('AUTH_INVALID_PASSWORD');
        }

        const newPasswordHash = await bcrypt.hash(newPassword, 10);
        userFound.password = newPasswordHash;
        await userFound.save();

        res.json({
            success: true,
            message: 'Contraseña actualizada correctamente'
        });
        
    } catch (error) {
        next(error);
    }
};

// 07 - Solicitar código de reset.
export const requestPasswordReset = async (req, res, next) => {
    try {
        const { email } = req.body;
        const userFound = await User.findOne({ email: email.trim().toLowerCase() });
        
        // Por seguridad, siempre respondemos igual
        if (!userFound || !userFound.active) {
            return res.json({ 
                success: true,
                message: 'Si el email existe, se envió un código de verificación' 
            });
        }

        const resetCode = Math.floor(100000 + Math.random() * 900000).toString();
        
        userFound.resetPasswordToken = resetCode;
        userFound.resetPasswordExpires = new Date(Date.now() + 15 * 60 * 1000);
        await userFound.save();

        await sendPasswordResetEmail(userFound.email, resetCode);

        res.json({ 
            success: true,
            message: 'Si el email existe, se envió un código de verificación' 
        });
        
    } catch (error) {
        if (error.message.includes('Email service')) {
            next(createError('SRV_EMAIL_SEND_FAILED', { originalError: error.message }));
        } else {
            next(error);
        }
    }
};

// 08 - Reset contraseña con código.
export const resetPassword = async (req, res, next) => {
    try {
        const { email, code, newPassword } = req.body;

        const userFound = await User.findOne({ 
            email: email.trim().toLowerCase(),
            resetPasswordToken: code.trim(),
            resetPasswordExpires: { $gt: new Date() }
        });

        if (!userFound) {
            throw createError('AUTH_INVALID_RESET_CODE');
        }

        if (!userFound.active) {
            throw createError('AUTH_USER_INACTIVE', { userId: userFound._id });
        }

        const newPasswordHash = await bcrypt.hash(newPassword, 10);
        userFound.password = newPasswordHash;
        userFound.resetPasswordToken = undefined;
        userFound.resetPasswordExpires = undefined;
        await userFound.save();

        res.json({ 
            success: true,
            message: 'Contraseña actualizada correctamente' 
        });
        
    } catch (error) {
        next(error);
    }
};

// 09 - Solicitar código de verificación de email
export const requestEmailVerification = async (req, res, next) => {
    try {
        if (req.user.verifiedEmail) {
            throw createError('AUTH_EMAIL_ALREADY_VERIFIED');
        }

        const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
        
        const userFound = await User.findByIdAndUpdate(
            req.user._id,
            {
                emailVerificationToken: verificationCode,
                emailVerificationExpires: new Date(Date.now() + 24 * 60 * 60 * 1000)
            },
            { new: true }
        );

        if (!userFound) {
            throw createError('AUTH_USER_NOT_FOUND', { userId: req.user._id });
        }

        await sendEmailVerificationCode(req.user.email, verificationCode, req.user.username);

        res.json({ 
            success: true,
            message: 'Código de verificación enviado al email' 
        });
        
    } catch (error) {
        if (error.message.includes('Email service')) {
            next(createError('SRV_EMAIL_SEND_FAILED', { originalError: error.message }));
        } else {
            next(error);
        }
    }
};

// 10 - Verificar email con código
export const verifyEmail = async (req, res, next) => {
    try {
        const { email, code } = req.body;

        const userFound = await User.findOne({ 
            email: email.trim().toLowerCase(),
            emailVerificationToken: code.trim(),
            emailVerificationExpires: { $gt: new Date() }
        });

        if (!userFound) {
            throw createError('AUTH_INVALID_VERIFICATION_CODE');
        }

        if (!userFound.active) {
            throw createError('AUTH_USER_INACTIVE', { userId: userFound._id });
        }

        userFound.verifiedEmail = true;
        userFound.emailVerificationToken = undefined;
        userFound.emailVerificationExpires = undefined;
        await userFound.save();

        res.json({ 
            success: true,
            message: 'Email verificado correctamente',
            user: {
                id: userFound._id,
                username: userFound.username,
                email: userFound.email,
                verifiedEmail: userFound.verifiedEmail
            }
        });
        
    } catch (error) {
        next(error);
    }
};

// 11 - Generar setup 2FA TOTP
export const setup2FA = async (req, res, next) => {
    try {
        console.log('setup2FA -> req.user:', req.user ? req.user._id : 'undefined');
        console.log('setup2FA -> req.body:', req.body);

        const userFound = await User.findById(req.user._id);
        if (!userFound) {
            throw createError('AUTH_USER_NOT_FOUND', { userId: req.user._id });
        }

        if (!userFound.verifiedEmail) {
            throw createError('AUTH_EMAIL_NOT_VERIFIED');
        }

        if (userFound.twoFactorEnabled) {
            throw createError('AUTH_2FA_ALREADY_ENABLED');
        }

        // Generar secreto TOTP
        const secret = speakeasy.generateSecret({
            name: `Verde Nexo (${userFound.username})`,
            issuer: 'Verde Nexo'
        });

        // Generar códigos de respaldo (10 códigos únicos)
        const backupCodes = [];
        for (let i = 0; i < 10; i++) {
            backupCodes.push(Math.random().toString(36).substring(2, 10).toUpperCase());
        }

        // Generar QR code
        const qrCodeUrl = await qrcode.toDataURL(secret.otpauth_url);

        // Guardar temporalmente (no activar aún)
        userFound.twoFactorSecret = secret.base32;
        userFound.twoFactorBackupCodes = backupCodes;
        await userFound.save();

        res.json({
            success: true,
            message: 'Setup 2FA iniciado',
            secret: secret.base32,
            qrCode: qrCodeUrl,
            backupCodes: backupCodes
        });

    } catch (error) {
        next(error);
    }
};

// 12 - Verificar y activar 2FA
export const verifyAndEnable2FA = async (req, res, next) => {
    try {
        const { code } = req.body;

        const userFound = await User.findById(req.user._id);
        if (!userFound) {
            throw createError('AUTH_USER_NOT_FOUND', { userId: req.user._id });
        }

        if (!userFound.twoFactorSecret) {
            throw createError('AUTH_2FA_NOT_SETUP');
        }

        if (userFound.twoFactorEnabled) {
            throw createError('AUTH_2FA_ALREADY_ENABLED');
        }

        // Verificar código TOTP
        const verified = speakeasy.totp.verify({
            secret: userFound.twoFactorSecret,
            encoding: 'base32',
            token: code,
            window: 2 // 2 intervalos de tolerancia (30 segundos cada uno)
        });

        if (!verified) {
            throw createError('AUTH_INVALID_2FA_CODE');
        }

        // Activar 2FA
        userFound.twoFactorEnabled = true;
        await userFound.save();

        res.json({
            success: true,
            message: '2FA activado correctamente'
        });

    } catch (error) {
        next(error);
    }
};

// 13 - Desactivar 2FA
export const disable2FA = async (req, res, next) => {
    try {
        const { currentPassword } = req.body;

        const userFound = await User.findById(req.user._id);
        if (!userFound) {
            throw createError('AUTH_USER_NOT_FOUND', { userId: req.user._id });
        }

        if (!userFound.twoFactorEnabled) {
            throw createError('AUTH_2FA_NOT_ENABLED');
        }

        // Verificar contraseña actual
        const isValidPassword = await bcrypt.compare(currentPassword, userFound.password);
        if (!isValidPassword) {
            throw createError('AUTH_INVALID_PASSWORD');
        }

        // Desactivar 2FA
        userFound.twoFactorEnabled = false;
        userFound.twoFactorSecret = undefined;
        userFound.twoFactorBackupCodes = [];
        await userFound.save();

        res.json({
            success: true,
            message: '2FA desactivado correctamente'
        });

    } catch (error) {
        next(error);
    }
};

// 14 - Verificar código 2FA (para login)
export const verify2FA = async (req, res, next) => {
    try {
        const { code, backupCode } = req.body;

        const userFound = await User.findById(req.user._id);
        if (!userFound) {
            throw createError('AUTH_USER_NOT_FOUND', { userId: req.user._id });
        }

        if (!userFound.twoFactorEnabled) {
            throw createError('AUTH_2FA_NOT_ENABLED');
        }

        let verified = false;

        // Intentar verificar con TOTP
        if (code) {
            verified = speakeasy.totp.verify({
                secret: userFound.twoFactorSecret,
                encoding: 'base32',
                token: code,
                window: 2
            });
        }

        // Si no funcionó TOTP, intentar con código de respaldo
        if (!verified && backupCode) {
            const backupCodeIndex = userFound.twoFactorBackupCodes.indexOf(backupCode);
            if (backupCodeIndex !== -1) {
                verified = true;
                // Remover el código usado
                userFound.twoFactorBackupCodes.splice(backupCodeIndex, 1);
                await userFound.save();
            }
        }

        if (!verified) {
            throw createError('AUTH_INVALID_2FA_CODE');
        }

        // Verificar si hay un token temporal (login con 2FA)
        const tempToken = req.cookies?.temp_token;
        if (tempToken) {
            try {
                const decoded = jwt.verify(tempToken, process.env.JWT_SECRET);
                if (decoded.requires2FA) {
                    // Es un login con 2FA - borrar cookie temporal y crear cookie normal
                    res.clearCookie('temp_token');
                    
                    const token = await createAccessToken({ id: userFound._id });
                    res.cookie("token", token, {
                        httpOnly: true,
                        secure: true,
                        sameSite: 'none',
                        domain: cookieDomain,
                        maxAge: 24 * 60 * 60 * 1000
                    });
                }
            } catch (err) {
                // Token temporal inválido, continuar normalmente
            }
        }

        res.json({
            success: true,
            message: '2FA verificado correctamente',
            user: {
                id: userFound._id,
                username: userFound.username,
                email: userFound.email,
                role: userFound.role,
                avatar: userFound.avatar,
                verifiedEmail: userFound.verifiedEmail,
                lastLogin: userFound.lastLogin,
                createdAt: userFound.createdAt,
                updatedAt: userFound.updatedAt
            }
        });

    } catch (error) {
        next(error);
    }
};

// 15 - Solicitar cambio de email
export const requestEmailChange = async (req, res, next) => {
    try {
        const { newEmail, currentPassword } = req.body;

        const userFound = await User.findById(req.user._id);
        if (!userFound) {
            throw createError('AUTH_USER_NOT_FOUND', { userId: req.user._id });
        }

        // Verificar contraseña actual
        const isValidPassword = await bcrypt.compare(currentPassword, userFound.password);
        if (!isValidPassword) {
            throw createError('AUTH_INVALID_PASSWORD');
        }

        // Verificar que el nuevo email no esté en uso
        const existingUser = await User.findOne({ email: newEmail.toLowerCase().trim() });
        if (existingUser && existingUser._id.toString() !== userFound._id.toString()) {
            throw createError('VAL_EMAIL_ALREADY_EXISTS', { email: newEmail });
        }

        // Generar token de cambio
        const changeToken = Math.floor(100000 + Math.random() * 900000).toString();

        userFound.emailChangeToken = changeToken;
        userFound.emailChangeExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 hora
        userFound.pendingEmail = newEmail.toLowerCase().trim();
        await userFound.save();

        // Enviar código de confirmación al nuevo email
        await sendEmailChangeNotification(newEmail, changeToken, userFound.username);

        res.json({
            success: true,
            message: 'Código de confirmación enviado al nuevo email'
        });

    } catch (error) {
        if (error.message.includes('Email service')) {
            next(createError('SRV_EMAIL_SEND_FAILED', { originalError: error.message }));
        } else {
            next(error);
        }
    }
};

// 16 - Confirmar cambio de email
export const confirmEmailChange = async (req, res, next) => {
    try {
        const { code } = req.body;

        const userFound = await User.findOne({
            _id: req.user._id,
            emailChangeToken: code.trim(),
            emailChangeExpires: { $gt: new Date() }
        });

        if (!userFound) {
            throw createError('AUTH_INVALID_EMAIL_CHANGE_CODE');
        }

        // Actualizar email
        const oldEmail = userFound.email;
        userFound.email = userFound.pendingEmail;
        userFound.verifiedEmail = true; // El nuevo email queda verificado
        userFound.emailChangeToken = undefined;
        userFound.emailChangeExpires = undefined;
        userFound.pendingEmail = undefined;
        await userFound.save();

        res.json({
            success: true,
            message: 'Email actualizado correctamente',
            user: {
                id: userFound._id,
                username: userFound.username,
                email: userFound.email,
                verifiedEmail: userFound.verifiedEmail
            }
        });

    } catch (error) {
        next(error);
    }
};

// 13- Eliminar cuenta (unsubscribe)
export const unsubscribe = async (req, res, next) => {
    try {
        const { password } = req.body;
        const userId = req.user._id;

        // Verificar que se proporcionó la contraseña
        if (!password) {
            throw createError('VAL_MISSING_PASSWORD', {});
        }

        // Buscar el usuario
        const user = await User.findById(userId);
        if (!user) {
            throw createError('AUTH_USER_NOT_FOUND', {});
        }

        // Verificar la contraseña
        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) {
            throw createError('AUTH_INVALID_PASSWORD', {});
        }

        // Eliminar el usuario de la base de datos
        await User.findByIdAndDelete(userId);

        // Limpiar la cookie del token
        res.clearCookie("token");

        res.json({
            success: true,
            message: 'Cuenta eliminada correctamente'
        });

    } catch (error) {
        next(error);
    }
};
