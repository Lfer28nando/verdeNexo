import mongoose from 'mongoose';

const usuarioTokenSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'Usuario', required: true, index: true },
  type:   { type: String, required: true, enum: ['desactivar','cambiar_contraseña','verificar_email','2fa'] },
  hash:   { type: String, required: true }, // hash del código/OTP
  expiracion: { type: Date, required: true, index: true },
  usado:    { type: Date }                 // null => no usado
}, { timestamps: true });

usuarioTokenSchema.index({ userId: 1, type: 1, createdAt: -1 });

const UsuarioToken = mongoose.model('usuarioToken', usuarioTokenSchema);
export default UsuarioToken;