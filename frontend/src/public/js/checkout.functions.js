

import { API } from './api.functions.js';

// Estado del checkout
let cartData = null;
let sessionId = null;

// Inicializar checkout
document.addEventListener('DOMContentLoaded', function() {
    initializeCheckout();
});

// Inicializar checkout
async function initializeCheckout() {
    try {
        // Obtener sessionId
        sessionId = localStorage.getItem('cartSessionId');
        if (!sessionId) {
            showToast('No hay productos en el carrito', 'warning');
            window.location.href = '/carrito';
            return;
        }

        // Cargar datos del carrito
        await loadCartData();

        // Configurar event listeners
        setupEventListeners();

    } catch (error) {
        console.error('Error initializing checkout:', error);
        showError('Error al cargar el checkout');
    }
}

// Cargar datos del carrito
async function loadCartData() {
    showLoading(true);

    try {
        const response = await API.get(`/api/cart/${sessionId}`);

            if (response.data.success) {
            cartData = response.data.data;
            console.log('checkout: cartData loaded', cartData);

            // Verificar que hay items en el carrito
            if (!cartData.items || cartData.items.length === 0) {
                showToast('Tu carrito está vacío', 'warning');
                window.location.href = '/carrito';
                return;
            }

            renderOrderSummary();
            updateOrderTotals();

            // Si el carrito ya tiene dirección de envío calculada, prefilar en el checkout
            try {
                const envio = cartData.envio || {};
                console.log('checkout: envio payload', envio);

                // Helpers para lectura/escritura segura del DOM (en caso de que algunos inputs hayan sido eliminados)
                const elValue = (id) => {
                    const el = document.getElementById(id);
                    return el ? (el.value || '').toString().trim() : '';
                };
                const elSetValue = (id, val) => {
                    const el = document.getElementById(id);
                    if (el) el.value = val;
                };

                // Buscar la dirección en múltiples posibles formatos (más robusto)
                let addressString = '';
                let foundFrom = null;

                // 1) Top-level handy fields
                const topCandidates = [envio.calle, envio.addressString, envio.direccion_text, envio.direccion_raw, envio.direccionTexto, envio.direccionExacta, envio.direccionCompleta];
                for (const c of topCandidates) {
                    if (typeof c === 'string' && c.trim()) {
                        addressString = c.trim();
                        foundFrom = 'envio.top:' + c;
                        break;
                    }
                }

                // 2) If envio.direccion is present (string or object)
                if (!addressString && envio.direccion) {
                    const d = envio.direccion;
                    if (typeof d === 'string' && d.trim()) {
                        addressString = d.trim();
                        foundFrom = 'envio.direccion:string';
                    } else if (typeof d === 'object' && d !== null) {
                        const candidate = d.calle || d.street || d.address || d.fullAddress || d.direccion || d.direccionExacta || d.direccionCompleta || '';
                        if (candidate && typeof candidate === 'string') {
                            addressString = candidate.trim();
                            foundFrom = 'envio.direccion.object.' + (d.calle ? 'calle' : d.street ? 'street' : d.address ? 'address' : 'other');
                        }
                        // secondary fields (escribir solo si el elemento existe)
                        if (d.ciudad || d.city) elSetValue('city', d.ciudad || d.city);
                        if (d.departamento || d.department) elSetValue('department', d.departamento || d.department);
                        if (d.postalCode || d.codigoPostal) elSetValue('postalCode', d.postalCode || d.codigoPostal);
                    }
                }

                // 3) Other fields on envio
                if (!addressString) {
                    const other = envio.direccionExacta || envio.address || envio.street || envio.fullAddress || '';
                    if (other && typeof other === 'string') {
                        addressString = other.trim();
                        foundFrom = 'envio.other';
                    }
                }

                if (addressString) {
                    elSetValue('address', addressString);
                    console.log('checkout: dirección prefilleada desde', foundFrom || 'unknown');
                } else {
                    console.info('checkout: no se encontró dirección exacta en cartData.envio');
                }
            } catch (prefillErr) {
                console.warn('No se pudo prefilar dirección desde carrito:', prefillErr);
            }

            // Prefilar UPZ y Barrio si vienen en cartData.envio
            try {
                if (cartData.envio) {
                    const upzVal = cartData.envio.upz || cartData.envio.UPZ || cartData.envio.zone || '';
                    const barrioVal = cartData.envio.barrio || cartData.envio.neighborhood || '';

                    const shippingUPZ = document.getElementById('shippingUPZ');
                    const shippingBarrio = document.getElementById('shippingBarrio');

                    if (shippingUPZ && upzVal) {
                        shippingUPZ.value = upzVal;
                    }

                    if (shippingBarrio && barrioVal) {
                        // Si el select no tiene la opción, agregarla
                        let exists = Array.from(shippingBarrio.options).some(o => o.value === barrioVal || o.text === barrioVal);
                        if (!exists) {
                            const opt = document.createElement('option');
                            opt.value = barrioVal;
                            opt.text = barrioVal;
                            shippingBarrio.appendChild(opt);
                        }
                        shippingBarrio.value = barrioVal;
                    }
                }
            } catch (prefillErr2) {
                console.warn('No se pudo prefilar UPZ/Barrio desde carrito:', prefillErr2);
            }

            // Habilitar botón de pedido
            document.getElementById('placeOrderBtn').disabled = false;

        } else {
            throw new Error(response.data.message || 'Error al cargar carrito');
        }

    } catch (error) {
        console.error('Error loading cart data:', error);
        if (error.response?.status === 404) {
            showToast('Carrito no encontrado', 'warning');
            window.location.href = '/carrito';
        } else {
            showError('Error al cargar los datos del carrito');
        }
    } finally {
        showLoading(false);
    }
}

