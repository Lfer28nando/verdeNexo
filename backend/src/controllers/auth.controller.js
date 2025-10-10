import User from "../models/user.model.js";
import bcrypt from "bcryptjs";
import { createAccessToken } from "../libs/jwt.js";
import { sendPasswordResetEmail, sendEmailVerificationCode } from "../config/email.js";
import { createError } from "../utils/customError.js";

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
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
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

        const token = await createAccessToken({ id: userFound._id });
        
        res.cookie("token", token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
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
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
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
        const allowedFields = ['username', 'cellphone', 'document', 'address'];
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
