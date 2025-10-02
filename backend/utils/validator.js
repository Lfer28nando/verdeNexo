import { BadRequest } from "./error.js";

// ===== VALIDACIONES DE USUARIO =====
export const validarNombre = (nombre) => {
  if (typeof nombre !== 'string') throw BadRequest('Nombre debe ser un string.');
  if (nombre.length < 3 || nombre.length > 25) throw BadRequest('Nombre debe contener entre 3 y 25 caracteres.');
  if (!/^[a-zA-Z0-9_]+$/.test(nombre)) throw BadRequest('El nombre solo puede contener letras, números y guiones bajos (_).');
}
export const validarEmail = (email) => {
  if (typeof email !== 'string') throw BadRequest('Email debe ser un string.');
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw BadRequest('Email no tiene un formato válido.');
}
export const validarPassword = (password) => {
  if (typeof password !== 'string') throw BadRequest('Contraseña debe ser un string.');
  if (password.length < 6) throw BadRequest('Contraseña debe contener al menos 6 caracteres.');
  if (!/\d/.test(password)) throw BadRequest('Contraseña debe contener al menos un número.');
}
export const validarRol = (rol) => {
  const ROLES = ['cliente', 'vendedor', 'admin'];
  if (typeof rol !== 'string') throw BadRequest('Rol debe ser un string.');
  if (!ROLES.includes(rol)) throw BadRequest(`Rol inválido. Debe ser uno de: ${ROLES.join(', ')}`);
}
export const validarTelefono = (telefono) => {
  if (typeof telefono !== 'string') throw BadRequest('Teléfono debe ser un string.');
  if (!/^\d{10}$/.test(telefono)) throw BadRequest('Teléfono debe contener 10 dígitos.');
}
export const validarDireccion = (direccion) => {
  if (typeof direccion !== 'string') throw BadRequest('Dirección debe ser un string.');
  if (direccion.length < 5 || direccion.length > 100) throw BadRequest('Dirección debe contener entre 5 y 100 caracteres.');
}
export const validarDocumento = (documento) => {
  if (typeof documento !== 'string') throw BadRequest('Documento debe ser un string.');
  if (!/^\d{7,10}$/.test(documento)) throw BadRequest('Documento debe contener entre 7 y 10 dígitos.');
}

// ===== VALIDACIONES DE PRODUCTO =====
export const validarNombreProducto = (nombre) => {
  if (typeof nombre !== 'string') throw BadRequest('Nombre del producto debe ser un string.');
  if (nombre.length < 3 || nombre.length > 100) throw BadRequest('Nombre del producto debe contener entre 3 y 100 caracteres.');
}

export const validarDescripcion = (descripcion) => {
  if (typeof descripcion !== 'string') throw BadRequest('Descripción debe ser un string.');
  if (descripcion.length > 1000) throw BadRequest('Descripción no puede exceder 1000 caracteres.');
}

export const validarPrecio = (precio) => {
  if (typeof precio !== 'number' || precio <= 0) throw BadRequest('Precio debe ser un número positivo.');
  if (precio > 999999.99) throw BadRequest('Precio no puede exceder $999,999.99');
}

export const validarCategoria = (categoria) => {
  const CATEGORIAS = ['plantas', 'macetas', 'herramientas', 'fertilizantes', 'decoracion', 'semillas'];
  if (typeof categoria !== 'string') throw BadRequest('Categoría debe ser un string.');
  if (!CATEGORIAS.includes(categoria.toLowerCase())) throw BadRequest(`Categoría inválida. Debe ser una de: ${CATEGORIAS.join(', ')}`);
}

export const validarSlug = (slug) => {
  if (typeof slug !== 'string') throw BadRequest('Slug debe ser un string.');
  if (!/^[a-z0-9-]+$/.test(slug)) throw BadRequest('Slug solo puede contener letras minúsculas, números y guiones.');
  if (slug.length < 3 || slug.length > 100) throw BadRequest('Slug debe contener entre 3 y 100 caracteres.');
}

export const validarStock = (stock) => {
  if (typeof stock !== 'number' || stock < 0) throw BadRequest('Stock debe ser un número no negativo.');
  if (!Number.isInteger(stock)) throw BadRequest('Stock debe ser un número entero.');
}

export const validarAtributo = (atributo) => {
  if (typeof atributo !== 'string') throw BadRequest('Atributo debe ser un string.');
  if (atributo.length < 2 || atributo.length > 50) throw BadRequest('Atributo debe contener entre 2 y 50 caracteres.');
}

export const validarValor = (valor) => {
  if (typeof valor !== 'string') throw BadRequest('Valor debe ser un string.');
  if (valor.length < 1 || valor.length > 100) throw BadRequest('Valor debe contener entre 1 y 100 caracteres.');
}