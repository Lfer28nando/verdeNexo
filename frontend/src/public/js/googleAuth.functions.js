import { API, backendUrl } from "./api.functions.js";

export function initGoogleAuthButton(buttonSelector = '#googleAuth') {
  const btn = document.querySelector(buttonSelector);
  if (!btn) return;

  btn.addEventListener('click', async (e) => {
    e.preventDefault();


  // Usar backendUrl importado
  if (!backendUrl) {
    alert('No se encontró BACKEND_URL. Verifica la inyección de variables.');
    return;
  }
  const authUrl = `${backendUrl.replace(/\/$/, '')}/auth/google`;

    // Tamaño y posición del popup (opcional)
    const width = 600;
    const height = 700;
    const left = (window.screen.width / 2) - (width / 2);
    const top = (window.screen.height / 2) - (height / 2);

    const popup = window.open(
      authUrl,
      'googleAuth',
      `toolbar=no, location=no, status=no, menubar=no, width=${width}, height=${height}, top=${top}, left=${left}`
    );

    if (!popup) {
      return alert('Popup bloqueado. Permite popups y vuelve a intentarlo.');
    }

    // Polling: cada 700ms comprobaremos si el popup fue cerrado.
    const popupCheckInterval = 700;
    const maxWait = 1000 * 60 * 2; // 2 minutos máximo (ajusta)
    let waited = 0;

    const intervalId = setInterval(async () => {
      if (popup.closed) {
        clearInterval(intervalId);
        // El usuario terminó el flujo (o lo cerró). Consultamos /auth/me para ver si quedó autenticado.
        try {
          const res = await API.get('/auth/me'); // backend debe aceptar credentials
          if (res.data?.ok && res.data.user) {
            // usuario autenticado — actualiza UI
            console.log('Usuario logueado via Google:', res.data.user);
            // ejemplo: redirigir al dashboard
            window.location.href = '/';
          } else {
            // No autenticado — handle
            console.warn('No autenticado después del popup Google', res.data);
            alert('No se completó la autenticación con Google.');
          }
        } catch (err) {
          if (err.response?.status === 401) {
            console.info('No hay sesión activa con Google. El usuario no está logueado.');
          } else {
            console.error('Error al verificar auth después de Google:', err);
            alert('No se pudo verificar la autenticación. Revisa la consola.');
          }
        }
        return;
      }

      // timeout por si el usuario nunca cierra el popup
      waited += popupCheckInterval;
      if (waited > maxWait) {
        clearInterval(intervalId);
        try { popup.close(); } catch (e) {}
        alert('Tiempo de autenticación agotado.');
      }
    }, popupCheckInterval);
  });
}
  document.addEventListener('DOMContentLoaded', () => {
    initGoogleAuthButton('#googleAuth');
  }
);

