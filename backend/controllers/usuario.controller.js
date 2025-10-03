import bcrypt from 'bcrypt';
import { Usuario } from '../models/usuario/index.js';
import { BadRequest, NotFound, Conflict } from '../utils/error.js';
import enviarCorreo from '../utils/email.service.js';
import { crearTokenOTP, verificarTokenOTP } from '../utils/otp.js';
import { validarDireccion, validarDocumento, validarEmail, validarNombre, validarPassword, validarRol, validarTelefono, } from '../utils/validator.js';
import { UsuarioService } from '../services/usuario.service.js';

export class UsuarioController {
  // RF-USU-01 - Registrar usuario
  static async create({ nombre, email, password, telefono, direccion, documento }) {
    // Delegar lógica de negocio al service
    return await UsuarioService.crearUsuario({ nombre, email, password, telefono, direccion, documento });
  }

  // RF-USU-02 - Iniciar sesión.
  static async login({ email, password }) {
    // Delegar lógica de negocio al service
    return await UsuarioService.autenticarUsuario({ email, password });
  }

  // RF-USU-03 - Ver perfil.
  static async getById(id) {
    // Delegar al service
    return await UsuarioService.obtenerPorId(id);
  }

  // RF-USU-04 - Editar perfil.
  static async update(id, data) {
    // Delegar lógica de negocio al service
    return await UsuarioService.actualizarUsuario(id, data);
  }

  //RF-USU-06 (Reestablecer Contraseña) funcion obtener usuario por email (sin exponer password)
  static async getByEmail(email) {
    // Delegar al service
    return await UsuarioService.obtenerPorEmail(email);
  }

  //RF-USU-07 - Cambiar contraseña (requiere contraseña actual)
  static async changePassword(id, actualPassword, nuevaPassword) {
    return await UsuarioService.cambiarPassword(id, actualPassword, nuevaPassword);
  }
  //RF-USU-09 - Gestionar roles.
    //Listar usuarios (admin)
  static async list({ page = 1, limit = 10, q = '', rol = '' } = {}) {
    return await UsuarioService.listarUsuarios({ page, limit, q, rol });
  }

  //Cambiar rol (admin)
  static async changeRole(id, rol) {
    return await UsuarioService.cambiarRol(id, rol);
  }

  //RF-USU-10 - Marcar email como verificado
  static async markEmailVerified(id) {
    return await UsuarioService.marcarEmailVerificado(id);
  }

  //RF-USU-11 - Usar doble factor de verificación. 
  // Habilitar/Deshabilitar 2FA (admin o usuario autenticado según ruta)
  static async setTwoFactorEnabled(id, enabled) {
    return await UsuarioService.configurar2FA(id, enabled);
  }

  //Validar contraseña (para deshabilitar 2FA con confirmación)
  static async checkPassword(id, password) {
    return await UsuarioService.verificarPassword(id, password);
  }
  //RF-USU-12 Consentimientos.
    // Estado de consentimiento (simple)
  static async getConsentStatus(id) {
    return await UsuarioService.obtenerEstadoConsentimiento(id);
  }

  // Aceptar consentimiento (simple)
  static async acceptConsent(id) {
    return await UsuarioService.aceptarConsentimiento(id);
  }

  // ===== MÉTODOS DE PAGO =====

  // Agregar tarjeta
  static async agregarTarjeta(userId, tarjetaData) {
    return await UsuarioService.agregarTarjeta(userId, tarjetaData);
  }

  // Agregar cuenta bancaria
  static async agregarCuentaBancaria(userId, cuentaData) {
    return await UsuarioService.agregarCuentaBancaria(userId, cuentaData);
  }

  // Eliminar tarjeta
  static async eliminarTarjeta(userId, tarjetaId) {
    return await UsuarioService.eliminarTarjeta(userId, tarjetaId);
  }

  // Eliminar cuenta bancaria
  static async eliminarCuentaBancaria(userId, cuentaId) {
    return await UsuarioService.eliminarCuentaBancaria(userId, cuentaId);
  }

  // Establecer método de pago predeterminado
  static async establecerPredeterminado(userId, tipo, metodoPagoId) {
    return await UsuarioService.establecerPredeterminado(userId, tipo, metodoPagoId);
  }

  // Obtener métodos de pago del usuario
  static async obtenerMetodosPago(userId) {
    return await UsuarioService.obtenerMetodosPago(userId);
  }

  // ===== GESTIÓN DE BAJA DE USUARIO =====

  // Solicitar baja de usuario (genera OTP y envía email)
  static async solicitarBajaUsuario(userId) {
    return await UsuarioService.solicitarBajaUsuario(userId);
  }

  // Confirmar baja de usuario (verifica OTP y desactiva cuenta)
  static async confirmarBajaUsuario(userId, codigo, reason = 'Solicitud del usuario') {
    return await UsuarioService.confirmarBajaUsuario(userId, codigo, reason);
  }

}