// Renderizar resumen del pedido
function renderOrderSummary() {
    const container = document.getElementById('orderItems');

    if (!cartData || !cartData.items) return;

    container.innerHTML = cartData.items.map(item => `
        <div class="summary-item">
            <div>
                <strong>${item.productoId.nombre}</strong>
                <br>
                <small class="text-muted">Cantidad: ${item.cantidad}</small>
            </div>
            <div>$${(item.precioUnitario * item.cantidad).toFixed(2)}</div>
        </div>
    `).join('');
}

// Actualizar totales del pedido
function updateOrderTotals() {
    const container = document.getElementById('orderTotals');

    if (!cartData) return;

    container.innerHTML = `
        <div class="summary-item">
            <span>Subtotal:</span>
            <span>$${cartData.totales.subtotal.toFixed(2)}</span>
        </div>
        ${cartData.totales.descuentoCupones > 0 ? `
        <div class="summary-item">
            <span>Descuento:</span>
            <span>-$${cartData.totales.descuentoCupones.toFixed(2)}</span>
        </div>
        ` : ''}
        <div class="summary-item">
            <span>Envío:</span>
            <span>${cartData.totales.costoEnvio > 0 ? '$' + cartData.totales.costoEnvio.toFixed(2) : 'Gratis'}</span>
        </div>
        <div class="summary-item total">
            <span>Total:</span>
            <span>$${cartData.totales.total.toFixed(2)}</span>
        </div>
    `;
}

// Configurar event listeners
function setupEventListeners() {
    // Formulario de checkout
    document.getElementById('checkoutForm').addEventListener('submit', handlePlaceOrder);

    // Botón volver al carrito
    document.getElementById('backToCartBtn').addEventListener('click', (e) => {
        e.preventDefault();
        window.location.href = '/carrito';
    });
}

