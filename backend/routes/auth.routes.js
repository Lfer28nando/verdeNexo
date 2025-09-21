//Importaciones:
import express from 'express';
import jwt from 'jsonwebtoken';
import { UsuarioController as usuarioModel } from '../controllers/usuario.controller.js';
import enviarCorreo, { enviarCorreoBienvenida } from '../utils/email.service.js';
import cookieParser from 'cookie-parser';
import { soloAdmin, verificarToken } from '../middlewares/auth.js';
import { crearTokenOTP, verificarTokenOTP } from '../utils/otp.js';
//Instancia de Enrutador:
const router = express.Router();

// Middleware para parsear cookies
router.use(cookieParser());

//Rutas de autenticación de usuarios:
// RF-USU-01 - Registrar usuario:
router.post('/registro', async (req, res) => {
  try {
    const { nombre, email, password, telefono, direccion, documento } = req.body;
    // Usamos usuarioModel.create para registrar y validar
    const nuevoUsuario = await usuarioModel.create({ nombre, email, password, telefono, direccion, documento });
    
    // Enviar correo de bienvenida profesional
    const resultadoCorreo = await enviarCorreoBienvenida(email, {
      projectName: 'Verde Nexo',
      ctaUrl: process.env.WEBSITE_URL || 'http://localhost:3000',
      ctaText: 'Explorar plantas',
      colors: {
        lightBg: '#F0F9F4',
        primary: '#166534',
        accent: '#22C55E',
        text: '#111827',
        footerBg: '#F9FAFB'
      }
    });

    if (resultadoCorreo.ok) {
      res.status(201).json({ 
        mensaje: 'Usuario registrado exitosamente', 
        usuario: {
          id: nuevoUsuario._id,
          nombre: nuevoUsuario.nombre,
          email: nuevoUsuario.email,
          rol: nuevoUsuario.rol
        }
      });
    } else {
      // Usuario creado pero falló el correo
      res.status(201).json({ 
        mensaje: 'Usuario registrado, pero no se pudo enviar el correo de bienvenida', 
        usuario: {
          id: nuevoUsuario._id,
          nombre: nuevoUsuario.nombre,
          email: nuevoUsuario.email,
          rol: nuevoUsuario.rol
        },
        advertencia: 'Correo no enviado'
      });
    }
  } catch (error) {
    res.status(500).json({ mensaje: 'Error al registrar el usuario', error: error.message });
  }
});

//RF-USU-02 - Iniciar sesión:
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    // 1) Validar credenciales
const usuario = await usuarioModel.login({ email, password });

// 2) Si 2FA NO está activo → login normal
if (!usuario.twoFactorEnabled) {
  const token = jwt.sign({ id: usuario._id, rol: usuario.rol }, process.env.JWT_SECRET, { expiresIn: '1h' });
  res.cookie('token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    maxAge: 3600000
  });
  return res.status(200).json({
    mensaje: 'Login exitoso',
    usuario: { id: usuario._id, nombre: usuario.nombre, email: usuario.email, rol: usuario.rol }
  });
}

// 3) Si 2FA SÍ está activo → enviar OTP y emitir "pretoken" temporal (pendiente 2FA)
const { codigo } = await crearTokenOTP(usuario._id, '2fa', 10);
await enviarCorreo(
  usuario.email,
  'Tu código de verificación (2FA)',
  `<p>Hola ${usuario.nombre}, tu código 2FA es: <b style="font-size:18px">${codigo}</b> (vigencia 10 minutos).</p>`
);

const pretoken = jwt.sign(
  { id: usuario._id, rol: usuario.rol, twofa: 'pending' },
  process.env.JWT_SECRET,
  { expiresIn: '10m' }
);
res.cookie('pretoken', pretoken, {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  maxAge: 10 * 60 * 1000
});

return res.status(200).json({ mensaje: 'Se envió un código 2FA a tu correo. Confírmalo para iniciar sesión.' });
  } catch (error) {
    res.status(401).json({ mensaje: 'Error al iniciar sesión', error: error.message });
  }
});

