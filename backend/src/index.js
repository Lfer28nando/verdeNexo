// backend/src/index.js (reemplaza todo esto)
import dotenv from 'dotenv';
dotenv.config({ path: './src/.env' });

import app from './app.js';
import { connectDB } from './db.js';

async function start() {
  // Puerto por defecto si PORT no está definido
  const port = process.env.PORT || 10000;

  // Intenta conectar a la DB pero no dejes que bloquee indefinidamente el start
 /* try {
    // espera la conexión si connectDB devuelve Promise
    await connectDB();
    console.log('✅ MongoDB connected');
  } catch (err) {
    console.error('⚠️ MongoDB connection failed:', err?.message || err);
    // Si la DB es crítica quizá quieras salir con error:
    // process.exit(1);
    // Pero para debug temporal, seguimos y arrancamos el servidor para comprobar puerto.
  }*/

  // Escucha siempre en 0.0.0.0 y en el puerto correcto
  app.listen(port, '0.0.0.0', () => {
    console.log(`✅ VerdeNexo Backend running on http://0.0.0.0:${port} (NODE_ENV=${process.env.NODE_ENV})`);
  });
}

start();
