async function register(e) {
  e.preventDefault();

  // Obtener valores de los campos
  const nombre = document.getElementById('registerNombre').value.trim();
  const email = document.getElementById('registerEmail').value.trim();
  const password = document.getElementById('registerPassword').value;
  const confirmPassword = document.getElementById('registerConfirm').value;
  const telefono = document.getElementById('registerTelefono').value.trim();
  const politicas = document.getElementById('registerPoliticas').checked;

  // Validaciones del lado del cliente
  let hasErrors = false;

  // Limpiar clases de error anteriores
  document.querySelectorAll('.is-invalid').forEach(el => el.classList.remove('is-invalid'));

  // Validar nombre
  if (!nombre || nombre.length < 3 || nombre.length > 25) {
    document.getElementById('registerNombre').classList.add('is-invalid');
    hasErrors = true;
  }

  // Validar email
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!email || !emailRegex.test(email)) {
    document.getElementById('registerEmail').classList.add('is-invalid');
    hasErrors = true;
  }

  // Validar contraseña
  if (!password || password.length < 6 || !/\d/.test(password)) {
    document.getElementById('registerPassword').classList.add('is-invalid');
    hasErrors = true;
  }

  // Validar confirmación de contraseña
  if (password !== confirmPassword) {
    document.getElementById('registerConfirm').classList.add('is-invalid');
    hasErrors = true;
  }

  // Validar teléfono (opcional, pero si se proporciona debe ser válido)
  if (telefono && !/^\d{10}$/.test(telefono)) {
    document.getElementById('registerTelefono').classList.add('is-invalid');
    hasErrors = true;
  }

  // Validar políticas
  if (!politicas) {
    document.getElementById('registerPoliticas').classList.add('is-invalid');
    hasErrors = true;
  }

  if (hasErrors) {
    return false;
  }

  try {
    // Preparar datos para enviar
    const userData = { nombre, email, password };
    
    // Solo incluir teléfono si se proporcionó
    if (telefono) {
      userData.telefono = telefono;
    }

    const data = await apiService.post('/api/auth/registro', userData);

    // Guardar usuario en localStorage si el registro fue exitoso
    if (data.usuario) {
      localStorage.setItem('usuario', JSON.stringify(data.usuario));
    }

    alert('Cuenta creada con éxito. ¡Bienvenido!');
    
    // Cerrar modal
    const modal = bootstrap.Modal.getInstance(document.getElementById('registerModal'));
    modal.hide();

    // Limpiar formulario
    document.getElementById('registerForm').reset();

    // Actualizar UI para mostrar usuario logueado
    updateUserInterface(data.usuario);

  } catch (error) {
    console.error('Error en el registro:', error);
    alert(`Error: ${error.message}`);
  }

  return false;
}

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
    
    const userNameElement = document.getElementById('userName');
    if (userNameElement) {
      userNameElement.innerText = usuario.nombre;
    }
  } else {
    console.log('No se encontraron los elementos necesarios');
  }
}