//RF-USU-03 - Ver perfil.
router.get('/me', verificarToken, async (req, res) => {
  try {
    const usuario = await usuarioModel.getById(req.usuario.id);
    if (!usuario) {
      return res.status(404).json({ mensaje: 'Usuario no encontrado' });
    }
    res.status(200).json({ usuario });
  } catch (error) {
    res.status(500).json({ mensaje: 'Error al obtener el perfil', error: error.message });
  }
});

// RF-USU-04 - Editar perfil
router.put('/me', verificarToken, async (req, res) => {
  try {
    const id = req.usuario.id; // del token decodificado
    // Solo permitimos estos campos para /me (nada de rol/activo/etc.)
    const { nombre, email, password, telefono, direccion, documento } = req.body;
    const data = { nombre, email, password, telefono, direccion, documento };
    const usuarioActualizado = await usuarioModel.update(id, data);

    res.status(200).json({
      mensaje: 'Perfil actualizado correctamente',
      usuario: usuarioActualizado
    });
  } catch (error) {
    res.status(400).json({ mensaje: 'error', error: error.message });
  }
});

// RF-USU-05 - Eliminar cuenta.

// 1) Solicitar código de verificación para desactivar cuenta
router.post('/me/desactivar/request', verificarToken, async (req, res) => {
  try {
    // Crea OTP (6 dígitos) y envíalo por correo
    const { codigo } = await crearTokenOTP(req.usuario.id, 'desactivar', 10); // 10 min
    const perfil = await usuarioModel.getById(req.usuario.id);

    await enviarCorreo(
      perfil.email,
      'Código para desactivar tu cuenta',
      `
      <p>Hola ${perfil.nombre},</p>
      <p>Tu código para desactivar tu cuenta es: <b style="font-size:18px">${codigo}</b></p>
      <p>El código vence en 10 minutos. Si no fuiste tú, ignora este mensaje.</p>
      `
    );

    res.status(200).json({ mensaje: 'Código enviado al correo' });
  } catch (error) {
    res.status(400).json({ mensaje: 'No se pudo generar el código', error: error.message });
  }
});

// 2) Confirmar desactivación con código
router.post('/me/desactivar/confirm', verificarToken, async (req, res) => {
  try {
    const { codigo, reason } = req.body;
    if (!codigo) return res.status(400).json({ mensaje: 'Código requerido' });

    // Verifica OTP
    await verificarTokenOTP(req.usuario.id, 'desactivar', codigo);

    // Marca usuario como inactivo (reversible)
    const usuarioActualizado = await usuarioModel.update(req.usuario.id, {
      activo: false
    });

    // Limpia sesión
    res.clearCookie('token');
    res.status(200).json({ mensaje: 'Cuenta desactivada correctamente', usuario: usuarioActualizado });
  } catch (error) {
    res.status(400).json({ mensaje: 'No se pudo desactivar', error: error.message });
  }
});

// RF-USU-05 (admin)
// Desactivar usuario (admin) — sin código
router.post('/admin/users/:id/desactivar', verificarToken, soloAdmin, async (req, res) => {
  try {
    const { reason } = req.body;
    const usuarioActualizado = await usuarioModel.update(req.params.id, {
      activo: false
    });
    res.status(200).json({ mensaje: 'Usuario desactivado', usuario: usuarioActualizado });
  } catch (error) {
    res.status(400).json({ mensaje: 'Error al desactivar', error: error.message });
  }
});

// Reactivar usuario (admin)
router.post('/admin/users/:id/reactivate', verificarToken, soloAdmin, async (req, res) => {
  try {
    const usuarioActualizado = await usuarioModel.update(req.params.id, {
      activo: true,
    });
    res.status(200).json({ mensaje: 'Usuario reactivado', usuario: usuarioActualizado });
  } catch (error) {
    res.status(400).json({ mensaje: 'Error al reactivar', error: error.message });
  }
});

