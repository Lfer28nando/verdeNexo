// backend/src/index.js (reemplaza todo esto)
// justo después de crear `app = express()`
import dotenv from 'dotenv';
dotenv.config({ path: './src/.env' });

import app from './app.js';
import { connectDB } from './db.js';



  // Intenta conectar a la DB pero no dejes que bloquee indefinidamente el start
 try {
    // espera la conexión si connectDB devuelve Promise
    await connectDB();
    console.log('✅ MongoDB connected');
  } catch (err) {
    console.error('⚠️ MongoDB connection failed:', err?.message || err);
    // Si la DB es crítica quizá quieras salir con error:
    // process.exit(1);
    // Pero para debug temporal, seguimos y arrancamos el servidor para comprobar puerto.
  }

  // Escucha siempre en 0.0.0.0 y en el puerto correcto
const PORT = process.env.PORT || 3000;

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Backend corriendo en puerto ${PORT}`);
  console.log(`🌍 Entorno: ${process.env.NODE_ENV || 'development'}`);
  if (process.env.NODE_ENV === 'production') {
    console.log(`📱 Aplicación disponible en: ${process.env.FRONTEND_URL || 'https://tu-app.onrender.com'}`);
  }
});
