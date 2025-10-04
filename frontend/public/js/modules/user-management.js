// ============= MÓDULO DE GESTIÓN DE USUARIO =============

// ============= FUNCIONES DE INTERFAZ DE USUARIO =============

// Función para actualizar la interfaz cuando un usuario se loguea
function updateUserInterface(usuario) {
  console.log('updateUserInterface llamada con:', usuario);
  const botones = document.getElementById('botonesSesion');
  const avatar = document.getElementById('avatarSesion');
  
  console.log('Elementos encontrados - botones:', botones, 'avatar:', avatar);
  
  if (botones && avatar) {
    console.log('Ocultando botones y mostrando avatar');
    botones.style.display = 'none';
    botones.classList.add('d-none');
    avatar.style.display = 'block';
    avatar.classList.remove('d-none');
    
    // Configurar click en el avatar para abrir el modal del usuario
    const avatarImg = document.getElementById('avatarImg');
    if (avatarImg) {
      // Remover event listeners anteriores de forma más suave
      avatarImg.removeEventListener('click', abrirModalUsuario);
      
      // Agregar nuevo event listener
      avatarImg.addEventListener('click', function() {
        abrirModalUsuario(usuario);
      });
    }
    
    const userNameElement = document.getElementById('userName');
    if (userNameElement) {
      userNameElement.innerText = usuario.nombre;
    }

    // Actualizar información del rol en el panel de usuario
    updateUserRoleDisplay(usuario.rol);
  } else {
    console.log('No se encontraron los elementos necesarios');
  }
}

// Función para actualizar la visualización del rol del usuario
function updateUserRoleDisplay(rol) {
  const userRoleElement = document.getElementById('userRole');
  const adminPanelAction = document.getElementById('adminPanelAction');
  const vendedorAction = document.getElementById('vendedorAction');

  if (userRoleElement) {
    // Limpiar clases anteriores
    userRoleElement.classList.remove('rol-admin', 'rol-vendedor', 'rol-cliente');
    
    // Actualizar texto y clase según el rol
    switch (rol) {
      case 'admin':
        userRoleElement.textContent = 'Administrador';
        userRoleElement.classList.add('rol-admin');
        // Mostrar botón de panel admin y ocultar botón de ser vendedor
        if (adminPanelAction) adminPanelAction.style.display = 'flex';
        if (vendedorAction) vendedorAction.style.display = 'none';
        break;
      case 'vendedor':
        userRoleElement.textContent = 'Vendedor';
        userRoleElement.classList.add('rol-vendedor');
        // Ocultar ambos botones especiales
        if (adminPanelAction) adminPanelAction.style.display = 'none';
        if (vendedorAction) vendedorAction.style.display = 'none';
        break;
      case 'cliente':
      default:
        userRoleElement.textContent = 'Cliente';
        userRoleElement.classList.add('rol-cliente');
        // Ocultar panel admin y mostrar botón de ser vendedor
        if (adminPanelAction) adminPanelAction.style.display = 'none';
        if (vendedorAction) vendedorAction.style.display = 'flex';
        break;
    }
  }
}

// Función para mostrar botones de sesión cuando no hay usuario logueado
function mostrarBotonesSesion() {
  const botones = document.getElementById('botonesSesion');
  const avatar = document.getElementById('avatarSesion');
  
  if (botones) {
    botones.style.display = 'block';
    botones.classList.remove('d-none');
  }
  
  if (avatar) {
    avatar.style.display = 'none';
    avatar.classList.add('d-none');
  }
}

// Función para abrir el modal del usuario
function abrirModalUsuario(usuario) {
  // Actualizar la información del usuario en el modal
  const nombreUsuario = document.getElementById('userName');
  const emailUsuario = document.getElementById('userEmail');
  const rolUsuario = document.getElementById('userRole');
  
  if (nombreUsuario) nombreUsuario.textContent = usuario.nombre;
  if (emailUsuario) emailUsuario.textContent = usuario.email;
  if (rolUsuario) rolUsuario.textContent = usuario.rol;
  
  // Actualizar la visualización del rol
  updateUserRoleDisplay(usuario.rol);
  
  // Abrir el modal
  const modal = new bootstrap.Modal(document.getElementById('userPanelModal'));
  modal.show();
}

// ============= FUNCIONES DE PERFIL =============

// Función para ir al panel de administrador
function irAPanelAdmin() {
  // Cerrar el modal del panel de usuario
  const modal = bootstrap.Modal.getInstance(document.getElementById('userPanelModal'));
  if (modal) {
    modal.hide();
  }
  
  // Redirigir al panel de administrador
  window.location.href = '/admin';
}

// Solicitar permiso (placeholder por ahora)
function solicitarPermiso() {
  alert('Tu solicitud ha sido enviada. (Aquí va la lógica real luego)');
}

// Toggle para mostrar/ocultar sección de upload de foto
function togglePhotoUpload() {
  const section = document.getElementById('photoUploadSection');
  if (section.style.display === 'none') {
    section.style.display = 'block';
  } else {
    section.style.display = 'none';
  }
}

// Abrir modal de editar perfil
function abrirEditarPerfil() {
  // Cerrar el modal del panel de usuario
  const userPanelModal = bootstrap.Modal.getInstance(document.getElementById('userPanelModal'));
  if (userPanelModal) {
    userPanelModal.hide();
  }
  
  // Cargar datos actuales del usuario
  cargarDatosUsuario();
  
  // Abrir modal de editar perfil
  const editModal = new bootstrap.Modal(document.getElementById('editProfileModal'));
  editModal.show();
}