// RF-USU-06 - Restablecer contraseña
// Flujo: (1) solicitar código por email → (2) confirmar con código + nueva password
// (1) Solicitar código de restablecimiento
router.post('/password/reset/request', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ mensaje: 'Email requerido' });

    // 1. Buscar usuario por email
    const user = await usuarioModel.getByEmail(email);

    // 2. Crear OTP asociado al usuario y a la acción 'cambiar_contraseña'
    //    Vigencia 10 minutos
    const { codigo } = await crearTokenOTP(user._id, 'cambiar_contraseña', 10);

    // 3. Enviar correo
    await enviarCorreo(
      user.email,
      'Código para restablecer tu contraseña',
      `
      <p>Hola ${user.nombre},</p>
      <p>Tu código para restablecer la contraseña es: <b style="font-size:18px">${codigo}</b></p>
      <p>Este código vence en 10 minutos.</p>
      `
    );

    res.status(200).json({ mensaje: 'Código enviado al correo' });
  } catch (error) {
    res.status(400).json({ mensaje: 'No se pudo generar el código', error: error.message });
  }
});

// (2) Confirmar restablecimiento con código + nueva contraseña
router.post('/password/reset/confirm', async (req, res) => {
  try {
    const { email, codigo, nuevaPassword } = req.body;
    if (!email || !codigo || !nuevaPassword) {
      return res.status(400).json({ mensaje: 'Email, código y nuevaPassword son requeridos' });
    }

    // 1. Buscar usuario por email
    const user = await usuarioModel.getByEmail(email);

    // 2. Verificar OTP (acción 'cambiar_contraseña')
    await verificarTokenOTP(user._id, 'cambiar_contraseña', codigo);

    // 3. Actualizar contraseña usando el controller (este ya hashea internamente)
    const actualizado = await usuarioModel.update(user._id, { password: nuevaPassword });

    // 4. Limpiar sesión si existía
    res.clearCookie('token');

    res.status(200).json({ mensaje: 'Contraseña restablecida correctamente', usuario: actualizado });
  } catch (error) {
    res.status(400).json({ mensaje: 'No se pudo restablecer la contraseña', error: error.message });
  }
});

// RF-USU-07 - Cambiar contraseña (autenticado)
router.post('/password/change', verificarToken, async (req, res) => {
  try {
    const { actualPassword, nuevaPassword, confirmarPassword } = req.body;

    if (!actualPassword || !nuevaPassword || !confirmarPassword) {
      return res.status(400).json({ mensaje: 'actualPassword, nuevaPassword y confirmarPassword son requeridos.' });
    }
    if (nuevaPassword !== confirmarPassword) {
      return res.status(400).json({ mensaje: 'La nueva contraseña y su confirmación no coinciden.' });
    }

    const usuario = await usuarioModel.changePassword(req.usuario.id, actualPassword, nuevaPassword);

    //  (recomendado): cerrar sesión para obligar re-login
    res.clearCookie('token');

    res.status(200).json({
      mensaje: 'Contraseña cambiada correctamente. Inicia sesión de nuevo.',
      usuario
    });
  } catch (error) {
    res.status(400).json({ mensaje: 'No se pudo cambiar la contraseña', error: error.message });
  }
});

//RF-USU-08 - Cerrar sesión
router.post('/logout', (req, res) => {
  res.clearCookie('token');
  res.status(200).json({ mensaje: 'Sesión cerrada' });
});

// RF-USU-09 - Gestión de roles (solo admin)
// Listar usuarios con filtros básicos
router.get('/admin/users', verificarToken, soloAdmin, async (req, res) => {
  try {
    const { page, limit, q, rol } = req.query;
    const result = await usuarioModel.list({ page, limit, q, rol });
    res.status(200).json(result);
  } catch (error) {
    res.status(400).json({ mensaje: 'No se pudo listar usuarios', error: error.message });
  }
});
// Cambiar rol de un usuario
router.patch('/admin/users/:id/rol', verificarToken, soloAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { rol } = req.body;

    if (!rol) return res.status(400).json({ mensaje: 'Campo rol es requerido' });
    // Evitar que un admin cambie su propio rol
    if (id === req.usuario.id) return res.status(400).json({ mensaje: 'No puedes cambiar tu propio rol.' });

    const actualizado = await usuarioModel.changeRole(id, rol);
    res.status(200).json({ mensaje: 'Rol actualizado correctamente', usuario: actualizado });
  } catch (error) {
    res.status(400).json({ mensaje: 'No se pudo cambiar el rol', error: error.message });
  }
});

