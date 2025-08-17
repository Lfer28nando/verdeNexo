document.addEventListener('DOMContentLoaded', ()=> {
    fetch('http://localhost:3333/api/productos')// hacemos una petición GET al backend para obtener los productos, se usa addEventListener para asegurarnos de que el DOM esté completamente cargado antes de ejecutar el código, el DOM es el árbol de elementos HTML que componen la página web; fetch() es una función de JavaScript que permite hacer peticiones HTTP, en este caso al backend que corre en el puerto 3333 para obtener los productos; http://localhost:3333/api/productos es la URL del endpoint que hemos definido en el backend para obtener los productos; Mejor dicho va al servidor backend que corre en el puerto 3333 y le pide los productos a la ruta /api/productos y espera la respuesta.

    .then(response => response.json()) //Cuando la petición se completa, convertimos la respuesta a formato JSON, response es el objeto de respuesta que contiene los datos que nos envía el backend, y res.json() es un método que convierte esa respuesta en un objeto JavaScript. Esta conversión es necesaria para poder usarla como un array de productos en el frontend.

    .then(response => {
        console.log(response); // Mostramos la respuesta completa en la consola para verificar que se ha recibido correctamente
        const contenedor = document.getElementById('lista-productos'); // getElementById busca una etiqueta que tenga ese id en el HTML, en este caso 'lista-productos', que es donde vamos a mostrar los productos
        
        // Verificamos que la respuesta sea exitosa y que contenga productos
        if (response.success && response.data && Array.isArray(response.data)) {
            response.data.forEach(producto => { //recorremos cada producto del array response.data (Monstera,Suculenta,etc.), forEach es un método de los arrays que ejecuta una función para cada elemento del array
            const div = document.createElement('div'); // Creamos un nuevo elemento div para cada producto, createElement es un método que crea un nuevo elemento HTML, en este caso un div; div es una variable que representa el nuevo elemento div que vamos a crear.
            div.classList.add('loom-item', 'text-center'); // Añadimos clases CSS al div para darle estilo, classList es una propiedad que permite manipular las clases de un elemento HTML, add es un método que añade una o más clases al elemento, en este caso 'loom-item' y 'text-center' son clases CSS que hemos definido para dar estilo a los productos.
    div.innerHTML = `
            <img src="http://localhost:3333/uploads/${encodeURIComponent(producto.imagen)}">
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
    })
    .catch(error => console.error('Error al cargar los productos:', error)); // Si ocurre un error durante la petición, lo mostramos en la consola, catch es un método que captura cualquier error que ocurra en la cadena de promesas anterior.
});