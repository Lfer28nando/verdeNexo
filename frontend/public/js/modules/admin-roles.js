// ============= MÓDULO DE GESTIÓN DE ROLES PARA ADMIN =============

// Variables globales del módulo
let usuariosData = [];
let paginaActual = 1;
let totalPaginas = 1;
let filtroActual = {
  rol: '',
  busqueda: '',
  limite: 10
};

// Usuario seleccionado para cambio de rol
let usuarioSeleccionado = null;

// ============= FUNCIONES DE CARGA Y FILTRADO =============

// Cargar usuarios con filtros y paginación
async function cargarUsuarios(pagina = 1) {
  const loadingElement = document.getElementById('loadingUsuarios');
  const tablaBody = document.getElementById('tablaUsuarios');
  
  try {
    // Mostrar loading
    if (loadingElement) loadingElement.style.display = 'block';
    if (tablaBody) tablaBody.innerHTML = '';

    // Construir parámetros de la consulta
    const params = new URLSearchParams({
      page: pagina,
      limit: filtroActual.limite
    });

    if (filtroActual.rol) params.append('rol', filtroActual.rol);
    if (filtroActual.busqueda) params.append('q', filtroActual.busqueda);

    // Realizar petición al backend
    const response = await apiService.get(`/api/auth/admin/users?${params.toString()}`);
    
    usuariosData = response.docs || [];
    paginaActual = response.page || 1;
    totalPaginas = response.pages || 1;

    // Renderizar usuarios
    renderizarUsuarios();
    renderizarPaginacion();

  } catch (error) {
    console.error('Error al cargar usuarios:', error);
    mostrarAlerta('Error al cargar los usuarios: ' + error.message, 'error');
    
    if (tablaBody) {
      tablaBody.innerHTML = `
        <tr>
          <td colspan="6" class="text-center text-muted py-4">
            <i class="fas fa-exclamation-triangle me-2"></i>
            Error al cargar usuarios
          </td>
        </tr>
      `;
    }
  } finally {
    // Ocultar loading
    if (loadingElement) loadingElement.style.display = 'none';
  }
}

// Aplicar filtros
function aplicarFiltros() {
  const filtroRol = document.getElementById('filtroRol');
  const buscarUsuario = document.getElementById('buscarUsuario');

  filtroActual.rol = filtroRol ? filtroRol.value : '';
  filtroActual.busqueda = buscarUsuario ? buscarUsuario.value.trim() : '';

  // Resetear a la primera página cuando se aplican filtros
  cargarUsuarios(1);
}

// Limpiar filtros
function limpiarFiltros() {
  const filtroRol = document.getElementById('filtroRol');
  const buscarUsuario = document.getElementById('buscarUsuario');

  if (filtroRol) filtroRol.value = '';
  if (buscarUsuario) buscarUsuario.value = '';

  filtroActual = {
    rol: '',
    busqueda: '',
    limite: 10
  };

  cargarUsuarios(1);
}

// ============= FUNCIONES DE RENDERIZADO =============

