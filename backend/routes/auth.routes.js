//Importaciones:
import express from 'express';
import jwt from 'jsonwebtoken';
import { usuarioModel } from '../models/usuario.model.js';
import enviarCorreo from '../utils/email.service.js';
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
    await enviarCorreo(email, 'Bienvenido a VerdeNexo', `<p>Hola ${nombre}, tu cuenta ha sido creada exitosamente.</p>`);
    res.status(201).json({ mensaje: 'Usuario registrado y correo enviado', usuario: nuevoUsuario });
  } catch (error) {
    res.status(500).json({ mensaje: 'Error al registrar el usuario', error: error.message });
  }
});

//RF-USU-02 - Iniciar sesión:
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    // Usamos usuarioModel.login para validar login
    const usuario = await usuarioModel.login({ email, password });
    const token = jwt.sign({ id: usuario._id, rol: usuario.rol }, process.env.JWT_SECRET, { expiresIn: '1h' });

    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production', // Asegura la cookie en producción
      maxAge: 3600000 // 1 hora
    });

    res.status(200).json({ mensaje: 'Login exitoso', usuario: { id: usuario._id, nombre: usuario.nombre, email: usuario.email, rol: usuario.rol } });

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
    const data = req.body;

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




//ruta de cierre de sesión
router.post('/logout', (req, res) => {
  res.clearCookie('token');
  res.status(200).json({ mensaje: 'Sesión cerrada' });
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