import {z} from 'zod';

export const registerSchema = z.object({
    username: z.string({
        required_error: 'Username is required'
    }).min(3, 'Username must be at least 3 characters').max(30, 'Username cannot exceed 30 characters'),
    email: z.string({
        required_error: 'Email is required'
    }).email('Invalid email address'),
    password: z.string({
        required_error: 'Password is required'
    }).min(6, 'Password must be at least 6 characters long'),
    cellphone: z.string()
        .optional()
        .refine((val) => {
            // Si no se proporciona o está vacío, es válido
            if (!val || val.trim() === '') return true;
            // Si se proporciona, debe cumplir las validaciones
            return val.length >= 7 && val.length <= 15 && /^\+?[\d\s\-()]+$/.test(val);
        }, {
            message: 'Phone number must be 7-15 digits and contain only numbers, spaces, dashes, parentheses, and optionally start with +'
        })
});

export const loginSchema = z.object({
    email: z.string({
        required_error: 'Email is required'
    }).email('Invalid email address'),
    password: z.string({
        required_error: 'Password is required'
    }).min(6, 'Password must be at least 6 characters long')
});

export const editUserSchema = z.object({
    username: z.string().min(3, 'Username must be at least 3 characters').max(30, 'Username cannot exceed 30 characters').optional(),
    document: z.string()
        .optional()
        .refine((val) => {
            if (!val || val.trim() === '') return true;
            return val.length >= 5 && val.length <= 20 && /^[A-Za-z0-9\-]+$/.test(val);
        }, {
            message: 'Document must be 5-20 characters and contain only letters, numbers and hyphens'
        }),
    cellphone: z.string()
        .optional()
        .refine((val) => {
            if (!val || val.trim() === '') return true;
            return val.length >= 7 && val.length <= 15 && /^\+?[\d\s\-()]+$/.test(val);
        }, {
            message: 'Phone number must be 7-15 digits and contain only numbers, spaces, dashes, parentheses, and optionally start with +'
        }),
    address: z.string()
        .optional()
        .refine((val) => {
            if (!val || val.trim() === '') return true;
            return val.length >= 5 && val.length <= 100;
        }, {
            message: 'Address must be 5-100 characters'
        })
}).refine(data => Object.keys(data).length > 0, {
    message: "At least one field must be provided"
});

export const changePasswordSchema = z.object({
    currentPassword: z.string({
        required_error: 'Current password is required'
    }).min(6, 'Current password must be at least 6 characters long'),
    newPassword: z.string({
        required_error: 'New password is required'
    }).min(6, 'New password must be at least 6 characters long')
}).refine(data => data.currentPassword !== data.newPassword, {
    message: "New password must be different from current password",
    path: ["newPassword"]
});

export const requestPasswordResetSchema = z.object({
    email: z.string({
        required_error: 'Email is required'
    }).email('Invalid email address')
});

export const resetPasswordSchema = z.object({
    email: z.string({
        required_error: 'Email is required'
    }).email('Invalid email address'),
    code: z.string({
        required_error: 'Reset code is required'
    }).regex(/^\d{6}$/, 'Reset code must be exactly 6 digits'),
    newPassword: z.string({
        required_error: 'New password is required'
    }).min(6, 'New password must be at least 6 characters long')
});

export const verifyEmailSchema = z.object({
    email: z.string({
        required_error: 'Email is required'
    }).email('Invalid email address'),
    code: z.string({
        required_error: 'Verification code is required'
    }).regex(/^\d{6}$/, 'Verification code must be exactly 6 digits')
});

export const requestEmailVerificationSchema = z.object({});
