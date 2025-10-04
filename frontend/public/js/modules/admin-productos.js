// ============= MÓDULO DE ADMINISTRACIÓN DE PRODUCTOS =============

console.log('[DEBUG] *** INICIO admin-productos.js ***');
console.log('[DEBUG] admin-productos.js cargándose...');

// Variables globales del módulo de productos
let productosData = [];
let paginaActualProductos = 1;
let totalPaginasProductos = 1;
let productoSeleccionado = null;
let filtroActualProductos = {
  categoria: '',
  disponibilidad: '',
  busqueda: '',
  limite: 10
};

console.log('[DEBUG] Variables globales inicializadas');

// ============= FUNCIONES DE CARGA Y FILTRADO =============

// Cargar productos con filtros y paginación
async function cargarProductos(pagina = 1) {
  console.log('[DEBUG] === CARGANDO PRODUCTOS - INICIO ===');
  console.log('[DEBUG] Página:', pagina);
  console.log('[DEBUG] apiService disponible:', typeof apiService);
  
  const loadingElement = document.getElementById('loadingProductos');
  const tablaBody = document.getElementById('tablaProductos');
  
  console.log('[DEBUG] loadingElement:', !!loadingElement);
  console.log('[DEBUG] tablaBody:', !!tablaBody);
  
  try {
    // Mostrar loading
    if (loadingElement) loadingElement.style.display = 'block';
    if (tablaBody) tablaBody.innerHTML = '';

    // Construir parámetros de la consulta
    const params = new URLSearchParams({
      page: pagina,
      limit: filtroActualProductos.limite
    });

    if (filtroActualProductos.categoria) params.append('categoria', filtroActualProductos.categoria);
    if (filtroActualProductos.disponibilidad) params.append('disponible', filtroActualProductos.disponibilidad);
    if (filtroActualProductos.busqueda) params.append('q', filtroActualProductos.busqueda);

    const url = `/api/productos?${params.toString()}`;
    console.log('[DEBUG] URL de petición:', url);

    // Realizar petición al backend
    const response = await apiService.get(url);
    console.log('[DEBUG] Respuesta completa:', response);
    
    // El backend retorna {ok: true, data: productos}, necesitamos acceder a data
    productosData = response.data || [];
    console.log('[DEBUG] Productos obtenidos:', productosData.length);
    
    // Para paginación, verificar si hay información de paginación
    if (response.pagination) {
      paginaActualProductos = response.pagination.page || 1;
      totalPaginasProductos = response.pagination.pages || 1;
      console.log('[DEBUG] Paginación:', response.pagination);
    } else {
      paginaActualProductos = 1;
      totalPaginasProductos = 1;
    }

    // Renderizar productos
    console.log('[DEBUG] Llamando a renderizarProductos...');
    renderizarProductos();
    renderizarPaginacion();
    console.log('[DEBUG] === CARGANDO PRODUCTOS - FIN EXITOSO ===');

  } catch (error) {
    console.error('[ERROR] Error al cargar productos:', error);
    const errorMessage = window.extractErrorMessage ? window.extractErrorMessage(error, 'Error al cargar los productos') : 'Error al cargar los productos';
    mostrarAlerta('Error al cargar los productos: ' + errorMessage, 'error');
    
    if (tablaBody) {
      tablaBody.innerHTML = `
        <tr>
          <td colspan="7" class="text-center text-muted py-4">
            <i class="fas fa-exclamation-triangle me-2"></i>
            Error al cargar productos
          </td>
        </tr>
      `;
    }
  } finally {
    // Ocultar loading
    if (loadingElement) loadingElement.style.display = 'none';
    console.log('[DEBUG] Loading ocultado');
  }
}

// Aplicar filtros
function aplicarFiltros() {
  const filtroCategoria = document.getElementById('filtroCategoria');
  const filtroDisponibilidad = document.getElementById('filtroDisponibilidad');
  const buscarProducto = document.getElementById('buscarProducto');

  filtroActualProductos.categoria = filtroCategoria ? filtroCategoria.value : '';
  filtroActualProductos.disponibilidad = filtroDisponibilidad ? filtroDisponibilidad.value : '';
  filtroActualProductos.busqueda = buscarProducto ? buscarProducto.value.trim() : '';

  // Resetear a la primera página cuando se aplican filtros
  cargarProductos(1);
}

