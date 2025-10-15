// authGuard.js (ESM)
import { API } from './api.js';

export default async function authGuard(redirectTo = '/login') {
  // Verificar si hay un parámetro requires2fa en la URL
  const urlParams = new URLSearchParams(window.location.search);
  const requires2FA = urlParams.get('requires2fa');

  if (requires2FA === 'true') {
    // Usuario necesita verificar 2FA - mostrar modal y detener ejecución
    if (typeof show2FAModal === 'function') {
      show2FAModal();
    }
    return; // No continuar con verificación de autenticación
  }

  // Verificar autenticación normal
  try {
    const res = await API.get('/auth/me');
    if (res?.data?.ok && res.data.user) {
      return; // Autenticado, continuar
    }
  } catch (err) {
    // Intentar con el otro endpoint
    try {
      const res = await API.get('/api/auth/profile');
      if (res?.data?.success && res.data.user) {
        return; // Autenticado, continuar
      }
    } catch (err2) {
      // No autenticado
    }
  }

  // No autenticado -> redirigir
  window.location.replace(redirectTo);
}