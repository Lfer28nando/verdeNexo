import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import Usuario from '../models/usuario.model.js';
import { BadRequest, NotFound, Conflict } from '../utils/error.js';
import { validarDireccion, validarDocumento, validarEmail, validarNombre, validarPassword, validarTelefono, validarRol } from '../utils/validator.js';
import enviarCorreo from '../utils/email.service.js';
import { crearTokenOTP, verificarTokenOTP } from '../utils/otp.js';

export class UsuarioService {
  
  // RF-USU-01 - Registrar usuario (solo lógica de negocio)
  static async crearUsuario({ nombre, email, password, telefono, direccion, documento }) {
    // 1) Sanitización
    const nombreClean = typeof nombre === 'string' ? nombre.trim() : nombre;
    const emailClean = typeof email === 'string' ? email.trim().toLowerCase() : email;
    const telefonoClean = typeof telefono === 'string' ? telefono.replace(/[\s\-()]/g, '') : telefono;
    const direccionClean = typeof direccion === 'string' ? direccion.trim() : direccion;
    const documentoClean = typeof documento === 'string' ? documento.replace(/[^\d]/g, '') : documento;

    // 2) Validaciones con datos limpios
    validarNombre(nombreClean);
    validarEmail(emailClean);
    validarPassword(password);
    if (telefonoClean) validarTelefono(telefonoClean);
    if (direccionClean) validarDireccion(direccionClean);
    if (documentoClean) validarDocumento(documentoClean);

    // 3) Verificar unicidad con datos limpios
    const existe = await Usuario.findOne({ $or: [{ nombre: nombreClean }, { email: emailClean }] });
    if (existe) {
      throw Conflict('El nombre de usuario o correo ya están registrados.');
    }

    // 4) Hash de contraseña
    const hashedPassword = await bcrypt.hash(password, 10);

    // 5) Crear y guardar usuario
    const nuevoUsuario = new Usuario({
      nombre: nombreClean,
      email: emailClean,
      password: hashedPassword,
      telefono: telefonoClean,
      direccion: direccionClean,
      documento: documentoClean
    });

    const usuarioGuardado = await nuevoUsuario.save();
    
    // 6) Retornar sin password
    return {
      _id: usuarioGuardado._id,
      nombre: usuarioGuardado.nombre,
      email: usuarioGuardado.email,
      rol: usuarioGuardado.rol,
      activo: usuarioGuardado.activo,
      emailVerificado: usuarioGuardado.emailVerificado,
      createdAt: usuarioGuardado.createdAt,
      updatedAt: usuarioGuardado.updatedAt
    };
  }

  // RF-USU-02 - Iniciar sesión (solo lógica de negocio)
  static async autenticarUsuario({ email, password }) {
    // 1) Sanitización
    const emailClean = typeof email === 'string' ? email.trim().toLowerCase() : email;

    // 2) Validaciones con datos limpios
    validarEmail(emailClean);
    validarPassword(password);

    // 3) Buscar usuario con email limpio
    const usuario = await Usuario.findOne({ email: emailClean });
    if (!usuario) throw NotFound('Email no encontrado.');
    if (!usuario.activo) throw BadRequest('Cuenta desactivada. Contacta al soporte.');

    // 4) Verificar contraseña
    const passwordValida = await bcrypt.compare(password, usuario.password);
    if (!passwordValida) throw BadRequest('Contraseña incorrecta.');

    // 5) Retornar datos del usuario sin password
    return {
      _id: usuario._id,
      nombre: usuario.nombre,
      email: usuario.email,
      rol: usuario.rol,
      activo: usuario.activo,
      emailVerificado: usuario.emailVerificado,
      twoFactorEnabled: usuario.twoFactorEnabled,
      createdAt: usuario.createdAt,
      updatedAt: usuario.updatedAt
    };
  }

  // RF-USU-04 - Editar perfil (solo lógica de negocio)
  static async actualizarUsuario(id, data) {
    // 1) Sanitización de campos presentes
    const cleanData = { ...data };
    if (cleanData.nombre) cleanData.nombre = cleanData.nombre.trim();
    if (cleanData.email) cleanData.email = cleanData.email.trim().toLowerCase();
    if (cleanData.telefono) cleanData.telefono = cleanData.telefono.replace(/[\s\-()]/g, '');
    if (cleanData.direccion) cleanData.direccion = cleanData.direccion.trim();
    if (cleanData.documento) cleanData.documento = cleanData.documento.replace(/[^\d]/g, '');

    // 2) Validaciones con datos limpios
    if (cleanData.nombre) validarNombre(cleanData.nombre);
    if (cleanData.email) validarEmail(cleanData.email);
    if (cleanData.password) {
      validarPassword(cleanData.password);
      cleanData.password = await bcrypt.hash(cleanData.password, 10);
    }
    if (cleanData.telefono) validarTelefono(cleanData.telefono);
    if (cleanData.direccion) validarDireccion(cleanData.direccion);
    if (cleanData.documento) validarDocumento(cleanData.documento);

    // 3) Verificar que el usuario existe y actualizar
    const usuarioActualizado = await Usuario.findByIdAndUpdate(id, cleanData, { 
      new: true, 
      runValidators: true 
    }).select('-password -__v');
    
    if (!usuarioActualizado) throw NotFound('Usuario no encontrado.');
    
    return usuarioActualizado;
  }

