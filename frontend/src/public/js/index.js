import { API } from "./api.js";

document.addEventListener('DOMContentLoaded', async () => {
    console.log('Cargando productos destacados...');
    await cargarProductosDestacados();

    const urlParams = new URLSearchParams(window.location.search);
    const requires2FA = urlParams.get('requires2fa');

    if (requires2FA === 'true') {
        console.log('Requiere 2FA, mostrando modal...');
        if (typeof show2FAModal === 'function') show2FAModal();
        return;
    }
});

// Helper: obtener baseURL limpia (sin slash final)
function baseUrlClean() {
    const base = API.defaults?.baseURL || window.BACKEND_URL;
    return base ? base.replace(/\/+$/, '') : '';
}

async function cargarProductosDestacados() {
    try {
        const response = await API.get('/api/products/featured');
        console.log('Respuesta de productos:', response.data);

        if (response.data.ok) {
            renderizarProductos(response.data.data);
        } else {
            console.error('Error al cargar productos:', response.data.message);
        }
    } catch (error) {
        console.error('Error de red:', error);
    }
}

function renderizarProductos(productos) {
    const slider = document.getElementById('productosSlider');
    if (!slider) return;
    slider.innerHTML = '';

    console.log('Número de productos a renderizar:', productos.length);

    const base = baseUrlClean();

    productos.forEach(producto => {
        console.log('Renderizando producto:', producto.nombre);
        const imagen = (producto.imagenes && producto.imagenes.length > 0)
            ? `${base}/uploads/imagenes/${producto.imagenes[0]}`
            : 'https://pic.onlinewebfonts.com/thumbnails/icons_574013.svg';

        const card = `
            <div class="producto-slide flex-shrink-0" style="width: 300px; margin-right: 1.5rem;">
                <div class="card h-100 shadow-sm producto-card-hover">
                    <img src="${imagen}" class="card-img-top" alt="${escapeHtml(producto.nombre)}" style="height: 200px; object-fit: cover;">
                    <div class="card-body d-flex flex-column">
                        <h5 class="card-title">${escapeHtml(producto.nombre)}</h5>
                        <p class="card-text text-muted flex-grow-1">${escapeHtml(producto.descripcion || 'Descripción no disponible')}</p>
                        <div class="d-flex justify-content-between align-items-center">
                            <span class="h5 text-success mb-0">$${Number(producto.precioBase).toFixed(2)}</span>
                            <button class="btn btn-outline-success btn-sm" onclick="agregarAlCarrito('${producto._id}', ${Number(producto.precioBase)})">
                                <i class="fas fa-cart-plus me-1"></i>Agregar
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;
        slider.innerHTML += card;
    });

    console.log('Productos renderizados en el DOM:', slider.children.length);

    if (productos.length > 3) {
        const left = document.querySelector('.slider-arrow-left');
        const right = document.querySelector('.slider-arrow-right');
        if (left) left.style.display = 'block';
        if (right) right.style.display = 'block';
    }
}

function agregarAlCarrito(id, precio) {
    let carrito = JSON.parse(localStorage.getItem('carrito')) || [];
    const item = carrito.find(i => i.id === id);
    if (item) item.cantidad += 1;
    else carrito.push({ id, precio, cantidad: 1 });
    localStorage.setItem('carrito', JSON.stringify(carrito));
    showToast('Producto agregado al carrito', 'success');
}

function moverSlider(direccion) {
    const slider = document.getElementById('productosSlider');
    if (!slider) return;
    const slideWidth = 315; // 300px + 15px margin

    // obtener transform actual de forma segura
    const style = window.getComputedStyle(slider);
    const matrix = style.transform || '';
    let currentX = 0;
    const match = matrix.match(/matrix\((.+)\)/);
    if (match) {
        const values = match[1].split(',').map(s => parseFloat(s));
        // en matrix(a, b, c, d, tx, ty) tx = values[4]
        if (!isNaN(values[4])) currentX = values[4];
    } else {
        // fallback: intentar leer translateX(...) si lo pones inline
        const inline = slider.style.transform || '';
        const tr = inline.match(/translateX\((-?\d+)px\)/);
        if (tr) currentX = parseInt(tr[1]);
    }

    let newX = direccion === 'next' ? currentX - slideWidth : currentX + slideWidth;

    const maxX = 0;
    const minX = - (Math.max(0, slider.children.length - 3) * slideWidth);
    newX = Math.max(minX, Math.min(maxX, newX));
    slider.style.transform = `translateX(${newX}px)`;
}

// Animación de contadores (sin cambios funcionales)
function animateCounters() {
    const counters = document.querySelectorAll('.stat-number');
    const speed = 500;
    counters.forEach(counter => {
        const target = parseInt(counter.getAttribute('data-count')) || 0;
        const current = parseInt(counter.innerText) || 0;
        const increment = target / speed;
        if (current < target) {
            counter.innerText = Math.ceil(current + increment);
            setTimeout(() => animateCounters(), 10);
        } else {
            counter.innerText = target;
        }
    });
}

const statsSection = document.querySelector('.stats-section');
if (statsSection) {
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                animateCounters();
                observer.unobserve(entry.target);
            }
        });
    }, { threshold: 0.5 });
    observer.observe(statsSection);
}

// 2FA - usa API global
function show2FAModal() {
    document.getElementById('twoFACode').value = '';
    const modal = new bootstrap.Modal(document.getElementById('twoFAModal'));
    modal.show();
}

async function verify2FA() {
    const code = document.getElementById('twoFACode').value.trim();
    const verifyButton = document.querySelector('#twoFAModal .btn-success');
    const originalText = verifyButton?.innerHTML || 'Verificar';

    if (!code || code.length !== 6) {
        showToast('Por favor ingresa un código válido de 6 dígitos.', 'danger');
        return;
    }

    if (verifyButton) {
        verifyButton.disabled = true;
        verifyButton.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Verificando...';
    }

    try {
        const res = await API.post('/api/auth/verify2FACode', { code });
        if (res.data.success) {
            bootstrap.Modal.getInstance(document.getElementById('twoFAModal')).hide();
            showToast('Verificación exitosa. Redirigiendo...', 'success');
            setTimeout(() => { window.location.replace('/'); }, 1000);
        } else {
            showToast(res.data.message || 'Código inválido.', 'danger');
        }
    } catch (err) {
        const message = err.response?.data?.error?.message || err.response?.data?.message || 'Error al verificar código';
        showToast(message, 'danger');
    } finally {
        if (verifyButton) {
            verifyButton.disabled = false;
            verifyButton.innerHTML = originalText;
        }
    }
}

function showToast(message, type = 'info') {
    let toastContainer = document.querySelector('.toast-container');
    if (!toastContainer) {
        toastContainer = document.createElement('div');
        toastContainer.className = 'toast-container position-fixed top-0 end-0 p-3';
        toastContainer.style.zIndex = '9999';
        document.body.appendChild(toastContainer);
    }

    const toast = document.createElement('div');
    toast.className = `toast align-items-center text-white bg-${type} border-0`;
    toast.setAttribute('role', 'alert');
    toast.innerHTML = `
        <div class="d-flex">
            <div class="toast-body">${message}</div>
            <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast"></button>
        </div>
    `;
    toastContainer.appendChild(toast);
    const bsToast = new bootstrap.Toast(toast);
    bsToast.show();
    toast.addEventListener('hidden.bs.toast', () => toast.remove());
}

async function mostrarBotonAdmin() {
    // Helper para leer cookies
    function getCookie(name) {
        const value = `; ${document.cookie}`;
        const parts = value.split(`; ${name}=`);
        if (parts.length === 2) return parts.pop().split(';').shift();
    }

    // Solo hacer la petición si existe cookie de sesión (ej: "connect.sid" o la que uses)
    const sessionCookie = getCookie('connect.sid');
    if (!sessionCookie) {
        // No hay sesión, no hacer petición ni mostrar nada
        return;
    }
    API.get('/api/auth/profile')
        .then(res => {
            if (res.data.success && res.data.user && res.data.user.role === 'admin') {
                const adminBtn = document.createElement('a');
                adminBtn.href = '/admin';
                adminBtn.className = 'btn btn-danger btn-lg position-fixed bottom-0 end-0 m-4 shadow-lg';
                adminBtn.style.zIndex = '9999';
                adminBtn.innerHTML = '<i class="fas fa-user-shield me-2"></i>Panel Administrador';
                document.body.appendChild(adminBtn);
            }
        })
        .catch(err => {
            if (err.response && err.response.status === 401) {
                // No autenticado, no mostrar nada ni loguear error
            } else {
                console.warn('[mostrarBotonAdmin] Error inesperado:', err);
            }
        });
}

mostrarBotonAdmin();

window.show2FAModal = show2FAModal;
window.verify2FA = verify2FA;
window.moverSlider = moverSlider;

// pequeño helper para escapar html
function escapeHtml(str = '') {
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}
