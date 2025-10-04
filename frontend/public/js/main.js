// ============= ARCHIVO PRINCIPAL - MAIN.JS =============
// Este archivo coordina todos los módulos y maneja la inicialización

// ============= INICIALIZACIÓN PRINCIPAL =============

document.addEventListener('DOMContentLoaded', async () => {
  console.log('DOM cargado, inicializando aplicación...');
  
  try {
    // 1. Verificar estado de autenticación
    console.log('Verificando estado de autenticación...');
    const autenticado = await verificarEstadoAutenticacion();
    
    if (!autenticado) {
      // Si no está autenticado, verificar localStorage como fallback
      const usuario = JSON.parse(localStorage.getItem('usuario') || 'null');
      
      if (usuario) {
        console.log('Usuario en localStorage pero sin token válido, limpiando...');
        localStorage.removeItem('usuario');
      }
      
      mostrarBotonesSesion();
    }
    
    console.log('Verificación de autenticación completada');

    // 2. Inicializar validaciones de formularios
    setupRegistrationValidation();
    setupLoginValidation();
    setupForgotPasswordValidation();
    
    // 3. Inicializar validaciones de perfil
    setupEditProfileValidation();
    // NOTA: setupEditProfileFormHandler() se comentó porque está duplicada
    // La implementación principal está en scripts.js
    setupPasswordToggle();
    setupAdvancedOptionsToggle();
    
    // 4. Inicializar validaciones de eliminación de cuenta
    if (typeof setupDeleteAccountValidation === 'function') {
      setupDeleteAccountValidation();
    }
    
    // 5. Inicializar funcionalidades de métodos de pago
    initMetodosPago();
    
    // 5. Inicializar funcionalidades generales
    setupAdminForms();
    setupPhotoUpload();
    
    // 6. Verificar acceso de administrador si estamos en esa página
    if (window.location.pathname === '/admin') {
      verificarAccesoAdmin();
    }
    
    // 7. Debug: Verificar que los modales funcionen
    console.log('Verificando modales...');
    const registerBtn = document.querySelector('[data-bs-target="#registerModal"]');
    const loginBtn = document.querySelector('[data-bs-target="#loginModal"]');
    
    console.log('Botón registro encontrado:', registerBtn);
    console.log('Botón login encontrado:', loginBtn);
    
    if (registerBtn) {
      registerBtn.addEventListener('click', function() {
        console.log('Click en botón de registro detectado');
      });
    }
    
    console.log('Aplicación inicializada correctamente');
    
  } catch (error) {
    console.error('Error durante la inicialización:', error);
    // Mostrar estado básico en caso de error
    mostrarBotonesSesion();
  }
});

// ============= FUNCIONES DE UTILIDAD PARA MODALES =============

// Función para abrir modal de login desde otros lugares
function abrirLogin() {
  abrirModalSeguro('loginModal');
}

// Función para abrir modal de registro desde otros lugares
function abrirRegistro() {
  abrirModalSeguro('registerModal');
}

// ============= MANEJO DE ERRORES GLOBALES =============

// Capturar errores no manejados
window.addEventListener('error', function(e) {
  console.error('Error no capturado:', e.error);
  
  // No mostrar alertas molestas en producción, solo log
  if (window.location.hostname === 'localhost') {
    console.warn('Error capturado en desarrollo:', e.error?.message);
  }
});

// Capturar promesas rechazadas no manejadas
window.addEventListener('unhandledrejection', function(e) {
  console.error('Promesa rechazada no manejada:', e.reason);
  
  // Prevenir que el error se muestre en la consola del navegador
  e.preventDefault();
  
  // En desarrollo, mostrar más información
  if (window.location.hostname === 'localhost') {
    console.warn('Promesa rechazada capturada:', e.reason?.message);
  }
});

// ============= FUNCIONES DE DEBUG (solo en desarrollo) =============

if (window.location.hostname === 'localhost') {
  // Función para probar todos los modales
  window.testModales = function() {
    console.log('Probando modales...');
    
    const modales = [
      'loginModal',
      'registerModal', 
      'userPanelModal',
      'editProfileModal',
      'metodoPagoModal',
      'forgotPasswordModal',
      'confirmResetModal'
    ];
    
    modales.forEach(modalId => {
      const modal = document.getElementById(modalId);
      console.log(`Modal ${modalId}:`, modal ? '✓ Encontrado' : '✗ No encontrado');
    });
  };
  
  // Función para probar API
  window.testAPI = async function() {
    try {
      const response = await apiService.get('/api/auth/me');
      console.log('API Test - Usuario actual:', response);
    } catch (error) {
      console.log('API Test - Sin usuario autenticado:', error.message);
    }
  };
  
  // Exponer funciones globalmente para debugging
  window.auth = {
    login,
    register,
    cerrarSesion,
    verificarEstadoAutenticacion,
    solicitarResetPassword,
    confirmarResetPassword
  };
  
  window.user = {
    updateUserInterface,
    abrirModalUsuario,
    abrirEditarPerfil,
    cargarDatosUsuario
  };
  
  window.payments = {
    abrirMetodosPago,
    cargarMetodosPago,
    establecerPredeterminado,
    eliminarMetodoPago
  };
}

console.log('🌱 VerdeNexo - Sistema cargado correctamente');