// RF-USU-10 - Verificar email con OTP
// Flujo: (1) solicitar código → (2) confirmar código
// (1) Solicitar código de verificación de email
router.post('/email/verify/request', verificarToken, async (req, res) => {
  try {
    // Traer el perfil del usuario logueado
    const perfil = await usuarioModel.getById(req.usuario.id);
    if (!perfil) return res.status(404).json({ mensaje: 'Usuario no encontrado' });

    if (perfil.emailVerificado) {
      return res.status(200).json({ mensaje: 'El email ya está verificado' });
    }

    // Crear OTP para 'verificar_email' con vigencia 15 min
    const { codigo } = await crearTokenOTP(req.usuario.id, 'verificar_email', 15);

    // Enviar email con el código
    await enviarCorreo(
      perfil.email,
      'Código para verificar tu email',
      `
      <p>Hola ${perfil.nombre},</p>
      <p>Tu código para verificar el email es: <b style="font-size:18px">${codigo}</b></p>
      <p>Este código vence en 15 minutos.</p>
      `
    );

    res.status(200).json({ mensaje: 'Código de verificación enviado a tu correo' });
  } catch (error) {
    res.status(400).json({ mensaje: 'No se pudo generar el código', error: error.message });
  }
});

// (2) Confirmar verificación con código
router.post('/email/verify/confirm', verificarToken, async (req, res) => {
  try {
    const { codigo } = req.body;
    if (!codigo) return res.status(400).json({ mensaje: 'Código requerido' });

    // Verificar OTP del usuario logueado
    await verificarTokenOTP(req.usuario.id, 'verificar_email', codigo);

    // Marcar email como verificado
    const usuario = await usuarioModel.markEmailVerified(req.usuario.id);

    res.status(200).json({ mensaje: 'Email verificado correctamente', usuario });
  } catch (error) {
    res.status(400).json({ mensaje: 'No se pudo verificar el email', error: error.message });
  }
});

// RF-USU-11 - Doble Factor (2FA por email)
// Login paso 2: confirmar 2FA con el pretoken
router.post('/login/2fa/verify', async (req, res) => {
  try {
    const { codigo } = req.body;
    if (!codigo) return res.status(400).json({ mensaje: 'Código requerido' });

    const { pretoken } = req.cookies || {};
    if (!pretoken) return res.status(401).json({ mensaje: 'Sesión 2FA no iniciada' });

    // Decodificar pretoken
    let payload;
    try {
      payload = jwt.verify(pretoken, process.env.JWT_SECRET);
    } catch {
      return res.status(401).json({ mensaje: 'Sesión 2FA expirada o inválida' });
    }
    if (payload.twofa !== 'pending') {
      return res.status(401).json({ mensaje: 'Estado 2FA inválido' });
    }

    // Verificar OTP de tipo '2fa'
    await verificarTokenOTP(payload.id, '2fa', codigo);

    // Emitir token final de sesión y limpiar pretoken
    const token = jwt.sign({ id: payload.id, rol: payload.rol }, process.env.JWT_SECRET, { expiresIn: '1h' });
    res.clearCookie('pretoken');
    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 3600000
    });

    return res.status(200).json({ mensaje: '2FA verificado. Sesión iniciada.' });
  } catch (error) {
    res.status(400).json({ mensaje: 'No se pudo verificar 2FA', error: error.message });
  }
});

