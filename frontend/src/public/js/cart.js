// Nueva lógica de integración carrito frontend-backend


import { API } from './api.js';
const API_BASE = '/api/cart';

// Utilidad para obtener o crear sessionId
function getSessionId() {
    let sessionId = localStorage.getItem('cartSessionId');
    if (!sessionId) {
        sessionId = 'cart_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
        localStorage.setItem('cartSessionId', sessionId);
    }
    return sessionId;
}

// Obtener datos del carrito desde backend
async function fetchCart() {
    const sessionId = getSessionId();
    try {
        const res = await API.get(`${API_BASE}/${sessionId}`);
        if (res.data.success) return res.data.data;
        return null;
    } catch (err) {
        console.error('Error al obtener carrito:', err);
        return null;
    }
}

// Renderizar items del carrito en la página
async function renderCart() {
    const cart = await fetchCart();
    const container = document.getElementById('cartItemsContainer');
    const emptyCart = document.getElementById('emptyCart');
        if (!container || !emptyCart) return; // Solo ejecuta si existe el contenedor
        if (!cart || cart.items.length === 0) {
        container.innerHTML = '';
        emptyCart.style.display = 'block';
            const checkoutBtn = document.getElementById('checkoutBtn');
            if (checkoutBtn) checkoutBtn.disabled = true;
        renderTotals({ subtotal: 0, descuentoCupones: 0, costoEnvio: 0, total: 0 });
        return;
    }
    emptyCart.style.display = 'none';
    container.innerHTML = cart.items.map((item, idx) => {
        const img = item.productoId?.imagenes?.[0]
            ? `/uploads/imagenes/${item.productoId.imagenes[0]}`
            : 'https://pic.onlinewebfonts.com/thumbnails/icons_574013.svg';
        return `
        <div class="cart-item" style="animation-delay:${0.1 * (idx + 1)}s;">
            <img src="${img}" alt="${item.productoId?.nombre || 'Producto'}" class="cart-item-image cart-item-clickable" data-product-id="${item.productoId?._id || ''}" />
            <div class="cart-item-info">
                <span class="cart-item-title cart-item-clickable" data-product-id="${item.productoId?._id || ''}">${item.productoId?.nombre || 'Producto'}</span>
                <span class="cart-item-description">${item.productoId?.descripcion || ''}</span>
                <span class="cart-item-price">$${item.precioUnitario.toLocaleString()}</span>
                <div class="quantity-controls">
                    <span>Cantidad: ${item.cantidad}</span>
                </div>
            </div>
            <div class="cart-item-actions">
                <button class="remove-item btn-remove-item" data-id="${item._id}" title="Eliminar">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        </div>
        `;
    }).join('');
    const checkoutBtn = document.getElementById('checkoutBtn');
    if (checkoutBtn) checkoutBtn.disabled = false;
    renderTotals(cart.totales);
    addRemoveItemListeners();
    addProductDetailListeners(cart.items);

// Función para mostrar modal de detalles del producto
function showProductModal(product) {
    // Si tienes un modal reutilizable en el HTML, puedes rellenarlo aquí
    // Ejemplo básico:
    let modal = document.getElementById('productDetailModal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'productDetailModal';
        modal.className = 'modal fade';
        modal.innerHTML = `
            <div class="modal-dialog">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title">${product.nombre}</h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Cerrar"></button>
                    </div>
                    <div class="modal-body">
                        <img src="${product.imagenes?.[0] ? `/uploads/imagenes/${product.imagenes[0]}` : 'https://pic.onlinewebfonts.com/thumbnails/icons_574013.svg'}" alt="${product.nombre}" style="width:100%;max-width:300px;border-radius:8px;margin-bottom:1rem;" />
                        <p>${product.descripcion || ''}</p>
                        <p><strong>Precio:</strong> $${product.precioBase?.toLocaleString() || ''}</p>
                    </div>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
    } else {
        modal.querySelector('.modal-title').textContent = product.nombre;
        modal.querySelector('img').src = product.imagenes?.[0] ? `/uploads/imagenes/${product.imagenes[0]}` : 'https://pic.onlinewebfonts.com/thumbnails/icons_574013.svg';
        modal.querySelector('img').alt = product.nombre;
        modal.querySelector('p').textContent = product.descripcion || '';
        modal.querySelector('strong').nextSibling.textContent = `$${product.precioBase?.toLocaleString() || ''}`;
    }
    const bsModal = new bootstrap.Modal(modal);
    bsModal.show();
}

// Listener para abrir modal al hacer click en imagen o nombre
function addProductDetailListeners(items) {
    document.querySelectorAll('.cart-item-clickable').forEach(el => {
        el.addEventListener('click', () => {
            const productId = el.getAttribute('data-product-id');
            if (productId) {
                window.location.href = `/producto/${productId}`;
            }
        });
    });
}
}

// Renderizar totales del carrito
function renderTotals(totales) {
    document.getElementById('subtotalAmount').textContent = `$${totales.subtotal.toLocaleString()}`;
    document.getElementById('discountAmount').textContent = `-$${totales.descuentoCupones.toLocaleString()}`;
    document.getElementById('shippingAmount').textContent = `$${totales.costoEnvio.toLocaleString()}`;
    // Calcular IVA desglosado (19% por defecto, ya incluido en el subtotal)
    const iva = Math.round(totales.subtotal * 0.19);
    document.getElementById('ivaAmount').textContent = `$${iva.toLocaleString()}`;
    // Sumar envío al total
    const totalConEnvio = totales.total + totales.costoEnvio;
    document.getElementById('totalAmount').textContent = `$${totalConEnvio.toLocaleString()}`;
    document.getElementById('discountRow').style.display = totales.descuentoCupones > 0 ? 'block' : 'none';
}

// Listener para eliminar item
function addRemoveItemListeners() {
    document.querySelectorAll('.btn-remove-item').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            const itemId = btn.getAttribute('data-id');
            await removeItem(itemId);
            renderCart();
        });
    });
}

// Eliminar item del carrito
async function removeItem(itemId) {
    const sessionId = getSessionId();
    try {
        await API.delete(`${API_BASE}/item/${sessionId}/${itemId}`);
    } catch (err) {
        console.error('Error al eliminar item:', err);
    }
}


// Exponer funciones globalmente para integración con catálogo y otras vistas
export const CartManager = window.CartManager = {
    addToCart: async function(productId, cantidad = 1) {
        const sessionId = getSessionId();
        try {
            const res = await API.post('/api/cart/item', { sessionId, productoId: productId, cantidad });
            if (res.data.success) {
                await window.CartManager.updateCartCount();
                return { success: true, message: 'Producto agregado al carrito' };
            }
            return { success: false, message: res.data.message };
        } catch (err) {
            return { success: false, message: 'Error al agregar producto al carrito' };
        }
    },
    updateCartCount: async function() {
        const sessionId = getSessionId();
        try {
            const res = await API.get(`/api/cart/${sessionId}`);
            if (res.data.success) {
                const cartData = res.data.data;
                const totalItems = cartData.items ? cartData.items.reduce((sum, item) => sum + item.cantidad, 0) : 0;
                const cartCount = document.getElementById('cartCount');
                if (cartCount) {
                    cartCount.textContent = totalItems;
                    cartCount.style.display = totalItems > 0 ? 'inline' : 'none';
                }
                return totalItems;
            }
        } catch (err) {
            return 0;
        }
    },
    getCartData: fetchCart,
    renderCart,
};

// Inicializar lógica al cargar la página
document.addEventListener('DOMContentLoaded', () => {
    // Listener para calcular envío
    const calculateShippingBtn = document.getElementById('calculateShippingBtn');
    if (calculateShippingBtn) {
        calculateShippingBtn.addEventListener('click', async () => {
            const sessionId = getSessionId();
            const upz = document.getElementById('shippingUPZ')?.value || '';
            const barrio = document.getElementById('shippingBarrio')?.value || '';
            const direccion = document.getElementById('shippingDireccion')?.value || '';
            try {
                // Enviar la dirección como objeto estructurado para que el backend la guarde en envio.direccion.calle
                const direccionPayload = direccion ? { calle: direccion } : {};
                const res = await API.post('/api/cart/shipping', {
                    sessionId,
                    upz,
                    barrio,
                    direccion: direccionPayload
                });
                if (res.data.success) {
                    document.getElementById('shippingResult').style.display = 'block';
                    const costo = res.data.data.envio?.costo ?? 0;
                    document.getElementById('shippingInfo').textContent = `Costo de envío: $${costo.toLocaleString()}`;
                    // Obtener los totales actuales del carrito directamente del DOM
                    const subtotal = parseInt(document.getElementById('subtotalAmount').textContent.replace(/[^\d]/g, '')) || 0;
                    const descuento = parseInt(document.getElementById('discountAmount').textContent.replace(/[^\d]/g, '')) || 0;
                    // Calcular IVA desglosado (19% por defecto, ya incluido en el subtotal)
                    const iva = Math.round(subtotal * 0.19);
                    document.getElementById('ivaAmount').textContent = `$${iva.toLocaleString()}`;
                    document.getElementById('shippingAmount').textContent = `$${costo.toLocaleString()}`;
                    // Sumar todo: subtotal - descuento + envío
                    const totalConEnvio = subtotal - descuento + costo;
                    document.getElementById('totalAmount').textContent = `$${totalConEnvio.toLocaleString()}`;
                } else {
                    alert(res.data.message ? `Error al calcular envío: ${res.data.message}` : 'No se pudo calcular el envío');
                }
            } catch (err) {
                if (err.response && err.response.data && err.response.data.message) {
                    alert('Error al calcular envío: ' + err.response.data.message);
                } else {
                    alert('Error al calcular envío (error interno)');
                }
            }
        });
    }
    renderCart();
    // Listener para el botón de checkout
    const checkoutBtn = document.getElementById('checkoutBtn');
    if (checkoutBtn) {
        checkoutBtn.addEventListener('click', () => {
            // Solo permite si el botón está habilitado
            if (!checkoutBtn.disabled) {
                window.location.href = '/checkout';
            }
        });
    }
    // Preestablecer valores de envío para Medellín
    const shippingUPZ = document.getElementById('shippingUPZ');
    const shippingBarrio = document.getElementById('shippingBarrio');
    if (shippingUPZ) shippingUPZ.value = 'Medellín';
    if (shippingBarrio) shippingBarrio.value = 'El Poblado';

    // Listener para aplicar cupón
    const applyCouponBtn = document.getElementById('applyCouponBtn');
    if (applyCouponBtn) {
        applyCouponBtn.addEventListener('click', async () => {
            const couponCode = document.getElementById('couponCode').value.trim();
            if (!couponCode) return;
            const sessionId = getSessionId();
            try {
                const res = await API.post('/api/cart/coupon', { sessionId, codigo: couponCode });
                if (res.data.success) {
                    document.getElementById('couponApplied').style.display = 'block';
                    document.getElementById('couponText').textContent = `Cupón aplicado: ${couponCode}`;
                    renderCart();
                } else {
                    alert(res.data.message || 'No se pudo aplicar el cupón');
                }
            } catch (err) {
                // Si el backend responde con error, intenta mostrar el mensaje
                if (err.response && err.response.data && err.response.data.message) {
                    alert('Error al aplicar cupón: ' + err.response.data.message);
                } else {
                    alert('Error al aplicar cupón (error interno)');
                }
            }
        });
    }
    // Listener para remover cupón
    const removeCouponBtn = document.getElementById('removeCouponBtn');
    if (removeCouponBtn) {
        removeCouponBtn.addEventListener('click', async () => {
            const couponCode = document.getElementById('couponCode').value.trim();
            const sessionId = getSessionId();
            try {
                const res = await API.delete(`/api/cart/coupon/${sessionId}/${couponCode}`);
                if (res.data.success) {
                    document.getElementById('couponApplied').style.display = 'none';
                    document.getElementById('couponText').textContent = '';
                    document.getElementById('couponCode').value = '';
                    renderCart();
                } else {
                    alert(res.data.message || 'No se pudo remover el cupón');
                }
            } catch (err) {
                if (err.response && err.response.data && err.response.data.message) {
                    alert('Error al remover cupón: ' + err.response.data.message);
                } else {
                    alert('Error al remover cupón (error interno)');
                }
            }
        });
    }
});