// Limpiar filtros
function limpiarFiltros() {
  const filtroCategoria = document.getElementById('filtroCategoria');
  const filtroDisponibilidad = document.getElementById('filtroDisponibilidad');
  const buscarProducto = document.getElementById('buscarProducto');

  if (filtroCategoria) filtroCategoria.value = '';
  if (filtroDisponibilidad) filtroDisponibilidad.value = '';
  if (buscarProducto) buscarProducto.value = '';

  filtroActualProductos = {
    categoria: '',
    disponibilidad: '',
    busqueda: '',
    limite: 10
  };

  cargarProductos(1);
}

// ============= FUNCIONES DE RENDERIZADO =============

// Renderizar lista de productos en la tabla
function renderizarProductos() {
  const tablaBody = document.getElementById('tablaProductos');
  if (!tablaBody) return;

  if (productosData.length === 0) {
    tablaBody.innerHTML = `
      <tr>
        <td colspan="7" class="text-center text-muted py-4">
          <i class="fas fa-box me-2"></i>
          No se encontraron productos
        </td>
      </tr>
    `;
    return;
  }

  tablaBody.innerHTML = productosData.map(producto => {
    const fechaCreacion = new Date(producto.createdAt || producto.creadoEn).toLocaleDateString('es-ES');
    const estadoBadge = producto.disponibilidad ? 
      '<span class="badge bg-success">Disponible</span>' : 
      '<span class="badge bg-danger">No disponible</span>';
    
    const imagenSrc = producto.imagenes && producto.imagenes.length > 0 
      ? `${CONFIG.API_BASE_URL}/uploads/${producto.imagenes[0]}`
      : '/img/logo.png';

    return `
      <tr>
        <td>
          <img src="${imagenSrc}" alt="${producto.nombre}" 
               style="width: 50px; height: 50px; object-fit: cover; border-radius: 8px;"
               onerror="this.src='/img/logo.png'">
        </td>
        <td>
          <div>
            <div class="fw-bold">${producto.nombre}</div>
            <small class="text-muted">${producto.descripcion || 'Sin descripción'}</small>
          </div>
        </td>
        <td>
          <span class="badge bg-info">${producto.categoria || 'Sin categoría'}</span>
        </td>
        <td>
          <strong>$${producto.precioBase ? producto.precioBase.toFixed(2) : '0.00'}</strong>
        </td>
        <td>
          <span class="badge ${(producto.stock || 0) > 10 ? 'bg-success' : (producto.stock || 0) > 0 ? 'bg-warning' : 'bg-danger'}">
            ${producto.stock || 0}
          </span>
        </td>
        <td>${estadoBadge}</td>
        <td>
          <div class="btn-group" role="group">
            <button class="btn btn-sm btn-outline-primary" onclick="window.adminProductos.editarProducto('${producto._id}')" title="Editar">
              <i class="fas fa-edit"></i>
            </button>
            <button class="btn btn-sm btn-outline-info" onclick="window.adminProductos.verDetalles('${producto._id}')" title="Ver detalles">
              <i class="fas fa-eye"></i>
            </button>
            <button class="btn btn-sm btn-outline-danger" onclick="window.adminProductos.eliminarProducto('${producto._id}')" title="Eliminar">
              <i class="fas fa-trash"></i>
            </button>
          </div>
        </td>
      </tr>
    `;
  }).join('');
}

// Renderizar paginación
function renderizarPaginacion() {
  const contenedor = document.getElementById('paginacionProductos');
  if (!contenedor || totalPaginasProductos <= 1) {
    if (contenedor) contenedor.innerHTML = '';
    return;
  }

  let html = '';

  // Botón anterior
  if (paginaActualProductos > 1) {
    html += `
      <li class="page-item">
        <a class="page-link" href="#" onclick="window.adminProductos.cargarProductos(${paginaActualProductos - 1})" 
           aria-label="Anterior">
          <span aria-hidden="true">&laquo;</span>
        </a>
      </li>
    `;
  }

  // Números de página
  for (let i = 1; i <= totalPaginasProductos; i++) {
    if (i === paginaActualProductos) {
      html += `<li class="page-item active"><span class="page-link">${i}</span></li>`;
    } else {
      html += `
        <li class="page-item">
          <a class="page-link" href="#" onclick="window.adminProductos.cargarProductos(${i})">${i}</a>
        </li>
      `;
    }
  }

  // Botón siguiente
  if (paginaActualProductos < totalPaginasProductos) {
    html += `
      <li class="page-item">
        <a class="page-link" href="#" onclick="window.adminProductos.cargarProductos(${paginaActualProductos + 1})"
           aria-label="Siguiente">
          <span aria-hidden="true">&raquo;</span>
        </a>
      </li>
    `;
  }

  contenedor.innerHTML = html;
}

