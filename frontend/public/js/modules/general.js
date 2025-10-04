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

// ============= CONFIGURACIÓN DE FORMULARIOS DUPLICADA - COMENTADA =============
// NOTA: Esta función se eliminó porque está duplicada en scripts.js
// y causaba que se ejecutaran dos handlers para el mismo formulario

/*
function setupEditProfileFormHandler() {
  // Esta función está comentada porque existe una implementación
  // idéntica en scripts.js que ya maneja el formulario de editar perfil
}
*/

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