// Manejar envío del pedido
async function handlePlaceOrder(event) {
    event.preventDefault();
    console.log('handlePlaceOrder: Iniciando proceso de pago');

    // Validar formulario
    const formData = getFormData();
    console.log('handlePlaceOrder: Datos del formulario:', formData);
    if (!validateForm(formData)) {
        console.log('handlePlaceOrder: Validación fallida');
        return;
    }
    console.log('handlePlaceOrder: Validación exitosa');

    // Deshabilitar botón
    const submitBtn = document.getElementById('placeOrderBtn');
    const originalText = submitBtn.innerHTML;
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>Procesando pago...';

    try {
        // Preparar datos para guardar checkout
        const checkoutData = {
            sessionId,
            facturacion: {
                tipoDocumento: 'cedula', // Corregido: usar 'cedula' en lugar de 'CC'
                numeroDocumento: '123456789', // Temporal, debería obtenerse del form
                nombreCompleto: `${formData.firstName} ${formData.lastName}`,
                email: formData.email,
                telefono: formData.phone
            },
            envio: {
                direccionEnvio: {
                    calle: formData.address,
                    numero: '', // Podría extraerse
                    barrio: document.getElementById('shippingBarrio')?.value || '',
                    ciudad: document.getElementById('shippingUPZ')?.value || 'Medellín',
                    departamento: 'Antioquia'
                },
                nombreDestinatario: `${formData.firstName} ${formData.lastName}`,
                telefonoDestinatario: formData.phone,
                costoEnvio: cartData.totales.costoEnvio || 0
            },
            pago: {
                metodoPago: 'mercadopago',
                montoTotal: cartData.totales.total
            }
        };
        console.log('handlePlaceOrder: Datos para guardar checkout:', checkoutData);

        // 1. Guardar datos del checkout (crear pedido en borrador)
        console.log('handlePlaceOrder: Enviando petición para guardar datos...');
        const saveResponse = await API.post('/api/checkout/guardar-datos', checkoutData);
        console.log('handlePlaceOrder: Respuesta guardar datos:', saveResponse);
        if (!saveResponse.data.success) {
            throw new Error('Error al guardar datos del checkout');
        }

        const pedidoId = saveResponse.data.data.pedidoId;
        console.log('handlePlaceOrder: Pedido creado en borrador:', pedidoId);

        // 2. Crear preferencia de pago
        console.log('handlePlaceOrder: Creando preferencia de pago...');
        const prefResponse = await API.post(`/api/checkout/crear-preferencia/${pedidoId}`);
        console.log('handlePlaceOrder: Respuesta crear preferencia:', prefResponse);
        if (!prefResponse.data.success) {
            throw new Error('Error al crear preferencia de pago');
        }

        const { initPoint } = prefResponse.data.data;
        console.log('handlePlaceOrder: Preferencia creada, initPoint:', initPoint);

        // 3. Redirigir al checkout de Mercado Pago
        console.log('handlePlaceOrder: Redirigiendo a:', initPoint);
        window.location.href = initPoint;

    } catch (error) {
        console.error('handlePlaceOrder: Error procesando pago:', error);
        showToast('Error al procesar el pago: ' + (error.response?.data?.message || error.message), 'error');

        // Rehabilitar botón
        submitBtn.disabled = false;
        submitBtn.innerHTML = originalText;
    }
}

// Obtener datos del formulario
function getFormData() {
    const g = id => {
        const el = document.getElementById(id);
        if (!el) return '';
        return (el.value || '').toString().trim();
    };
    return {
        email: g('email'),
        phone: g('phone'),
        firstName: g('firstName'),
        lastName: g('lastName'),
        address: g('address'),
        city: g('city'),
        department: g('department'),
        postalCode: g('postalCode'),
        orderNotes: g('orderNotes')
    };
}

// Validar formulario
function validateForm(data) {
    const errors = [];

    if (!data.email || !/\S+@\S+\.\S+/.test(data.email)) {
        errors.push('Correo electrónico inválido');
    }

    if (!data.phone) {
        errors.push('Teléfono es requerido');
    }

    if (!data.firstName || !data.lastName) {
        errors.push('Nombre y apellido son requeridos');
    }

    // Si la página no incluye city/department, no los requerimos
    const cityEl = document.getElementById('city');
    const deptEl = document.getElementById('department');
    if (!data.address || (cityEl && !data.city) || (deptEl && !data.department)) {
        errors.push('Dirección completa es requerida');
    }

    // No validar método de pago, será Mercado Pago

    if (errors.length > 0) {
        showToast('Por favor corrige los siguientes errores:\n' + errors.join('\n'), 'error');
        return false;
    }

    return true;
}

