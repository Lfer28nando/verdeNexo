export const API = axios.create({
  baseURL: 'https://verdenexo-backend.onrender.com/', // backend público en Render
  withCredentials: true, // MUY importante: para que el navegador envíe/reciba cookies HttpOnly
  headers: {
    'Content-Type': 'application/json' // Forzar JSON por defecto
  }
});

// NOTA: No añadimos interceptor que lea token de localStorage porque no usas Authorization header.
// Pero dejamos un interceptor de errores opcional para debug.
API.interceptors.response.use(
  res => res,
  err => {
    // loguea el error para debug
    console.error('API response error', err);
    return Promise.reject(err);
  }
);
