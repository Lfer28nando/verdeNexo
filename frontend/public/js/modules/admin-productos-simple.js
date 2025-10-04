// ============= MÓDULO DE ADMINISTRACIÓN DE PRODUCTOS (VERSIÓN SIMPLIFICADA) =============

console.log('[DEBUG] Cargando admin-productos-simple.js...');

// Variables globales básicas
let productosData = [];

// Función básica para abrir modal
function abrirModalCrear() {
  console.log('[DEBUG] abrirModalCrear ejecutándose...');
  
  try {
    // Verificar que Bootstrap esté disponible
    if (typeof bootstrap === 'undefined') {
      console.error('[ERROR] Bootstrap no está disponible');
      alert('Error: Bootstrap no está cargado');
      return;
    }
    
    // Verificar que el modal exista
    const modalElement = document.getElementById('modalProducto');
    if (!modalElement) {
      console.error('[ERROR] No se encontró el elemento modalProducto');
      alert('Error: No se encontró el modal de producto');
      return;
    }
    
    console.log('[DEBUG] Creando instancia de modal...');
    const modal = new bootstrap.Modal(modalElement);
    
    console.log('[DEBUG] Mostrando modal...');
    modal.show();
    
    // Configurar título
    const titulo = document.getElementById('tituloModalProducto');
    if (titulo) {
      titulo.textContent = 'Nuevo Producto';
    }
    
    console.log('[DEBUG] Modal mostrado exitosamente');
    
  } catch (error) {
    console.error('[ERROR] Error al abrir modal:', error);
    alert('Error al abrir modal: ' + error.message);
  }
}

// Función de test
function testModal() {
  console.log('=== TEST MODAL SIMPLE ===');
  console.log('Bootstrap disponible:', typeof bootstrap !== 'undefined');
  console.log('Modal element:', !!document.getElementById('modalProducto'));
  
  abrirModalCrear();
}

// Función para cargar productos con debug detallado
async function cargarProductos() {
  console.log('[DEBUG] === INICIANDO CARGA DE PRODUCTOS ===');
  
  const loadingElement = document.getElementById('loadingProductos');
  const tablaBody = document.getElementById('tablaProductos');
  
  console.log('[DEBUG] Elementos encontrados:', {
    loadingElement: !!loadingElement,
    tablaBody: !!tablaBody
  });
  
  try {
    // Mostrar loading
    if (loadingElement) {
      loadingElement.style.display = 'block';
      console.log('[DEBUG] Loading mostrado');
    }
    if (tablaBody) {
      tablaBody.innerHTML = '';
      console.log('[DEBUG] Tabla vaciada');
    }

    // Verificar que apiService esté disponible
    if (typeof apiService === 'undefined') {
      console.error('[ERROR] apiService no está disponible');
      throw new Error('apiService no está disponible');
    }

    console.log('[DEBUG] Haciendo petición a /api/productos...');
    
    // Realizar petición al backend
    const response = await apiService.get('/api/productos');
    
    console.log('[DEBUG] Respuesta recibida:', response);
    console.log('[DEBUG] Tipo de respuesta:', typeof response);
    console.log('[DEBUG] Propiedades de respuesta:', Object.keys(response || {}));
    
    // Intentar acceder a los datos de diferentes maneras
    let productos = [];
    
    if (response && response.data) {
      console.log('[DEBUG] Usando response.data');
      productos = response.data;
    } else if (response && Array.isArray(response)) {
      console.log('[DEBUG] Response es array directo');
      productos = response;
    } else if (response) {
      console.log('[DEBUG] Response es objeto, buscando productos...');
      productos = response.productos || response.docs || [];
    }
    
    console.log('[DEBUG] Productos encontrados:', productos);
    console.log('[DEBUG] Cantidad de productos:', productos.length);
    
    if (productos.length === 0) {
      console.log('[DEBUG] No hay productos, mostrando mensaje');
      if (tablaBody) {
        tablaBody.innerHTML = `
          <tr>
            <td colspan="7" class="text-center text-muted py-4">
              <i class="fas fa-box me-2"></i>
              No se encontraron productos en la base de datos
            </td>
          </tr>
        `;
      }
    } else {
      console.log('[DEBUG] Renderizando productos...');
      renderizarProductosSimple(productos);
    }

  } catch (error) {
    console.error('[ERROR] Error al cargar productos:', error);
    console.error('[ERROR] Stack trace:', error.stack);
    
    if (tablaBody) {
      tablaBody.innerHTML = `
        <tr>
          <td colspan="7" class="text-center text-danger py-4">
            <i class="fas fa-exclamation-triangle me-2"></i>
            Error al cargar productos: ${error.message}
          </td>
        </tr>
      `;
    }
  } finally {
    // Ocultar loading
    if (loadingElement) {
      loadingElement.style.display = 'none';
      console.log('[DEBUG] Loading ocultado');
    }
  }
}

