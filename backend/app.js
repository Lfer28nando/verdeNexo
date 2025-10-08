// ============================
// Importaciones
// ============================
import dotenv from "dotenv";
import mongoose from "mongoose";
import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import session from "express-session";
import MongoStore from "connect-mongo";
import path from "path";
import { fileURLToPath } from "url";

// Rutas
import authRoutes from "./routes/auth/index.js";
import productosRoutes from "./routes/productos/productos.routes.js";
import carritoRoutes from "./routes/carrito/index.js";
import checkoutRoutes from "./routes/checkout/index.js";
import pedidosRoutes from "./routes/pedidos/index.js";

// Middlewares
import { verificarApiKey } from "./middlewares/apikey.js";
import { notFound, errorHandler } from "./middlewares/error-handler.js";

// ============================
// Variables de entorno
// ============================
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, ".env") });

// ============================
// Instancia de Express
// ============================
const app = express();

// ============================
// Middlewares globales
// ============================
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Configuración de sesiones
app.use(session({
  secret: process.env.SESSION_SECRET || 'verdenexo-checkout-secret-2024',
  resave: false,
  saveUninitialized: false,
  store: MongoStore.create({
    mongoUrl: process.env.MONGO_URI,
    dbName: process.env.MONGO_DB_NAME || "mi_base_datos",
    collectionName: 'sessions',
    ttl: 24 * 60 * 60 // 24 horas
  }),
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000 // 24 horas
  }
}));

app.use(
  cors({
    origin: process.env.NODE_ENV === 'production' 
      ? [process.env.FRONTEND_URL] 
      : ["http://localhost:4444", "http://localhost:3000"],
    credentials: true,
  })
);

// ============================
// Seguridad API Key
// ============================

// Health check para deploy
app.get("/health", (req, res) => {
  res.status(200).json({ 
    ok: true, 
    message: "Server is running",
    timestamp: new Date().toISOString()
  });
});

app.use("/api", verificarApiKey);

// ============================
// Rutas principales (SOLO API)
// ============================
app.use("/api/auth", authRoutes);
app.use("/api/productos", productosRoutes);
app.use("/api/carrito", carritoRoutes);
app.use("/api/checkout", checkoutRoutes);
app.use("/api/pedidos", pedidosRoutes);

// Servir archivos estáticos (imágenes, pdf, etc.)
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// Health check para Render
app.get("/", (req, res) => {
  res.json({ 
    message: "VerdeNexo API funcionando", 
    status: "OK",
    version: "1.0.0",
    timestamp: new Date().toISOString()
  });
});

//404 y errores
app.use(notFound);
app.use(errorHandler);

// ============================
// Conexión a MongoDB
// ============================
mongoose
.connect(process.env.MONGO_URI, {
    dbName: process.env.MONGO_DB_NAME || "mi_base_datos",
  })
  .then(() => console.log("✅ MongoDB Conectado"))
  .catch((err) => {
    console.error("❌ Error de conexión MongoDB:", err.message);
    // En producción, no salir del proceso si MongoDB falla inicialmente
    if (process.env.NODE_ENV !== 'production') {
      process.exit(1);
    }
  });

// ============================
// Arranque del servidor
// ============================
const PORT = process.env.PORT || 3000;

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Backend corriendo en puerto ${PORT}`);
  console.log(`🌍 Entorno: ${process.env.NODE_ENV || 'development'}`);
  if (process.env.NODE_ENV === 'production') {
    console.log(`📱 Aplicación disponible en: ${process.env.FRONTEND_URL || 'https://tu-app.onrender.com'}`);
  }
});
