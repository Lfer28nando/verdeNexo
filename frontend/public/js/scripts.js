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

    // Actualizar rol y funcionalidades según el tipo de usuario
    updateUserRoleDisplay(usuario.rol);
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