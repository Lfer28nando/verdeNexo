document.addEventListener('DOMContentLoaded', async () => {
    try {
        // Hacemos una petición GET al backend para obtener los productos usando el servicio centralizado
        const response = await apiService.get('/api/productos');
        
        console.log(response); // Mostramos la respuesta completa en la consola para verificar que se ha recibido correctamente
        const contenedor = document.getElementById('lista-productos'); // getElementById busca una etiqueta que tenga ese id en el HTML, en este caso 'lista-productos', que es donde vamos a mostrar los productos
        
        // Verificamos que la respuesta sea exitosa y que contenga productos
        if (response.success && response.data && Array.isArray(response.data)) {
            response.data.forEach(producto => { //recorremos cada producto del array response.data (Monstera,Suculenta,etc.), forEach es un método de los arrays que ejecuta una función para cada elemento del array
                const div = document.createElement('div'); // Creamos un nuevo elemento div para cada producto, createElement es un método que crea un nuevo elemento HTML, en este caso un div; div es una variable que representa el nuevo elemento div que vamos a crear.
                div.classList.add('loom-item', 'text-center'); // Añadimos clases CSS al div para darle estilo, classList es una propiedad que permite manipular las clases de un elemento HTML, add es un método que añade una o más clases al elemento, en este caso 'loom-item' y 'text-center' son clases CSS que hemos definido para dar estilo a los productos.
                div.innerHTML = `
                    <img src="${CONFIG.API_BASE_URL}/uploads/${encodeURIComponent(producto.imagen)}">
                    <p class="mt-2 fw-semibold">${producto.nombre}</p>
                    <p class="fw-bold">${producto.precio}</p>
                    <button onclick="" class="btn loom-btn">Compra Ahora</button>
                `;
                // Aquí definimos el contenido HTML del div, innerHTML es una propiedad que permite establecer o obtener el contenido HTML de un elemento, en este caso estamos insertando una imagen, el nombre del producto, su precio y un botón que redirige a la página de catálogo; ${producto.nombre} y ${producto.precio} son interpolaciones de JavaScript que insertan el nombre y el precio del producto en el HTML.
                contenedor.appendChild(div); // Finalmente, añadimos el div al contenedor en el DOM, appendChild es un método que añade un nuevo nodo como hijo del nodo especificado, en este caso estamos añadiendo el div que hemos creado al contenedor que hemos seleccionado anteriormente. en otras palabras, estamos insertando el div con el producto dentro del contenedor que tiene el id 'lista-productos'.
            });
        } else {
            console.error('No se encontraron productos o la respuesta no es válida');
        }
    } catch (error) {
        console.error('Error al cargar los productos:', error);
        // Mostrar mensaje de error al usuario
        const contenedor = document.getElementById('lista-productos');
        if (contenedor) {
            contenedor.innerHTML = '<p class="text-center text-danger">Error al cargar los productos. Verifique la conexión con el servidor.</p>';
        }
    }
});