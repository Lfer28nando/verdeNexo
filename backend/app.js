// ============================
// Importaciones
// ============================
import dotenv from "dotenv";
import mongoose from "mongoose";
import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import path from "path";
import { fileURLToPath } from "url";

// Rutas
import authRoutes from "./routes/auth.routes.js";
import productosRoutes from "./routes/productos.routes.js";
import carritoRoutes from "./routes/carrito.routes.js";

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
app.use(
  cors({
    origin: process.env.FRONTEND_URL || "http://localhost:4444",
    credentials: true,
  })
);

// ============================
// Seguridad API Key
// ============================
app.use("/api", verificarApiKey);

// ============================
// Rutas principales
// ============================
app.use("/api/auth", authRoutes);
app.use("/api/productos", productosRoutes);
app.use("/api/carrito", carritoRoutes);

// Servir archivos estáticos (imágenes, pdf, etc.)
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

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
  .catch((err) =>
    console.error("❌ Error de conexión MongoDB:", err.message)
  );

// ============================
// Arranque del servidor
// ============================
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Backend corriendo en http://localhost:${PORT}`);
});