async function login(e) {
  e.preventDefault();

  const email = document.getElementById('loginEmail').value.trim();
  const password = document.getElementById('loginPassword').value;

  // Limpiar clases de error anteriores
  document.querySelectorAll('#loginForm .is-invalid').forEach(el => el.classList.remove('is-invalid'));

  let hasErrors = false;

  // Validar email
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!email || !emailRegex.test(email)) {
    document.getElementById('loginEmail').classList.add('is-invalid');
    hasErrors = true;
  }

  // Validar contraseña
  if (!password || password.length < 1) {
    document.getElementById('loginPassword').classList.add('is-invalid');
    hasErrors = true;
  }

  if (hasErrors) {
    return false;
  }

  // Deshabilitar botón durante el proceso
  const submitBtn = document.getElementById('btnLogin');
  const originalText = submitBtn.textContent;
  submitBtn.disabled = true;
  submitBtn.textContent = 'Iniciando...';

  try {
    const data = await apiService.post('/api/auth/login', { email, password });

    // 💾 Guarda usuario inmediatamente
    localStorage.setItem('usuario', JSON.stringify(data.usuario));

    alert('Sesión iniciada correctamente');

    // Cerrar modal
    const modal = bootstrap.Modal.getInstance(document.getElementById('loginModal'));
    modal.hide();

    // Limpiar formulario
    document.getElementById('loginForm').reset();

    // Actualizar interfaz
    updateUserInterface(data.usuario);

    // Redirigir según el rol
    if (data.usuario.rol === 'admin') {
      window.location.href = '/admin';
    } else {
      window.location.href = '/';
    }

  } catch (error) {
    console.error('Error al iniciar sesión:', error);
    
    // Mostrar error específico
    let errorMessage = 'Error al iniciar sesión';
    if (error.message.includes('Email no encontrado')) {
      errorMessage = 'El correo electrónico no está registrado';
      document.getElementById('loginEmail').classList.add('is-invalid');
    } else if (error.message.includes('Contraseña incorrecta')) {
      errorMessage = 'La contraseña es incorrecta';
      document.getElementById('loginPassword').classList.add('is-invalid');
    } else if (error.message.includes('Cuenta desactivada')) {
      errorMessage = 'Tu cuenta está desactivada. Contacta al soporte.';
    } else {
      errorMessage = error.message;
    }
    
    alert(errorMessage);
  } finally {
    // Restaurar botón
    submitBtn.disabled = false;
    submitBtn.textContent = originalText;
  }

  return false;
}

async function cerrarSesion() {
  try {
    await apiService.post('/api/auth/logout', {});

    // Limpiar localStorage
    localStorage.removeItem('usuario');

    // Redirigir al inicio
    alert('Sesión cerrada');
    window.location.href = '/';
  } catch (err) {
    console.error('Error al cerrar sesión:', err);
    alert('No se pudo cerrar la sesión');
  }
}

 async function verificarAccesoAdmin() {
    try {
      const data = await apiService.get('/api/auth/admin');
      
      // ✅ Mostrar la página
      document.documentElement.style.visibility = 'visible';
    } catch (error) {
      // ❌ Error al verificar, redirigir sin alert
      window.location.replace('/');
    }
  }

  if (window.location.pathname === '/admin') {
  verificarAccesoAdmin();
}


  // Llamar inmediatamente al cargar la vista

// Mostrar panel si hay usuario logueado
document.addEventListener('DOMContentLoaded', () => {
  const usuario = JSON.parse(localStorage.getItem('usuario'));
  const panel = document.getElementById('userPanel');
  const botones = document.getElementById('botonesSesion');
  const avatar = document.getElementById('avatarSesion');

  console.log('Usuario:', usuario);
  console.log('Botones element:', botones);
  console.log('Avatar element:', avatar);

  if (usuario) {
    console.log('Usuario logueado - ocultando botones');
    botones.style.display = 'none';
    botones.classList.add('d-none');
    avatar.style.display = 'block';
    avatar.classList.remove('d-none');

    document.getElementById('avatarImg')?.addEventListener('click', () => {
      const modal = new bootstrap.Modal(document.getElementById('userPanelModal'));
      modal.show();
    });

    // Mostrar nombre
    const userNameElement = document.getElementById('userName');
    if (userNameElement) {
      userNameElement.innerText = usuario.nombre;
    }
  } else {
    console.log('Sin usuario - mostrando botones');
    botones.style.display = 'flex';
    botones.classList.remove('d-none');
    avatar.style.display = 'none';
    avatar.classList.add('d-none');
  }

  // Validación en tiempo real para el formulario de registro
  setupRegistrationValidation();
  
  // Validación en tiempo real para el formulario de login
  setupLoginValidation();
});

// Configurar validación en tiempo real para el login
function setupLoginValidation() {
  const emailInput = document.getElementById('loginEmail');
  const passwordInput = document.getElementById('loginPassword');
  const submitBtn = document.getElementById('btnLogin');

  if (emailInput) {
    emailInput.addEventListener('input', function() {
      validateLoginField(this, 'email');
      checkLoginFormValidity();
    });

    emailInput.addEventListener('blur', function() {
      validateLoginField(this, 'email');
    });
  }

  if (passwordInput) {
    passwordInput.addEventListener('input', function() {
      validateLoginField(this, 'password');
      checkLoginFormValidity();
    });

    passwordInput.addEventListener('blur', function() {
      validateLoginField(this, 'password');
    });
  }
}

