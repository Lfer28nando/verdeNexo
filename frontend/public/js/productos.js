document.addEventListener('DOMContentLoaded', async () => {
    try {
        // Verificar que estamos en una página que tiene el contenedor de productos
        const contenedor = document.getElementById('lista-productos');
        if (!contenedor) {
            console.log('Contenedor lista-productos no encontrado en esta página, saltando carga de productos');
            return;
        }

        console.log('Cargando productos desde el backend...');

        // Hacemos una petición GET al backend para obtener los productos usando el servicio centralizado
        const response = await apiService.get('/api/productos');
        
        console.log('Respuesta de productos:', response); // Debug
        
        // El backend retorna {ok: true, data: productos}, accedemos a data
        if (response.ok && response.data && Array.isArray(response.data)) {
            if (response.data.length === 0) {
                contenedor.innerHTML = '<p class="text-center text-muted">No hay productos disponibles en este momento.</p>';
                return;
            }

            response.data.forEach(producto => {
                const div = document.createElement('div');
                div.classList.add('loom-item', 'text-center');
                
                // Usar la primera imagen si existe, sino imagen por defecto
                const imagenSrc = producto.imagenes && producto.imagenes.length > 0 
                    ? `${CONFIG.API_BASE_URL}/uploads/${producto.imagenes[0]}`
                    : '/img/logo.png';
                
                div.innerHTML = `
                    <img src="${imagenSrc}" 
                         alt="${producto.nombre}"
                         onerror="this.src='/img/logo.png'"
                         style="width: 200px; height: 200px; object-fit: cover;">
                    <p class="mt-2 fw-semibold">${producto.nombre}</p>
                    <p class="fw-bold">$${producto.precioBase ? producto.precioBase.toFixed(2) : '0.00'}</p>
                    <button onclick="agregarAlCarrito('${producto._id}')" class="btn loom-btn" ${!producto.disponibilidad ? 'disabled' : ''}>
                        ${producto.disponibilidad ? 'Agregar al Carrito' : 'No Disponible'}
                    </button>
                `;
                contenedor.appendChild(div);
            });
        } else {
            console.error('Respuesta no válida del servidor:', response);
            contenedor.innerHTML = '<p class="text-center text-danger">Error al cargar los productos. Formato de respuesta inválido.</p>';
        }
    } catch (error) {
        console.error('Error al cargar los productos:', error);
        // Mostrar mensaje de error al usuario
        const contenedor = document.getElementById('lista-productos');
        if (contenedor) {
            const errorMessage = window.extractErrorMessage ? 
                window.extractErrorMessage(error, 'Error al cargar los productos') : 
                'Error al cargar los productos. Verifica la conexión con el servidor.';
            contenedor.innerHTML = `<p class="text-center text-danger">${errorMessage}</p>`;
        }
    }
});

// Función auxiliar para agregar productos al carrito (placeholder)
function agregarAlCarrito(productoId) {
    console.log('Agregando producto al carrito:', productoId);
    // TODO: Implementar lógica del carrito
    alert('Funcionalidad de carrito en desarrollo');
}