// ============= FUNCIONES DE GESTIÓN DE PRODUCTOS =============

// Abrir modal para crear producto
function abrirModalCrear() {
  console.log('[DEBUG] abrirModalCrear ejecutándose...');
  console.log('[DEBUG] Bootstrap disponible:', typeof bootstrap !== 'undefined');
  
  const modalElement = document.getElementById('modalProducto');
  console.log('[DEBUG] Modal element encontrado:', !!modalElement);
  
  if (!modalElement) {
    console.error('[ERROR] No se encontró el elemento modalProducto');
    alert('Error: No se encontró el modal de producto');
    return;
  }
  
  if (typeof bootstrap === 'undefined') {
    console.error('[ERROR] Bootstrap no está disponible');
    alert('Error: Bootstrap no está cargado');
    return;
  }
  
  const modal = new bootstrap.Modal(modalElement);
  const titulo = document.getElementById('tituloModalProducto');
  const form = document.getElementById('formProducto');
  const textoBoton = document.getElementById('textoBotonGuardar');

  console.log('[DEBUG] Elementos encontrados:', {
    modal: !!modal,
    titulo: !!titulo,
    form: !!form,
    textoBoton: !!textoBoton
  });

  // Resetear formulario
  form.reset();
  document.getElementById('productoId').value = '';
  document.getElementById('disponibilidadProducto').checked = true;
  
  // Limpiar preview de imagen
  const preview = document.getElementById('previewImagen');
  preview.innerHTML = `
    <i class="fas fa-image fa-3x text-muted mb-2"></i>
    <p class="text-muted mb-0">Haz clic para seleccionar imagen</p>
  `;

  // Configurar modal para creación
  titulo.textContent = 'Nuevo Producto';
  textoBoton.textContent = 'Crear Producto';

  modal.show();
}

// Editar producto
async function editarProducto(productoId) {
  try {
    const response = await apiService.get(`/api/productos/${productoId}`);
    const producto = response.data || response;

    const modal = new bootstrap.Modal(document.getElementById('modalProducto'));
    const titulo = document.getElementById('tituloModalProducto');
    const textoBoton = document.getElementById('textoBotonGuardar');

    // Llenar formulario con datos del producto
    document.getElementById('productoId').value = producto._id;
    document.getElementById('nombreProducto').value = producto.nombre || '';
    document.getElementById('descripcionProducto').value = producto.descripcion || '';
    document.getElementById('categoriaProducto').value = producto.categoria || '';
    document.getElementById('precioProducto').value = producto.precioBase || '';
    document.getElementById('stockProducto').value = producto.stock || 0;
    document.getElementById('disponibilidadProducto').checked = producto.disponibilidad !== false;
    document.getElementById('etiquetasProducto').value = producto.etiquetas ? producto.etiquetas.join(', ') : '';

    // Mostrar imagen si existe
    if (producto.imagenes && producto.imagenes.length > 0) {
      const preview = document.getElementById('previewImagen');
      preview.innerHTML = `
        <img src="${CONFIG.API_BASE_URL}/uploads/${producto.imagenes[0]}" 
             style="width: 100%; height: 150px; object-fit: cover; border-radius: 8px;"
             onerror="this.src='/img/logo.png'">
      `;
    }

    // Configurar modal para edición
    titulo.textContent = 'Editar Producto';
    textoBoton.textContent = 'Actualizar Producto';

    modal.show();
  } catch (error) {
    console.error('Error al cargar producto:', error);
    const errorMessage = window.extractErrorMessage ? window.extractErrorMessage(error, 'Error al cargar el producto') : 'Error al cargar el producto';
    mostrarAlerta('Error al cargar el producto: ' + errorMessage, 'error');
  }
}

