// navbar.js - Manejo dinámico de la navbar basado en sesión (versión silenciosa)
import { API } from './api.functions.js';

// Activa logs útiles solo si pones window.DEBUG = true en la consola
const DEBUG = !!window.DEBUG;

function dlog(...args) { if (DEBUG) console.log(...args); }
function dwarn(...args) { if (DEBUG) console.warn(...args); }

document.addEventListener('DOMContentLoaded', async () => {
  // Obtener referencias (verificamos existencia)
  const loginLink = document.getElementById('loginLink');
  const registerLink = document.getElementById('registerLink');
  const btnPerfil = document.getElementById('btnPerfil');
  const btnPerfilBottom = document.getElementById('btnPerfilBottom');
  const modalPerfilEl = document.getElementById('modalPerfil');
  const modalAuthMobileEl = document.getElementById('modalAuthMobile');
  const modalPerfil = modalPerfilEl ? new bootstrap.Modal(modalPerfilEl) : null;
  const modalAuthMobile = modalAuthMobileEl ? new bootstrap.Modal(modalAuthMobileEl) : null;

  function safeSetDisplay(el, value) {
    if (!el) return;
    try { el.style.display = value; } catch (e) { /* silent */ }
  }

  function renderUserInNavbar(user) {
    if (!user) return;
    if (btnPerfil) {
      btnPerfil.style.display = 'flex';
      btnPerfil.innerHTML = `
        <img src="${user.avatar || '/img/default-avatar.png'}" style="width:32px;height:32px;object-fit:cover;border-radius:50%;border:2px solid #e0e0e0;box-shadow:0 1px 4px rgba(0,0,0,0.08);" />
      `;
      btnPerfil.onclick = () => {
        if (modalPerfil) modalPerfil.show();
        else window.location.href = '/perfil';
      };
    }
    if (btnPerfilBottom) btnPerfilBottom.onclick = () => window.location.href = '/perfil';
  }

  function renderLoggedOutUI() {
    safeSetDisplay(loginLink, 'flex');
    safeSetDisplay(registerLink, 'flex');
    if (btnPerfil) {
      safeSetDisplay(btnPerfil, 'none');
      btnPerfil.onclick = null;
      btnPerfil.innerHTML = '';
    }
    if (btnPerfilBottom) {
      btnPerfilBottom.onclick = () => {
        if (modalAuthMobile) modalAuthMobile.show();
        else window.location.href = '/login';
      };
    }
  }

  async function checkSession() {
    try {
      // Llamada normal al endpoint de sesión
      const res = await API.get('/auth/me', { withCredentials: true });
      if (res?.data?.ok && res.data.user) {
        safeSetDisplay(loginLink, 'none');
        safeSetDisplay(registerLink, 'none');
        renderUserInNavbar(res.data.user);
        dlog('[checkSession] usuario obtenido');
        return true;
      } else {
        // Si responde OK pero sin user -> tratamos como no logueado (sin ruido)
        renderLoggedOutUI();
        return false;
      }
    } catch (err) {
      // Silenciar 401 y errores de red comunes para no llenar consola
      const status = err?.response?.status;
      if (status === 401) {
        dlog('[checkSession] no autenticado (401)');
        renderLoggedOutUI();
        return false;
      }
      // Si hay otro error con respuesta (p. ej. 5xx) lo logueamos solo si DEBUG
      if (err?.response) {
        dwarn('[checkSession] respuesta inesperada:', err.response.status);
      } else {
        // error de red (no reach, CORS, ngrok cerrado). mostrar debug opcional.
        dwarn('[checkSession] error de red o CORS (silenciado). Pon window.DEBUG = true para ver más.');
      }

      // Intentar endpoint alternativo si existe sin producir ruido si falla
      try {
        const res2 = await API.get('/api/auth/profile', { withCredentials: true });
        if (res2?.data?.success && res2.data.user) {
          safeSetDisplay(loginLink, 'none');
          safeSetDisplay(registerLink, 'none');
          renderUserInNavbar(res2.data.user);
          dlog('[checkSession] usuario obtenido desde /api/auth/profile');
          return true;
        } else {
          renderLoggedOutUI();
          return false;
        }
      } catch (err2) {
        // silenciar fallback errors también
        dlog('[checkSession] fallback profile falló (silenciado).');
        renderLoggedOutUI();
        return false;
      }
    }
  }

  // Logout (si existe el botón)
  const logoutBtn = document.getElementById('logoutBtnModal');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', async () => {
      try {
        await API.get('/auth/logout', { withCredentials: true });
      } catch (err) {
        try { await API.get('/api/auth/logout', { withCredentials: true }); }
        catch (err2) { dwarn('logout ambos endpoints fallaron (silenciado)'); }
      } finally {
        if (modalPerfil) modalPerfil.hide();
        window.location.replace('/login');
      }
    });
  }

  // Manejadores de forms mobile (si existen) - mismos checks
  const loginForm = document.getElementById('loginForm');
  const registerForm = document.getElementById('registerForm');
  const switchToRegister = document.getElementById('switchToRegister');
  const switchToLogin = document.getElementById('switchToLogin');
  const loginFormMobile = document.getElementById('loginFormMobile');
  const registerFormMobile = document.getElementById('registerFormMobile');

  if (switchToRegister && loginFormMobile && registerFormMobile) {
    switchToRegister.addEventListener('click', () => {
      loginFormMobile.style.display = 'none';
      registerFormMobile.style.display = 'block';
    });
  }
  if (switchToLogin && loginFormMobile && registerFormMobile) {
    switchToLogin.addEventListener('click', () => {
      registerFormMobile.style.display = 'none';
      loginFormMobile.style.display = 'block';
    });
  }

  if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const email = document.getElementById('emailMobile')?.value;
      const password = document.getElementById('passwordMobile')?.value;
      try {
        const res = await API.post('/api/auth/login', { email, password }, { withCredentials: true });
        if (res.data?.requires2FA) {
          window.show2FAModal?.();
          modalAuthMobile?.hide();
          return;
        }
        if (res.data?.success) {
          modalAuthMobile?.hide();
          window.location.reload();
        }
      } catch (err) {
        alert('Error en login: ' + (err.response?.data?.message || 'Desconocido'));
      }
    });
  }

  if (registerForm) {
    registerForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const username = document.getElementById('usernameMobile')?.value;
      const email = document.getElementById('emailRegMobile')?.value;
      const password = document.getElementById('passwordRegMobile')?.value;
      const confirmPassword = document.getElementById('confirmPasswordMobile')?.value;
      const cellphone = document.getElementById('cellphoneMobile')?.value;
      const acceptTerms = document.getElementById('acceptTermsMobile')?.checked;

      if (password !== confirmPassword) return alert('Las contraseñas no coinciden');
      if (!acceptTerms) return alert('Debes aceptar los términos y condiciones');

      try {
        const res = await API.post('/api/auth/register', { username, email, password, cellphone }, { withCredentials: true });
        if (res.data?.success) {
          modalAuthMobile?.hide();
          window.location.reload();
        }
      } catch (err) {
        alert('Error en registro: ' + (err.response?.data?.message || 'Desconocido'));
      }
    });
  }

  // Inicializar: verificar sesión y actualizar contador del carrito
  await checkSession();
  if (window.CartManager && window.CartManager.updateCartCount) {
    try { window.CartManager.updateCartCount(); } catch (e) { dlog('CartManager.updateCartCount falló (silenciado)'); }
  }

  // Exponer show2FAModal en global si no existe
  if (!window.show2FAModal) {
    window.show2FAModal = () => {
      const twoFAModal = document.getElementById('twoFAModal');
      if (twoFAModal) {
        const inp = document.getElementById('twoFACode');
        if (inp) inp.value = '';
        new bootstrap.Modal(twoFAModal).show();
      } else {
        window.location.href = '/login?requires2fa=true';
      }
    };
  }
});
