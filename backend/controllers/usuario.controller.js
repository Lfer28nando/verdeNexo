import bcrypt from 'bcrypt';
import Usuario from '../models/usuario.model.js';
import { BadRequest, NotFound, Conflict } from '../utils/error.js';
import enviarCorreo from '../utils/email.service.js';
import { crearTokenOTP, verificarTokenOTP } from '../utils/otp.js';

//validaciones:
class Validaciones {
  static nombre(nombre) {
    if (typeof nombre !== 'string') throw BadRequest('Nombre debe ser un string.');
    if (nombre.length < 3 || nombre.length > 25) throw BadRequest('Nombre debe contener entre 3 y 25 caracteres.');
    if (!/^[a-zA-Z0-9_]+$/.test(nombre)) throw BadRequest('El nombre solo puede contener letras, números y guiones bajos (_).');
  }
  static email(email) {
    if (typeof email !== 'string') throw BadRequest('Email debe ser un string.');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw BadRequest('Email no tiene un formato válido.');
  }
  static password(password) {
    if (typeof password !== 'string') throw BadRequest('Contraseña debe ser un string.');
    if (password.length < 6) throw BadRequest('Contraseña debe contener al menos 6 caracteres.');
    if (!/\d/.test(password)) throw BadRequest('Contraseña debe contener al menos un número.');
  }
  static rol(rol) {
    const ROLES = ['cliente', 'vendedor', 'admin'];
    if (typeof rol !== 'string') throw BadRequest('Rol debe ser un string.');
    if (!ROLES.includes(rol)) throw BadRequest(`Rol inválido. Debe ser uno de: ${ROLES.join(', ')}`);
  }
  static telefono(telefono) {
    if (typeof telefono !== 'string') throw BadRequest('Teléfono debe ser un string.');
    if (!/^\d{10}$/.test(telefono)) throw BadRequest('Teléfono debe contener 10 dígitos.');
  }
  static direccion(direccion) {
    if (typeof direccion !== 'string') throw BadRequest('Dirección debe ser un string.');
    if (direccion.length < 5 || direccion.length > 100) throw BadRequest('Dirección debe contener entre 5 y 100 caracteres.');
  }
  static documento(documento) {
    if (typeof documento !== 'string') throw BadRequest('Documento debe ser un string.');
    if (!/^\d{7,10}$/.test(documento)) throw BadRequest('Documento debe contener entre 7 y 10 dígitos.');
  }
}

export class UsuarioController {
  // RF-USU-01 - Registrar usuario
  static async create({ nombre, email, password, telefono, direccion, documento }) {
    Validaciones.nombre(nombre);
    Validaciones.email(email);
    Validaciones.password(password);
    if (telefono) Validaciones.telefono(telefono);
    if (direccion) Validaciones.direccion(direccion);
    if (documento) Validaciones.documento(documento);

    const hashedPassword = await bcrypt.hash(password, 10);
    const existe = await Usuario.findOne({ $or: [{ nombre }, { email }] });
    if (existe) {
      throw Conflict('El nombre de usuario o correo ya están registrados.');
    }

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
    if (!usuario) throw NotFound('Email no encontrado.');
    if (!usuario.activo) throw BadRequest('Cuenta desactivada. Contacta al soporte.');

    const passwordValida = await bcrypt.compare(password, usuario.password);
    if (!passwordValida) throw BadRequest('Contraseña incorrecta.');

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
    if (!usuarioActualizado) throw NotFound('Usuario no encontrado.');
    return usuarioActualizado;
  }

  //RF-USU-06 (Reestablecer Contraseña) funcion obtener usuario por email (sin exponer password)
  static async getByEmail(email) {
  Validaciones.email(email);
  const user = await Usuario.findOne({ email });
  if (!user) throw NotFound('Email no registrado.');
  return user;
  }

  //RF-USU-07 - Cambiar contraseña (requiere contraseña actual)
  static async changePassword(id, actualPassword, nuevaPassword) {
    if (typeof actualPassword !== 'string' || !actualPassword.trim()) {
      throw BadRequest('Contraseña actual requerida.');
    }
    Validaciones.password(nuevaPassword); // aplica tus reglas (>=6, al menos un número)

    const user = await Usuario.findById(id);
    if (!user) throw NotFound('Usuario no encontrado.');

    const esValida = await bcrypt.compare(actualPassword, user.password);
    if (!esValida) throw BadRequest('Contraseña actual incorrecta.');

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

    if (!actualizado) throw NotFound('Usuario no encontrado.');
    return actualizado;
  }

  //RF-USU-10 - Marcar email como verificado
  static async markEmailVerified(id) {
    const user = await Usuario.findById(id);
    if (!user) throw NotFound('Usuario no encontrado.');
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
    if (!actualizado) throw NotFound('Usuario no encontrado.');
    return actualizado;
  }

