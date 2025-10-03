// models/carrito/index.js
// ============================
// BARREL EXPORT PARA MÓDULO CARRITO
// ============================

// Exportar todos los modelos del módulo carrito
export { Carrito } from './carrito.model.js';
export { Cupon } from './cupon.model.js';
export { ZonaEnvio } from './zona-envio.model.js';

// Export como namespace para importación agrupada
export * as CarritoModels from './carrito.model.js';
export * as CuponModels from './cupon.model.js';
export * as ZonaEnvioModels from './zona-envio.model.js';