// Renderizar lista de usuarios en la tabla
function renderizarUsuarios() {
  const tablaBody = document.getElementById('tablaUsuarios');
  if (!tablaBody) return;

  if (usuariosData.length === 0) {
    tablaBody.innerHTML = `
      <tr>
        <td colspan="6" class="text-center text-muted py-4">
          <i class="fas fa-users me-2"></i>
          No se encontraron usuarios
        </td>
      </tr>
    `;
    return;
  }

  tablaBody.innerHTML = usuariosData.map(usuario => {
    const fechaRegistro = new Date(usuario.createdAt).toLocaleDateString('es-ES');
    const rolBadge = obtenerBadgeRol(usuario.rol);
    const estadoBadge = usuario.activo ? 
      '<span class="badge bg-success">Activo</span>' : 
      '<span class="badge bg-danger">Inactivo</span>';

    return `
      <tr>
        <td>
          <div class="d-flex align-items-center">
            <div class="user-avatar me-2">
              <i class="fas fa-user-circle fa-2x text-muted"></i>
            </div>
            <div>
              <div class="fw-bold">${usuario.nombre}</div>
              <small class="text-muted">ID: ${usuario._id}</small>
            </div>
          </div>
        </td>
        <td>
          <div>${usuario.email}</div>
          ${usuario.emailVerificado ? 
            '<small class="text-success"><i class="fas fa-check-circle me-1"></i>Verificado</small>' :
            '<small class="text-warning"><i class="fas fa-exclamation-circle me-1"></i>Sin verificar</small>'
          }
        </td>
        <td>${rolBadge}</td>
        <td>${estadoBadge}</td>
        <td>${fechaRegistro}</td>
        <td>
          <div class="btn-group" role="group">
            <button type="button" class="btn btn-sm btn-outline-primary dropdown-toggle" 
                    data-bs-toggle="dropdown" aria-expanded="false">
              <i class="fas fa-user-cog me-1"></i>
              Cambiar rol
            </button>
            <ul class="dropdown-menu">
              ${usuario.rol !== 'cliente' ? 
                `<li><a class="dropdown-item" href="#" onclick="window.adminRoles.prepararCambioRol('${usuario._id}', 'cliente')">
                  <i class="fas fa-user me-2"></i>Cliente
                </a></li>` : ''
              }
              ${usuario.rol !== 'vendedor' ? 
                `<li><a class="dropdown-item" href="#" onclick="window.adminRoles.prepararCambioRol('${usuario._id}', 'vendedor')">
                  <i class="fas fa-store me-2"></i>Vendedor
                </a></li>` : ''
              }
              ${usuario.rol !== 'admin' ? 
                `<li><a class="dropdown-item text-danger" href="#" onclick="window.adminRoles.prepararCambioRol('${usuario._id}', 'admin')">
                  <i class="fas fa-crown me-2"></i>Administrador
                </a></li>` : ''
              }
            </ul>
          </div>
        </td>
      </tr>
    `;
  }).join('');
}

// Renderizar paginación
function renderizarPaginacion() {
  const paginacionContainer = document.getElementById('paginacionUsuarios');
  if (!paginacionContainer) return;

  if (totalPaginas <= 1) {
    paginacionContainer.innerHTML = '';
    return;
  }

  let paginacionHTML = '';

  // Botón anterior
  paginacionHTML += `
    <li class="page-item ${paginaActual === 1 ? 'disabled' : ''}">
      <a class="page-link" href="#" onclick="window.adminRoles.cargarUsuarios(${paginaActual - 1})" 
         ${paginaActual === 1 ? 'tabindex="-1"' : ''}>
        <i class="fas fa-chevron-left"></i>
      </a>
    </li>
  `;

  // Páginas numéricas (simplificado para mostrar máximo 5 páginas)
  const inicio = Math.max(1, paginaActual - 2);
  const fin = Math.min(totalPaginas, inicio + 4);

  for (let i = inicio; i <= fin; i++) {
    paginacionHTML += `
      <li class="page-item ${i === paginaActual ? 'active' : ''}">
        <a class="page-link" href="#" onclick="window.adminRoles.cargarUsuarios(${i})">${i}</a>
      </li>
    `;
  }

  // Botón siguiente
  paginacionHTML += `
    <li class="page-item ${paginaActual === totalPaginas ? 'disabled' : ''}">
      <a class="page-link" href="#" onclick="window.adminRoles.cargarUsuarios(${paginaActual + 1})"
         ${paginaActual === totalPaginas ? 'tabindex="-1"' : ''}>
        <i class="fas fa-chevron-right"></i>
      </a>
    </li>
  `;

  paginacionContainer.innerHTML = paginacionHTML;
}

// ============= FUNCIONES DE CAMBIO DE ROL =============

// Preparar modal de cambio de rol
function prepararCambioRol(usuarioId, nuevoRol) {
  usuarioSeleccionado = usuariosData.find(u => u._id === usuarioId);
  
  if (!usuarioSeleccionado) {
    mostrarAlerta('Usuario no encontrado', 'error');
    return;
  }

  // Llenar información del modal
  document.getElementById('usuarioNombreCambio').textContent = usuarioSeleccionado.nombre;
  document.getElementById('usuarioEmailCambio').textContent = usuarioSeleccionado.email;
  document.getElementById('usuarioIdCambio').textContent = usuarioSeleccionado._id;
  
  const rolActualElement = document.getElementById('rolActualCambio');
  const rolNuevoElement = document.getElementById('rolNuevoCambio');
  
  rolActualElement.textContent = capitalizar(usuarioSeleccionado.rol);
  rolActualElement.className = `badge ${obtenerClaseRol(usuarioSeleccionado.rol)}`;
  
  rolNuevoElement.textContent = capitalizar(nuevoRol);
  rolNuevoElement.className = `badge ${obtenerClaseRol(nuevoRol)}`;

  // Mostrar permisos del nuevo rol
  mostrarPermisosRol(nuevoRol);

  // Mostrar confirmación adicional si es admin
  const confirmacionAdmin = document.getElementById('confirmacionAdmin');
  if (nuevoRol === 'admin') {
    confirmacionAdmin.style.display = 'block';
  } else {
    confirmacionAdmin.style.display = 'none';
  }

  // Limpiar formulario
  limpiarFormularioCambioRol();

  // Configurar botón de confirmación
  const btnConfirmar = document.getElementById('btnConfirmarCambio');
  btnConfirmar.onclick = () => confirmarCambioRol(usuarioId, nuevoRol);

  // Abrir modal
  const modal = new bootstrap.Modal(document.getElementById('modalCambioRol'));
  modal.show();
}

