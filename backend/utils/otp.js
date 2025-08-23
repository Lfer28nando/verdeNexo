import bcrypt from 'bcrypt';
import UserToken from '../models/usuarioToken.model.js';

function generarCodigo6() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}
function agregarMinutos(min=10) {
  const d = new Date(); d.setMinutes(d.getMinutes() + min); return d;
}

async function crearTokenOTP(userId, type, minutes=10, sobreescribirCodigo=null) {
  const codigo = sobreescribirCodigo ?? generarCodigo6();
  const hash = await bcrypt.hash(codigo, 10);
  const token = await UserToken.create({
    userId, type, hash, expiracion: agregarMinutos(minutes)
  });
  return { codigo, tokenId: token._id.toString() };
}

async function verificarTokenOTP(userId, type, codigo) {
  const t = await UserToken.findOne({ userId, type }).sort({ createdAt: -1 });
  if (!t) throw new Error('No hay token activo.');
  if (t.usado) throw new Error('Token ya utilizado.');
  if (t.expiracion < new Date()) throw new Error('Token expirado.');
  const ok = await bcrypt.compare(codigo, t.hash);
  if (!ok) throw new Error('Código incorrecto.');
  t.usado = new Date();
  await t.save();
  return true;
}

export {
  crearTokenOTP,
  verificarTokenOTP
};