  //Validar contraseña (para deshabilitar 2FA con confirmación)
  static async checkPassword(id, password) {
    const user = await Usuario.findById(id);
    if (!user) throw NotFound('Usuario no encontrado.');
    const ok = await bcrypt.compare(password, user.password);
    if (!ok) throw BadRequest('Contraseña actual incorrecta.');
    return true;
  }
  //RF-USU-12 Consentimientos.
    // Estado de consentimiento (simple)
  static async getConsentStatus(id) {
    const user = await Usuario.findById(id).select('consentAccepted');
    if (!user) throw NotFound('Usuario no encontrado.');
    return { consentAccepted: !!user.consentAccepted };
  }

  // Aceptar consentimiento (simple)
  static async acceptConsent(id) {
    const user = await Usuario.findByIdAndUpdate(
      id,
      { consentAccepted: true },
      { new: true }
    ).select('-password -__v');
    if (!user) throw NotFound('Usuario no encontrado.');
    return user;
  }

  // ===== MÉTODOS DE PAGO =====

  // Agregar tarjeta
  static async agregarTarjeta(userId, tarjetaData) {
    const { alias, tipo, numeroCompleto, titular, fechaVencimiento, banco } = tarjetaData;
    
    // Validaciones
    if (!alias || alias.length < 3) throw BadRequest('El alias debe tener al menos 3 caracteres.');
    if (!['credito', 'debito'].includes(tipo)) throw BadRequest('Tipo de tarjeta inválido.');
    if (!numeroCompleto || !/^\d{13,19}$/.test(numeroCompleto.replace(/\s/g, ''))) {
      throw BadRequest('Número de tarjeta inválido.');
    }
    if (!titular || titular.length < 3) throw BadRequest('Titular inválido.');
    if (!fechaVencimiento || !/^(0[1-9]|1[0-2])\/\d{2}$/.test(fechaVencimiento)) {
      throw BadRequest('Fecha de vencimiento inválida (MM/YY).');
    }

    const usuario = await Usuario.findById(userId);
    if (!usuario) throw NotFound('Usuario no encontrado.');

    // Inicializar métodos de pago si no existen
    if (!usuario.metodosPago) {
      usuario.metodosPago = { tarjetas: [], cuentasBancarias: [] };
    }
    if (!usuario.metodosPago.tarjetas) {
      usuario.metodosPago.tarjetas = [];
    }

    // Generar ID único para la tarjeta
    const tarjetaId = `tarjeta_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Obtener solo los últimos 4 dígitos
    const ultimosDigitos = numeroCompleto.replace(/\s/g, '').slice(-4);
    
    // Verificar si ya existe una tarjeta con los mismos últimos dígitos
    const tarjetaExistente = usuario.metodosPago.tarjetas.find(
      t => t.ultimosDigitos === ultimosDigitos && t.titular === titular
    );
    if (tarjetaExistente) {
      throw Conflict('Ya tienes registrada una tarjeta con estos datos.');
    }

    const nuevaTarjeta = {
      id: tarjetaId,
      alias,
      tipo,
      ultimosDigitos,
      titular,
      fechaVencimiento,
      banco: banco || '',
      predeterminada: usuario.metodosPago.tarjetas.length === 0, // Primera tarjeta es predeterminada
      fechaCreacion: new Date()
    };

    usuario.metodosPago.tarjetas.push(nuevaTarjeta);
    await usuario.save();

    return nuevaTarjeta;
  }

  // Agregar cuenta bancaria
  static async agregarCuentaBancaria(userId, cuentaData) {
    const { alias, banco, tipoCuenta, numeroCuenta, titular } = cuentaData;
    
    // Validaciones
    if (!alias || alias.length < 3) throw BadRequest('El alias debe tener al menos 3 caracteres.');
    if (!banco || banco.length < 3) throw BadRequest('Banco inválido.');
    if (!['ahorros', 'corriente'].includes(tipoCuenta)) throw BadRequest('Tipo de cuenta inválido.');
    if (!numeroCuenta || !/^\d{8,20}$/.test(numeroCuenta)) {
      throw BadRequest('Número de cuenta inválido.');
    }
    if (!titular || titular.length < 3) throw BadRequest('Titular inválido.');

    const usuario = await Usuario.findById(userId);
    if (!usuario) throw NotFound('Usuario no encontrado.');

    // Inicializar métodos de pago si no existen
    if (!usuario.metodosPago) {
      usuario.metodosPago = { tarjetas: [], cuentasBancarias: [] };
    }
    if (!usuario.metodosPago.cuentasBancarias) {
      usuario.metodosPago.cuentasBancarias = [];
    }

    // Generar ID único para la cuenta
    const cuentaId = `cuenta_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Verificar si ya existe la cuenta
    const cuentaExistente = usuario.metodosPago.cuentasBancarias.find(
      c => c.numeroCuenta === numeroCuenta && c.banco === banco
    );
    if (cuentaExistente) {
      throw Conflict('Ya tienes registrada esta cuenta bancaria.');
    }

    const nuevaCuenta = {
      id: cuentaId,
      alias,
      banco,
      tipoCuenta,
      numeroCuenta, // En producción, esto debería estar encriptado
      titular,
      predeterminada: usuario.metodosPago.cuentasBancarias.length === 0, // Primera cuenta es predeterminada
      fechaCreacion: new Date()
    };

    usuario.metodosPago.cuentasBancarias.push(nuevaCuenta);
    await usuario.save();

    return nuevaCuenta;
  }