// Limpiar formulario de cambio de rol
function limpiarFormularioCambioRol() {
  document.getElementById('motivoCambio').value = '';
  document.getElementById('passwordAdmin').value = '';
  document.getElementById('confirmarCambio').checked = false;
  document.getElementById('confirmarAdmin').checked = false;
  
  // Limpiar validaciones
  document.querySelectorAll('#formCambioRol .is-invalid').forEach(el => el.classList.remove('is-invalid'));
  document.querySelectorAll('#formCambioRol .is-valid').forEach(el => el.classList.remove('is-valid'));
}

// Mostrar permisos del rol
function mostrarPermisosRol(rol) {
  const permisosContainer = document.getElementById('permisosNuevoRol');
  
  const permisos = {
    cliente: [
      'Ver productos',
      'Realizar compras',
      'Gestionar perfil personal',
      'Ver historial de pedidos'
    ],
    vendedor: [
      'Todos los permisos de cliente',
      'Gestionar productos',
      'Ver reportes de ventas',
      'Gestionar inventario'
    ],
    admin: [
      'Todos los permisos de vendedor',
      'Gestionar usuarios y roles',
      'Acceso al panel administrativo',
      'Configuración del sistema'
    ]
  };

  const permisosRol = permisos[rol] || [];
  
  permisosContainer.innerHTML = permisosRol.map(permiso => 
    `<li class="text-muted">${permiso}</li>`
  ).join('');
}

// Confirmar cambio de rol
async function confirmarCambioRol(usuarioId, nuevoRol) {
  const btnConfirmar = document.getElementById('btnConfirmarCambio');
  const btnText = btnConfirmar.querySelector('.btn-text');
  const btnLoading = btnConfirmar.querySelector('.btn-loading');

  // Validar formulario
  if (!validarFormularioCambioRol(nuevoRol)) {
    return;
  }

  const motivo = document.getElementById('motivoCambio').value.trim();
  const passwordAdmin = document.getElementById('passwordAdmin').value;

  try {
    // Mostrar estado de carga
    btnConfirmar.disabled = true;
    btnText.style.display = 'none';
    btnLoading.style.display = 'inline-flex';

    console.log('[DEBUG] Enviando datos de cambio de rol:');
    console.log('- Usuario ID:', usuarioId);
    console.log('- Nuevo rol:', nuevoRol);
    console.log('- Motivo:', motivo);
    console.log('- Usuario seleccionado:', usuarioSeleccionado);

    const datosEnvio = {
      rol: nuevoRol,
      motivo: motivo,
      passwordAdmin: passwordAdmin,
      adminId: JSON.parse(localStorage.getItem('usuario'))._id,
      adminNombre: JSON.parse(localStorage.getItem('usuario')).nombre
    };

    console.log('[DEBUG] Datos a enviar:', datosEnvio);

    // Realizar cambio de rol con datos de autorización
    const response = await apiService.patch(`/api/auth/admin/users/${usuarioId}/rol`, datosEnvio);

    console.log('[DEBUG] Respuesta recibida:', response);

    // Mostrar notificación de éxito profesional
    mostrarNotificacionExito(usuarioSeleccionado, nuevoRol, response.auditoria);

    // Cerrar modal
    const modal = bootstrap.Modal.getInstance(document.getElementById('modalCambioRol'));
    modal.hide();

    // Recargar usuarios
    cargarUsuarios(paginaActual);

    // Log de auditoría local (opcional para debugging)
    console.log(`[AUDIT] Rol cambiado: Usuario ${usuarioSeleccionado.nombre} (${usuarioId}) de ${usuarioSeleccionado.rol} a ${nuevoRol}. Motivo: ${motivo}`);

  } catch (error) {
    console.error('Error al cambiar rol:', error);
    
    // Manejar errores específicos
    if (error.message.includes('Contraseña incorrecta')) {
      document.getElementById('passwordAdmin').classList.add('is-invalid');
      mostrarAlerta('Contraseña de administrador incorrecta', 'error');
    } else if (error.message.includes('No puedes cambiar tu propio rol')) {
      mostrarAlerta('No puedes cambiar tu propio rol por seguridad', 'error');
    } else {
      mostrarAlerta('Error al cambiar el rol: ' + error.message, 'error');
    }
  } finally {
    // Restaurar estado del botón
    btnConfirmar.disabled = false;
    btnText.style.display = 'inline';
    btnLoading.style.display = 'none';
  }
}

