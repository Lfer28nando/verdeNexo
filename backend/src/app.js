import express from 'express';
import dotenv from 'dotenv';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import cors from 'cors';

import authRoutes from "./routes/auth.routes.js";
import googleAuthRoutes from "./routes/googleAuth.routes.js";
import productoRoutes from "./routes/product.routes.js";
import shopCartRoutes from "./routes/shopCart.routes.js";
import checkoutRoutes from "./routes/checkout.routes.js";
import userRoutes from "./routes/user.routes.js";
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

// Configurar trust proxy para producción
trustProxyMiddleware(app);

// Rate limiting global
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
app.use(express.urlencoded({ extended: true })); // Para manejar form data también

// Servir archivos estáticos de uploads
app.use('/uploads', express.static('uploads'));

// Configurar sesión
app.use(session({
    secret: process.env.SESSION_SECRET || 'verdenexo-secret-session-2025',
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: process.env.NODE_ENV === 'production',
        maxAge: 24 * 60 * 60 * 1000 // 24 horas
    }
}));

// Configurar motor de vistas EJS
import path from 'path';
import { fileURLToPath } from 'url';
const __dirname = path.dirname(fileURLToPath(import.meta.url));
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, '../../frontend/src/views/pages'));

// Ruta para servir la vista de login
app.get('/login', (req, res) => {
    // Puedes pasar parámetros si lo necesitas
    res.render('login', { requires2fa: req.query.requires2fa === 'true' });
});

// Rutas de autenticación
app.use("/api/auth", authRoutes);      // Rutas tradicionales (register, login, etc.)
app.use("/auth", googleAuthRoutes);    // Rutas de Google OAuth (/auth/google, /auth/google/callback, etc.)
// Rutas de productos
app.use("/api/products", productoRoutes);
// Rutas del carrito de compras
app.use("/api/cart", shopCartRoutes);
// Rutas de checkout
app.use("/api/checkout", checkoutRoutes);
// Rutas de usuarios
app.use("/api/users", userRoutes);
// Middlewares de manejo de errores (DEBEN IR AL FINAL)
app.use(notFoundHandler);  // Para rutas 404
app.use(errorHandler);     // Para todos los otros errores

export default app;