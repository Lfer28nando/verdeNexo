// producto.js - Renderiza la vista de detalle de producto
import { API } from './api.functions.js';
import { CartManager } from './cart.js';

document.addEventListener('DOMContentLoaded', async () => {
    // Obtener el id del producto desde la URL
    const match = window.location.pathname.match(/\/producto\/(\w+)/);
    const productId = match ? match[1] : null;
    if (!productId) return;

    try {
        const res = await API.get(`/api/products/${productId}`);
        console.log('Respuesta producto:', res.data);
        // Soportar ambos formatos: res.data.product o res.data.data
        const product = res.data.product || res.data.data || res.data;
        if (product && product.nombre) {
            const imgEl = document.getElementById('productImage');
            const nameEl = document.getElementById('productName');
            const priceEl = document.getElementById('productPrice');
            const descEl = document.getElementById('productDescription');
            const stockEl = document.getElementById('productStock');
            const addBtn = document.getElementById('addToCartBtn');

            if (imgEl) imgEl.src = product.imagenes?.[0]
                ? `/uploads/imagenes/${product.imagenes[0]}`
                : 'https://pic.onlinewebfonts.com/thumbnails/icons_574013.svg';
            if (nameEl) nameEl.textContent = product.nombre;
            if (priceEl) priceEl.textContent = product.precioBase ? `$${product.precioBase.toLocaleString()}` : '';
            if (descEl) descEl.textContent = product.descripcion || '';
            if (stockEl) stockEl.textContent = product.disponibilidad ? 'Disponible' : 'Agotado';
            if (addBtn) {
                addBtn.disabled = !product.disponibilidad;
                addBtn.onclick = async () => {
                    const result = await CartManager.addToCart(productId, 1);
                    if (result.success) {
                        alert('Producto agregado al carrito');
                    } else {
                        alert(result.message || 'Error al agregar al carrito');
                    }
                };
            }
        } else {
            document.getElementById('productDetailCard').innerHTML = '<div class="alert alert-danger">Producto no encontrado.</div>';
        }
    } catch (err) {
        document.getElementById('productDetailCard').innerHTML = '<div class="alert alert-danger">Error al cargar el producto.</div>';
        console.error('Error al cargar producto:', err);
    }
});