// Cargar datos actuales del usuario en el formulario
async function cargarDatosUsuario() {
  try {
    const data = await apiService.get('/api/auth/me');
    
    // Validar que la respuesta contenga los datos del usuario
    if (!data || !data.data || !data.data.usuario) {
      throw new Error('Respuesta del servidor incompleta');
    }
    
    const usuario = data.data.usuario;
    
    // Validar que el usuario tenga las propiedades necesarias
    if (!usuario.nombre || !usuario.email) {
      throw new Error('Datos del usuario incompletos');
    }
    
    // Llenar los campos del formulario
    document.getElementById('editNombre').value = usuario.nombre || '';
    document.getElementById('editEmail').value = usuario.email || '';
    document.getElementById('editTelefono').value = usuario.telefono || '';
    document.getElementById('editDireccion').value = usuario.direccion || '';
    document.getElementById('editDocumento').value = usuario.documento || '';
    
    // Limpiar campos de contraseña
    document.getElementById('editCurrentPassword').value = '';
    document.getElementById('editPassword').value = '';
    document.getElementById('editConfirmPassword').value = '';
    
  } catch (error) {
    console.error('Error al cargar datos del usuario:', error);
    // Usar función utilitaria si está disponible, sino usar mensaje directo
    const errorMessage = typeof extractErrorMessage === 'function' 
      ? extractErrorMessage(error, 'Error al cargar los datos del perfil')
      : (error.message || 'Error al cargar los datos del perfil');
    mostrarAlerta(errorMessage, 'error');
  }
}

// ============= VALIDACIONES DE PERFIL =============

// Función para validar todo el formulario
function validarFormularioCompleto() {
  const nombre = document.getElementById('editNombre').value.trim();
  const email = document.getElementById('editEmail').value.trim();
  const telefono = document.getElementById('editTelefono').value.trim();
  const documento = document.getElementById('editDocumento').value.trim();
  const currentPassword = document.getElementById('editCurrentPassword').value;
  const password = document.getElementById('editPassword').value;
  const confirmPassword = document.getElementById('editConfirmPassword').value;
  
  // Validar campos obligatorios
  if (!nombre || nombre.length < 3 || nombre.length > 25 || !/^[a-zA-Z0-9_]+$/.test(nombre)) {
    return false;
  }
  
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return false;
  }
  
  // Validar campos opcionales si están llenos
  if (telefono && !/^\d{10}$/.test(telefono)) {
    return false;
  }
  
  if (documento && !/^\d{7,10}$/.test(documento)) {
    return false;
  }
  
  // Validar contraseña si se está cambiando
  if (currentPassword || password || confirmPassword) {
    // Si se ingresa algún campo de contraseña, todos son obligatorios
    if (!currentPassword || currentPassword.length < 6) {
      return false;
    }
    if (!password || password.length < 6 || !/\d/.test(password)) {
      return false;
    }
    if (password !== confirmPassword) {
      return false;
    }
  }
  
  return true;
}

// Función para limpiar el formulario de edición
function limpiarFormularioEdicion() {
  const form = document.getElementById('editProfileForm');
  if (form) {
    // Limpiar clases de validación
    form.querySelectorAll('.form-control').forEach(input => {
      input.classList.remove('is-valid', 'is-invalid');
    });
    
    // Ocultar campos de contraseña si están visibles
    const passwordFields = document.getElementById('passwordFields');
    const toggleText = document.getElementById('passwordToggleText');
    if (passwordFields && passwordFields.style.display !== 'none') {
      passwordFields.style.display = 'none';
      toggleText.textContent = 'Mostrar';
      
      // Limpiar campos de contraseña
      document.getElementById('editCurrentPassword').value = '';
      document.getElementById('editPassword').value = '';
      document.getElementById('editConfirmPassword').value = '';
    }
  }
}

// ============= FUNCIONES DE UTILIDAD =============

// Función para mostrar alertas
function mostrarAlerta(mensaje, tipo = 'info') {
  // Crear elemento de alerta
  const alertDiv = document.createElement('div');
  alertDiv.className = `alert alert-${tipo === 'error' ? 'danger' : tipo} alert-dismissible fade show position-fixed`;
  alertDiv.style.cssText = 'top: 20px; right: 20px; z-index: 9999; max-width: 400px;';
  
  alertDiv.innerHTML = `
    ${mensaje}
    <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Cerrar"></button>
  `;
  
  // Agregar al body
  document.body.appendChild(alertDiv);
  
  // Auto-remove después de 5 segundos
  setTimeout(() => {
    if (alertDiv.parentNode) {
      alertDiv.remove();
    }
  }, 5000);
}

// ============= CONFIGURACIÓN DE OPCIONES AVANZADAS =============

function setupAdvancedOptionsToggle() {
  const toggleBtn = document.getElementById('toggleAdvancedOptions');
  const toggleText = document.getElementById('advancedToggleText');
  const advancedFields = document.getElementById('advancedFields');

  if (toggleBtn && toggleText && advancedFields) {
    toggleBtn.addEventListener('click', function() {
      const isHidden = advancedFields.style.display === 'none';
      
      if (isHidden) {
        advancedFields.style.display = 'block';
        toggleText.textContent = 'Ocultar';
        toggleBtn.classList.remove('btn-outline-secondary');
        toggleBtn.classList.add('btn-outline-warning');
      } else {
        advancedFields.style.display = 'none';
        toggleText.textContent = 'Mostrar';
        toggleBtn.classList.remove('btn-outline-warning');
        toggleBtn.classList.add('btn-outline-secondary');
      }
    });
  }
}