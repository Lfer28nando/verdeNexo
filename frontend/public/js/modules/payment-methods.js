// ============= MÓDULO DE MÉTODOS DE PAGO =============

// ============= FUNCIONES PRINCIPALES =============

// Función para abrir el modal de métodos de pago
function abrirMetodosPago() {
  console.log('abrirMetodosPago llamada');
  
  // Cerrar el modal del panel de usuario
  const userPanelModal = bootstrap.Modal.getInstance(document.getElementById('userPanelModal'));
  if (userPanelModal) {
    userPanelModal.hide();
  }
  
  // Cargar métodos de pago existentes
  cargarMetodosPago();
  
  // Abrir modal de métodos de pago
  const metodosModal = new bootstrap.Modal(document.getElementById('metodoPagoModal'));
  metodosModal.show();
}

// Función para cargar y mostrar métodos de pago del usuario
async function cargarMetodosPago() {
  try {
    const response = await apiService.get('/api/auth/me');
    const usuario = response.usuario;
    const metodosPago = usuario.metodosPago || { tarjetas: [], cuentasBancarias: [] };
    
    // Limpiar contenedores
    const listaTarjetas = document.getElementById('listaTarjetas');
    const listaCuentas = document.getElementById('listaCuentas');
    
    if (listaTarjetas) listaTarjetas.innerHTML = '';
    if (listaCuentas) listaCuentas.innerHTML = '';
    
    // Mostrar tarjetas
    if (metodosPago.tarjetas && metodosPago.tarjetas.length > 0) {
      metodosPago.tarjetas.forEach((tarjeta, index) => {
        const tarjetaHTML = crearElementoTarjeta(tarjeta, index);
        if (listaTarjetas) listaTarjetas.appendChild(tarjetaHTML);
      });
    } else {
      if (listaTarjetas) {
        listaTarjetas.innerHTML = '<p class="text-muted text-center">No tienes tarjetas registradas</p>';
      }
    }
    
    // Mostrar cuentas bancarias
    if (metodosPago.cuentasBancarias && metodosPago.cuentasBancarias.length > 0) {
      metodosPago.cuentasBancarias.forEach((cuenta, index) => {
        const cuentaHTML = crearElementoCuenta(cuenta, index);
        if (listaCuentas) listaCuentas.appendChild(cuentaHTML);
      });
    } else {
      if (listaCuentas) {
        listaCuentas.innerHTML = '<p class="text-muted text-center">No tienes cuentas bancarias registradas</p>';
      }
    }
    
  } catch (error) {
    console.error('Error al cargar métodos de pago:', error);
    mostrarAlerta('Error al cargar los métodos de pago', 'error');
  }
}

// ============= FUNCIONES DE CREACIÓN DE ELEMENTOS HTML =============

// Función para crear elemento HTML de tarjeta
function crearElementoTarjeta(tarjeta, index) {
  const div = document.createElement('div');
  div.className = 'col-md-6 mb-3';
  
  const tipoIcon = tarjeta.tipo === 'credito' ? 'fas fa-credit-card' : 'fas fa-money-check-alt';
  const tipoBadge = tarjeta.tipo === 'credito' ? 'bg-primary' : 'bg-success';
  
  div.innerHTML = `
    <div class="card h-100">
      <div class="card-body">
        <div class="d-flex justify-content-between align-items-start mb-2">
          <div class="d-flex align-items-center">
            <i class="${tipoIcon} text-primary me-2"></i>
            <span class="badge ${tipoBadge}">${tarjeta.tipo === 'credito' ? 'Crédito' : 'Débito'}</span>
          </div>
          ${tarjeta.predeterminada ? '<i class="fas fa-star text-warning" title="Predeterminada"></i>' : ''}
        </div>
        <h6 class="card-title">${tarjeta.titular}</h6>
        <p class="card-text">
          <strong>**** **** **** ${tarjeta.ultimosDigitos}</strong><br>
          <small class="text-muted">${tarjeta.banco}</small>
        </p>
        <div class="btn-group btn-group-sm w-100">
          ${!tarjeta.predeterminada ? `<button class="btn btn-outline-warning" onclick="establecerPredeterminado('tarjeta', ${index})">
            <i class="fas fa-star"></i> Predeterminada
          </button>` : ''}
          <button class="btn btn-outline-danger" onclick="eliminarMetodoPago('tarjeta', ${index})">
            <i class="fas fa-trash"></i> Eliminar
          </button>
        </div>
      </div>
    </div>
  `;
  
  return div;
}