// Función para renderizar productos (versión simple)
function renderizarProductosSimple(productos) {
  console.log('[DEBUG] === RENDERIZANDO PRODUCTOS ===');
  console.log('[DEBUG] Productos a renderizar:', productos);
  
  const tablaBody = document.getElementById('tablaProductos');
  if (!tablaBody) {
    console.error('[ERROR] No se encontró tablaProductos');
    return;
  }

  const html = productos.map((producto, index) => {
    console.log(`[DEBUG] Renderizando producto ${index}:`, producto);
    
    const nombre = producto.nombre || 'Sin nombre';
    const descripcion = producto.descripcion || 'Sin descripción';
    const categoria = producto.categoria || 'Sin categoría';
    const precio = producto.precioBase ? producto.precioBase.toFixed(2) : '0.00';
    const stock = producto.stock || 0;
    const disponible = producto.disponibilidad !== false;
    
    return `
      <tr>
        <td>
          <img src="/img/logo.png" alt="${nombre}" 
               style="width: 50px; height: 50px; object-fit: cover; border-radius: 8px;">
        </td>
        <td>
          <div>
            <div class="fw-bold">${nombre}</div>
            <small class="text-muted">${descripcion}</small>
          </div>
        </td>
        <td>
          <span class="badge bg-info">${categoria}</span>
        </td>
        <td>
          <strong>$${precio}</strong>
        </td>
        <td>
          <span class="badge ${stock > 10 ? 'bg-success' : stock > 0 ? 'bg-warning' : 'bg-danger'}">
            ${stock}
          </span>
        </td>
        <td>
          <span class="badge ${disponible ? 'bg-success' : 'bg-danger'}">
            ${disponible ? 'Disponible' : 'No disponible'}
          </span>
        </td>
        <td>
          <div class="btn-group" role="group">
            <button class="btn btn-sm btn-outline-primary" title="Editar">
              <i class="fas fa-edit"></i>
            </button>
            <button class="btn btn-sm btn-outline-info" title="Ver detalles">
              <i class="fas fa-eye"></i>
            </button>
            <button class="btn btn-sm btn-outline-danger" title="Eliminar">
              <i class="fas fa-trash"></i>
            </button>
          </div>
        </td>
      </tr>
    `;
  }).join('');

  console.log('[DEBUG] HTML generado:', html);
  tablaBody.innerHTML = html;
  console.log('[DEBUG] Productos renderizados exitosamente');
}

// Exportar al window (versión simple)
window.adminProductosSimple = {
  abrirModalCrear,
  testModal,
  cargarProductos,
  renderizarProductosSimple
};

console.log('[DEBUG] adminProductosSimple cargado:', !!window.adminProductosSimple);
console.log('[DEBUG] Funciones disponibles:', Object.keys(window.adminProductosSimple));

// Auto-cargar productos cuando estemos en admin
if (window.location.pathname === '/admin') {
  document.addEventListener('DOMContentLoaded', function() {
    console.log('[DEBUG] DOMContentLoaded - cargando productos automáticamente...');
    setTimeout(() => {
      cargarProductos();
    }, 1000); // Esperar 1 segundo para que todo se cargue
  });
}