// Guardar producto (crear o actualizar)
async function guardarProducto() {
  const btn = document.querySelector('#modalProducto .btn-primary');
  const btnText = btn.querySelector('.btn-text');
  const btnLoading = btn.querySelector('.btn-loading');

  try {
    // Validar formulario
    const form = document.getElementById('formProducto');
    if (!form.checkValidity()) {
      form.reportValidity();
      return;
    }

    // Mostrar loading
    btn.disabled = true;
    btnText.style.display = 'none';
    btnLoading.style.display = 'inline-flex';

    // Recopilar datos del formulario
    const productoId = document.getElementById('productoId').value;
    const datos = {
      nombre: document.getElementById('nombreProducto').value.trim(),
      descripcion: document.getElementById('descripcionProducto').value.trim(),
      categoria: document.getElementById('categoriaProducto').value,
      precioBase: parseFloat(document.getElementById('precioProducto').value),
      stock: parseInt(document.getElementById('stockProducto').value) || 0,
      disponibilidad: document.getElementById('disponibilidadProducto').checked,
      etiquetas: document.getElementById('etiquetasProducto').value.split(',').map(tag => tag.trim()).filter(tag => tag)
    };

    console.log('[DEBUG] Datos a enviar:', datos);

    let response;
    if (productoId) {
      // Actualizar producto existente
      console.log('[DEBUG] Actualizando producto:', productoId);
      response = await apiService.put(`/api/productos/${productoId}`, datos);
    } else {
      // Crear nuevo producto
      console.log('[DEBUG] Creando nuevo producto');
      response = await apiService.post('/api/productos', datos);
    }

    console.log('[DEBUG] Respuesta del servidor:', response);

    // Manejar imagen si se seleccionó una
    const imagenFile = document.getElementById('imagenProducto').files[0];
    if (imagenFile) {
      const formData = new FormData();
      formData.append('imagen', imagenFile);
      
      const productoCreado = response.data || response;
      const idProducto = productoId || productoCreado._id;
      
      await apiService.postFile(`/api/productos/${idProducto}/imagenes`, formData);
    }

    // Cerrar modal y recargar lista
    const modal = bootstrap.Modal.getInstance(document.getElementById('modalProducto'));
    modal.hide();
    
    mostrarAlerta(productoId ? 'Producto actualizado exitosamente' : 'Producto creado exitosamente', 'success');
    cargarProductos(paginaActualProductos);

  } catch (error) {
    console.error('Error al guardar producto:', error);
    const errorMessage = window.extractErrorMessage ? window.extractErrorMessage(error, 'Error al guardar el producto') : 'Error al guardar el producto';
    mostrarAlerta('Error al guardar el producto: ' + errorMessage, 'error');
  } finally {
    // Restaurar botón
    btn.disabled = false;
    btnText.style.display = 'inline';
    btnLoading.style.display = 'none';
  }
}

// Eliminar producto
function eliminarProducto(productoId) {
  const producto = productosData.find(p => p._id === productoId);
  if (!producto) return;

  const modal = new bootstrap.Modal(document.getElementById('modalEliminarProducto'));
  document.getElementById('nombreProductoEliminar').textContent = producto.nombre;
  document.getElementById('confirmarEliminacion').checked = false;
  
  // Guardar ID para confirmación
  window.adminProductos.productoAEliminar = productoId;
  
  modal.show();
}

// Confirmar eliminación
async function confirmarEliminacion() {
  const confirmacion = document.getElementById('confirmarEliminacion');
  if (!confirmacion.checked) {
    mostrarAlerta('Debes confirmar la eliminación', 'warning');
    return;
  }

  const btn = document.querySelector('#modalEliminarProducto .btn-danger');
  const btnText = btn.querySelector('.btn-text');
  const btnLoading = btn.querySelector('.btn-loading');

  try {
    btn.disabled = true;
    btnText.style.display = 'none';
    btnLoading.style.display = 'inline-flex';

    await apiService.delete(`/api/productos/${window.adminProductos.productoAEliminar}`);

    const modal = bootstrap.Modal.getInstance(document.getElementById('modalEliminarProducto'));
    modal.hide();

    mostrarAlerta('Producto eliminado exitosamente', 'success');
    cargarProductos(paginaActualProductos);

  } catch (error) {
    console.error('Error al eliminar producto:', error);
    const errorMessage = window.extractErrorMessage ? window.extractErrorMessage(error, 'Error al eliminar el producto') : 'Error al eliminar el producto';
    mostrarAlerta('Error al eliminar el producto: ' + errorMessage, 'error');
  } finally {
    btn.disabled = false;
    btnText.style.display = 'inline';
    btnLoading.style.display = 'none';
  }
}

