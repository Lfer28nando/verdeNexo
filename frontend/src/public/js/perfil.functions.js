import { API } from './api.functions.js';
import authGuard from './authGuard.js';

document.addEventListener('DOMContentLoaded', () => {
    console.log('[Perfil] DOMContentLoaded');
    authGuard('/login').then(() => {
        console.log('[Perfil] authGuard terminó, usuario autenticado');
    }).catch(() => {
        console.warn('[Perfil] authGuard redirigió a login');
    });
    const logoutBtn = document.getElementById('logoutBtn');
    const logoutBtnMobile = document.getElementById('logoutBtnMobile');
    if (logoutBtn) logoutBtn.addEventListener('click', logout);
    if (logoutBtnMobile) logoutBtnMobile.addEventListener('click', logout);
});

        // Función para cargar información del usuario
async function loadUserInfo() {
    console.log('[Perfil] loadUserInfo inicia');
    try {
        let res = await API.get('/api/auth/profile');
        console.log('[Perfil] /api/auth/profile respuesta:', res);
        if (res.data.success) {
            const user = res.data.user;
            console.log('[Perfil] Usuario cargado:', user);
            populateUserData(user);
            return;
        } else {
            console.warn('[Perfil] /api/auth/profile no exitoso:', res.data);
        }
    } catch (err) {
        console.error('[Perfil] Error en loadUserInfo:', err);
    }
    // Si no carga, redirigir
    console.warn('[Perfil] Redirigiendo a login desde loadUserInfo');
    window.location.replace('/login');
}

        // Función para poblar los datos del usuario
        function populateUserData(user) {
            // Guardar en localStorage para edición
            localStorage.setItem('user', JSON.stringify(user));
            
            // Función para traducir roles
            function translateRole(role) {
                const roleTranslations = {
                    'admin': 'Administrador',
                    'seller': 'Vendedor',
                    'client': 'Cliente'
                };
                return roleTranslations[role] || 'Usuario';
            }
            
            // Header
            document.getElementById('welcomeName').textContent = `¡Hola, ${user.username}!`;
            document.getElementById('welcomeEmail').textContent = user.email;

    // Información personal
    document.getElementById('personalInfo').innerHTML = `
        <div class="info-item">
            <span class="info-label">Nombre de usuario:</span>
            <span class="info-value">${user.username}</span>
        </div>
        <div class="info-item">
            <span class="info-label">Correo electrónico:</span>
            <div class="d-flex align-items-center gap-2">
                <span class="info-value">${user.email}</span>
                ${user.verifiedEmail ? 
                    '<span class="badge bg-success"><i class="fas fa-check me-1"></i>Verificado</span>' : 
                    '<span class="badge bg-warning text-dark"><i class="fas fa-exclamation-triangle me-1"></i>No verificado</span>'}
                ${!user.verifiedEmail ? '<button class="btn btn-sm btn-outline-primary" onclick="requestEmailVerification()"><i class="fas fa-envelope me-1"></i>Verificar</button>' : ''}
            </div>
        </div>
        <div class="info-item">
            <span class="info-label">Documento:</span>
            <span class="info-value">
                ${user.documentType && user.document ? `${user.documentType}: ${user.document}` : 'No especificado'}
            </span>
        </div>
        <div class="info-item">
            <span class="info-label">Teléfono:</span>
            <span class="info-value">${user.cellphone || 'No especificado'}</span>
        </div>
        <div class="info-item">
            <span class="info-label">Dirección:</span>
            <span class="info-value">${user.address || 'No especificado'}</span>
        </div>
        <div class="info-item">
            <span class="info-label">Rol:</span>
            <span class="info-value">${translateRole(user.role)}</span>
        </div>
        <div class="info-item">
            <span class="info-label">Miembro desde:</span>
            <span class="info-value">${new Date(user.createdAt || Date.now()).toLocaleDateString('es-ES')}</span>
        </div>
        <div class="mt-4">
            <button class="btn btn-edit" onclick="editProfile()">
                <i class="fas fa-edit me-2"></i>Editar Perfil
            </button>
        </div>
    `;

    // Llamar a populateSecurityContent después de populateUserData
    populateSecurityContent(user);
    // Cargar favoritos del usuario
    loadUserFavorites(user._id || user.id);
    // Inicializar event listeners después de cargar todo el contenido
    initializeEventListeners();
}

    // Función para inicializar event listeners después de cargar el contenido
    function initializeEventListeners() {
        // Event listener para el botón de darse de baja
        const unsubscribeLink = document.getElementById('showUnsubscribe');
        if (unsubscribeLink) {
            unsubscribeLink.addEventListener('click', function(e) {
                e.preventDefault();
                document.getElementById('unsubscribePassword').value = '';
                document.getElementById('confirmDelete').checked = false;
                const modal = new bootstrap.Modal(document.getElementById('unsubscribeModal'));
                modal.show();
            });
        }
    }

    // ...existing code...

        // Renderizar favoritos
        async function loadUserFavorites(userId) {
            const container = document.getElementById('favoritesList');
            container.innerHTML = '<div class="loading"><div class="spinner-border" role="status"><span class="visually-hidden">Cargando...</span></div></div>';
            try {
                const res = await API.get(`/api/users/${userId}/favorites`);
                if (res.data.ok && Array.isArray(res.data.favorites)) {
                    if (res.data.favorites.length === 0) {
                        container.innerHTML = '<p class="text-center text-muted">No tienes productos favoritos.</p>';
                        return;
                    }
                    container.innerHTML = res.data.favorites.map(fav => `
                        <div class="favorite-item">
                            <img src="${fav.imagen ? fav.imagen : 'https://pic.onlinewebfonts.com/thumbnails/icons_574013.svg'}" alt="${fav.nombre}" class="favorite-img">
                            <div class="favorite-info flex-grow-1">
                                <h5>${fav.nombre}</h5>
                                <p>${fav.descripcion || ''}</p>
                                <p class="fw-bold text-success">$${fav.precioBase ? fav.precioBase.toFixed(2) : ''}</p>
                            </div>
                            <button class="btn btn-remove-favorite" onclick="removeFavorite('${fav._id}')">
                                <i class="fas fa-trash me-1"></i>Quitar
                            </button>
                        </div>
                    `).join('');
                } else {
                    container.innerHTML = '<p class="text-center text-muted">No tienes productos favoritos.</p>';
                }
            } catch (err) {
                if (!err.response) {
                    container.innerHTML = '<p class="text-center text-danger">Error de conexión. Verifica tu internet.</p>';
                } else {
                    container.innerHTML = '<p class="text-center text-muted">No tienes productos favoritos.</p>';
                }
            }
        }

        // Función para quitar favorito
        async function removeFavorite(favoriteId) {
            if (!confirm('¿Estás seguro de que quieres quitar este producto de tus favoritos?')) {
                return;
            }

            try {
                const user = JSON.parse(localStorage.getItem('user') || '{}');
                const userId = user._id || user.id;

                if (!userId) {
                    alert('Error: Usuario no identificado.');
                    return;
                }

                // Hacer petición DELETE para quitar el favorito
                const res = await API.delete(`/api/users/${userId}/favorites/${favoriteId}`);

                if (res.data.success) {
                    // Recargar la lista de favoritos
                    loadUserFavorites(userId);
                    alert('Producto quitado de favoritos exitosamente.');
                } else {
                    alert(res.data.message || 'Error al quitar el favorito.');
                }
            } catch (err) {
                console.error('Error al quitar favorito:', err);
                if (!err.response) {
                    alert('Error de conexión. Verifica tu internet.');
                } else {
                    alert(err.response.data?.message || 'Error al quitar el favorito.');
                }
            }
        }

        // Función para editar perfil
        function editProfile() {
            // Obtener datos actuales del usuario
            const user = JSON.parse(localStorage.getItem('user') || '{}');
            document.getElementById('editUsername').value = user.username || '';
            document.getElementById('editDocumentType').value = user.documentType || '';
            document.getElementById('editDocument').value = user.document || '';
            document.getElementById('editCellphone').value = user.cellphone || '';
            document.getElementById('editAddress').value = user.address || '';
            
            // Mostrar modal
            const modal = new bootstrap.Modal(document.getElementById('editProfileModal'));
            modal.show();
        }

        // Función para guardar cambios del perfil
        window.saveProfile = async function() {
            // Verificar que los elementos existan
            const usernameEl = document.getElementById('editUsername');
            if (!usernameEl) {
                console.error('Username element not found');
                alert('Error: Elemento no encontrado. Recarga la página.');
                return;
            }

            const username = usernameEl.value.trim();
            const documentType = document.getElementById('editDocumentType').value;
            const documentNumber = document.getElementById('editDocument').value.trim();
            const cellphone = document.getElementById('editCellphone').value.trim();
            const address = document.getElementById('editAddress').value.trim();

            // Validaciones básicas
            if (!username) {
                alert('El nombre de usuario es obligatorio.');
                return;
            }

            // Validar que si hay tipo de documento, también debe haber número
            if (documentType && !documentNumber) {
                alert('Si seleccionas un tipo de documento, debes ingresar el número.');
                return;
            }

            // Validar que si hay número de documento, también debe haber tipo
            if (documentNumber && !documentType) {
                alert('Si ingresas un número de documento, debes seleccionar el tipo.');
                return;
            }

            try {
                // Preparar datos para enviar
                const profileData = { username };

                // Agregar campos opcionales solo si tienen valor
                if (documentType) profileData.documentType = documentType;
                if (documentNumber) profileData.document = documentNumber;
                if (cellphone) profileData.cellphone = cellphone;
                if (address) profileData.address = address;

                const profileRes = await API.put('/api/auth/edit', profileData);
                
                if (!profileRes.data.success) {
                    alert(profileRes.data.message || 'Error al actualizar el perfil.');
                    return;
                }

                // Mostrar modal de éxito
                const successModal = new bootstrap.Modal(document.getElementById('successModal'));
                successModal.show();
                
                // Actualizar datos en localStorage
                const updatedUser = profileRes.data.user;
                localStorage.setItem('user', JSON.stringify(updatedUser));
                
                // Recargar información del perfil
                populateUserData(updatedUser);
                
                // Cerrar modal de edición
                bootstrap.Modal.getInstance(document.getElementById('editProfileModal')).hide();
                
            } catch (err) {
                console.error('Error al guardar perfil:', err);
                if (!err.response) {
                    alert('Error de conexión. Verifica tu internet.');
                } else {
                    alert(err.response.data?.message || 'Error al actualizar el perfil.');
                }
            }
        };

        // Función para solicitar verificación de email
        async function requestEmailVerification() {
            try {
                const res = await API.post('/api/auth/requestEmailVerification');
                if (res.data.success) {
                    alert('Código de verificación enviado a tu email.');
                } else {
                    alert(res.data.message || 'Error al enviar código de verificación.');
                }
            } catch (err) {
                if (!err.response) {
                    alert('Error de conexión. Verifica tu internet.');
                } else {
                    alert(err.response.data?.message || 'Error al solicitar verificación.');
                }
            }
        }

        // Función para cambiar contraseña
        async function changePassword() {
            // Limpiar formulario
            document.getElementById('changePasswordForm').reset();
            
            // Mostrar modal
            const modal = new bootstrap.Modal(document.getElementById('changePasswordModal'));
            modal.show();
        }

        // Función para enviar cambio de contraseña
        async function submitChangePassword() {
            const currentPassword = document.getElementById('currentPassword').value;
            const newPassword = document.getElementById('newPassword').value;
            const confirmPassword = document.getElementById('confirmPassword').value;

            // Validaciones
            if (!currentPassword || !newPassword || !confirmPassword) {
                alert('Todos los campos son obligatorios.');
                return;
            }

            if (newPassword.length < 6) {
                alert('La nueva contraseña debe tener al menos 6 caracteres.');
                return;
            }

            if (newPassword !== confirmPassword) {
                alert('Las contraseñas no coinciden.');
                return;
            }

            if (currentPassword === newPassword) {
                alert('La nueva contraseña debe ser diferente a la actual.');
                return;
            }

            try {
                const res = await API.put('/api/auth/changePassword', {
                    currentPassword,
                    newPassword
                });

                if (res.data.success) {
                    // Cerrar modal
                    bootstrap.Modal.getInstance(document.getElementById('changePasswordModal')).hide();
                    
                    // Mostrar modal de éxito
                    document.getElementById('successModalLabel').textContent = '¡Contraseña cambiada exitosamente!';
                    const successModal = new bootstrap.Modal(document.getElementById('successModal'));
                    successModal.show();
                } else {
                    alert(res.data.message || 'Error al cambiar contraseña.');
                }
            } catch (err) {
                if (!err.response) {
                    alert('Error de conexión. Verifica tu internet.');
                } else {
                    alert(err.response.data?.message || 'Error al cambiar contraseña.');
                }
            }
        }

        // Función para configurar 2FA
        async function setup2FA() {
            try {
                // Enviar body vacío JSON explícitamente para evitar 400 por falta de req.body
                const res = await API.post('/api/auth/setup2FA', {});
                if (res.data.success) {
                    // Mostrar modal con QR code
                    show2FASetupModal(res.data.secret, res.data.qrCode, res.data.backupCodes);
                } else {
                    alert(res.data.message || 'Error al configurar 2FA.');
                }
            } catch (err) {
                if (!err.response) {
                    alert('Error de conexión. Verifica tu internet.');
                } else {
                    // Manejar errores específicos del backend
                    const errorMessage = err.response.data?.error?.message || err.response.data?.message || 'Error al configurar 2FA.';
                    alert(errorMessage);
                }
            }
        }

        // Función para desactivar 2FA
        async function disable2FA() {
            // Limpiar formulario
            document.getElementById('disable2FAForm').reset();
            
            // Mostrar modal
            const modal = new bootstrap.Modal(document.getElementById('disable2FAModal'));
            modal.show();
        }

        // Función para enviar desactivación de 2FA
        async function submitDisable2FA() {
            const currentPassword = document.getElementById('disable2FAPassword').value;

            if (!currentPassword) {
                alert('Debes ingresar tu contraseña actual.');
                return;
            }

            try {
                const res = await API.post('/api/auth/disable2FA', { currentPassword });
                if (res.data.success) {
                    // Cerrar modal
                    bootstrap.Modal.getInstance(document.getElementById('disable2FAModal')).hide();
                    
                    // Mostrar modal de éxito
                    document.getElementById('successModalLabel').textContent = '2FA desactivado exitosamente.';
                    const successModal = new bootstrap.Modal(document.getElementById('successModal'));
                    successModal.show();
                    
                    // Recargar datos del usuario
                    loadUserInfo();
                } else {
                    alert(res.data.message || 'Error al desactivar 2FA.');
                }
            } catch (err) {
                if (!err.response) {
                    alert('Error de conexión. Verifica tu internet.');
                } else {
                    alert(err.response.data?.message || 'Error al desactivar 2FA.');
                }
            }
        }

        // Función para cambiar email
        async function changeEmail() {
            // Limpiar formulario
            document.getElementById('changeEmailForm').reset();
            
            // Mostrar modal
            const modal = new bootstrap.Modal(document.getElementById('changeEmailRequestModal'));
            modal.show();
        }

        // Función para enviar solicitud de cambio de email
        async function submitChangeEmailRequest() {
            const newEmail = document.getElementById('newEmail').value;
            const currentPassword = document.getElementById('changeEmailPassword').value;

            // Validaciones
            if (!newEmail || !currentPassword) {
                alert('Todos los campos son obligatorios.');
                return;
            }

            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(newEmail)) {
                alert('Ingresa una dirección de email válida.');
                return;
            }

            try {
                const res = await API.post('/api/auth/requestEmailChange', {
                    newEmail,
                    currentPassword
                });

                if (res.data.success) {
                    // Cerrar modal de solicitud
                    bootstrap.Modal.getInstance(document.getElementById('changeEmailRequestModal')).hide();
                    
                    // Mostrar modal para ingresar código
                    showEmailChangeModal(newEmail);
                } else {
                    alert(res.data.message || 'Error al solicitar cambio de email.');
                }
            } catch (err) {
                if (!err.response) {
                    alert('Error de conexión. Verifica tu internet.');
                } else {
                    alert(err.response.data?.message || 'Error al solicitar cambio de email.');
                }
            }
        }

        // Función para logout
        async function logout() {
            try {
                await API.get('/api/auth/logout');
                window.location.replace('/login');
            } catch (err) {
                console.error('Error en logout:', err);
                // Aun así redirigir
                window.location.replace('/login');
            }
        }

        // Función para mostrar modal de setup 2FA
        function show2FASetupModal(secret, qrCode, backupCodes) {
            document.getElementById('qrCodeContainer').innerHTML = '<img src="' + qrCode + '" alt="QR Code" class="img-fluid">';
            document.getElementById('secretCode').textContent = secret;
            var backupHtml = '';
            for (var i = 0; i < backupCodes.length; i++) {
                backupHtml += '<code class="me-2">' + backupCodes[i] + '</code>';
            }
            document.getElementById('backupCodesContainer').innerHTML = backupHtml;
            document.getElementById('twoFactorCode').value = '';
            var modal = new bootstrap.Modal(document.getElementById('setup2FAModal'));
            modal.show();
        }

        // Función para verificar y activar 2FA
        async function verifyAndEnable2FA() {
            const code = document.getElementById('twoFactorCode').value.trim();
            
            if (!code || code.length !== 6) {
                alert('Ingresa un código válido de 6 dígitos.');
                return;
            }

            try {
                const res = await API.post('/api/auth/verify2FA', { code });
                if (res.data.success) {
                    // Cerrar modal
                    bootstrap.Modal.getInstance(document.getElementById('setup2FAModal')).hide();
                    
                    // Mostrar modal de éxito
                    document.getElementById('successModalLabel').textContent = '2FA activado exitosamente.';
                    const successModal = new bootstrap.Modal(document.getElementById('successModal'));
                    successModal.show();
                    
                    // Recargar datos del usuario
                    loadUserInfo();
                } else {
                    alert(res.data.message || 'Código inválido.');
                }
            } catch (err) {
                if (!err.response) {
                    alert('Error de conexión. Verifica tu internet.');
                } else {
                    alert(err.response.data?.message || 'Error al verificar código.');
                }
            }
        }

        // Función para mostrar modal de cambio de email
        function showEmailChangeModal(newEmail) {
            document.getElementById('newEmailDisplay').textContent = newEmail;
            document.getElementById('emailChangeCode').value = '';
            
            const modal = new bootstrap.Modal(document.getElementById('changeEmailModal'));
            modal.show();
        }

        // Función para confirmar cambio de email
        async function confirmEmailChange() {
            const code = document.getElementById('emailChangeCode').value.trim();
            
            if (!code || code.length !== 6) {
                alert('Ingresa un código válido de 6 dígitos.');
                return;
            }

            try {
                const res = await API.post('/api/auth/confirmEmailChange', { code });
                if (res.data.success) {
                    // Cerrar modal
                    bootstrap.Modal.getInstance(document.getElementById('changeEmailModal')).hide();
                    
                    // Mostrar modal de éxito
                    document.getElementById('successModalLabel').textContent = 'Email actualizado exitosamente.';
                    const successModal = new bootstrap.Modal(document.getElementById('successModal'));
                    successModal.show();
                    
                    // Recargar datos del usuario
                    loadUserInfo();
                } else {
                    alert(res.data.message || 'Código inválido.');
                }
            } catch (err) {
                if (!err.response) {
                    alert('Error de conexión. Verifica tu internet.');
                } else {
                    alert(err.response.data?.message || 'Error al confirmar cambio.');
                }
            }
        }

        // Hacer funciones globales para onclick
        window.editProfile = editProfile;
        window.removeFavorite = removeFavorite;
        window.requestEmailVerification = requestEmailVerification;
        window.changePassword = changePassword;
        window.submitChangePassword = submitChangePassword;
        window.setup2FA = setup2FA;
        window.disable2FA = disable2FA;
        window.submitDisable2FA = submitDisable2FA;
        window.changeEmail = changeEmail;
        window.submitChangeEmailRequest = submitChangeEmailRequest;
        window.verifyAndEnable2FA = verifyAndEnable2FA;
        window.confirmEmailChange = confirmEmailChange;

        // Cargar info al cargar la página
        loadUserInfo();

    // Función para enviar baja
    window.submitUnsubscribe = async function() {
        const password = document.getElementById('unsubscribePassword').value;
        const confirmDelete = document.getElementById('confirmDelete').checked;

        if (!password) {
            alert('Debes ingresar tu contraseña.');
            return;
        }

        if (!confirmDelete) {
            alert('Debes confirmar que entiendes que esta acción es permanente.');
            return;
        }

        // Confirmación adicional
        if (!confirm('¿Estás completamente seguro? Esta acción eliminará tu cuenta permanentemente y no se puede deshacer.')) {
            return;
        }

        try {
            const res = await API.post('/api/auth/unsubscribe', { password });
            if (res.data.success) {
                bootstrap.Modal.getInstance(document.getElementById('unsubscribeModal')).hide();
                alert('Cuenta eliminada correctamente. ¡Gracias por haber sido parte!');
                window.location.replace('/');
            } else {
                alert(res.data.message || 'No se pudo eliminar la cuenta.');
            }
        } catch (err) {
            console.error('Error al eliminar cuenta:', err);
            if (!err.response) {
                alert('Error de conexión. Verifica tu internet.');
            } else {
                alert(err.response.data?.message || 'Error al eliminar la cuenta.');
            }
        }
    };
    