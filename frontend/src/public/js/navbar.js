// navbar.js - Manejo dinámico de la navbar basado en sesión
import { API } from './api.js';
import { initializeCartCounter } from './cart.js';

document.addEventListener('DOMContentLoaded', async () => {
    const loginLink = document.getElementById('loginLink');
    const registerLink = document.getElementById('registerLink');
    const btnPerfil = document.getElementById('btnPerfil');
    const btnPerfilBottom = document.getElementById('btnPerfilBottom');
    const modalPerfil = new bootstrap.Modal(document.getElementById('modalPerfil'));
    const modalAuthMobile = new bootstrap.Modal(document.getElementById('modalAuthMobile'));

    // Función para verificar sesión
    async function checkSession() {
        let hasSession = false;
        try {
            let res = await API.get('/auth/me');
            if (res.data.ok && res.data.user) {
                hasSession = true;
            }
        } catch (err) {
            // Intentar con /api/auth/profile
            try {
                let res = await API.get('/api/auth/profile');
                if (res.data.success && res.data.user) {
                    hasSession = true;
                }
            } catch (err2) {
                // No autenticado
            }
        }

        if (hasSession) {
            // Hay sesión: ocultar login/register, mostrar perfil
            loginLink.style.display = 'none';
            registerLink.style.display = 'none';
            btnPerfil.style.display = 'flex';
            // Bottom nav: redirigir a perfil
            btnPerfilBottom.onclick = () => window.location.href = '/perfil';
        } else {
            // No hay sesión: mostrar login/register, ocultar perfil
            loginLink.style.display = 'flex';
            registerLink.style.display = 'flex';
            btnPerfil.style.display = 'none';
            // Bottom nav: abrir modal
            btnPerfilBottom.onclick = () => modalAuthMobile.show();
        }
    }

    // Verificar sesión al cargar
    await checkSession();

    // Inicializar contador del carrito
    initializeCartCounter();

    // Event listener para botón de perfil
    btnPerfil.addEventListener('click', () => {
        modalPerfil.show();
    });
    // btnPerfilBottom se setea en checkSession

    // Event listener para editar perfil
    document.getElementById('editProfileBtn').addEventListener('click', () => {
        modalPerfil.hide();
        window.location.href = '/perfil';
    });

    // Event listener para cerrar sesión
    document.getElementById('logoutBtnModal').addEventListener('click', async () => {
        try {
            await API.get('/auth/logout');
            modalPerfil.hide();
            window.location.replace('/login');
        } catch (err) {
            // Intentar con /api/auth/logout
            try {
                await API.get('/api/auth/logout');
                modalPerfil.hide();
                window.location.replace('/login');
            } catch (err2) {
                console.error('Error en logout:', err2);
                window.location.replace('/login');
            }
        }
    });

    // Lógica para modal auth móvil
    const loginForm = document.getElementById('loginForm');
    const registerForm = document.getElementById('registerForm');
    const switchToRegister = document.getElementById('switchToRegister');
    const switchToLogin = document.getElementById('switchToLogin');
    const loginFormMobile = document.getElementById('loginFormMobile');
    const registerFormMobile = document.getElementById('registerFormMobile');

    switchToRegister.addEventListener('click', () => {
        loginFormMobile.style.display = 'none';
        registerFormMobile.style.display = 'block';
    });

    switchToLogin.addEventListener('click', () => {
        registerFormMobile.style.display = 'none';
        loginFormMobile.style.display = 'block';
    });

    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('emailMobile').value;
        const password = document.getElementById('passwordMobile').value;
        
        try {
            const res = await API.post('/api/auth/login', { email, password });
            
            if (res.data.requires2FA) {
                // Mostrar modal de 2FA
                show2FAModal();
                modalAuthMobile.hide();
                return;
            }
            
            if (res.data.success) {
                modalAuthMobile.hide();
                window.location.reload();
            }
        } catch (err) {
            alert('Error en login: ' + (err.response?.data?.error?.message || err.response?.data?.message || 'Desconocido'));
        }
    });

    registerForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const username = document.getElementById('usernameMobile').value;
        const email = document.getElementById('emailRegMobile').value;
        const password = document.getElementById('passwordRegMobile').value;
        const confirmPassword = document.getElementById('confirmPasswordMobile').value;
        const cellphone = document.getElementById('cellphoneMobile').value;
        const acceptTerms = document.getElementById('acceptTermsMobile').checked;

        if (password !== confirmPassword) {
            alert('Las contraseñas no coinciden');
            return;
        }
        if (!acceptTerms) {
            alert('Debes aceptar los términos y condiciones');
            return;
        }

        try {
            const res = await API.post('/api/auth/register', { username, email, password, cellphone });
            if (res.data.success) {
                modalAuthMobile.hide();
                window.location.reload();
            }
        } catch (err) {
            alert('Error en registro: ' + (err.response?.data?.message || 'Desconocido'));
        }
    });

    // Función para mostrar modal de 2FA
    function show2FAModal() {
        // Si estamos en la página de login, usar el modal ahí
        const twoFAModal = document.getElementById('twoFAModal');
        if (twoFAModal) {
            document.getElementById('twoFACode').value = '';
            const modal = new bootstrap.Modal(twoFAModal);
            modal.show();
        } else {
            // Si no estamos en login, redirigir a login con parámetro
            window.location.href = '/login?requires2fa=true';
        }
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
                // Cerrar modal y redirigir
                const modal = bootstrap.Modal.getInstance(document.getElementById('twoFAModal'));
                if (modal) modal.hide();
                window.location.reload();
            } else {
                alert(res.data.message || 'Código inválido.');
            }
        } catch (err) {
            const message = err.response?.data?.error?.message || err.response?.data?.message || 'Error al verificar código';
            alert(`Error: ${message}`);
        }
    }

    // Hacer funciones globales
    window.show2FAModal = show2FAModal;
    window.verify2FA = verify2FA;
});