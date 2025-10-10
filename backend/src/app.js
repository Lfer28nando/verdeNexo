import express from 'express';
import dotenv from 'dotenv';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import cors from 'cors';

import authRoutes from "./routes/auth.routes.js";
import googleAuthRoutes from "./routes/googleAuth.routes.js";
import session from 'express-session';
import './config/googleAuth.js'; // Importar la configuración de Google OAuth
import { errorHandler, notFoundHandler } from './middlewares/errorHandler.middleware.js';
import { 
    generalLimiter, 
    trustProxyMiddleware, 
    logRateLimit 
} from './middlewares/rateLimiter.middleware.js';

const app = express();
dotenv.config()

// 🛡️ Configurar trust proxy para producción (debe ir ANTES de rate limiters)
trustProxyMiddleware(app);

// 🚦 Rate limiting global (aplicar ANTES de otras configuraciones)
app.use(generalLimiter);
app.use(logRateLimit);

// Configurar CORS adecuadamente
app.use(cors({
    origin: ['http://localhost:5173', 'http://127.0.0.1:5173'], // Frontend Vite
    credentials: true, // Permitir cookies
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Cookie']
}));

app.use(cookieParser());
app.use(morgan('dev'));
app.use(express.json());

// Configurar sesión (opcional, principalmente usamos JWT)
app.use(session({
    secret: process.env.SESSION_SECRET || 'verdenexo-secret-session-2025',
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: process.env.NODE_ENV === 'production',
        maxAge: 24 * 60 * 60 * 1000 // 24 horas
    }
}));

// Rutas de autenticación
app.use("/api/auth", authRoutes);      // Rutas tradicionales (register, login, etc.)
app.use("/auth", googleAuthRoutes);    // Rutas de Google OAuth (/auth/google, /auth/google/callback, etc.)

// Middlewares de manejo de errores (DEBEN IR AL FINAL)
app.use(notFoundHandler);  // Para rutas 404
app.use(errorHandler);     // Para todos los otros errores

export default app;