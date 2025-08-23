//Importaciones:
import mongoose from 'mongoose';
import bcrypt from 'bcrypt';

//Esquema de Usuario:
const usuarioSchema = new mongoose.Schema({
  nombre: { type: String, required: true, unique: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  rol: { type: String, enum: ['cliente', 'vendedor', 'admin'], default: 'cliente' },
  documento: { type: String, required: false },
  telefono: { type: String, required: false },
  direccion: { type: String,required: false },
  activo: { type: Boolean, default: true },
  emailVerificado: { type: Boolean, default: false },
  twoFactorEnabled: { type: Boolean, default: false },
  consentAccepted: { type: Boolean, default: false }
}, {timestamps: true});

// Índice único pero sparse: permite múltiples documentos sin `documento` (null/absente) y garantiza que sean únicos cuando se proporciona
usuarioSchema.index({ documento: 1 }, { unique: true, sparse: true });

const Usuario = mongoose.model('Usuario', usuarioSchema);
export default Usuario;