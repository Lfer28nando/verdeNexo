//Importaciones:
import mongoose from 'mongoose';

//Esquema de Usuario:
const userSchema = new mongoose.Schema({
  username: { type: String, required: true, trim:true },

  email: { type: String, required: true, unique: true, trim: true },

  password: { type: String, required: true },

  role: { type: String, enum: ['client', 'seller', 'admin'], default: 'client' },

  // Google OAuth fields
  googleId: { type: String, required: false },
  provider: { type: String, enum: ['local', 'google'], default: 'local' },
  avatar: { type: String, required: false },
  lastLogin: { type: Date, required: false },

  document: { type: String, required: false },

  cellphone: { type: String, required: false },

  address: { type: String,required: false },

  active: { type: Boolean, default: true },

  verifiedEmail: { type: Boolean, default: false },

  twoFactorEnabled: { type: Boolean, default: false },

  consentAccepted: { type: Boolean, default: false },

  // Password reset fields
  resetPasswordToken: { type: String, required: false },
  resetPasswordExpires: { type: Date, required: false },

  // Email verification fields
  emailVerificationToken: { type: String, required: false },
  emailVerificationExpires: { type: Date, required: false },

  // Métodos de pago
  paidMethods: {
    card: [{
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

// Índices únicos pero sparse: permite múltiples documentos sin el campo (null/absente) y garantiza que sean únicos cuando se proporciona
userSchema.index({ document: 1 }, { unique: true, sparse: true });
userSchema.index({ googleId: 1 }, { unique: true, sparse: true });

export default mongoose.model('User', userSchema);
