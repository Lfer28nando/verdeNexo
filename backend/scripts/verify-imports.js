#!/usr/bin/env node

// Script para verificar que todos los imports están correctos
import { fileURLToPath } from 'url';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('🔍 Verificando imports del proyecto...\n');

try {
  console.log('✅ Verificando modelos...');
  const { Producto } = await import('../models/producto/index.js');
  console.log('  ✅ Modelo Producto importado correctamente');

  console.log('✅ Verificando controladores...');
  const productosController = await import('../controllers/productos.controller.js');
  console.log('  ✅ Controlador productos importado correctamente');
  
  const carritoController = await import('../controllers/carrito.controller.js');
  console.log('  ✅ Controlador carrito importado correctamente');
  
  const checkoutController = await import('../controllers/checkout.controller.js');
  console.log('  ✅ Controlador checkout importado correctamente');

  console.log('✅ Verificando middlewares...');
  const auth = await import('../middlewares/auth.js');
  console.log('  ✅ Middleware auth importado correctamente');
  
  const apikey = await import('../middlewares/apikey.js');
  console.log('  ✅ Middleware apikey importado correctamente');

  console.log('✅ Verificando rutas...');
  const productosRoutes = await import('../routes/productos/index.js');
  console.log('  ✅ Rutas productos importadas correctamente');
  
  const carritoRoutes = await import('../routes/carrito/index.js');
  console.log('  ✅ Rutas carrito importadas correctamente');

  console.log('\n🎉 ¡Todos los imports están correctos!');
  console.log('💡 El servidor debería funcionar sin problemas de importación');
  
} catch (error) {
  console.error('\n❌ Error al verificar imports:');
  console.error(`   ${error.message}`);
  console.error('\n💡 Revisa los paths de los imports en el archivo mencionado');
  process.exit(1);
}