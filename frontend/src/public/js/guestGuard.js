// public/js/guestGuard.js (ESM)
import { API } from './api.js'; // tu instancia con withCredentials:true

export default async function guardGuest(redirectTo = '/') {
  try {
    let res = await API.get('/auth/me');
    if (res?.data?.ok && res.data.user) {
      // Está autenticado -> redirigir
      window.location.replace(redirectTo);
      return;
    }
  } catch (err) {
    try {
      let res = await API.get('/api/auth/profile');
      if (res?.data?.success && res.data.user) {
        // Está autenticado -> redirigir
        window.location.replace(redirectTo);
        return;
      }
    } catch (err2) {
      // No autenticado, continuar
    }
  }
  // Si no está autenticado, no hacemos nada (deja ver la página)
}
