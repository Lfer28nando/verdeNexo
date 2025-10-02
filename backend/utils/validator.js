import { BadRequest } from "./error.js";

//validaciones:
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