import { API } from './api.js';

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
