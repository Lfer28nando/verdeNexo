// ============= MÓDULO DE AUTENTICACIÓN =============

// ============= FUNCIONES DE REGISTRO =============

async function register(e) {
  console.log('Función register llamada');
  e.preventDefault();

  // Obtener valores de los campos
  const nombre = document.getElementById('registerNombre').value.trim();
  const email = document.getElementById('registerEmail').value.trim();
  const password = document.getElementById('registerPassword').value;
  const confirmPassword = document.getElementById('registerConfirm').value;
  const telefono = document.getElementById('registerTelefono').value.trim();
  const politicas = document.getElementById('registerPoliticas').checked;

  console.log('Datos de registro:', { nombre, email, telefono, politicas });

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

    // Validar que la respuesta contenga los datos del usuario
    if (!data || !data.data || !data.data.usuario) {
      throw new Error('Respuesta del servidor incompleta');
    }

    const usuario = data.data.usuario;

    // Validar que el usuario tenga las propiedades necesarias
    if (!usuario.nombre || !usuario.email) {
      throw new Error('Datos del usuario incompletos');
    }

    // Guardar usuario en localStorage si el registro fue exitoso
    localStorage.setItem('usuario', JSON.stringify(usuario));

    alert('Cuenta creada con éxito. ¡Bienvenido!');
    
    // Cerrar modal de manera segura
    cerrarModalSeguro('registerModal');

    // Limpiar formulario
    document.getElementById('registerForm').reset();

    // Actualizar UI para mostrar usuario logueado
    updateUserInterface(usuario);

  } catch (error) {
    console.error('Error en el registro:', error);
    
    // Extraer mensaje de error usando la función utilitaria
    const errorMessage = extractErrorMessage(error, 'Error al registrar usuario. Verifica los datos ingresados.');
    
    alert(`Error: ${errorMessage}`);
  }

  return false;
}

// ============= FUNCIONES DE LOGIN =============

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

    // Validar que la respuesta contenga los datos del usuario
    if (!data || !data.data || !data.data.usuario) {
      throw new Error('Respuesta del servidor incompleta');
    }

    const usuario = data.data.usuario;

    // Validar que el usuario tenga las propiedades necesarias
    if (!usuario.nombre || !usuario.email) {
      throw new Error('Datos del usuario incompletos');
    }

    // 💾 Guarda usuario inmediatamente
    localStorage.setItem('usuario', JSON.stringify(usuario));

    alert('Sesión iniciada correctamente');

    // Cerrar modal de manera segura
    cerrarModalSeguro('loginModal');

    // Limpiar formulario
    document.getElementById('loginForm').reset();

    // Actualizar interfaz
    updateUserInterface(usuario);

    // Redirigir según el rol
    if (usuario.rol === 'admin') {
      window.location.href = '/admin';
    } else {
      window.location.href = '/';
    }

  } catch (error) {
    console.error('Error al iniciar sesión:', error);
    
    // Extraer mensaje de error usando la función utilitaria
    let errorMessage = extractErrorMessage(error, 'Error al iniciar sesión. Verifica tus credenciales.');
    
    // Mostrar error específico basado en el mensaje
    if (errorMessage.includes('Email no encontrado') || errorMessage.includes('Email no registrado')) {
      errorMessage = 'El correo electrónico no está registrado';
      document.getElementById('loginEmail').classList.add('is-invalid');
    } else if (errorMessage.includes('Contraseña incorrecta') || errorMessage.includes('password')) {
      errorMessage = 'La contraseña es incorrecta';
      document.getElementById('loginPassword').classList.add('is-invalid');
    } else if (errorMessage.includes('Cuenta desactivada') || errorMessage.includes('desactivada')) {
      errorMessage = 'Tu cuenta está desactivada. Contacta al soporte.';
    }
    
    alert(errorMessage);
  } finally {
    // Restaurar botón
    submitBtn.disabled = false;
    submitBtn.textContent = originalText;
  }

  return false;
}

// ============= FUNCIÓN DE CERRAR SESIÓN =============

