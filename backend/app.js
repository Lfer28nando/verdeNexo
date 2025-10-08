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
    origin: process.env.FRONTEND_URL || "http://localhost:4444",
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
// Rutas principales
// ============================
app.use("/api/auth", authRoutes);
app.use("/api/productos", productosRoutes);
app.use("/api/carrito", carritoRoutes);
app.use("/api/checkout", checkoutRoutes);
app.use("/api/pedidos", pedidosRoutes);

// Servir archivos estáticos (imágenes, pdf, etc.)
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// Servir archivos estáticos del frontend
app.use(express.static(path.join(__dirname, "../frontend/public")));

// Configurar el motor de plantillas EJS
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "../frontend/views"));

// Rutas del frontend
app.get("/", (req, res) => {
  res.render("paginas/home", { user: req.session.user });
});

app.get("/admin", (req, res) => {
  // Verificar si el usuario es admin
  if (!req.session.user || req.session.user.rol !== 'admin') {
    return res.redirect('/');
  }
  res.render("paginas/homeAdmin", { user: req.session.user });
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

app.listen(PORT, () => {
  console.log(`Backend corriendo en http://localhost:${PORT}`);
});
