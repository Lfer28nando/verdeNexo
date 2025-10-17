
import { API } from './api.functions.js'; // Usa la instancia centralizada
import guardGuest from '/js/guestGuard.functions.js';

document.addEventListener('DOMContentLoaded', () => guardGuest('/'));

// Función para manejar el login
async function handleLogin(email, password) {
    try {
        const res = await API.post('/api/auth/login', { email, password });
        if (res.data.requires2FA) {
            show2FAModal();
            return;
        }
        if (res.data.success) {
            window.location.href = '/';
        }
    } catch (err) {
        const message = err.response?.data?.error?.message || err.response?.data?.message || 'Error en login';
        alert(`Error: ${message}`);
    }
}

// Función para mostrar modal de 2FA
function show2FAModal() {
    const twoFACodeInput = document.getElementById('twoFACode');
    twoFACodeInput.value = '';
    const modalEl = document.getElementById('twoFAModal');
    const modal = new bootstrap.Modal(modalEl);
    // Esperar a que el modal esté visible para poner el foco
    modalEl.addEventListener('shown.bs.modal', function handler() {
        twoFACodeInput.focus();
        modalEl.removeEventListener('shown.bs.modal', handler);
    });
    modal.show();
}

// Función para verificar 2FA
async function verify2FA() {
    const code = document.getElementById('twoFACode').value.trim();
    if (!code || code.length !== 6) {
        alert('Ingresa un código válido de 6 dígitos.');
        return;
    }
    try {
        const res = await API.post('/api/auth/verify2FACode', { code });
        if (res.data.success) {
            bootstrap.Modal.getInstance(document.getElementById('twoFAModal')).hide();
            window.location.href = '/';
        } else {
            alert(res.data.message || 'Código inválido.');
        }
    } catch (err) {
        const message = err.response?.data?.error?.message || err.response?.data?.message || 'Error al verificar código';
        alert(`Error: ${message}`);
    }
}

// Hacer funciones globales
window.verify2FA = verify2FA;

// Mostrar modal de 2FA si la URL tiene ?requires2fa=true
document.addEventListener('DOMContentLoaded', () => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('requires2fa') === 'true') {
        show2FAModal();
    }
});

// Manejar submit del formulario de login
document.getElementById('loginForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    if (!email || !password) {
        alert('Por favor completa todos los campos.');
        return;
    }
    await handleLogin(email, password);
});