// Función para cerrar sesión
async function logout() {
  try {
    // Confirmar con el usuario
    if (!confirm('¿Estás seguro de que deseas cerrar sesión?')) {
      return;
    }

    // Limpiar token del localStorage
    localStorage.removeItem('token');
    localStorage.removeItem('usuario');

    // Actualizar interfaz de usuario
    updateUserInterface(null);

    // Mostrar mensaje
    alert('Sesión cerrada correctamente');

    // Redirigir a inicio
    window.location.href = '/';

  } catch (error) {
    console.error('Error al cerrar sesión:', error);
    alert('Error al cerrar sesión');
  }
}

// ============= FUNCIONES DE RECUPERACIÓN DE CONTRASEÑA =============

// Abrir modal de recuperar contraseña
function abrirRecuperarPassword() {
  // Cerrar modal de login si está abierto
  const loginModal = bootstrap.Modal.getInstance(document.getElementById('loginModal'));
  if (loginModal) {
    loginModal.hide();
  }
  
  // Abrir modal de recuperar contraseña
  const forgotModal = new bootstrap.Modal(document.getElementById('forgotPasswordModal'));
  forgotModal.show();
}

// Solicitar reset de contraseña
async function solicitarResetPassword(e) {
  e.preventDefault();

  const email = document.getElementById('forgotEmail').value.trim();
  const submitBtn = document.getElementById('btnSolicitarReset');
  const btnText = submitBtn.querySelector('.btn-text');
  const btnLoading = submitBtn.querySelector('.btn-loading');

  // Validar email
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!email || !emailRegex.test(email)) {
    document.getElementById('forgotEmail').classList.add('is-invalid');
    mostrarAlerta('Por favor, ingresa un email válido', 'error');
    return false;
  }

  try {
    // Mostrar estado de carga
    submitBtn.disabled = true;
    btnText.style.display = 'none';
    btnLoading.style.display = 'inline-flex';

    const response = await apiService.post('/api/auth/password/reset/request', { email });

    mostrarAlerta('Se ha enviado un código de verificación a tu email', 'success');

    // Cerrar modal de solicitud y abrir modal de confirmación
    const forgotModal = bootstrap.Modal.getInstance(document.getElementById('forgotPasswordModal'));
    forgotModal.hide();

    // Guardar email temporalmente para el siguiente paso
    sessionStorage.setItem('resetEmail', email);

    // Abrir modal de confirmación
    setTimeout(() => {
      const confirmModal = new bootstrap.Modal(document.getElementById('confirmResetModal'));
      confirmModal.show();
    }, 300);

  } catch (error) {
    console.error('Error al solicitar reset:', error);
    mostrarAlerta(error.message || 'Error al enviar el código de verificación', 'error');
  } finally {
    // Restaurar estado del botón
    submitBtn.disabled = false;
    btnText.style.display = 'inline';
    btnLoading.style.display = 'none';
  }

  return false;
}

// Confirmar reset de contraseña
async function confirmarResetPassword(e) {
  e.preventDefault();

  const email = sessionStorage.getItem('resetEmail');
  const codigo = document.getElementById('codigoReset').value.trim();
  const nuevaPassword = document.getElementById('nuevaPassword').value;
  const confirmarPassword = document.getElementById('confirmarPassword').value;
  
  const submitBtn = document.getElementById('btnConfirmarReset');
  const btnText = submitBtn.querySelector('.btn-text');
  const btnLoading = submitBtn.querySelector('.btn-loading');

  // Validaciones
  let hasErrors = false;

  // Limpiar errores anteriores
  document.querySelectorAll('#confirmResetForm .is-invalid').forEach(el => el.classList.remove('is-invalid'));

  if (!codigo || codigo.length !== 6) {
    document.getElementById('codigoReset').classList.add('is-invalid');
    hasErrors = true;
  }

  if (!nuevaPassword || nuevaPassword.length < 6 || !/\d/.test(nuevaPassword)) {
    document.getElementById('nuevaPassword').classList.add('is-invalid');
    hasErrors = true;
  }

  if (nuevaPassword !== confirmarPassword) {
    document.getElementById('confirmarPassword').classList.add('is-invalid');
    hasErrors = true;
  }

  if (hasErrors) {
    mostrarAlerta('Por favor, corrige los errores en el formulario', 'error');
    return false;
  }

  try {
    // Mostrar estado de carga
    submitBtn.disabled = true;
    btnText.style.display = 'none';
    btnLoading.style.display = 'inline-flex';

    const response = await apiService.post('/api/auth/password/reset/confirm', {
      email,
      codigo,
      nuevaPassword
    });

    mostrarAlerta('Contraseña cambiada exitosamente', 'success');

    // Limpiar email temporal
    sessionStorage.removeItem('resetEmail');

    // Cerrar modal de confirmación
    const confirmModal = bootstrap.Modal.getInstance(document.getElementById('confirmResetModal'));
    confirmModal.hide();

    // Limpiar formularios
    document.getElementById('forgotPasswordForm').reset();
    document.getElementById('confirmResetForm').reset();

    // Abrir modal de login después de 2 segundos
    setTimeout(() => {
      const loginModal = new bootstrap.Modal(document.getElementById('loginModal'));
      loginModal.show();
      mostrarAlerta('Ya puedes iniciar sesión con tu nueva contraseña', 'info');
    }, 2000);

  } catch (error) {
    console.error('Error al confirmar reset:', error);
    mostrarAlerta(error.message || 'Error al cambiar la contraseña', 'error');
  } finally {
    // Restaurar estado del botón
    submitBtn.disabled = false;
    btnText.style.display = 'inline';
    btnLoading.style.display = 'none';
  }

  return false;
}