  // Eliminar tarjeta
  static async eliminarTarjeta(userId, tarjetaId) {
    const usuario = await Usuario.findById(userId);
    if (!usuario) throw NotFound('Usuario no encontrado.');
    if (!usuario.metodosPago || !usuario.metodosPago.tarjetas) {
      throw BadRequest('No tienes tarjetas registradas.');
    }

    const index = usuario.metodosPago.tarjetas.findIndex(t => t.id === tarjetaId);
    if (index === -1) throw NotFound('Tarjeta no encontrada.');

    usuario.metodosPago.tarjetas.splice(index, 1);
    await usuario.save();

    return { mensaje: 'Tarjeta eliminada correctamente.' };
  }

  // Eliminar cuenta bancaria
  static async eliminarCuentaBancaria(userId, cuentaId) {
    const usuario = await Usuario.findById(userId);
    if (!usuario) throw NotFound('Usuario no encontrado.');
    if (!usuario.metodosPago || !usuario.metodosPago.cuentasBancarias) {
      throw BadRequest('No tienes cuentas bancarias registradas.');
    }

    const index = usuario.metodosPago.cuentasBancarias.findIndex(c => c.id === cuentaId);
    if (index === -1) throw NotFound('Cuenta bancaria no encontrada.');

    usuario.metodosPago.cuentasBancarias.splice(index, 1);
    await usuario.save();

    return { mensaje: 'Cuenta bancaria eliminada correctamente.' };
  }

  // Establecer método de pago predeterminado
  static async establecerPredeterminado(userId, tipo, metodoPagoId) {
    const usuario = await Usuario.findById(userId);
    if (!usuario) throw NotFound('Usuario no encontrado.');
    if (!usuario.metodosPago) throw BadRequest('No tienes métodos de pago registrados.');

    if (tipo === 'tarjeta') {
      if (!usuario.metodosPago.tarjetas) throw BadRequest('No tienes tarjetas registradas.');
      
      // Quitar predeterminado de todas las tarjetas
      usuario.metodosPago.tarjetas.forEach(t => t.predeterminada = false);
      
      // Establecer la nueva predeterminada
      const tarjeta = usuario.metodosPago.tarjetas.find(t => t.id === metodoPagoId);
      if (!tarjeta) throw NotFound('Tarjeta no encontrada.');
      tarjeta.predeterminada = true;
      
    } else if (tipo === 'cuenta') {
      if (!usuario.metodosPago.cuentasBancarias) throw BadRequest('No tienes cuentas bancarias registradas.');
      
      // Quitar predeterminado de todas las cuentas
      usuario.metodosPago.cuentasBancarias.forEach(c => c.predeterminada = false);
      
      // Establecer la nueva predeterminada
      const cuenta = usuario.metodosPago.cuentasBancarias.find(c => c.id === metodoPagoId);
      if (!cuenta) throw NotFound('Cuenta bancaria no encontrada.');
      cuenta.predeterminada = true;
      
    } else {
      throw BadRequest('Tipo de método de pago inválido.');
    }

    await usuario.save();
    return { mensaje: 'Método de pago predeterminado actualizado.' };
  }

  // Obtener métodos de pago del usuario
  static async obtenerMetodosPago(userId) {
    const usuario = await Usuario.findById(userId);
    if (!usuario) throw NotFound('Usuario no encontrado.');
    
    return {
      tarjetas: usuario.metodosPago?.tarjetas || [],
      cuentasBancarias: usuario.metodosPago?.cuentasBancarias || []
    };
  }

  // ===== GESTIÓN DE BAJA DE USUARIO =====

  // Solicitar baja de usuario (genera OTP y envía email)
  static async solicitarBajaUsuario(userId) {
    const usuario = await Usuario.findById(userId);
    if (!usuario) throw NotFound('Usuario no encontrado.');
    if (!usuario.activo) throw BadRequest('La cuenta ya está desactivada.');

    const { codigo } = await crearTokenOTP(usuario._id, 'deactivate', 10);
    await enviarCorreo(
      usuario.email,
      'Código para desactivar tu cuenta',
      `<p>Hola ${usuario.nombre}, tu código es <b>${codigo}</b> (válido 10 min).</p>`
    );
    return { email: usuario.email };
  }

  // Confirmar baja de usuario (verifica OTP y desactiva cuenta)
  static async confirmarBajaUsuario(userId, codigo, reason = 'Solicitud del usuario') {
    await verificarTokenOTP(userId, 'deactivate', codigo);
    const usuarioActualizado = await Usuario.findByIdAndUpdate(
      userId,
      { activo: false },
      { new: true }
    ).select('-password -__v');
    
    if (!usuarioActualizado) throw NotFound('Usuario no encontrado.');
    return { ok: true, message: 'Cuenta desactivada correctamente' };
  }

}

