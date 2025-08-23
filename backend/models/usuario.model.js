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
}, {timestamps: true});

// Índice único pero sparse: permite múltiples documentos sin `documento` (null/absente) y garantiza que sean únicos cuando se proporciona
usuarioSchema.index({ documento: 1 }, { unique: true, sparse: true });

//Modelo:
const Usuario = mongoose.model('Usuario', usuarioSchema);

//usuarioModel con validaciones:
export class usuarioModel {

// RF-USU-01 - Registrar usuario.
  static async create({ nombre, email, password, telefono, direccion, documento }) {
    validaciones.nombre(nombre);
    validaciones.email(email);
    validaciones.password(password);
    if (telefono) validaciones.telefono(telefono); // validar solo si se proporciona
    if (direccion) validaciones.direccion(direccion); // validar solo si se proporciona
    if (documento) validaciones.documento(documento); // validar solo si se proporciona

    //Hash contraseña con bcrypt:
    const hashedPassword = await bcrypt.hash(password, 10);

    //Verificar si ya existe un usuario con ese nombre || email:
    const existe = await Usuario.findOne({ $or: [{ nombre }, {email }]});
    if (existe) throw new Error('El nombre de usuario o correo ya están registrados,');

    // Crear el nuevo usuario
    const nuevoUsuario = new Usuario({
     nombre,
     email,
     password : hashedPassword,
     telefono,
     direccion,
     documento
    });

     return await nuevoUsuario.save();
  }

// RF-USU-02 - Iniciar sesión.
  static async login({ email, password }) {
    validaciones.email(email);
    validaciones.password(password);

    const usuario = await Usuario.findOne({ email });
    if (!usuario) throw new Error('email no encontrado.');
    if (!usuario.activo) throw new Error('Cuenta desactivada. Contacta al soporte.');

    const passwordValida = await bcrypt.compare(password, usuario.password);
    if (!passwordValida) throw new Error('Contraseña incorrecta.');



    return usuario;


}
// RF-USU-03 - Ver perfil.
static async getById(id) {
    return await Usuario.findById(id).select('-password -__v');
  }

// RF-USU-04 - Editar perfil.
static async update(id, data) {
    if (data.nombre) validaciones.nombre(data.nombre);
    if (data.email) validaciones.email(data.email);
    if (data.password) {
      validaciones.password(data.password);
      data.password = await bcrypt.hash(data.password, 10); // Hashea la nueva contraseña
    }
    if (data.telefono) validaciones.telefono(data.telefono);
    if (data.direccion) validaciones.direccion(data.direccion);
    if (data.documento) validaciones.documento(data.documento);

    const usuarioActualizado = await Usuario.findByIdAndUpdate(id, data, { new: true }).select('-password -__v');
    if (!usuarioActualizado) throw new Error('Usuario no encontrado.');
    return usuarioActualizado;
  }
}

//RF_USU-05 - Eliminar Usuario.

//RF_USU-06 - 


//validaciones:
class validaciones {
    static nombre (nombre) { 
        // Validación: nombre
        if (typeof nombre !== 'string') throw new Error('Nombre debe ser un string.');
        if (nombre.length < 3 || nombre.length > 25) throw new Error('Nombre debe contener entre 3 y 25 caracteres.');
        if (!/^[a-zA-Z0-9_]+$/.test(nombre)) throw new Error('El nombre solo puede contener letras, números y guiones bajos (_).'); 
    }
    static email (email) {
        // Validación: email
        if (typeof email !== 'string') throw new Error('Email debe ser un string.');
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error('Email no tiene un formato válido.');
    }
    
    static password (password){
        // Validación: contraseña
        if (typeof password !== 'string') throw new Error('Contraseña debe ser un string.');
        if (password.length < 6) throw new Error('Contraseña debe contener al menos 6 caracteres.');
        if (!/\d/.test(password)) throw new Error('Contraseña debe contener al menos un número.');
    }

    static telefono (telefono) {
        // Validación: teléfono
        if (typeof telefono !== 'string') throw new Error('Teléfono debe ser un string.');
        if (!/^\d{10}$/.test(telefono)) throw new Error('Teléfono debe contener 10 dígitos.');
    }

    static direccion (direccion) {
        // Validación: dirección
        if (typeof direccion !== 'string') throw new Error('Dirección debe ser un string.');
        if (direccion.length < 5 || direccion.length > 100) throw new Error('Dirección debe contener entre 5 y 100 caracteres.');
    }

    static documento (documento) {
        // Validación: documento
        if (typeof documento !== 'string') throw new Error('Documento debe ser un string.');
        if (!/^\d{7,10}$/.test(documento)) throw new Error('Documento debe contener entre 7 y 10 dígitos.');
    }
}

