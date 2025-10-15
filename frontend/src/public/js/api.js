
export const API = axios.create({
  baseURL: 'http://localhost:3000/', // ajusta si tu API tiene otro prefijo
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