// Validar campo individual del login
function validateLoginField(field, type) {
  const value = field.value.trim();
  
  field.classList.remove('is-valid', 'is-invalid');
  
  if (type === 'email') {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (value && emailRegex.test(value)) {
      field.classList.add('is-valid');
      return true;
    } else if (value) {
      field.classList.add('is-invalid');
      return false;
    }
  } else if (type === 'password') {
    if (value && value.length >= 1) {
      field.classList.add('is-valid');
      return true;
    } else if (value) {
      field.classList.add('is-invalid');
      return false;
    }
  }
  
  return false;
}

// Verificar validez del formulario de login
function checkLoginFormValidity() {
  const email = document.getElementById('loginEmail')?.value.trim();
  const password = document.getElementById('loginPassword')?.value;
  const submitBtn = document.getElementById('btnLogin');

  if (!submitBtn) return;

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const isValid = email && emailRegex.test(email) && password && password.length >= 1;

  submitBtn.disabled = !isValid;
}
function setupRegistrationValidation() {
  const passwordInput = document.getElementById('registerPassword');
  const confirmInput = document.getElementById('registerConfirm');
  const submitBtn = document.getElementById('btnRegistrar');
  const politicasCheckbox = document.getElementById('registerPoliticas');

  if (passwordInput) {
    passwordInput.addEventListener('input', function() {
      updatePasswordStrength(this.value);
      checkFormValidity();
    });
  }

  if (confirmInput) {
    confirmInput.addEventListener('input', function() {
      validatePasswordMatch();
      checkFormValidity();
    });
  }

  if (politicasCheckbox) {
    politicasCheckbox.addEventListener('change', checkFormValidity);
  }

  // Validar otros campos cuando cambian
  ['registerNombre', 'registerEmail', 'registerTelefono'].forEach(id => {
    const element = document.getElementById(id);
    if (element) {
      element.addEventListener('input', checkFormValidity);
    }
  });
}

// Verificar si el formulario es válido para habilitar/deshabilitar el botón
function checkFormValidity() {
  const nombre = document.getElementById('registerNombre')?.value.trim();
  const email = document.getElementById('registerEmail')?.value.trim();
  const password = document.getElementById('registerPassword')?.value;
  const confirm = document.getElementById('registerConfirm')?.value;
  const politicas = document.getElementById('registerPoliticas')?.checked;
  const submitBtn = document.getElementById('btnRegistrar');

  if (!submitBtn) return;

  const isValid = nombre && nombre.length >= 3 && 
                  email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) &&
                  password && password.length >= 6 && /\d/.test(password) &&
                  password === confirm &&
                  politicas;

  submitBtn.disabled = !isValid;
}

// Validar que las contraseñas coincidan
function validatePasswordMatch() {
  const password = document.getElementById('registerPassword')?.value;
  const confirm = document.getElementById('registerConfirm')?.value;
  const confirmInput = document.getElementById('registerConfirm');

  if (confirmInput && confirm) {
    if (password === confirm) {
      confirmInput.classList.remove('is-invalid');
      confirmInput.classList.add('is-valid');
    } else {
      confirmInput.classList.remove('is-valid');
      confirmInput.classList.add('is-invalid');
    }
  }
}