// Validar formulario de cambio de rol
function validarFormularioCambioRol(nuevoRol) {
  let esValido = true;
  
  // Limpiar validaciones anteriores
  document.querySelectorAll('#formCambioRol .is-invalid').forEach(el => el.classList.remove('is-invalid'));
  
  // Validar motivo
  const motivo = document.getElementById('motivoCambio').value.trim();
  if (!motivo || motivo.length < 10) {
    document.getElementById('motivoCambio').classList.add('is-invalid');
    mostrarAlerta('El motivo debe tener al menos 10 caracteres', 'error');
    esValido = false;
  } else {
    document.getElementById('motivoCambio').classList.add('is-valid');
  }

  // Validar contraseña del admin
  const passwordAdmin = document.getElementById('passwordAdmin').value;
  if (!passwordAdmin || passwordAdmin.length < 6) {
    document.getElementById('passwordAdmin').classList.add('is-invalid');
    mostrarAlerta('Debes ingresar tu contraseña de administrador', 'error');
    esValido = false;
  } else {
    document.getElementById('passwordAdmin').classList.add('is-valid');
  }

  // Validar confirmación general
  if (!document.getElementById('confirmarCambio').checked) {
    mostrarAlerta('Debes confirmar que has verificado toda la información', 'error');
    esValido = false;
  }

  // Validar confirmación adicional para admin
  if (nuevoRol === 'admin' && !document.getElementById('confirmarAdmin').checked) {
    mostrarAlerta('Debes confirmar que entiendes los permisos de administrador', 'error');
    esValido = false;
  }

  return esValido;
}

// ============= FUNCIONES AUXILIARES =============

// Obtener badge HTML para rol
function obtenerBadgeRol(rol) {
  const clases = {
    cliente: 'bg-primary',
    vendedor: 'bg-warning text-dark',
    admin: 'bg-danger'
  };
  
  return `<span class="badge ${clases[rol] || 'bg-secondary'}">${capitalizar(rol)}</span>`;
}

// Obtener clase CSS para rol
function obtenerClaseRol(rol) {
  const clases = {
    cliente: 'bg-primary',
    vendedor: 'bg-warning text-dark',
    admin: 'bg-danger'
  };
  
  return clases[rol] || 'bg-secondary';
}

// Capitalizar primera letra
function capitalizar(texto) {
  if (!texto) return '';
  return texto.charAt(0).toUpperCase() + texto.slice(1).toLowerCase();
}

// Función para mostrar notificación de éxito profesional
function mostrarNotificacionExito(usuario, nuevoRol, auditoria) {
  const alertDiv = document.createElement('div');
  alertDiv.className = 'alert alert-success alert-dismissible fade show position-fixed shadow-lg';
  alertDiv.style.cssText = `
    top: 20px; 
    right: 20px; 
    z-index: 9999; 
    max-width: 450px;
    border-left: 4px solid #198754;
    background: linear-gradient(135deg, #d4edda 0%, #c3e6cb 100%);
  `;
  
  alertDiv.innerHTML = `
    <div class="d-flex align-items-start">
      <div class="me-3">
        <i class="fas fa-shield-check fa-2x text-success"></i>
      </div>
      <div class="flex-grow-1">
        <h6 class="alert-heading mb-2">
          <i class="fas fa-check-circle me-1"></i>
          Cambio de Rol Autorizado
        </h6>
        <p class="mb-2">
          <strong>${usuario.nombre}</strong> ahora tiene el rol de 
          <span class="badge ${obtenerClaseRol(nuevoRol)}">${capitalizar(nuevoRol)}</span>
        </p>
        <small class="text-muted">
          <i class="fas fa-clock me-1"></i>
          Registrado en auditoría: ${new Date(auditoria.timestamp).toLocaleString('es-ES')}
        </small>
      </div>
    </div>
    <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Cerrar"></button>
  `;
  
  document.body.appendChild(alertDiv);
  
  // Auto-remove después de 8 segundos (más tiempo para leer)
  setTimeout(() => {
    if (alertDiv.parentNode) {
      alertDiv.remove();
    }
  }, 8000);
}

