import bcrypt from 'bcrypt';
import Usuario from '../models/usuario.model.js';

//validaciones:
class Validaciones {
  static nombre(nombre) {
    if (typeof nombre !== 'string') throw new Error('Nombre debe ser un string.');
    if (nombre.length < 3 || nombre.length > 25) throw new Error('Nombre debe contener entre 3 y 25 caracteres.');
    if (!/^[a-zA-Z0-9_]+$/.test(nombre)) throw new Error('El nombre solo puede contener letras, números y guiones bajos (_).');
  }
  static email(email) {
    if (typeof email !== 'string') throw new Error('Email debe ser un string.');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error('Email no tiene un formato válido.');
  }
  static password(password) {
    if (typeof password !== 'string') throw new Error('Contraseña debe ser un string.');
    if (password.length < 6) throw new Error('Contraseña debe contener al menos 6 caracteres.');
    if (!/\d/.test(password)) throw new Error('Contraseña debe contener al menos un número.');
  }
  static rol(rol) {
    const ROLES = ['cliente', 'vendedor', 'admin'];
    if (typeof rol !== 'string') throw new Error('Rol debe ser un string.');
    if (!ROLES.includes(rol)) throw new Error(`Rol inválido. Debe ser uno de: ${ROLES.join(', ')}`);
  }
  static telefono(telefono) {
    if (typeof telefono !== 'string') throw new Error('Teléfono debe ser un string.');
    if (!/^\d{10}$/.test(telefono)) throw new Error('Teléfono debe contener 10 dígitos.');
  }
  static direccion(direccion) {
    if (typeof direccion !== 'string') throw new Error('Dirección debe ser un string.');
    if (direccion.length < 5 || direccion.length > 100) throw new Error('Dirección debe contener entre 5 y 100 caracteres.');
  }
  static documento(documento) {
    if (typeof documento !== 'string') throw new Error('Documento debe ser un string.');
    if (!/^\d{7,10}$/.test(documento)) throw new Error('Documento debe contener entre 7 y 10 dígitos.');
  }
}


export class UsuarioController {
  // RF-USU-01 - Registrar usuario.
  static async create({ nombre, email, password, telefono, direccion, documento }) {
    Validaciones.nombre(nombre);
    Validaciones.email(email);
    Validaciones.password(password);
    if (telefono) Validaciones.telefono(telefono);
    if (direccion) Validaciones.direccion(direccion);
    if (documento) Validaciones.documento(documento);

    const hashedPassword = await bcrypt.hash(password, 10);
    const existe = await Usuario.findOne({ $or: [{ nombre }, { email }] });
    if (existe) throw new Error('El nombre de usuario o correo ya están registrados.');

    const nuevoUsuario = new Usuario({
      nombre,
      email,
      password: hashedPassword,
      telefono,
      direccion,
      documento
    });
    return await nuevoUsuario.save();
  }

  // RF-USU-02 - Iniciar sesión.
  static async login({ email, password }) {
    Validaciones.email(email);
    Validaciones.password(password);

    const usuario = await Usuario.findOne({ email });
    if (!usuario) throw new Error('Email no encontrado.');
    if (!usuario.activo) throw new Error('Cuenta desactivada. Contacta al soporte.');

    const passwordValida = await bcrypt.compare(password, usuario.password);
    if (!passwordValida) throw new Error('Contraseña incorrecta.');

    return usuario;
  }

  // RF-USU-03 - Ver perfil.
  static async getById(id) {
    return await Usuario.findById(id).select('-password -__v');
  }

  // RF-USU-04 - Editar perfil.
  static async update(id, data) {
    if (data.nombre) Validaciones.nombre(data.nombre);
    if (data.email) Validaciones.email(data.email);
    if (data.password) {
      Validaciones.password(data.password);
      data.password = await bcrypt.hash(data.password, 10);
    }
    if (data.telefono) Validaciones.telefono(data.telefono);
    if (data.direccion) Validaciones.direccion(data.direccion);
    if (data.documento) Validaciones.documento(data.documento);

    const usuarioActualizado = await Usuario.findByIdAndUpdate(id, data, { new: true }).select('-password -__v');
    if (!usuarioActualizado) throw new Error('Usuario no encontrado.');
    return usuarioActualizado;
  }

