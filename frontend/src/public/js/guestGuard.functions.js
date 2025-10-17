// public/js/guestGuard.functions.js (ESM)
import { API } from './api.functions.js'; // tu instancia con withCredentials:true

export default async function guardGuest(redirectTo = '/') {
  // Helper para leer cookies
  function getCookie(name) {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) return parts.pop().split(';').shift();
  }
  // Solo hacer la petición si existe cookie de sesión (ej: "connect.sid" o la que uses)
  const sessionCookie = getCookie('token');
  if (!sessionCookie) {
    // No hay sesión, dejar ver la página
    return;
  }
  try {
    let res = await API.get('/auth/me');
    if (res?.data?.ok && res.data.user) {
      window.location.replace(redirectTo);
      return;
    }
  } catch (err) {
    try {
      let res = await API.get('/api/auth/profile');
      if (res?.data?.success && res.data.user) {
        window.location.replace(redirectTo);
        return;
      }
    } catch (err2) {
      // No autenticado, continuar
    }
  }
  // Si no está autenticado, no hacemos nada (deja ver la página)
}