// Ver detalles del producto (placeholder)
function verDetalles(productoId) {
  const producto = productosData.find(p => p._id === productoId);
  if (!producto) return;

  // Por ahora, mostrar información básica en una alerta
  const detalles = `
    Nombre: ${producto.nombre}
    Descripción: ${producto.descripcion || 'Sin descripción'}
    Categoría: ${producto.categoria || 'Sin categoría'}
    Precio: $${producto.precioBase ? producto.precioBase.toFixed(2) : '0.00'}
    Stock: ${producto.stock || 0}
    Estado: ${producto.disponibilidad ? 'Disponible' : 'No disponible'}
    Etiquetas: ${producto.etiquetas ? producto.etiquetas.join(', ') : 'Sin etiquetas'}
  `;
  
  alert(`Detalles del producto:\n\n${detalles}`);
}

// ============= FUNCIONES UTILITARIAS =============

// Función para mostrar alertas
function mostrarAlerta(mensaje, tipo = 'info') {
  // Protección contra [object Object]
  if (typeof mensaje === 'object') {
    console.warn('[mostrarAlerta] Recibió objeto en lugar de string:', mensaje);
    mensaje = JSON.stringify(mensaje);
  }
  
  if (mensaje === '[object Object]') {
    mensaje = 'Ha ocurrido un error inesperado';
  }
  
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

// Inicializar gestión de productos cuando se carga la página de admin
function initAdminProductos() {
  // Solo inicializar en la página de admin
  if (window.location.pathname === '/admin') {
    // Cargar productos automáticamente
    cargarProductos(1);
    
    // Configurar evento del botón "Nuevo Producto" como alternativa
    const btnNuevoProducto = document.querySelector('button[onclick*="abrirModalCrear"]');
    if (btnNuevoProducto) {
      console.log('[DEBUG] Configurando event listener alternativo para botón nuevo producto');
      btnNuevoProducto.addEventListener('click', function(e) {
        e.preventDefault();
        e.stopPropagation();
        console.log('[DEBUG] Click en botón nuevo producto detectado');
        abrirModalCrear();
      });
    } else {
      console.warn('[DEBUG] No se encontró el botón de nuevo producto');
    }
    
    // Configurar eventos de filtros con debounce para búsqueda
    let timeoutBusqueda;
    const buscarProducto = document.getElementById('buscarProducto');
    if (buscarProducto) {
      buscarProducto.addEventListener('keyup', () => {
        clearTimeout(timeoutBusqueda);
        timeoutBusqueda = setTimeout(() => window.adminProductos.aplicarFiltros(), 500); // 500ms de delay
      });
    }

    // Configurar preview de imagen
    const imagenInput = document.getElementById('imagenProducto');
    if (imagenInput) {
      imagenInput.addEventListener('change', function(e) {
        const file = e.target.files[0];
        if (file) {
          const reader = new FileReader();
          reader.onload = function(e) {
            const preview = document.getElementById('previewImagen');
            preview.innerHTML = `
              <img src="${e.target.result}" 
                   style="width: 100%; height: 150px; object-fit: cover; border-radius: 8px;">
            `;
          };
          reader.readAsDataURL(file);
        }
      });
    }
  }
}

// Función de test para debug
function testModal() {
  console.log('=== TEST MODAL ===');
  console.log('Bootstrap disponible:', typeof bootstrap !== 'undefined');
  console.log('Modal element:', !!document.getElementById('modalProducto'));
  console.log('adminProductos disponible:', !!window.adminProductos);
  console.log('abrirModalCrear function:', typeof window.adminProductos?.abrirModalCrear);
  
  // Intentar abrir modal directamente
  try {
    window.adminProductos.abrirModalCrear();
  } catch (error) {
    console.error('Error al abrir modal:', error);
  }
}

// Exportar funciones públicas
window.adminProductos = {
  cargarProductos,
  aplicarFiltros,
  limpiarFiltros,
  abrirModalCrear,
  editarProducto,
  guardarProducto,
  eliminarProducto,
  confirmarEliminacion,
  verDetalles,
  initAdminProductos,
  productoAEliminar: null,
  testModal // Para debugging
};

console.log('[DEBUG] adminProductos cargado en window:', !!window.adminProductos);
console.log('[DEBUG] abrirModalCrear disponible:', typeof window.adminProductos.abrirModalCrear);
console.log('[DEBUG] cargarProductos disponible:', typeof window.adminProductos.cargarProductos);

// Auto-inicializar si estamos en la página de admin
document.addEventListener('DOMContentLoaded', initAdminProductos);

console.log('[DEBUG] *** FIN admin-productos.js ***');