// Función para crear elemento HTML de cuenta bancaria
function crearElementoCuenta(cuenta, index) {
  const div = document.createElement('div');
  div.className = 'col-md-6 mb-3';
  
  const tipoIcon = cuenta.tipoCuenta === 'ahorros' ? 'fas fa-piggy-bank' : 'fas fa-university';
  const tipoBadge = cuenta.tipoCuenta === 'ahorros' ? 'bg-success' : 'bg-info';
  
  div.innerHTML = `
    <div class="card h-100">
      <div class="card-body">
        <div class="d-flex justify-content-between align-items-start mb-2">
          <div class="d-flex align-items-center">
            <i class="${tipoIcon} text-primary me-2"></i>
            <span class="badge ${tipoBadge}">${cuenta.tipoCuenta === 'ahorros' ? 'Ahorros' : 'Corriente'}</span>
          </div>
          ${cuenta.predeterminada ? '<i class="fas fa-star text-warning" title="Predeterminada"></i>' : ''}
        </div>
        <h6 class="card-title">${cuenta.titular}</h6>
        <p class="card-text">
          <strong>***${cuenta.ultimosDigitos}</strong><br>
          <small class="text-muted">${cuenta.banco}</small>
        </p>
        <div class="btn-group btn-group-sm w-100">
          ${!cuenta.predeterminada ? `<button class="btn btn-outline-warning" onclick="establecerPredeterminado('cuenta', ${index})">
            <i class="fas fa-star"></i> Predeterminada
          </button>` : ''}
          <button class="btn btn-outline-danger" onclick="eliminarMetodoPago('cuenta', ${index})">
            <i class="fas fa-trash"></i> Eliminar
          </button>
        </div>
      </div>
    </div>
  `;
  
  return div;
}

// ============= FUNCIONES DE GESTIÓN =============

// Función para establecer método de pago como predeterminado
async function establecerPredeterminado(tipo, index) {
  try {
    const endpoint = tipo === 'tarjeta' ? 'tarjeta' : 'cuenta';
    await apiService.patch(`/api/auth/me/metodos-pago/${endpoint}/${index}/predeterminado`);
    
    mostrarAlerta(`${tipo === 'tarjeta' ? 'Tarjeta' : 'Cuenta'} establecida como predeterminada`, 'success');
    
    // Recargar métodos de pago
    cargarMetodosPago();
    
  } catch (error) {
    console.error('Error al establecer predeterminado:', error);
    mostrarAlerta(error.message || 'Error al establecer como predeterminado', 'error');
  }
}

// Función para eliminar método de pago
async function eliminarMetodoPago(tipo, index) {
  const confirmacion = confirm(`¿Estás seguro de que deseas eliminar esta ${tipo === 'tarjeta' ? 'tarjeta' : 'cuenta bancaria'}?`);
  
  if (!confirmacion) return;
  
  try {
    const endpoint = tipo === 'tarjeta' ? 'tarjeta' : 'cuenta';
    await apiService.delete(`/api/auth/me/metodos-pago/${endpoint}/${index}`);
    
    mostrarAlerta(`${tipo === 'tarjeta' ? 'Tarjeta' : 'Cuenta'} eliminada correctamente`, 'success');
    
    // Recargar métodos de pago
    cargarMetodosPago();
    
  } catch (error) {
    console.error('Error al eliminar método de pago:', error);
    mostrarAlerta(error.message || 'Error al eliminar el método de pago', 'error');
  }
}

// ============= MANEJADORES DE FORMULARIOS =============

// Función para manejar envío del formulario de tarjeta
function setupTarjetaFormHandler() {
  const formTarjeta = document.getElementById('formAgregarTarjeta');
  if (formTarjeta) {
    formTarjeta.addEventListener('submit', async function(e) {
      e.preventDefault();
      
      const formData = new FormData(this);
      const tarjetaData = {
        tipo: formData.get('tipoTarjeta'),
        numero: formData.get('numeroTarjeta'),
        titular: formData.get('titularTarjeta'),
        banco: formData.get('bancoTarjeta'),
        fechaVencimiento: formData.get('fechaVencimiento')
      };
      
      try {
        await apiService.post('/api/auth/me/metodos-pago/tarjeta', tarjetaData);
        mostrarAlerta('Tarjeta agregada correctamente', 'success');
        
        // Limpiar formulario
        this.reset();
        
        // Recargar métodos de pago
        cargarMetodosPago();
        
      } catch (error) {
        console.error('Error al agregar tarjeta:', error);
        mostrarAlerta(error.message || 'Error al agregar la tarjeta', 'error');
      }
    });
  }
}