// Actualizar indicador de fortaleza de contraseña
function updatePasswordStrength(password) {
  const meters = document.querySelectorAll('.meter-seg');
  const meterText = document.getElementById('meterText');
  
  if (!meters.length || !meterText) return;

  let strength = 0;
  let text = 'Muy débil';
  let color = '#dc3545';

  if (password.length >= 6) strength++;
  if (/[a-z]/.test(password)) strength++;
  if (/[A-Z]/.test(password)) strength++;
  if (/\d/.test(password)) strength++;
  if (/[^a-zA-Z0-9]/.test(password)) strength++;

  switch (strength) {
    case 0:
    case 1:
      text = 'Muy débil';
      color = '#dc3545';
      break;
    case 2:
      text = 'Débil';
      color = '#fd7e14';
      break;
    case 3:
      text = 'Regular';
      color = '#ffc107';
      break;
    case 4:
      text = 'Fuerte';
      color = '#198754';
      break;
    case 5:
      text = 'Muy fuerte';
      color = '#0d6efd';
      break;
  }

  // Actualizar barras
  meters.forEach((meter, index) => {
    if (index < strength) {
      meter.style.backgroundColor = color;
    } else {
      meter.style.backgroundColor = '#e9ecef';
    }
  });

  meterText.textContent = text;
  meterText.style.color = color;
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

// Editar perfil
function editarPerfil() {
  alert('Funcionalidad de editar perfil (implementar luego)');
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
    const usuario = data.usuario;
    
    // Llenar los campos del formulario
    document.getElementById('editNombre').value = usuario.nombre || '';
    document.getElementById('editEmail').value = usuario.email || '';
    document.getElementById('editTelefono').value = usuario.telefono || '';
    document.getElementById('editDireccion').value = usuario.direccion || '';
    document.getElementById('editDocumento').value = usuario.documento || '';
    
    // Limpiar campos de contraseña
    document.getElementById('editPassword').value = '';
    document.getElementById('editConfirmPassword').value = '';
    
  } catch (error) {
    console.error('Error al cargar datos del usuario:', error);
    mostrarAlerta('Error al cargar los datos del perfil', 'error');
  }
}

// Toggle para mostrar/ocultar campos de contraseña
document.addEventListener('DOMContentLoaded', function() {
  const toggleBtn = document.getElementById('togglePasswordSection');
  const passwordFields = document.getElementById('passwordFields');
  const toggleText = document.getElementById('passwordToggleText');
  
  if (toggleBtn && passwordFields && toggleText) {
    toggleBtn.addEventListener('click', function() {
      if (passwordFields.style.display === 'none') {
        passwordFields.style.display = 'block';
        toggleText.textContent = 'Ocultar';
      } else {
        passwordFields.style.display = 'none';
        toggleText.textContent = 'Mostrar';
        // Limpiar campos cuando se ocultan
        document.getElementById('editPassword').value = '';
        document.getElementById('editConfirmPassword').value = '';
      }
    });
  }
});

// Validaciones en tiempo real para editar perfil
document.addEventListener('DOMContentLoaded', function() {
  // Validación del nombre
  const editNombre = document.getElementById('editNombre');
  if (editNombre) {
    editNombre.addEventListener('input', function() {
      const valor = this.value.trim();
      const isValid = valor.length >= 3 && valor.length <= 25 && /^[a-zA-Z0-9_]+$/.test(valor);
      
      this.classList.toggle('is-valid', isValid && valor.length > 0);
      this.classList.toggle('is-invalid', !isValid && valor.length > 0);
    });
  }

  // Validación del email
  const editEmail = document.getElementById('editEmail');
  if (editEmail) {
    editEmail.addEventListener('input', function() {
      const valor = this.value.trim();
      const isValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(valor);
      
      this.classList.toggle('is-valid', isValid);
      this.classList.toggle('is-invalid', !isValid && valor.length > 0);
    });
  }

  // Validación del teléfono
  const editTelefono = document.getElementById('editTelefono');
  if (editTelefono) {
    editTelefono.addEventListener('input', function() {
      const valor = this.value.trim();
      const isValid = /^\d{10}$/.test(valor) || valor === '';
      
      this.classList.toggle('is-valid', isValid && valor.length > 0);
      this.classList.toggle('is-invalid', !isValid && valor.length > 0);
    });
  }

  // Validación del documento
  const editDocumento = document.getElementById('editDocumento');
  if (editDocumento) {
    editDocumento.addEventListener('input', function() {
      const valor = this.value.trim();
      const isValid = /^\d{7,10}$/.test(valor) || valor === '';
      
      this.classList.toggle('is-valid', isValid && valor.length > 0);
      this.classList.toggle('is-invalid', !isValid && valor.length > 0);
    });
  }

  // Validación de la contraseña
  const editPassword = document.getElementById('editPassword');
  const editConfirmPassword = document.getElementById('editConfirmPassword');
  
  if (editPassword) {
    editPassword.addEventListener('input', function() {
      const valor = this.value;
      const isValid = valor.length >= 6 && /\d/.test(valor) || valor === '';
      
      this.classList.toggle('is-valid', isValid && valor.length > 0);
      this.classList.toggle('is-invalid', !isValid && valor.length > 0);
      
      // Validar también la confirmación si ya tiene contenido
      if (editConfirmPassword && editConfirmPassword.value) {
        validatePasswordConfirmation();
      }
    });
  }

  if (editConfirmPassword) {
    editConfirmPassword.addEventListener('input', validatePasswordConfirmation);
  }

  function validatePasswordConfirmation() {
    const password = editPassword.value;
    const confirmPassword = editConfirmPassword.value;
    const isValid = password === confirmPassword;
    
    editConfirmPassword.classList.toggle('is-valid', isValid && confirmPassword.length > 0);
    editConfirmPassword.classList.toggle('is-invalid', !isValid && confirmPassword.length > 0);
  }
});

