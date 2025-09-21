// ============= MÓDULO DE PRODUCTOS Y FUNCIONALIDADES GENERALES =============

// ============= FUNCIONES DE SLIDER =============

function moverSlider(direccion) {
  const slider = document.getElementById("loomSlider");
  const itemWidth = slider.querySelector(".loom-item").offsetWidth + 16; // ancho + gap
  slider.scrollLeft += direccion * itemWidth * 1; // mover 1 ítems
}

// ============= FUNCIONES DE GESTIÓN DE FORMULARIOS =============

// Función principal para manejar formularios del administrador
function setupAdminForms() {
  const formularios = document.querySelectorAll("form:not(#loginForm):not(#registerForm):not(#editProfileForm):not(#formFoto):not(#forgotPasswordForm):not(#confirmResetForm):not(#formAgregarTarjeta):not(#formAgregarCuenta)");

  formularios.forEach(formulario => {
    formulario.addEventListener("submit", function (evento) {
      evento.preventDefault();

      const inputs = this.querySelectorAll("input, select");
      const valores = Array.from(inputs).map(input => input.value);

      if (generalElementoEditando) {
        for (let i = 1; i < valores.length + 1; i++) {
          generalElementoEditando.children[i].textContent = valores[i - 1];
        }
        generalElementoEditando = null;
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

  // Manejar clics en botones de tabla
  setupTableActions();
}

// Función para configurar acciones de tabla
function setupTableActions() {
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

        generalElementoEditando = fila;
      }

      if (boton.classList.contains("btn-danger")) {
        if (confirm("¿Deseas eliminar este registro?")) {
          fila.remove();
        }
      }
    });
  });
}

// ============= FUNCIONES DE UPLOAD DE FOTO =============

// Subir foto de perfil
function setupPhotoUpload() {
  const formFoto = document.getElementById('formFoto');
  if (formFoto) {
    formFoto.addEventListener('submit', async (e) => {
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
  }
}

// ============= FUNCIONES DE VALIDACIÓN DE PERFIL =============

// Configurar validaciones del perfil de edición
function setupEditProfileValidation() {
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

  // Validación de las contraseñas
  setupEditPasswordValidation();
}

// Configurar validaciones de contraseña en edición de perfil
function setupEditPasswordValidation() {
  const editCurrentPassword = document.getElementById('editCurrentPassword');
  const editPassword = document.getElementById('editPassword');
  const editConfirmPassword = document.getElementById('editConfirmPassword');
  
  if (editCurrentPassword) {
    editCurrentPassword.addEventListener('input', function() {
      const valor = this.value;
      const isValid = valor.length >= 6 || valor === '';
      
      this.classList.toggle('is-valid', isValid && valor.length > 0);
      this.classList.toggle('is-invalid', !isValid && valor.length > 0);
    });
  }
  
  if (editPassword) {
    editPassword.addEventListener('input', function() {
      const valor = this.value;
      const isValid = valor.length >= 6 && /\d/.test(valor) || valor === '';
      
      this.classList.toggle('is-valid', isValid && valor.length > 0);
      this.classList.toggle('is-invalid', !isValid && valor.length > 0);
      
      // Validar también la confirmación si ya tiene contenido
      if (editConfirmPassword && editConfirmPassword.value) {
        validateEditPasswordConfirmation();
      }
    });
  }

  if (editConfirmPassword) {
    editConfirmPassword.addEventListener('input', validateEditPasswordConfirmation);
  }

  function validateEditPasswordConfirmation() {
    const password = editPassword.value;
    const confirmPassword = editConfirmPassword.value;
    const isValid = password === confirmPassword;
    
    editConfirmPassword.classList.toggle('is-valid', isValid && confirmPassword.length > 0);
    editConfirmPassword.classList.toggle('is-invalid', !isValid && confirmPassword.length > 0);
  }
}

// ============= MANEJADOR DE FORMULARIO DE EDICIÓN DE PERFIL =============

// Configurar el manejador del formulario de edición de perfil
function setupEditProfileFormHandler() {
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
        
        // Solo incluir campos que no estén vacíos para actualización de perfil
        if (formData.get('nombre').trim()) updateData.nombre = formData.get('nombre').trim();
        if (formData.get('email').trim()) updateData.email = formData.get('email').trim();
        if (formData.get('telefono').trim()) updateData.telefono = formData.get('telefono').trim();
        if (formData.get('direccion').trim()) updateData.direccion = formData.get('direccion').trim();
        if (formData.get('documento').trim()) updateData.documento = formData.get('documento').trim();
        
        // Manejar cambio de contraseña por separado
        const currentPassword = document.getElementById('editCurrentPassword').value;
        const newPassword = document.getElementById('editPassword').value;
        const confirmPassword = document.getElementById('editConfirmPassword').value;
        
        let passwordChanged = false;
        
        // Si se quiere cambiar la contraseña, usar el endpoint específico
        if (currentPassword || newPassword || confirmPassword) {
          if (!currentPassword) {
            throw new Error('Debes ingresar tu contraseña actual para cambiarla');
          }
          if (!newPassword) {
            throw new Error('Debes ingresar la nueva contraseña');
          }
          if (newPassword !== confirmPassword) {
            throw new Error('Las contraseñas nuevas no coinciden');
          }
          
          // Cambiar contraseña usando endpoint específico
          await apiService.post('/api/auth/password/change', {
            actualPassword: currentPassword,
            nuevaPassword: newPassword,
            confirmarPassword: confirmPassword
          });
          
          passwordChanged = true;
        }
        
        let response = null;
        
        // Actualizar otros datos del perfil si hay cambios
        if (Object.keys(updateData).length > 0) {
          response = await apiService.put('/api/auth/me', updateData);
        }
        
        // Si se cambió la contraseña, manejar el cierre de sesión
        if (passwordChanged) {
          mostrarAlerta('Contraseña cambiada correctamente. Serás redirigido al login.', 'success');
          
          // Limpiar localStorage y redirigir después de 2 segundos
          setTimeout(() => {
            localStorage.removeItem('usuario');
            window.location.reload();
          }, 2000);
          
          return; // No continuar con la actualización de interfaz
        }
        
        // Si solo se actualizó el perfil (sin contraseña)
        if (response) {
          // Actualizar localStorage con los nuevos datos
          const usuarioActual = JSON.parse(localStorage.getItem('usuario') || '{}');
          const usuarioActualizado = { ...usuarioActual, ...response.usuario };
          localStorage.setItem('usuario', JSON.stringify(usuarioActualizado));
          
          // Actualizar interfaz
          updateUserInterface(usuarioActualizado);
          
          // Mostrar mensaje de éxito
          mostrarAlerta('Perfil actualizado correctamente', 'success');
        } else if (!passwordChanged) {
          throw new Error('No se realizaron cambios en el perfil');
        }
        
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
}

// ============= TOGGLE PARA CAMPOS DE CONTRASEÑA =============

// Configurar toggle para mostrar/ocultar campos de contraseña
function setupPasswordToggle() {
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
        document.getElementById('editCurrentPassword').value = '';
        document.getElementById('editPassword').value = '';
        document.getElementById('editConfirmPassword').value = '';
      }
    });
  }
}

// ============= VARIABLES GLOBALES =============

let generalElementoEditando = null;