  //RF-USU-06 (Reestablecer Contraseña) funcion obtener usuario por email (sin exponer password)
  static async getByEmail(email) {
  Validaciones.email(email);
  const user = await Usuario.findOne({ email });
  if (!user) throw new Error('Email no registrado.');
  return user;
  }

  //RF-USU-07 - Cambiar contraseña (requiere contraseña actual)
  static async changePassword(id, actualPassword, nuevaPassword) {
    if (typeof actualPassword !== 'string' || !actualPassword.trim()) {
      throw new Error('Contraseña actual requerida.');
    }
    Validaciones.password(nuevaPassword); // aplica tus reglas (>=6, al menos un número)

    const user = await Usuario.findById(id);
    if (!user) throw new Error('Usuario no encontrado.');

    const esValida = await bcrypt.compare(actualPassword, user.password);
    if (!esValida) throw new Error('Contraseña actual incorrecta.');

    user.password = await bcrypt.hash(nuevaPassword, 10);
    await user.save();

    // devolver sin password
    const { _id, nombre, email, rol, activo, createdAt, updatedAt } = user;
    return { _id, nombre, email, rol, activo, createdAt, updatedAt };
  }
  //RF-USU-09 - Gestionar roles.
    //Listar usuarios (admin)
  static async list({ page = 1, limit = 10, q = '', rol = '' } = {}) {
    const filter = {};
    if (q && typeof q === 'string') {
      filter.$or = [
        { nombre: new RegExp(q, 'i') },
        { email: new RegExp(q, 'i') }
      ];
    }
    if (rol) {
      Validaciones.rol(rol);
      filter.rol = rol;
    }

    const skip = (Number(page) - 1) * Number(limit);
    const [docs, total] = await Promise.all([
      Usuario.find(filter).select('-password -__v').sort({ createdAt: -1 }).skip(skip).limit(Number(limit)),
      Usuario.countDocuments(filter)
    ]);

    return { docs, total, page: Number(page), pages: Math.ceil(total / Number(limit)) };
  }

  //Cambiar rol (admin)
  static async changeRole(id, rol) {
    Validaciones.rol(rol);
    const actualizado = await Usuario.findByIdAndUpdate(
      id,
      { rol },
      { new: true }
    ).select('-password -__v');

    if (!actualizado) throw new Error('Usuario no encontrado.');
    return actualizado;
  }

  //RF-USU-10 - Marcar email como verificado
  static async markEmailVerified(id) {
    const user = await Usuario.findById(id);
    if (!user) throw new Error('Usuario no encontrado.');
    if (user.emailVerificado) {
      return {
        _id: user._id,
        nombre: user.nombre,
        email: user.email,
        rol: user.rol,
        activo: user.activo,
        emailVerificado: true,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt
      };
    }
    user.emailVerificado = true;
    await user.save();
    const { _id, nombre, email, rol, activo, emailVerificado, createdAt, updatedAt } = user;
    return { _id, nombre, email, rol, activo, emailVerificado, createdAt, updatedAt };
  }

  //RF-USU-11 - Usar doble factor de verificación. 
  // Habilitar/Deshabilitar 2FA (admin o usuario autenticado según ruta)
  static async setTwoFactorEnabled(id, enabled) {
    const actualizado = await Usuario.findByIdAndUpdate(
      id,
      { twoFactorEnabled: !!enabled },
      { new: true }
    ).select('-password -__v');
    if (!actualizado) throw new Error('Usuario no encontrado.');
    return actualizado;
  }

  //Validar contraseña (para deshabilitar 2FA con confirmación)
  static async checkPassword(id, password) {
    const user = await Usuario.findById(id);
    if (!user) throw new Error('Usuario no encontrado.');
    const ok = await bcrypt.compare(password, user.password);
    if (!ok) throw new Error('Contraseña actual incorrecta.');
    return true;
  }
  //RF-USU-12 Consentimientos.
    // Estado de consentimiento (simple)
  static async getConsentStatus(id) {
    const user = await Usuario.findById(id).select('consentAccepted');
    if (!user) throw new Error('Usuario no encontrado.');
    return { consentAccepted: !!user.consentAccepted };
  }

  // Aceptar consentimiento (simple)
  static async acceptConsent(id) {
    const user = await Usuario.findByIdAndUpdate(
      id,
      { consentAccepted: true },
      { new: true }
    ).select('-password -__v');
    if (!user) throw new Error('Usuario no encontrado.');
    return user;
  }

}