// Manejar envío del formulario de editar perfil
document.addEventListener('DOMContentLoaded', function() {
  const editForm = document.getElementById('editProfileForm');
  if (editForm) {
    editForm.addEventListener('submit', async function(e) {
      e.preventDefault();
      
      const btnActualizar = document.getElementById('btnActualizar');
      const btnText = btnActualizar.querySelector('.btn-text');
      const btnLoading = btnActualizar.querySelector('.btn-loading');
      
      try {
        // Validar formulario antes de enviar
        if (!validarFormularioCompleto()) {
          mostrarAlerta('Por favor, corrige los errores en el formulario', 'error');
          return;
        }
        
        // Mostrar estado de carga
        btnActualizar.disabled = true;
        btnText.style.display = 'none';
        btnLoading.style.display = 'inline-flex';
        
        // Obtener datos del formulario
        const formData = new FormData(editForm);
        const updateData = {};
        
        // Solo incluir campos que no estén vacíos
        if (formData.get('nombre').trim()) updateData.nombre = formData.get('nombre').trim();
        if (formData.get('email').trim()) updateData.email = formData.get('email').trim();
        if (formData.get('telefono').trim()) updateData.telefono = formData.get('telefono').trim();
        if (formData.get('direccion').trim()) updateData.direccion = formData.get('direccion').trim();
        if (formData.get('documento').trim()) updateData.documento = formData.get('documento').trim();
        
        // Validar contraseña si se proporcionó
        const password = formData.get('password');
        const confirmPassword = document.getElementById('editConfirmPassword').value;
        
        if (password && password.trim()) {
          if (password !== confirmPassword) {
            throw new Error('Las contraseñas no coinciden');
          }
          updateData.password = password;
        }
        
        // Verificar que al menos un campo esté siendo actualizado
        if (Object.keys(updateData).length === 0) {
          throw new Error('Debes modificar al menos un campo para actualizar');
        }
        
        // Enviar actualización
        const response = await apiService.put('/api/auth/me', updateData);
        
        // Actualizar localStorage con los nuevos datos
        const usuarioActual = JSON.parse(localStorage.getItem('usuario') || '{}');
        const usuarioActualizado = { ...usuarioActual, ...response.usuario };
        localStorage.setItem('usuario', JSON.stringify(usuarioActualizado));
        
        // Actualizar interfaz
        updateUserInterface(usuarioActualizado);
        
        // Mostrar mensaje de éxito
        mostrarAlerta('Perfil actualizado correctamente', 'success');
        
        // Cerrar modal
        const editModal = bootstrap.Modal.getInstance(document.getElementById('editProfileModal'));
        if (editModal) {
          editModal.hide();
        }
        
        // Limpiar formulario
        limpiarFormularioEdicion();
        
      } catch (error) {
        console.error('Error al actualizar perfil:', error);
        mostrarAlerta(error.message || 'Error al actualizar el perfil', 'error');
      } finally {
        // Restaurar estado del botón
        btnActualizar.disabled = false;
        btnText.style.display = 'inline';
        btnLoading.style.display = 'none';
      }
    });
  }
});

