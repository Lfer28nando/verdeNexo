// ============= MÓDULO DE PRODUCTOS Y FUNCIONALIDADES GENERALES =============

// ============= FUNCIONES DE SLIDER CON ARRASTRE =============

function moverSlider(direccion) {
  const slider = document.getElementById("loomSlider");
  if (!slider) {
    console.error('Slider container not found');
    return;
  }
  
  const listaProductos = document.getElementById("lista-productos");
  if (!listaProductos) {
    console.error('Lista productos container not found');
    return;
  }
  
  const primerItem = listaProductos.querySelector(".loom-item");
  if (!primerItem) {
    console.error('No se encontraron items en el slider');
    return;
  }
  
  // Calcular dimensiones dinámicamente según el zoom
  const sliderWidth = slider.clientWidth; // Ancho visible del contenedor
  const itemWidth = primerItem.offsetWidth + 16; // ancho del item + gap
  
  // Calcular cuántos productos son completamente visibles
  const itemsVisibles = Math.floor(sliderWidth / itemWidth);
  
  // Si hay menos de 1 item visible, mover al menos 1
  const itemsAMover = Math.max(1, Math.floor(itemsVisibles * 0.8)); // Mover 80% de los visibles
  
  const scrollAmount = direccion * itemWidth * itemsAMover;
  
  console.log(`[Slider] Ancho contenedor: ${sliderWidth}px, Ancho item: ${itemWidth}px, Items visibles: ${itemsVisibles}, Items a mover: ${itemsAMover}`);
  
  // Usar smooth scroll para una transición suave
  slider.scrollBy({
    left: scrollAmount,
    behavior: 'smooth'
  });
}

// Exponer la función al scope global para que funcione con onclick
window.moverSlider = moverSlider;

// Función para implementar arrastre del carrusel
function initSliderDrag() {
  const slider = document.getElementById("loomSlider");
  if (!slider) return;

  let isDragging = false;
  let startX = 0;
  let scrollLeft = 0;
  let velocity = 0;
  let lastMoveTime = 0;
  let lastMoveX = 0;

  // Eventos para mouse (desktop)
  slider.addEventListener('mousedown', (e) => {
    isDragging = true;
    slider.style.cursor = 'grabbing';
    slider.style.userSelect = 'none';
    
    startX = e.pageX - slider.offsetLeft;
    scrollLeft = slider.scrollLeft;
    velocity = 0;
    lastMoveTime = Date.now();
    lastMoveX = e.pageX;
    
    console.log('[Drag] Inicio de arrastre con mouse');
  });

  slider.addEventListener('mouseleave', () => {
    if (isDragging) {
      isDragging = false;
      slider.style.cursor = 'grab';
      slider.style.userSelect = '';
      applyMomentum();
    }
  });

  slider.addEventListener('mouseup', () => {
    if (isDragging) {
      isDragging = false;
      slider.style.cursor = 'grab';
      slider.style.userSelect = '';
      applyMomentum();
      console.log('[Drag] Fin de arrastre con mouse');
    }
  });

  slider.addEventListener('mousemove', (e) => {
    if (!isDragging) return;
    
    e.preventDefault();
    const x = e.pageX - slider.offsetLeft;
    const walk = (x - startX) * 1.5; // Multiplicador para sensibilidad
    
    slider.scrollLeft = scrollLeft - walk;
    
    // Calcular velocidad para momentum
    const now = Date.now();
    const timeDiff = now - lastMoveTime;
    const distance = e.pageX - lastMoveX;
    
    if (timeDiff > 0) {
      velocity = distance / timeDiff;
    }
    
    lastMoveTime = now;
    lastMoveX = e.pageX;
  });

  // Eventos para touch (móviles y tablets)
  slider.addEventListener('touchstart', (e) => {
    isDragging = true;
    const touch = e.touches[0];
    
    startX = touch.pageX - slider.offsetLeft;
    scrollLeft = slider.scrollLeft;
    velocity = 0;
    lastMoveTime = Date.now();
    lastMoveX = touch.pageX;
    
    console.log('[Drag] Inicio de arrastre con touch');
  }, { passive: true });

  slider.addEventListener('touchend', () => {
    if (isDragging) {
      isDragging = false;
      applyMomentum();
      console.log('[Drag] Fin de arrastre con touch');
    }
  }, { passive: true });

  slider.addEventListener('touchmove', (e) => {
    if (!isDragging) return;
    
    const touch = e.touches[0];
    const x = touch.pageX - slider.offsetLeft;
    const walk = (x - startX) * 1.2; // Sensibilidad para touch
    
    slider.scrollLeft = scrollLeft - walk;
    
    // Calcular velocidad para momentum
    const now = Date.now();
    const timeDiff = now - lastMoveTime;
    const distance = touch.pageX - lastMoveX;
    
    if (timeDiff > 0) {
      velocity = distance / timeDiff;
    }
    
    lastMoveTime = now;
    lastMoveX = touch.pageX;
  }, { passive: true });

  // Aplicar momentum después del arrastre
  function applyMomentum() {
    if (Math.abs(velocity) > 0.1) {
      console.log('[Drag] Aplicando momentum, velocidad:', velocity);
      
      const momentum = velocity * 100; // Escalar la velocidad
      slider.scrollBy({
        left: -momentum,
        behavior: 'smooth'
      });
    }
  }

  // Estilo inicial del cursor
  slider.style.cursor = 'grab';
  slider.style.scrollBehavior = 'auto'; // Desactivar smooth scroll por defecto para el arrastre
  
  console.log('[Drag] Sistema de arrastre inicializado');
}

// Función para inicializar eventos del slider
function initSliderEvents() {
  // Verificar que la función esté disponible globalmente
  console.log('[Slider] moverSlider está disponible globalmente:', typeof window.moverSlider === 'function');
  
  // Inicializar sistema de arrastre
  initSliderDrag();
  
  // Recalcular cuando cambie el tamaño de la ventana o zoom
  let resizeTimeout;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimeout);
    resizeTimeout = setTimeout(() => {
      console.log('[Slider] Ventana redimensionada, recalculando slider...');
      // Forzar recálculo del layout
      const slider = document.getElementById("loomSlider");
      if (slider) {
        slider.style.overflow = 'hidden';
        setTimeout(() => {
          slider.style.overflow = 'auto';
        }, 50);
      }
    }, 250);
  });
  
  // Agregar listeners a los botones como alternativa al onclick
  const botonIzq = document.querySelector('.slider-arrow.left');
  const botonDer = document.querySelector('.slider-arrow.right');
  
  if (botonIzq) {
    botonIzq.addEventListener('click', (e) => {
      e.preventDefault();
      console.log('[Slider] Botón izquierdo clickeado');
      window.moverSlider(-1);
    });
  }
  
  if (botonDer) {
    botonDer.addEventListener('click', (e) => {
      e.preventDefault();
      console.log('[Slider] Botón derecho clickeado');
      window.moverSlider(1);
    });
  }
  
  console.log('[Slider] Eventos inicializados. Botones encontrados:', {
    izquierdo: !!botonIzq,
    derecho: !!botonDer
  });
}

// Inicializar eventos cuando el DOM esté listo
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initSliderEvents);
} else {
  initSliderEvents();
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