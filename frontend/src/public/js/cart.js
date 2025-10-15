// cart.js - Gestión del carrito de compras

// Configuración de la API
const API_BASE = 'http://localhost:3000';
const API_INSTANCE = axios.create({
    baseURL: API_BASE,
    withCredentials: true,
    headers: { 'Content-Type': 'application/json' }
});

// Estado del carrito
let cartSessionId = null;

/**
 * Obtiene o crea un sessionId para el carrito
 */
export function getOrCreateCartSessionId() {
    if (!cartSessionId) {
        cartSessionId = localStorage.getItem('cartSessionId');
        if (!cartSessionId) {
            cartSessionId = 'cart_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
            localStorage.setItem('cartSessionId', cartSessionId);
        }
    }
    return cartSessionId;
}

/**
 * Actualiza el contador del carrito en el header
 */
export async function updateCartCount() {
    const sessionId = getOrCreateCartSessionId();

    try {
        const response = await API_INSTANCE.get(`/api/cart/${sessionId}`);

        if (response.data.success) {
            const cartData = response.data.data;
            const totalItems = cartData.items ? cartData.items.reduce((sum, item) => sum + item.cantidad, 0) : 0;

            // Actualizar contador en el header si existe
            const cartCount = document.getElementById('cartCount');
            if (cartCount) {
                cartCount.textContent = totalItems;
                cartCount.style.display = totalItems > 0 ? 'inline' : 'none';
            }

            return totalItems;
        }
    } catch (error) {
        console.error('Error updating cart count:', error);
        // No mostrar error al usuario, solo log
        return 0;
    }
}

/**
 * Agrega un producto al carrito
 */
export async function addToCart(productId, cantidad = 1) {
    const sessionId = getOrCreateCartSessionId();

    try {
        const response = await API_INSTANCE.post('/api/cart/item', {
            sessionId,
            productoId: productId,
            cantidad: cantidad
        });

        if (response.data.success) {
            await updateCartCount();
            return { success: true, message: 'Producto agregado al carrito' };
        } else {
            throw new Error(response.data.message);
        }

    } catch (error) {
        console.error('Error adding to cart:', error);
        const message = error.response?.data?.message || 'Error al agregar producto al carrito';
        return { success: false, message };
    }
}

/**
 * Obtiene los datos del carrito
 */
export async function getCartData() {
    const sessionId = getOrCreateCartSessionId();

    try {
        const response = await API_INSTANCE.get(`/api/cart/${sessionId}`);
        return response.data.success ? response.data.data : null;
    } catch (error) {
        console.error('Error getting cart data:', error);
        return null;
    }
}

/**
 * Inicializa el contador del carrito al cargar la página
 */
export function initializeCartCounter() {
    // Actualizar contador al cargar la página
    updateCartCount();

    // Actualizar contador periódicamente (cada 30 segundos)
    setInterval(updateCartCount, 30000);
}

// Funciones globales para uso en HTML
window.CartManager = {
    addToCart,
    updateCartCount,
    getCartData,
    initializeCartCounter
};