// Función para mostrar alertas (reutiliza la existente)
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

// ============= INICIALIZACIÓN DEL MÓDULO =============

// Inicializar gestión de roles cuando se carga la página de admin
function initAdminRoles() {
  // Solo inicializar en la página de admin
  if (window.location.pathname === '/admin') {
    // Cargar usuarios automáticamente
    cargarUsuarios(1);
    
    // Configurar eventos de filtros con debounce para búsqueda
    let timeoutBusqueda;
    const buscarUsuario = document.getElementById('buscarUsuario');
    if (buscarUsuario) {
      buscarUsuario.addEventListener('keyup', () => {
        clearTimeout(timeoutBusqueda);
        timeoutBusqueda = setTimeout(() => window.adminRoles.aplicarFiltros(), 500); // 500ms de delay
      });
    }

    // Configurar validaciones en tiempo real para el formulario de cambio de rol
    setupFormValidation();
  }
}

// Configurar validaciones en tiempo real
function setupFormValidation() {
  // Validación del motivo en tiempo real
  const motivoCambio = document.getElementById('motivoCambio');
  if (motivoCambio) {
    motivoCambio.addEventListener('input', function() {
      const valor = this.value.trim();
      this.classList.remove('is-valid', 'is-invalid');
      
      if (valor.length >= 10) {
        this.classList.add('is-valid');
      } else if (valor.length > 0) {
        this.classList.add('is-invalid');
      }
    });
  }

  // Validación de contraseña en tiempo real
  const passwordAdmin = document.getElementById('passwordAdmin');
  if (passwordAdmin) {
    passwordAdmin.addEventListener('input', function() {
      const valor = this.value;
      this.classList.remove('is-valid', 'is-invalid');
      
      if (valor.length >= 6) {
        this.classList.add('is-valid');
      } else if (valor.length > 0) {
        this.classList.add('is-invalid');
      }
    });
  }

  // Manejar cambios en los checkboxes
  const confirmarCambio = document.getElementById('confirmarCambio');
  const confirmarAdmin = document.getElementById('confirmarAdmin');
  
  if (confirmarCambio) {
    confirmarCambio.addEventListener('change', function() {
      validarEstadoBotones();
    });
  }
  
  if (confirmarAdmin) {
    confirmarAdmin.addEventListener('change', function() {
      validarEstadoBotones();
    });
  }
}

// Validar estado de botones según las condiciones
function validarEstadoBotones() {
  const btnConfirmar = document.getElementById('btnConfirmarCambio');
  const motivoCambio = document.getElementById('motivoCambio');
  const passwordAdmin = document.getElementById('passwordAdmin');
  const confirmarCambio = document.getElementById('confirmarCambio');
  const confirmarAdmin = document.getElementById('confirmarAdmin');
  const confirmacionAdmin = document.getElementById('confirmacionAdmin');
  
  if (!btnConfirmar) return;

  let puedeConfirmar = true;

  // Validar campos básicos
  if (!motivoCambio.value.trim() || motivoCambio.value.trim().length < 10) {
    puedeConfirmar = false;
  }
  
  if (!passwordAdmin.value || passwordAdmin.value.length < 6) {
    puedeConfirmar = false;
  }
  
  if (!confirmarCambio.checked) {
    puedeConfirmar = false;
  }

  // Si es cambio a admin, validar confirmación adicional
  if (confirmacionAdmin.style.display !== 'none' && !confirmarAdmin.checked) {
    puedeConfirmar = false;
  }

  btnConfirmar.disabled = !puedeConfirmar;
}

// Exportar funciones públicas
window.adminRoles = {
  cargarUsuarios,
  aplicarFiltros,
  limpiarFiltros,
  prepararCambioRol,
  confirmarCambioRol,
  initAdminRoles
};

// Auto-inicializar si estamos en la página de admin
document.addEventListener('DOMContentLoaded', initAdminRoles);