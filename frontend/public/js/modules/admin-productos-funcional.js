// ============= MÓDULO DE ADMINISTRACIÓN DE PRODUCTOS (VERSIÓN FUNCIONAL) =============

console.log('[DEBUG] Cargando admin-productos-funcional.js...');

// Variables globales
let productosData = [];
let paginaActual = 1;
let totalPaginas = 1;
let productoSeleccionado = null;

// ============= FUNCIONES DE CARGA =============

// Cargar productos
async function cargarProductos(pagina = 1) {
  console.log('[DEBUG] === CARGANDO PRODUCTOS ===');
  
  const loadingElement = document.getElementById('loadingProductos');
  const tablaBody = document.getElementById('tablaProductos');
  
  try {
    // Mostrar loading
    if (loadingElement) loadingElement.style.display = 'block';
    if (tablaBody) tablaBody.innerHTML = '';

    // Verificar apiService
    if (typeof apiService === 'undefined') {
      throw new Error('apiService no está disponible');
    }

    console.log('[DEBUG] Haciendo petición a /api/productos...');
    const response = await apiService.get('/api/productos');
    
    console.log('[DEBUG] Respuesta:', response);
    
    // Obtener productos de la respuesta
    productosData = response.data || response.productos || response || [];
    
    console.log('[DEBUG] Productos encontrados:', productosData.length);
    
    // Renderizar productos
    renderizarProductos();

  } catch (error) {
    console.error('[ERROR] Error al cargar productos:', error);
    const errorMessage = window.extractErrorMessage ? window.extractErrorMessage(error, 'Error al cargar productos') : error.message;
    
    if (tablaBody) {
      tablaBody.innerHTML = `
        <tr>
          <td colspan="7" class="text-center text-danger py-4">
            <i class="fas fa-exclamation-triangle me-2"></i>
            Error: ${errorMessage}
          </td>
        </tr>
      `;
    }
  } finally {
    if (loadingElement) loadingElement.style.display = 'none';
  }
}

// Renderizar productos en la tabla
function renderizarProductos() {
  console.log('[DEBUG] Renderizando productos:', productosData.length);
  
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
            <div class="fw-bold">${producto.nombre || 'Sin nombre'}</div>
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
        <td>
          <span class="badge ${producto.disponibilidad ? 'bg-success' : 'bg-danger'}">
            ${producto.disponibilidad ? 'Disponible' : 'No disponible'}
          </span>
        </td>
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

// ============= FUNCIONES DE GESTIÓN =============

// Abrir modal para crear producto
function abrirModalCrear() {
  console.log('[DEBUG] Abriendo modal para crear producto...');
  
  try {
    if (typeof bootstrap === 'undefined') {
      throw new Error('Bootstrap no está disponible');
    }
    
    const modalElement = document.getElementById('modalProducto');
    if (!modalElement) {
      throw new Error('Modal de producto no encontrado');
    }
    
    const modal = new bootstrap.Modal(modalElement);
    const titulo = document.getElementById('tituloModalProducto');
    const form = document.getElementById('formProducto');
    const textoBoton = document.getElementById('textoBotonGuardar');

    // Resetear formulario
    if (form) form.reset();
    document.getElementById('productoId').value = '';
    document.getElementById('disponibilidadProducto').checked = true;
    
    // Limpiar preview de imagen
    const preview = document.getElementById('previewImagen');
    if (preview) {
      preview.innerHTML = `
        <i class="fas fa-image fa-3x text-muted mb-2"></i>
        <p class="text-muted mb-0">Haz clic para seleccionar imagen</p>
      `;
    }

    // Configurar modal para creación
    if (titulo) titulo.textContent = 'Nuevo Producto';
    if (textoBoton) textoBoton.textContent = 'Crear Producto';

    modal.show();
    console.log('[DEBUG] Modal mostrado exitosamente');
    
  } catch (error) {
    console.error('[ERROR] Error al abrir modal:', error);
    alert('Error al abrir modal: ' + error.message);
  }
}

// Guardar producto (crear o actualizar)
async function guardarProducto() {
  console.log('[DEBUG] Guardando producto...');
  
  const btn = document.querySelector('#modalProducto .btn-primary');
  const btnText = btn?.querySelector('.btn-text');
  const btnLoading = btn?.querySelector('.btn-loading');

  try {
    // Validar formulario
    const form = document.getElementById('formProducto');
    if (!form.checkValidity()) {
      form.reportValidity();
      return;
    }

    // Mostrar loading
    if (btn) btn.disabled = true;
    if (btnText) btnText.style.display = 'none';
    if (btnLoading) btnLoading.style.display = 'inline-flex';

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
      response = await apiService.put(`/api/productos/${productoId}`, datos);
    } else {
      // Crear nuevo producto
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
    cargarProductos(paginaActual);

  } catch (error) {
    console.error('[ERROR] Error al guardar producto:', error);
    const errorMessage = window.extractErrorMessage ? window.extractErrorMessage(error, 'Error al guardar el producto') : error.message;
    mostrarAlerta('Error al guardar el producto: ' + errorMessage, 'error');
  } finally {
    // Restaurar botón
    if (btn) btn.disabled = false;
    if (btnText) btnText.style.display = 'inline';
    if (btnLoading) btnLoading.style.display = 'none';
  }
}

// Editar producto
async function editarProducto(productoId) {
  console.log('[DEBUG] Editando producto:', productoId);
  
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
    console.error('[ERROR] Error al cargar producto:', error);
    const errorMessage = window.extractErrorMessage ? window.extractErrorMessage(error, 'Error al cargar el producto') : error.message;
    mostrarAlerta('Error al cargar el producto: ' + errorMessage, 'error');
  }
}

