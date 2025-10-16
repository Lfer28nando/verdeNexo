import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import User from '../models/user.model.js';
import { createAccessToken } from '../libs/jwt.js';

// Configuración de la estrategia de Google OAuth 2.0
passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: process.env.GOOGLE_CALLBACK_URL,
}, async (accessToken, refreshToken, profile, done) => {
    try {
        // Extraer información del perfil de Google
        const googleId = profile.id;
        const email = profile.emails?.[0]?.value;
        const name = profile.displayName || profile.name?.givenName || 'Usuario Google';
        const avatar = profile.photos?.[0]?.value;

        // Verificar que tenemos email (requerido por nuestro esquema)
        if (!email) {
            return done(new Error('No se pudo obtener el email de Google'), null);
        }

        // Buscar si ya existe un usuario con este googleId o email
        let user = await User.findOne({
            $or: [
                { googleId: googleId },
                { email: email.toLowerCase() }
            ]
        });

        if (user) {
            // Usuario existente: actualizar información relevante
            const updateData = {
                name: name,
                avatar: avatar,
                lastLogin: new Date(),
                verifiedEmail: true, // Los emails de Google están verificados
            };

            // Si no tenía googleId pero sí el email, lo agregamos
            if (!user.googleId) {
                updateData.googleId = googleId;
                updateData.provider = 'google';
            }

            user = await User.findByIdAndUpdate(
                user._id,
                updateData,
                { new: true, runValidators: false }
            );
        } else {
            // Usuario nuevo: crear registro
            user = new User({
                googleId: googleId,
                username: name,
                email: email.toLowerCase(),
                password: 'google-oauth', // Password placeholder para OAuth users
                avatar: avatar,
                provider: 'google',
                verifiedEmail: true,
                active: true,
                role: 'client', // Rol por defecto
                consentAccepted: true, // Asumimos que acepta al usar Google
                lastLogin: new Date()
            });

            await user.save();
        }

        return done(null, user);
    } catch (error) {
        console.error('Error en Google OAuth Strategy:', error);
        return done(error, null);
    }
}));

// Serialización para sesión (aunque usaremos JWT principalmente)
passport.serializeUser((user, done) => {
    done(null, user._id);
});

passport.deserializeUser(async (id, done) => {
    try {
        const user = await User.findById(id).select('-password');
        done(null, user);
    } catch (error) {
        done(error, null);
    }
});

// Función helper para generar JWT y configurar cookie
export const setAuthCookie = async (res, user) => {
    try {
        const token = await createAccessToken({ id: user._id });
        
        // Configurar cookie HttpOnly
        res.cookie("token", token, {
            httpOnly: true,
            secure:true,
            sameSite: 'None',
            maxAge: 24 * 60 * 60 * 1000 // 24 horas
        });

        return token;
    } catch (error) {
        throw new Error('Error al generar token JWT');
    }
};

// Función helper para generar token temporal de 2FA
export const setTemp2FACookie = async (res, user) => {
    try {
        const token = await createAccessToken({ 
            id: user._id, 
            requires2FA: true 
        });
        
        // Configurar cookie temporal HttpOnly (5 minutos)
        res.cookie("temp_token", token, {
            httpOnly: true,
            secure: true,
            sameSite: 'None',
            maxAge: 5 * 60 * 1000 // 5 minutos
        });

        return token;
    } catch (error) {
        throw new Error('Error al generar token temporal de 2FA');
    }
};

export default passport;