// Función para validar todo el formulario
function validarFormularioCompleto() {
  const nombre = document.getElementById('editNombre').value.trim();
  const email = document.getElementById('editEmail').value.trim();
  const telefono = document.getElementById('editTelefono').value.trim();
  const documento = document.getElementById('editDocumento').value.trim();
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
  if (password) {
    if (password.length < 6 || !/\d/.test(password)) {
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
    }
  }
}

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

// Subir foto
document.getElementById('formFoto')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const fileInput = document.getElementById('fotoPerfil');
  const formData = new FormData();
  formData.append('foto', fileInput.files[0]);

  try {
    const data = await apiService.postFile('/api/usuarios/foto', formData);
    alert(data.mensaje || 'Foto subida');
    togglePhotoUpload(); // Ocultar sección después de subir
    
    // Actualizar avatar en el modal
    const userAvatarModal = document.getElementById('userAvatarModal');
    if (userAvatarModal && data.urlFoto) {
      userAvatarModal.src = data.urlFoto;
    }
  } catch (err) {
    console.error('Error al subir la foto:', err);
    alert(`Error al subir la foto: ${err.message}`);
  }
});


  const formulario = document.querySelector("form");
  const cuerpoTabla = document.querySelector("table tbody");
  
  let productoEditando = null;
  
  let elementoEditando = null;

  document.addEventListener("DOMContentLoaded", () => {
    // Solo aplicar a formularios que NO sean de autenticación
    const formularios = document.querySelectorAll("form:not(#loginForm):not(#registerForm)");
  
    formularios.forEach(formulario => {
      formulario.addEventListener("submit", function (evento) {
        evento.preventDefault();
  
        const inputs = this.querySelectorAll("input, select");
        const valores = Array.from(inputs).map(input => input.value);
  
        if (elementoEditando) {
          for (let i = 1; i < valores.length + 1; i++) {
            elementoEditando.children[i].textContent = valores[i - 1];
          }
          elementoEditando = null;
          alert("Datos actualizados correctamente ");
        } else {
          const nuevaFila = document.createElement("tr");
          let celdas = `<td>#</td>`;
          valores.forEach(valor => {
            celdas += `<td>${valor}</td>`;
          });
          celdas += `
            <td>
              <button class="btn btn-sm btn-info">Ver</button>
              <button class="btn btn-sm btn-warning">Editar</button>
              <button class="btn btn-sm btn-danger">Eliminar</button>
            </td>`;
          nuevaFila.innerHTML = celdas;
          const tablaBody = document.querySelector("table tbody");
          if (tablaBody) {
            tablaBody.appendChild(nuevaFila);
          }
          alert("Registro exitoso ");
        }
  
        this.reset();
      });
    });
  
    const secciones = document.querySelectorAll(".seccion");
  
    secciones.forEach(seccion => {
      const tabla = seccion.querySelector("table");
      if (!tabla) return;
  
      tabla.addEventListener("click", (evento) => {
        const boton = evento.target;
        const fila = boton.closest("tr");
        const celdas = fila.querySelectorAll("td");
  
        if (boton.classList.contains("btn-info")) {
          let mensaje = "";
          for (let i = 1; i < celdas.length - 1; i++) {
            mensaje += `${celdas[i].textContent}\n`;
          }
          alert("Detalles:\n" + mensaje);
        }
  
        if (boton.classList.contains("btn-warning")) {
          const formulario = seccion.querySelector("form");
          const campos = formulario.querySelectorAll("input, select");
  
          campos.forEach((campo, i) => {
            campo.value = celdas[i + 1].textContent;
          });
  
          elementoEditando = fila;
        }
  
        if (boton.classList.contains("btn-danger")) {
          if (confirm("¿Deseas eliminar este registro?")) {
            fila.remove();
          }
        }
      });
    });
  });

function moverSlider(direccion) {
  const slider = document.getElementById("loomSlider");
  const itemWidth = slider.querySelector(".loom-item").offsetWidth + 16; // ancho + gap
  slider.scrollLeft += direccion * itemWidth * 1; // mover 1 ítems
}