// Eliminar producto
function eliminarProducto(productoId) {
  console.log('[DEBUG] Eliminando producto:', productoId);
  
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
  const btnText = btn?.querySelector('.btn-text');
  const btnLoading = btn?.querySelector('.btn-loading');

  try {
    if (btn) btn.disabled = true;
    if (btnText) btnText.style.display = 'none';
    if (btnLoading) btnLoading.style.display = 'inline-flex';

    await apiService.delete(`/api/productos/${window.adminProductos.productoAEliminar}`);

    const modal = bootstrap.Modal.getInstance(document.getElementById('modalEliminarProducto'));
    modal.hide();

    mostrarAlerta('Producto eliminado exitosamente', 'success');
    cargarProductos(paginaActual);

  } catch (error) {
    console.error('[ERROR] Error al eliminar producto:', error);
    const errorMessage = window.extractErrorMessage ? window.extractErrorMessage(error, 'Error al eliminar el producto') : error.message;
    mostrarAlerta('Error al eliminar el producto: ' + errorMessage, 'error');
  } finally {
    if (btn) btn.disabled = false;
    if (btnText) btnText.style.display = 'inline';
    if (btnLoading) btnLoading.style.display = 'none';
  }
}

// Ver detalles del producto
function verDetalles(productoId) {
  const producto = productosData.find(p => p._id === productoId);
  if (!producto) return;

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

// Función para mostrar alertas
function mostrarAlerta(mensaje, tipo = 'info') {
  if (typeof mensaje === 'object') {
    mensaje = JSON.stringify(mensaje);
  }
  
  if (mensaje === '[object Object]') {
    mensaje = 'Ha ocurrido un error inesperado';
  }
  
  const alertDiv = document.createElement('div');
  alertDiv.className = `alert alert-${tipo === 'error' ? 'danger' : tipo} alert-dismissible fade show position-fixed`;
  alertDiv.style.cssText = 'top: 20px; right: 20px; z-index: 9999; max-width: 400px;';
  
  alertDiv.innerHTML = `
    ${mensaje}
    <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Cerrar"></button>
  `;
  
  document.body.appendChild(alertDiv);
  
  setTimeout(() => {
    if (alertDiv.parentNode) {
      alertDiv.remove();
    }
  }, 5000);
}

// ============= INICIALIZACIÓN =============

function initAdminProductos() {
  console.log('[DEBUG] Inicializando admin productos...');
  
  if (window.location.pathname === '/admin') {
    // Cargar productos automáticamente
    cargarProductos(1);
    
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

// ============= EXPORTACIÓN =============

window.adminProductos = {
  cargarProductos,
  abrirModalCrear,
  editarProducto,
  guardarProducto,
  eliminarProducto,
  confirmarEliminacion,
  verDetalles,
  initAdminProductos,
  productoAEliminar: null
};

console.log('[DEBUG] adminProductos funcional cargado:', !!window.adminProductos);
console.log('[DEBUG] Funciones disponibles:', Object.keys(window.adminProductos));

// Auto-inicializar
document.addEventListener('DOMContentLoaded', initAdminProductos);