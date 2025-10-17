import express from 'express';
import dotenv from 'dotenv';
dotenv.config({ path: './src/.env' });

import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import cors from 'cors';

import authRoutes from "./routes/auth.routes.js";
import googleAuthRoutes from "./routes/googleAuth.routes.js";
import productoRoutes from "./routes/product.routes.js";
import shopCartRoutes from "./routes/shopCart.routes.js";
import checkoutRoutes from "./routes/checkout.routes.js";
import userRoutes from "./routes/user.routes.js";
import adminRoutes from "./routes/admin.routes.js";
import session from 'express-session';
import MongoStore from 'connect-mongo';
import './config/googleAuth.js'; // Importar la configuración de Google OAuth
import { errorHandler, notFoundHandler } from './middlewares/errorHandler.middleware.js';
import { 
    generalLimiter, 
    trustProxyMiddleware, 
    logRateLimit 
} from './middlewares/rateLimiter.middleware.js';

const app = express();

// Health check para Render (debe ir antes de cualquier middleware)
app.get('/health', (req, res) => res.status(200).json({ ok: true, time: new Date().toISOString() }));


// Configurar trust proxy para producción
trustProxyMiddleware(app);

// Rate limiting global
app.use(generalLimiter);
app.use(logRateLimit);


// Configurar CORS usando el paquete cors y el .env
const allowedOriginsEnv = process.env.ALLOWED_ORIGINS || process.env.FRONTEND_URL || 'http://localhost:5173';
const allowedOrigins = allowedOriginsEnv.split(',').map(s => s.trim()).filter(Boolean);
console.log('[CORS] allowedOrigins (startup):', allowedOrigins);

app.use(cors({
    origin: function (origin, callback) {
        console.log('[CORS] origin recibido:', origin);
        if (!origin) return callback(null, true); // Permitir requests sin origin (curl, Postman)
        if (allowedOrigins.includes(origin.trim().replace(/\/+$/, ''))) {
            return callback(null, true);
        }
        console.warn(`[CORS] Origen NO permitido: ${origin}`);
        return callback(new Error('CORS: origen no permitido'));
    },
    credentials: true,
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
    store: MongoStore.create({
        mongoUrl: process.env.MONGODB_URI,
        dbName: process.env.DB_NAME,
    }),
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

// Ruta para servir la vista de carrito
app.get('/carrito', (req, res) => {
    res.render('carrito');
});

// Ruta para servir la vista de checkout
app.get('/checkout', (req, res) => {
    res.render('checkout');
});

// Ruta para servir la vista de confirmación de pedido
app.get('/pedido-confirmado', (req, res) => {
    res.render('pedido-confirmado');
});




// Ruta para servir la vista de admin (solo para admins)
app.get('/admin', (req, res) => {
    res.render('admin');
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
// Rutas de administrador
app.use("/api/admin", adminRoutes);
// Middlewares de manejo de errores (DEBEN IR AL FINAL)
app.use(notFoundHandler);  // Para rutas 404
app.use(errorHandler);     // Para todos los otros errores

export default app;