// Importaciones;
import jwt from 'jsonwebtoken';
import enviarCorreo from '../utils/email.service.js';
import { crearTokenOTP, verificarTokenOTP } from '../utils/otp.js';

async function solicitarBajaUsuario(userId) {
  const u = await Usuario.findById(userId);
  if (!u) throw new Error('Usuario no encontrado.');
  if (!u.activo) throw new Error('La cuenta ya está desactivada.');

  const { codigo } = await crearTokenOTP(u._id, 'deactivate', 10);
  await enviarCorreo(
    u.email,
    'Código para desactivar tu cuenta',
    `<p>Hola ${u.nombre}, tu código es <b>${codigo}</b> (válido 10 min).</p>`
  );
  return { email: u.email };
}

 async function confirmarBajaUsuario(userId, codigo, reason='Solicitud del usuario') {
  await verifyToken(userId, 'deactivate', codigo);
  await Usuario.findByIdAndUpdate(userId, {
    isActive: false
  });
  // si quieres guardar razón/fecha, puedes tener una colección de auditoría aparte.
  return { ok: true };
}

function verificarToken(req, res, next) {
  const token = req.cookies.token;

  if (!token) {
    return res.status(403).json({ mensaje: 'Token requerido' });
  }

  try {
    const decodigod = jwt.verify(token, process.env.JWT_SECRET);
    console.log('Token decodificado:', decodigod); // debug
    req.usuario = decodigod;
    next();
  } catch (error) {
    return res.status(401).json({ mensaje: 'Token inválido' });
  }
}

function soloAdmin(req, res, next) {
  if (req.usuario.rol !== 'admin') {
    return res.status(403).json({ mensaje: 'Acceso denegado' });
  }
  next();
}

export {
  verificarToken,
  soloAdmin,
  solicitarBajaUsuario,
  confirmarBajaUsuario
};