  // Helper: Obtener usuario por ID (reutilizable)
  static async obtenerPorId(id) {
    const usuario = await Usuario.findById(id).select('-password -__v');
    if (!usuario) throw NotFound('Usuario no encontrado.');
    return usuario;
  }

  // Helper: Obtener usuario por email (reutilizable)
  static async obtenerPorEmail(email) {
    // 1) Sanitización
    const emailClean = typeof email === 'string' ? email.trim().toLowerCase() : email;
    
    // 2) Validación
    validarEmail(emailClean);
    
    // 3) Buscar con email limpio
    const user = await Usuario.findOne({ email: emailClean });
    if (!user) throw NotFound('Email no registrado.');
    return user;
  }

  // RF-USU-07 - Cambiar contraseña (requiere contraseña actual)
  static async cambiarPassword(id, actualPassword, nuevaPassword) {
    // 1) Validaciones
    if (typeof actualPassword !== 'string' || !actualPassword.trim()) {
      throw BadRequest('Contraseña actual requerida.');
    }
    validarPassword(nuevaPassword);

    // 2) Obtener usuario
    const user = await Usuario.findById(id);
    if (!user) throw NotFound('Usuario no encontrado.');

    // 3) Verificar contraseña actual
    const esValida = await bcrypt.compare(actualPassword, user.password);
    if (!esValida) throw BadRequest('Contraseña actual incorrecta.');

    // 4) Actualizar contraseña
    user.password = await bcrypt.hash(nuevaPassword, 10);
    await user.save();

    // 5) Devolver sin password
    return {
      _id: user._id,
      nombre: user.nombre,
      email: user.email,
      rol: user.rol,
      activo: user.activo,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt
    };
  }

  // Helper: Verificar contraseña (para 2FA, etc.)
  static async verificarPassword(id, password) {
    const user = await Usuario.findById(id);
    if (!user) throw NotFound('Usuario no encontrado.');
    const ok = await bcrypt.compare(password, user.password);
    if (!ok) throw BadRequest('Contraseña actual incorrecta.');
    return true;
  }

  // RF-USU-09 - Listar usuarios (admin)
  static async listarUsuarios({ page = 1, limit = 10, q = '', rol = '' } = {}) {
    const filter = {};
    
    // Filtro de búsqueda por texto
    if (q && typeof q === 'string') {
      filter.$or = [
        { nombre: new RegExp(q, 'i') },
        { email: new RegExp(q, 'i') }
      ];
    }
    
    // Filtro por rol
    if (rol) {
      validarRol(rol);
      filter.rol = rol;
    }

    const skip = (Number(page) - 1) * Number(limit);
    const [docs, total] = await Promise.all([
      Usuario.find(filter).select('-password -__v').sort({ createdAt: -1 }).skip(skip).limit(Number(limit)),
      Usuario.countDocuments(filter)
    ]);

    return { 
      docs, 
      total, 
      page: Number(page), 
      pages: Math.ceil(total / Number(limit)) 
    };
  }

  // Cambiar rol de usuario (admin)
  static async cambiarRol(id, rol) {
    validarRol(rol);
    const actualizado = await Usuario.findByIdAndUpdate(
      id,
      { rol },
      { new: true }
    ).select('-password -__v');

    if (!actualizado) throw NotFound('Usuario no encontrado.');
    return actualizado;
  }

  // RF-USU-10 - Marcar email como verificado
  static async marcarEmailVerificado(id) {
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
    
    return {
      _id: user._id,
      nombre: user.nombre,
      email: user.email,
      rol: user.rol,
      activo: user.activo,
      emailVerificado: user.emailVerificado,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt
    };
  }

  // RF-USU-11 - Configurar 2FA
  static async configurar2FA(id, enabled) {
    const actualizado = await Usuario.findByIdAndUpdate(
      id,
      { twoFactorEnabled: !!enabled },
      { new: true }
    ).select('-password -__v');

    if (!actualizado) throw NotFound('Usuario no encontrado.');
    return actualizado;
  }

  // RF-USU-12 - Consentimientos
  static async obtenerEstadoConsentimiento(id) {
    const user = await Usuario.findById(id).select('consentAccepted');
    if (!user) throw NotFound('Usuario no encontrado.');
    return { consentAccepted: !!user.consentAccepted };
  }

  static async aceptarConsentimiento(id) {
    const user = await Usuario.findByIdAndUpdate(
      id,
      { consentAccepted: true },
      { new: true }
    ).select('-password -__v');
    if (!user) throw NotFound('Usuario no encontrado.');
    return user;
  }

  // ===== MÉTODOS DE PAGO =====
  
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
      predeterminada: usuario.metodosPago.tarjetas.length === 0,
      fechaCreacion: new Date()
    };

    usuario.metodosPago.tarjetas.push(nuevaTarjeta);
    await usuario.save();

    return nuevaTarjeta;
  }

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
      numeroCuenta,
      titular,
      predeterminada: usuario.metodosPago.cuentasBancarias.length === 0,
      fechaCreacion: new Date()
    };

    usuario.metodosPago.cuentasBancarias.push(nuevaCuenta);
    await usuario.save();

    return nuevaCuenta;
  }

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

  static async obtenerMetodosPago(userId) {
    const usuario = await Usuario.findById(userId).select('metodosPago');
    if (!usuario) throw NotFound('Usuario no encontrado.');
    
    return usuario.metodosPago || { tarjetas: [], cuentasBancarias: [] };
  }

  // ===== GESTIÓN DE BAJA DE USUARIO =====
  
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