// ============= FUNCIONES DE CIERRE DE SESIÓN =============

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

// ============= VALIDACIONES =============

// Configurar validación en tiempo real para el login
function setupLoginValidation() {
  const emailInput = document.getElementById('loginEmail');
  const passwordInput = document.getElementById('loginPassword');

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

// Configurar validaciones de registro
function setupRegistrationValidation() {
  console.log('Configurando validaciones de registro...');
  const passwordInput = document.getElementById('registerPassword');
  const confirmInput = document.getElementById('registerConfirm');
  const submitBtn = document.getElementById('btnRegistrar');
  const politicasCheckbox = document.getElementById('registerPoliticas');

  console.log('Elementos encontrados:', {
    passwordInput,
    confirmInput,
    submitBtn,
    politicasCheckbox
  });

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
  console.log('Verificando validez del formulario...');
  const nombre = document.getElementById('registerNombre')?.value.trim();
  const email = document.getElementById('registerEmail')?.value.trim();
  const password = document.getElementById('registerPassword')?.value;
  const confirm = document.getElementById('registerConfirm')?.value;
  const politicas = document.getElementById('registerPoliticas')?.checked;
  const submitBtn = document.getElementById('btnRegistrar');

  console.log('Valores del formulario:', {
    nombre,
    email,
    password: password ? '[PRESENTE]' : '[VACÍO]',
    confirm: confirm ? '[PRESENTE]' : '[VACÍO]',
    politicas
  });

  if (!submitBtn) return;

  const isValid = nombre && nombre.length >= 3 && 
                  email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) &&
                  password && password.length >= 6 && /\d/.test(password) &&
                  password === confirm &&
                  politicas;

  console.log('Formulario válido:', isValid);
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

// ============= VERIFICACIÓN DE ESTADO =============

// Función para verificar el estado de autenticación real
async function verificarEstadoAutenticacion() {
  try {
    const response = await apiService.get('/api/auth/me');
    
    // Validar la estructura de la respuesta
    if (response && response.data && response.data.usuario) {
      const usuario = response.data.usuario;
      
      // Validar que el usuario tenga las propiedades necesarias
      if (usuario.nombre && usuario.email) {
        // Usuario autenticado, actualizar localStorage y UI
        localStorage.setItem('usuario', JSON.stringify(usuario));
        updateUserInterface(usuario);
        return true;
      } else {
        console.error('Usuario recibido pero sin propiedades requeridas:', usuario);
      }
    } else {
      console.log('Respuesta del servidor sin datos de usuario válidos');
    }
  } catch (error) {
    console.log('Usuario no autenticado:', error.message);
    // Limpiar datos de localStorage si el token no es válido
    localStorage.removeItem('usuario');
    mostrarBotonesSesion();
    return false;
  }
  
  // Si llegamos aquí, no hay usuario válido
  localStorage.removeItem('usuario');
  mostrarBotonesSesion();
  return false;
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

// Validaciones para formularios de recuperación de contraseña
function setupForgotPasswordValidation() {
  // Validación para email de recuperación
  const forgotEmail = document.getElementById('forgotEmail');
  if (forgotEmail) {
    forgotEmail.addEventListener('input', function() {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      const esValido = emailRegex.test(this.value.trim());
      
      this.classList.toggle('is-valid', esValido && this.value.length > 0);
      this.classList.toggle('is-invalid', !esValido && this.value.length > 0);
    });
  }

  // Validación para código de reset
  const codigoReset = document.getElementById('codigoReset');
  if (codigoReset) {
    codigoReset.addEventListener('input', function() {
      // Limitar a 6 dígitos
      this.value = this.value.replace(/\D/g, '').substr(0, 6);
      
      const esValido = this.value.length === 6;
      this.classList.toggle('is-valid', esValido);
      this.classList.toggle('is-invalid', !esValido && this.value.length > 0);
    });
  }

  // Validación para nueva contraseña
  const nuevaPassword = document.getElementById('nuevaPassword');
  const confirmarPassword = document.getElementById('confirmarPassword');
  
  if (nuevaPassword) {
    nuevaPassword.addEventListener('input', function() {
      const esValido = this.value.length >= 6 && /\d/.test(this.value);
      this.classList.toggle('is-valid', esValido);
      this.classList.toggle('is-invalid', !esValido && this.value.length > 0);
      
      // Validar confirmación si ya tiene contenido
      if (confirmarPassword && confirmarPassword.value) {
        validatePasswordConfirmationReset();
      }
    });
  }

  if (confirmarPassword) {
    confirmarPassword.addEventListener('input', validatePasswordConfirmationReset);
  }

  function validatePasswordConfirmationReset() {
    const password = nuevaPassword.value;
    const confirm = confirmarPassword.value;
    const esValido = password === confirm;
    
    confirmarPassword.classList.toggle('is-valid', esValido && confirm.length > 0);
    confirmarPassword.classList.toggle('is-invalid', !esValido && confirm.length > 0);
  }
}

// ============= FUNCIONES DE ELIMINACIÓN DE CUENTA =============

// Abrir modal de eliminar cuenta
function abrirEliminarCuenta() {
  // Cerrar modal del panel de usuario si está abierto
  const userPanelModal = bootstrap.Modal.getInstance(document.getElementById('userPanelModal'));
  if (userPanelModal) {
    userPanelModal.hide();
  }
  
  // Cerrar modal de editar perfil si está abierto
  const editProfileModal = bootstrap.Modal.getInstance(document.getElementById('editProfileModal'));
  if (editProfileModal) {
    editProfileModal.hide();
  }
  
  // Pequeño delay para evitar conflictos entre modales
  setTimeout(() => {
    // Abrir modal de eliminar cuenta
    const deleteModal = new bootstrap.Modal(document.getElementById('deleteAccountModal'));
    deleteModal.show();
  }, 300);
}

// Solicitar eliminación de cuenta
async function solicitarEliminarCuenta(e) {
  e.preventDefault();

  const password = document.getElementById('deletePassword').value;
  const confirmCheck = document.getElementById('confirmDelete').checked;
  const submitBtn = document.getElementById('btnSolicitarEliminar');
  const btnText = submitBtn.querySelector('.btn-text');
  const btnLoading = submitBtn.querySelector('.btn-loading');

  // Validaciones
  if (!password) {
    document.getElementById('deletePassword').classList.add('is-invalid');
    mostrarAlerta('Debes ingresar tu contraseña actual', 'error');
    return false;
  }

  if (!confirmCheck) {
    mostrarAlerta('Debes confirmar que entiendes las consecuencias', 'error');
    return false;
  }

  try {
    // Mostrar estado de carga
    submitBtn.disabled = true;
    btnText.style.display = 'none';
    btnLoading.style.display = 'inline-flex';

    // Verificar contraseña y solicitar código
    const response = await apiService.post('/api/auth/me/desactivar/request', { 
      password: password 
    });

    mostrarAlerta('Se ha enviado un código de verificación a tu email', 'success');

    // Cerrar modal de solicitud y abrir modal de confirmación
    const deleteModal = bootstrap.Modal.getInstance(document.getElementById('deleteAccountModal'));
    deleteModal.hide();

    // Abrir modal de confirmación después de un breve delay
    setTimeout(() => {
      const confirmModal = new bootstrap.Modal(document.getElementById('confirmDeleteModal'));
      confirmModal.show();
    }, 300);

  } catch (error) {
    console.error('Error al solicitar eliminación:', error);
    
    if (error.message.includes('Contraseña incorrecta')) {
      document.getElementById('deletePassword').classList.add('is-invalid');
      mostrarAlerta('La contraseña ingresada es incorrecta', 'error');
    } else {
      mostrarAlerta(error.message || 'Error al procesar la solicitud', 'error');
    }
  } finally {
    // Restaurar estado del botón
    submitBtn.disabled = false;
    btnText.style.display = 'inline';
    btnLoading.style.display = 'none';
  }

  return false;
}

// Confirmar eliminación de cuenta
async function confirmarEliminarCuenta(e) {
  e.preventDefault();

  const codigo = document.getElementById('codigoEliminar').value.trim();
  const submitBtn = document.getElementById('btnConfirmarEliminar');
  const btnText = submitBtn.querySelector('.btn-text');
  const btnLoading = submitBtn.querySelector('.btn-loading');

  // Validaciones
  if (!codigo || codigo.length !== 6) {
    document.getElementById('codigoEliminar').classList.add('is-invalid');
    mostrarAlerta('Debes ingresar un código de 6 dígitos válido', 'error');
    return false;
  }

  // Confirmación final
  const confirmacion = confirm(
    '⚠️ CONFIRMACIÓN FINAL ⚠️\n\n' +
    'Estás a punto de eliminar tu cuenta permanentemente.\n\n' +
    '• No podrás recuperar tu cuenta\n' +
    '• Perderás todos tus datos\n' +
    '• Se eliminará tu historial de compras\n' +
    '• Tus métodos de pago serán removidos\n\n' +
    '¿Estás completamente seguro de que deseas continuar?'
  );

  if (!confirmacion) {
    return false;
  }

  try {
    // Mostrar estado de carga
    submitBtn.disabled = true;
    btnText.style.display = 'none';
    btnLoading.style.display = 'inline-flex';

    const response = await apiService.post('/api/auth/me/desactivar/confirm', {
      codigo: codigo
    });

    // Mostrar mensaje de éxito
    mostrarAlerta('Tu cuenta ha sido eliminada exitosamente', 'success');

    // Cerrar modal
    const confirmModal = bootstrap.Modal.getInstance(document.getElementById('confirmDeleteModal'));
    confirmModal.hide();

    // Limpiar localStorage
    localStorage.removeItem('usuario');

    // Mostrar mensaje final y redirigir
    setTimeout(() => {
      alert('Tu cuenta ha sido eliminada. Serás redirigido a la página principal.');
      window.location.href = '/';
    }, 2000);

  } catch (error) {
    console.error('Error al confirmar eliminación:', error);
    
    if (error.message.includes('Código inválido') || error.message.includes('expirado')) {
      document.getElementById('codigoEliminar').classList.add('is-invalid');
      mostrarAlerta('Código inválido o expirado. Solicita un nuevo código.', 'error');
    } else {
      mostrarAlerta(error.message || 'Error al eliminar la cuenta', 'error');
    }
  } finally {
    // Restaurar estado del botón
    submitBtn.disabled = false;
    btnText.style.display = 'inline';
    btnLoading.style.display = 'none';
  }

  return false;
}

// Validaciones para formularios de eliminación de cuenta
function setupDeleteAccountValidation() {
  // Validación para contraseña de eliminación
  const deletePassword = document.getElementById('deletePassword');
  if (deletePassword) {
    deletePassword.addEventListener('input', function() {
      const esValido = this.value.length >= 6;
      this.classList.toggle('is-valid', esValido);
      this.classList.toggle('is-invalid', !esValido && this.value.length > 0);
    });
  }

  // Validación para código de eliminación
  const codigoEliminar = document.getElementById('codigoEliminar');
  if (codigoEliminar) {
    codigoEliminar.addEventListener('input', function() {
      // Limitar a 6 dígitos
      this.value = this.value.replace(/\D/g, '').substr(0, 6);
      
      const esValido = this.value.length === 6;
      this.classList.toggle('is-valid', esValido);
      this.classList.toggle('is-invalid', !esValido && this.value.length > 0);
    });
  }
}

// Exportar funciones públicas del módulo de autenticación
window.authModule = {
  register,
  login,
  logout,
  solicitarResetPassword,
  confirmarResetPassword,
  abrirEliminarCuenta,
  solicitarEliminarCuenta,
  confirmarEliminarCuenta,
  setupDeleteAccountValidation
};

// ============= FUNCIÓN UTILITARIA PARA MANEJO DE ERRORES =============

/**
 * Extrae un mensaje de error legible de un objeto Error o string
 * @param {Error|string|any} error - El error a procesar
 * @param {string} defaultMessage - Mensaje por defecto si no se puede extraer un mensaje
 * @returns {string} - Mensaje de error legible
 */
function extractErrorMessage(error, defaultMessage = 'Ha ocurrido un error inesperado') {
  // Si es string directamente
  if (typeof error === 'string') {
    return error;
  }
  
  // Si es objeto Error con mensaje
  if (error && typeof error === 'object') {
    if (error.message && typeof error.message === 'string') {
      return error.message;
    }
    
    // Si tiene propiedad 'mensaje'
    if (error.mensaje && typeof error.mensaje === 'string') {
      return error.mensaje;
    }
    
    // Si tiene propiedad 'error'
    if (error.error && typeof error.error === 'string') {
      return error.error;
    }
  }
  
  // Si no se pudo extraer mensaje, usar el por defecto
  return defaultMessage;
}

// ============= FUNCIÓN UTILITARIA PARA MANEJO DE MODALES =============

/**
 * Cierra un modal de manera segura y limpia el backdrop si es necesario
 * @param {string} modalId - ID del modal a cerrar
 * @param {boolean} forceCleanup - Si debe forzar la limpieza del backdrop
 */
function cerrarModalSeguro(modalId, forceCleanup = true) {
  try {
    const modalElement = document.getElementById(modalId);
    if (!modalElement) {
      console.warn(`Modal con ID '${modalId}' no encontrado`);
      return;
    }

    // Intentar obtener la instancia del modal
    let modalInstance = bootstrap.Modal.getInstance(modalElement);
    
    if (modalInstance) {
      // Si existe la instancia, cerrarla
      modalInstance.hide();
    } else {
      // Si no existe instancia, crearla y cerrarla
      modalInstance = new bootstrap.Modal(modalElement);
      modalInstance.hide();
    }

    // Cleanup adicional si es necesario
    if (forceCleanup) {
      setTimeout(() => {
        // Limpiar backdrops huérfanos
        const backdrops = document.querySelectorAll('.modal-backdrop');
        backdrops.forEach(backdrop => {
          if (!backdrop.closest('.modal.show')) {
            backdrop.remove();
          }
        });

        // Asegurar que body no tenga clases de modal
        document.body.classList.remove('modal-open');
        document.body.style.overflow = '';
        document.body.style.paddingRight = '';
      }, 300); // Esperar que termine la animación
    }
  } catch (error) {
    console.error(`Error al cerrar modal ${modalId}:`, error);
    
    // Cleanup de emergencia
    if (forceCleanup) {
      const backdrops = document.querySelectorAll('.modal-backdrop');
      backdrops.forEach(backdrop => backdrop.remove());
      document.body.classList.remove('modal-open');
      document.body.style.overflow = '';
      document.body.style.paddingRight = '';
    }
  }
}

/**
 * Abre un modal de manera segura, cerrando otros modales si es necesario
 * @param {string} modalId - ID del modal a abrir
 * @param {boolean} closeOthers - Si debe cerrar otros modales abiertos
 */
function abrirModalSeguro(modalId, closeOthers = true) {
  try {
    if (closeOthers) {
      // Cerrar todos los modales abiertos
      const modalesAbiertos = document.querySelectorAll('.modal.show');
      modalesAbiertos.forEach(modal => {
        const modalInstance = bootstrap.Modal.getInstance(modal);
        if (modalInstance) {
          modalInstance.hide();
        }
      });
    }

    // Pequeña pausa para permitir que se cierren los modales anteriores
    setTimeout(() => {
      const modalElement = document.getElementById(modalId);
      if (modalElement) {
        const modalInstance = new bootstrap.Modal(modalElement);
        modalInstance.show();
      }
    }, closeOthers ? 300 : 0);
    
  } catch (error) {
    console.error(`Error al abrir modal ${modalId}:`, error);
  }
}