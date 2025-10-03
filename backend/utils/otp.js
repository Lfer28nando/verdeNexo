import bcrypt from 'bcrypt';
import { UsuarioToken } from '../models/usuario/index.js';
import { BadRequest, NotFound } from '../utils/error.js';

function generarCodigo6() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}
function agregarMinutos(min=10) {
  const d = new Date(); d.setMinutes(d.getMinutes() + min); return d;
}

async function crearTokenOTP(userId, type, minutes=10, sobreescribirCodigo=null) {
  const codigo = sobreescribirCodigo ?? generarCodigo6();
  const hash = await bcrypt.hash(codigo, 10);
  const token = await UsuarioToken.create({
    userId, type, hash, expiracion: agregarMinutos(minutes)
  });
  return { codigo, tokenId: token._id.toString() };
}

async function verificarTokenOTP(userId, type, codigo) {
  const t = await UsuarioToken.findOne({ userId, type }).sort({ createdAt: -1 });
  if (!t) throw NotFound('No hay token activo.');
  if (t.usado) throw BadRequest('Token ya utilizado.');
  if (t.expiracion < new Date()) throw BadRequest('Token expirado.');
  const ok = await bcrypt.compare(codigo, t.hash);
  if (!ok) throw BadRequest('Código incorrecto.');
  t.usado = new Date();
  await t.save();
  return true;
}

export {
  crearTokenOTP,
  verificarTokenOTP
};