// Utilidades
function showLoading(show) {
    document.getElementById('loadingOverlay').style.display = show ? 'flex' : 'none';
}

function showToast(message, type = 'info') {
    // Crear contenedor de toasts si no existe
    let toastContainer = document.querySelector('.toast-container');
    if (!toastContainer) {
        toastContainer = document.createElement('div');
        toastContainer.className = 'toast-container position-fixed top-0 end-0 p-3';
        toastContainer.style.zIndex = '9999';
        document.body.appendChild(toastContainer);
    }

    // Crear toast
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

    // Mostrar toast
    const bsToast = new bootstrap.Toast(toast);
    bsToast.show();

    // Limpiar después de ocultar
    toast.addEventListener('hidden.bs.toast', () => {
        toast.remove();
    });
}

function showError(message) {
    const container = document.querySelector('.checkout-form');
    container.innerHTML = `
        <div class="text-center py-5">
            <i class="fas fa-exclamation-triangle fa-3x text-danger mb-3"></i>
            <h4>Error al cargar el checkout</h4>
            <p>${message}</p>
            <button class="btn btn-success" onclick="location.reload()">Reintentar</button>
        </div>
    `;
}



// Utilidad para obtener el usuario actual (simulación, reemplazar por tu lógica de sesión real)
async function fetchUserProfile() {
    try {
        const url = '/api/auth/profile';
        console.log('fetchUserProfile: llamando a', url);
        const res = await API.get(url);
    if (res.data.success) return res.data.user;
        console.warn('fetchUserProfile: respuesta sin success', res.data);
        return null;
    } catch (err) {
        console.error('fetchUserProfile error', err);
        return null;
    }
}

