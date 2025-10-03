// ============================
// MODELOS PRINCIPALES - VERDENEXO
// ============================
// Barrel export general de todos los modelos organizados por módulos

// ============================
// Módulo Usuario
// ============================
export * from './usuario/index.js';

// ============================
// Módulo Producto  
// ============================
export * from './producto/index.js';

// ============================
// Módulo Carrito
// ============================
export * from './carrito/index.js';

// ============================
// Exports por módulo (para importación selectiva)
// ============================
export * as UsuarioModels from './usuario/index.js';
export * as ProductoModels from './producto/index.js';
export * as CarritoModels from './carrito/index.js';

// ============================
// Compatibilidad con imports antiguos
// ============================
// Esto permite que los imports existentes sigan funcionando
export { default as Usuario } from './usuario/usuario.model.js';
export { Producto } from './producto/producto.model.js';
export { default as UsuarioToken } from './usuario/usuario-token.model.js';

// Nuevos modelos del carrito
export { Carrito } from './carrito/carrito.model.js';
export { Cupon } from './carrito/cupon.model.js';
export { ZonaEnvio } from './carrito/zona-envio.model.js';