// Habilitar 2FA (requiere login) — envía OTP para confirmar habilitación
router.post('/2fa/enable/request', verificarToken, async (req, res) => {
  try {
    const perfil = await usuarioModel.getById(req.usuario.id);
    if (!perfil) return res.status(404).json({ mensaje: 'Usuario no encontrado' });
    if (perfil.twoFactorEnabled) {
      return res.status(200).json({ mensaje: '2FA ya está habilitado' });
    }
    if (!perfil.emailVerificado) {
      return res.status(400).json({ mensaje: 'Verifica tu email antes de habilitar 2FA' });
    }

    const { codigo } = await crearTokenOTP(req.usuario.id, '2fa', 10);
    await enviarCorreo(
      perfil.email,
      'Confirma habilitación de 2FA',
      `<p>Hola ${perfil.nombre}, tu código para habilitar 2FA es: <b style="font-size:18px">${codigo}</b></p>`
    );

    res.status(200).json({ mensaje: 'Código enviado al correo para habilitar 2FA' });
  } catch (error) {
    res.status(400).json({ mensaje: 'No se pudo generar el código', error: error.message });
  }
});

// Confirmar habilitación de 2FA
router.post('/2fa/enable/confirm', verificarToken, async (req, res) => {
  try {
    const { codigo } = req.body;
    if (!codigo) return res.status(400).json({ mensaje: 'Código requerido' });

    await verificarTokenOTP(req.usuario.id, '2fa', codigo);
    const usuario = await usuarioModel.setTwoFactorEnabled(req.usuario.id, true);

    res.status(200).json({ mensaje: '2FA habilitado', usuario });
  } catch (error) {
    res.status(400).json({ mensaje: 'No se pudo habilitar 2FA', error: error.message });
  }
});

// Deshabilitar 2FA (pide contraseña actual para confirmar)
router.post('/2fa/disable', verificarToken, async (req, res) => {
  try {
    const { actualPassword } = req.body;
    if (!actualPassword) return res.status(400).json({ mensaje: 'Contraseña actual requerida' });

    await usuarioModel.checkPassword(req.usuario.id, actualPassword);
    const usuario = await usuarioModel.setTwoFactorEnabled(req.usuario.id, false);

    // Opcional: limpiar cualquier pretoken residual
    res.clearCookie('pretoken');

    res.status(200).json({ mensaje: '2FA deshabilitado', usuario });
  } catch (error) {
    res.status(400).json({ mensaje: 'No se pudo deshabilitar 2FA', error: error.message });
  }
});

// Estado de 2FA
router.get('/2fa/status', verificarToken, async (req, res) => {
  try {
    const perfil = await usuarioModel.getById(req.usuario.id);
    if (!perfil) return res.status(404).json({ mensaje: 'Usuario no encontrado' });
    res.status(200).json({ twoFactorEnabled: !!perfil.twoFactorEnabled });
  } catch (error) {
    res.status(400).json({ mensaje: 'No se pudo obtener el estado de 2FA', error: error.message });
  }
});

// RF-USU-12 - Consentimiento (versión simple)
// Ver estado (requiere login)
router.get('/consent/status', verificarToken, async (req, res) => {
  try {
    const estado = await usuarioModel.getConsentStatus(req.usuario.id);
    res.status(200).json(estado);
  } catch (error) {
    res.status(400).json({ mensaje: 'No se pudo obtener el estado', error: error.message });
  }
});

// Aceptar (requiere login)
router.post('/consent/accept', verificarToken, async (req, res) => {
  try {
    const usuario = await usuarioModel.acceptConsent(req.usuario.id);
    res.status(200).json({ mensaje: 'Consentimiento aceptado', usuario });
  } catch (error) {
    res.status(400).json({ mensaje: 'No se pudo aceptar el consentimiento', error: error.message });
  }
});





//Ruta Privada: admin
router.get('/admin', verificarToken, soloAdmin, async (req, res) => {
try { 
  res.status(200).json({ mensaje: 'Bienvenido al área de administración', usuario: req.usuario });
} catch (error) {
  res.status(500).json({ mensaje: 'area restringida'});
}
});

export default router;