//Importaciones:
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import express from 'express';
import cors from 'cors';
import authRoutes from './routes/auth.routes.js';
import productosRoutes from './routes/productos.routes.js';
import path from 'path';
import { fileURLToPath } from 'url';

//Variables de entorno:
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
// Cargar .env desde la carpeta raíz del proyecto (uno arriba de /backend)
dotenv.config({ path: path.resolve(__dirname, '..', '.env') });

//Instancia de Express:
const app = express();

// Middlewares
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors({
  origin: 'http://localhost:4444',
  credentials: true
}));

// Rutas
app.use('/api/auth', authRoutes);
app.use('/api/productos', productosRoutes);
app.use('/uploads', express.static('uploads'));

// Conexión Mongo
mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log('MongoDB Conectado'))
    .catch(err => console.error('Error de conexión MongoDB:', err.message));

// Arranque del server
app.listen(process.env.PORT, () => {
    console.log(`Backend corriendo en http://localhost:${process.env.PORT}`);
});
