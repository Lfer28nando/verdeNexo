// public/js/auth.functions.js
// Módulo que importa API y maneja el registro (formulario)

import { API } from './api.functions.js';

const initRegister = () => {
  const registerForm = document.getElementById('registerForm');
  if (!registerForm) return;

  const password = document.getElementById('password');
  const confirmPassword = document.getElementById('confirmPassword');
  const passwordFeedback = document.getElementById('passwordFeedback');

  const checkPasswords = () => {
    if (!confirmPassword) return;
    if (confirmPassword.value.length === 0) {
      passwordFeedback.textContent = 'Recomendamos usar al menos 8 caracteres con mayúsculas, números y símbolos.';
      passwordFeedback.classList.remove('text-success', 'text-warning');
      passwordFeedback.classList.add('text-light');
      return;
    }
    if (password.value !== confirmPassword.value) {
      passwordFeedback.textContent = 'Las contraseñas no coinciden.';
      passwordFeedback.classList.remove('text-light', 'text-success');
      passwordFeedback.classList.add('text-warning');
    } else {
      passwordFeedback.textContent = 'Las contraseñas coinciden.';
      passwordFeedback.classList.remove('text-light', 'text-warning');
      passwordFeedback.classList.add('text-success');
    }
  };

  password?.addEventListener('input', checkPasswords);
  confirmPassword?.addEventListener('input', checkPasswords);

  registerForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const formData = new FormData(registerForm);
    const payload = {
      username: formData.get('username')?.trim(),
      cellphone: formData.get('cellphone')?.trim(),
      email: formData.get('email')?.trim(),
      password: formData.get('password')
    };

    if (!payload.username || !payload.email || !payload.password) {
      return alert('Por favor completa los campos obligatorios.');
    }
    if (payload.password.length < 6) {
      return alert('La contraseña debe tener al menos 6 caracteres.');
    }
    if (payload.password !== formData.get('confirmPassword')) {
      return alert('Las contraseñas no coinciden.');
    }

    try {
      // Supuesto endpoint: POST /api/auth/register
      const res = await API.post('api/auth/register', payload);
      // Si devuelve token en body -> guardar localStorage (solo para prototipo)
      if (res?.data?.token) {
        localStorage.setItem('vn_token', res.data.token);
      }
      // Mensaje / redirección
      alert('Cuenta creada con éxito.');
      window.location.href = '/';
    } catch (err) {
      console.error('Register error', err);
      const message = err.response?.data?.message || err.message || 'Error en el registro';
      alert(`Error: ${message}`);
    }
  });
};

// Exporta la función por si quieres inicializar manualmente
export default initRegister;

// Auto-init cuando se importe (opcional)
document.addEventListener('DOMContentLoaded', initRegister);
