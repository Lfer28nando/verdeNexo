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
  consentAccepted: { type: Boolean, default: false },
  // Métodos de pago
  metodosPago: {
    tarjetas: [{
      id: { type: String, required: true }, // ID único generado en frontend
      alias: { type: String, required: true }, // "Mi tarjeta personal", "Tarjeta empresa"
      tipo: { type: String, enum: ['credito', 'debito'], required: true },
      ultimosDigitos: { type: String, required: true, minlength: 4, maxlength: 4 }, // Últimos 4 dígitos
      titular: { type: String, required: true },
      fechaVencimiento: { type: String, required: true }, // MM/YY
      banco: { type: String, required: false },
      predeterminada: { type: Boolean, default: false },
      fechaCreacion: { type: Date, default: Date.now }
    }],
    cuentasBancarias: [{
      id: { type: String, required: true }, // ID único generado en frontend
      alias: { type: String, required: true }, // "Cuenta principal", "Cuenta ahorros"
      banco: { type: String, required: true },
      tipoCuenta: { type: String, enum: ['ahorros', 'corriente'], required: true },
      numeroCuenta: { type: String, required: true }, // Encriptado o últimos dígitos
      titular: { type: String, required: true },
      predeterminada: { type: Boolean, default: false },
      fechaCreacion: { type: Date, default: Date.now }
    }]
  }
}, {timestamps: true});

// Índice único pero sparse: permite múltiples documentos sin `documento` (null/absente) y garantiza que sean únicos cuando se proporciona
usuarioSchema.index({ documento: 1 }, { unique: true, sparse: true });

const Usuario = mongoose.model('Usuario', usuarioSchema);
export default Usuario;