// Función para manejar envío del formulario de cuenta bancaria
function setupCuentaFormHandler() {
  const formCuenta = document.getElementById('formAgregarCuenta');
  if (formCuenta) {
    formCuenta.addEventListener('submit', async function(e) {
      e.preventDefault();
      
      const formData = new FormData(this);
      const cuentaData = {
        tipoCuenta: formData.get('tipoCuenta'),
        numero: formData.get('numeroCuenta'),
        titular: formData.get('titularCuenta'),
        banco: formData.get('bancoCuenta')
      };
      
      try {
        await apiService.post('/api/auth/me/metodos-pago/cuenta', cuentaData);
        mostrarAlerta('Cuenta bancaria agregada correctamente', 'success');
        
        // Limpiar formulario
        this.reset();
        
        // Recargar métodos de pago
        cargarMetodosPago();
        
      } catch (error) {
        console.error('Error al agregar cuenta:', error);
        mostrarAlerta(error.message || 'Error al agregar la cuenta bancaria', 'error');
      }
    });
  }
}

// ============= VALIDACIONES EN TIEMPO REAL =============

// Validaciones en tiempo real para formularios de métodos de pago
function setupMetodosPagoValidation() {
  // Validación para número de tarjeta
  const numeroTarjeta = document.getElementById('numeroTarjeta');
  if (numeroTarjeta) {
    numeroTarjeta.addEventListener('input', function() {
      // Remover espacios y caracteres no numéricos
      let valor = this.value.replace(/\D/g, '');
      
      // Limitar a 16 dígitos
      if (valor.length > 16) {
        valor = valor.substr(0, 16);
      }
      
      // Agregar espacios cada 4 dígitos para mejor visualización
      const valorFormateado = valor.replace(/(.{4})/g, '$1 ').trim();
      this.value = valorFormateado;
      
      // Validar longitud
      const esValido = valor.length === 16;
      this.classList.toggle('is-valid', esValido);
      this.classList.toggle('is-invalid', !esValido && valor.length > 0);
    });
  }
  
  // Validación para fecha de vencimiento
  const fechaVencimiento = document.getElementById('fechaVencimiento');
  if (fechaVencimiento) {
    fechaVencimiento.addEventListener('input', function() {
      let valor = this.value.replace(/\D/g, '');
      
      if (valor.length >= 2) {
        valor = valor.substr(0, 2) + '/' + valor.substr(2, 2);
      }
      
      this.value = valor;
      
      // Validar formato MM/YY
      const esValido = /^(0[1-9]|1[0-2])\/\d{2}$/.test(valor);
      this.classList.toggle('is-valid', esValido);
      this.classList.toggle('is-invalid', !esValido && valor.length > 0);
    });
  }
  
  // Validación para número de cuenta bancaria
  const numeroCuenta = document.getElementById('numeroCuenta');
  if (numeroCuenta) {
    numeroCuenta.addEventListener('input', function() {
      const valor = this.value.replace(/\D/g, '');
      this.value = valor;
      
      // Validar longitud (entre 10 y 20 dígitos)
      const esValido = valor.length >= 10 && valor.length <= 20;
      this.classList.toggle('is-valid', esValido);
      this.classList.toggle('is-invalid', !esValido && valor.length > 0);
    });
  }
  
  // Validaciones para titulares (tarjeta y cuenta)
  ['titularTarjeta', 'titularCuenta'].forEach(id => {
    const elemento = document.getElementById(id);
    if (elemento) {
      elemento.addEventListener('input', function() {
        const valor = this.value.trim();
        const esValido = valor.length >= 3 && valor.length <= 50 && /^[a-zA-ZÀ-ÿ\s]+$/.test(valor);
        this.classList.toggle('is-valid', esValido);
        this.classList.toggle('is-invalid', !esValido && valor.length > 0);
      });
    }
  });
}

// ============= INICIALIZACIÓN =============

// Función para inicializar los manejadores de métodos de pago
function initMetodosPago() {
  setupTarjetaFormHandler();
  setupCuentaFormHandler();
  setupMetodosPagoValidation();
}