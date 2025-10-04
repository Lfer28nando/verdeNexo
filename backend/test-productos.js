import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { Producto } from './models/producto/index.js';

// Cargar variables de entorno
dotenv.config();

// Conectar a MongoDB
await mongoose.connect(process.env.MONGO_URI, {
  dbName: process.env.MONGO_DB_NAME || "mi_base_datos",
});

console.log('✅ Conectado a MongoDB');

// Crear productos de prueba
const productosTest = [
  {
    nombre: 'Monstera Deliciosa',
    descripcion: 'Planta tropical perfecta para interiores',
    categoria: 'Plantas de Interior',
    precioBase: 45.99,
    stock: 15,
    disponibilidad: true,
    etiquetas: ['interior', 'tropical', 'popular']
  },
  {
    nombre: 'Cactus Pequeño',
    descripcion: 'Cactus ideal para principiantes',
    categoria: 'Cactus',
    precioBase: 12.50,
    stock: 30,
    disponibilidad: true,
    etiquetas: ['facil cuidado', 'pequeño']
  },
  {
    nombre: 'Helecho Boston',
    descripcion: 'Helecho elegante para espacios húmedos',
    categoria: 'Helechos',
    precioBase: 28.75,
    stock: 8,
    disponibilidad: true,
    etiquetas: ['humedad', 'verde']
  }
];

try {
  // Verificar si ya hay productos
  const count = await Producto.countDocuments();
  console.log(`Productos existentes: ${count}`);
  
  if (count === 0) {
    // Insertar productos de prueba
    const resultado = await Producto.insertMany(productosTest);
    console.log(`✅ ${resultado.length} productos creados exitosamente`);
  } else {
    console.log('Ya hay productos en la base de datos');
  }
  
  // Mostrar todos los productos
  const productos = await Producto.find();
  console.log('\n📦 Productos en la base de datos:');
  productos.forEach(p => {
    console.log(`- ${p.nombre} ($${p.precioBase}) - Stock: ${p.stock}`);
  });
  
} catch (error) {
  console.error('❌ Error:', error);
} finally {
  await mongoose.connection.close();
  console.log('\n🔚 Conexión cerrada');
}