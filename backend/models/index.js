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
// Exports por módulo (para importación selectiva)
// ============================
export * as UsuarioModels from './usuario/index.js';
export * as ProductoModels from './producto/index.js';

// ============================
// Compatibilidad con imports antiguos
// ============================
// Esto permite que los imports existentes sigan funcionando
export { default as Usuario } from './usuario/usuario.model.js';
export { Producto } from './producto/producto.model.js';
export { default as UsuarioToken } from './usuario/usuario-token.model.js';