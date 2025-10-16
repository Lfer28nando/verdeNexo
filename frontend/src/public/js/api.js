import axios from 'https://cdn.jsdelivr.net/npm/axios@1.7.2/dist/esm/axios.min.js';

// Obtener la variable inyectada desde el servidor (EJS)
const backendUrl = window.BACKEND_URL;

// Validar que esté definida
if (!backendUrl) {
  throw new Error("❌ BACKEND_URL no está definida. Asegúrate de que el servidor la esté enviando correctamente.");
}

export const API = axios.create({
  baseURL: backendUrl,
  withCredentials: true, // Para manejar cookies HttpOnly
  headers: {
    'Content-Type': 'application/json'
  }
});

// Interceptor para manejar errores
API.interceptors.response.use(
  res => res,
  err => {
    console.error('❌ Error en la API:', err);
    return Promise.reject(err);
  }
);
