// TEST: Verificar si el archivo se puede cargar
console.log('[TEST] admin-productos-test.js cargándose...');

window.adminProductosTest = {
  test: function() {
    console.log('Test function ejecutándose');
    alert('adminProductosTest funcionando!');
  }
};

console.log('[TEST] adminProductosTest disponible:', !!window.adminProductosTest);