// Prioriza datos registrados y permite agregar nueva dirección
async function renderUserInfo() {
    // Mostrar/ocultar X solo si hay valor
    function toggleClearBtn(inputId, btnId) {
        const input = document.getElementById(inputId);
        const btn = document.getElementById(btnId);
        if (!input || !btn) return;
        btn.style.display = input.value ? 'inline-block' : 'none';
        input.addEventListener('input', () => {
            btn.style.display = input.value ? 'inline-block' : 'none';
        });
    }
    toggleClearBtn('email', 'clearEmailBtn');
    toggleClearBtn('phone', 'clearPhoneBtn');
    // Botones para limpiar email y celular
    let clearEmailBtn = document.getElementById('clearEmailBtn');
    if (clearEmailBtn) {
        clearEmailBtn.onclick = () => {
            document.getElementById('email').value = '';
            // hide after clearing
            clearEmailBtn.style.display = 'none';
        };
    }
    let clearPhoneBtn = document.getElementById('clearPhoneBtn');
    if (clearPhoneBtn) {
        clearPhoneBtn.onclick = () => {
            document.getElementById('phone').value = '';
            // hide after clearing
            clearPhoneBtn.style.display = 'none';
        };
    }
    // Botón para limpiar contacto
    const addContactBtn = document.getElementById('addContactBtn');
    if (addContactBtn) {
        addContactBtn.onclick = () => {
            document.getElementById('email').value = '';
            document.getElementById('phone').value = '';
        };
    }
    let user;
    try {
        user = await fetchUserProfile();
        console.log('checkout: usuario obtenido', user);
    } catch (e) {
        console.error('Error al obtener perfil:', e);
    }
    if (!user) {
        console.log('checkout: no hay usuario, saliendo de renderUserInfo');
        return;
    }
    // Priorizar datos existentes: no sobreescribir si ya hay valor (por ejemplo, prefills desde el carrito)
    try {
        const emailEl = document.getElementById('email');
        const phoneEl = document.getElementById('phone');
        if (emailEl && !emailEl.value && user.email) emailEl.value = user.email;
        if (phoneEl && !phoneEl.value && user.cellphone) phoneEl.value = user.cellphone;
        console.log('Valores asignados a email/phone:', emailEl?.value, phoneEl?.value);
    } catch (assignErr) {
        console.error('Error asignando valores a campos de contacto:', assignErr);
    }
    // Si tienes campos separados, usa los del perfil solo si están vacíos
    try {
        const fn = document.getElementById('firstName');
        const ln = document.getElementById('lastName');
        const addr = document.getElementById('address');
        const city = document.getElementById('city');
        const dept = document.getElementById('department');
        const pc = document.getElementById('postalCode');

        if (fn && !fn.value && user.firstName) fn.value = user.firstName;
        if (ln && !ln.value && user.lastName) ln.value = user.lastName;
        if (addr && !addr.value && user.address) addr.value = user.address;
        if (city && !city.value && user.city) city.value = user.city;
        if (dept && !dept.value && user.department) dept.value = user.department;
        if (pc && !pc.value && user.postalCode) pc.value = user.postalCode;
    } catch (assignAddrErr) {
        console.error('Error asignando valores a campos de dirección desde perfil:', assignAddrErr);
    }
    // Si no hay datos separados, reparte el address en todos los campos (sólo si los elementos existen)
    if (!user.firstName && !user.lastName && !user.city && !user.department && !user.postalCode && user.address) {
        const parts = user.address.split(',');
        const addressEl = document.getElementById('address');
        const cityEl = document.getElementById('city');
        const deptEl = document.getElementById('department');
        const pcEl = document.getElementById('postalCode');
        if (addressEl && !addressEl.value) addressEl.value = parts[0] ? parts[0].trim() : user.address;
        if (cityEl && !cityEl.value) cityEl.value = (parts[1] || '').trim();
        if (deptEl && !deptEl.value) deptEl.value = (parts[2] || '').trim();
        if (pcEl && !pcEl.value) pcEl.value = (parts[3] || '').trim();
    }

    // Usar el botón de la vista
    const addAddressBtn = document.getElementById('addAddressBtn');
    if (addAddressBtn) {
        addAddressBtn.onclick = () => {
            const addressEl = document.getElementById('address');
            if (addressEl) addressEl.value = '';
            const cityEl = document.getElementById('city');
            if (cityEl) cityEl.value = '';
            const deptEl = document.getElementById('department');
            if (deptEl) deptEl.value = '';
            const pcEl = document.getElementById('postalCode');
            if (pcEl) pcEl.value = '';
        };
    }

    // Asegurar visibilidad de las X si hay valores (programáticamente no disparan input)
    clearEmailBtn = document.getElementById('clearEmailBtn');
    if (clearEmailBtn) clearEmailBtn.style.display = (document.getElementById('email')?.value ? 'inline-block' : 'none');
    clearPhoneBtn = document.getElementById('clearPhoneBtn');
    if (clearPhoneBtn) clearPhoneBtn.style.display = (document.getElementById('phone')?.value ? 'inline-block' : 'none');

    // Ajustar visualmente la X para que tenga la misma altura que el input
    try {
        const emailInput = document.getElementById('email');
        const phoneInput = document.getElementById('phone');
        if (emailInput && clearEmailBtn) {
            const h = emailInput.offsetHeight;
            clearEmailBtn.style.height = h + 'px';
            clearEmailBtn.style.padding = '0 0.6rem';
            clearEmailBtn.style.lineHeight = h + 'px';
            clearEmailBtn.style.borderRadius = '0 .375rem .375rem 0';
        }
        if (phoneInput && clearPhoneBtn) {
            const h2 = phoneInput.offsetHeight;
            clearPhoneBtn.style.height = h2 + 'px';
            clearPhoneBtn.style.padding = '0 0.6rem';
            clearPhoneBtn.style.lineHeight = h2 + 'px';
            clearPhoneBtn.style.borderRadius = '0 .375rem .375rem 0';
        }
    } catch (sizeErr) {
        console.warn('No se pudo ajustar tamaño de botones X:', sizeErr);
    }
}

document.addEventListener('DOMContentLoaded', renderUserInfo);
