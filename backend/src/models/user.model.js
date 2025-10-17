//Importaciones:
import mongoose from 'mongoose';

//Esquema de Usuario:
const userSchema = new mongoose.Schema({
  username: { type: String, required: true, trim:true },

  email: { type: String, required: true, unique: true, trim: true },

  password: { type: String, required: true },

  role: { type: String, enum: ['admin', 'seller', 'client'], default: 'client' },

  // Información de vendedor (solo para role: 'seller')
  informacionVendedor: {
    porcentajeComision: { type: Number, default: 5.0 }, // Porcentaje de comisión (5.0 = 5%)
    comisionesAcumuladas: { type: Number, default: 0 }, // Total de comisiones ganadas
    comisionesPendientes: { type: Number, default: 0 }, // Comisiones pendientes de pago
    ventasTotales: { type: Number, default: 0 }, // Número total de ventas realizadas
    ultimaVenta: { type: Date }, // Fecha de la última venta
    metaMensual: { type: Number, default: 0 }, // Meta de ventas mensual
    activo: { type: Boolean, default: true } // Si el vendedor está activo
  },

  // Google OAuth fields
  googleId: { type: String, required: false },
  provider: { type: String, enum: ['local', 'google'], default: 'local' },
  avatar: { type: String, required: false },
  lastLogin: { type: Date, required: false },

  document: { type: String, required: false },

  documentType: { type: String, enum: ['Cédula', 'Cédula de extranjería', 'PPT', 'Pasaporte'], required: false },

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

  // Two-Factor Authentication fields
  twoFactorEnabled: { type: Boolean, default: false },
  twoFactorSecret: { type: String, required: false }, // TOTP secret
  twoFactorBackupCodes: [{ type: String }], // Array of backup codes

  // Email change fields
  emailChangeToken: { type: String, required: false },
  emailChangeExpires: { type: Date, required: false },
  pendingEmail: { type: String, required: false }, // New email waiting verification

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
  },

  // Favoritos del usuario
  favorites: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Producto' }]
}, {timestamps: true});

// Índices únicos pero sparse: permite múltiples documentos sin el campo (null/absente) y garantiza que sean únicos cuando se proporciona
userSchema.index({ document: 1 }, { unique: true, sparse: true });
userSchema.index({ googleId: 1 }, { unique: true, sparse: true });

export default mongoose.model('User', userSchema);
