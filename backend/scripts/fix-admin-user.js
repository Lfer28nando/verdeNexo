import bcrypt from 'bcrypt';
import mongoose from 'mongoose';
import { Usuario } from '../models/usuario/index.js';

// Script para verificar y corregir el usuario administrador
async function fixAdminUser() {
  try {
    // Conectar a la base de datos
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/verdenexo');
    console.log('✅ Conectado a MongoDB');

    // Buscar usuarios administradores
    const adminUsers = await Usuario.find({ rol: 'admin' });
    console.log(`📊 Encontrados ${adminUsers.length} usuarios administradores:`);

    for (const admin of adminUsers) {
      console.log(`\n👤 Usuario: ${admin.nombre} (${admin.email})`);
      console.log(`   - ID: ${admin._id}`);
      console.log(`   - Rol: ${admin.rol}`);
      console.log(`   - Activo: ${admin.activo}`);
      console.log(`   - Tiene contraseña: ${admin.password ? '✅ SÍ' : '❌ NO'}`);
      
      if (!admin.password) {
        console.log(`   🔧 Este usuario NO tiene contraseña configurada`);
        
        // Preguntar si queremos generar una contraseña temporal
        const tempPassword = 'Admin123!';
        const hashedPassword = await bcrypt.hash(tempPassword, 10);
        
        await Usuario.findByIdAndUpdate(admin._id, { 
          password: hashedPassword 
        });
        
        console.log(`   ✅ Contraseña temporal configurada: ${tempPassword}`);
        console.log(`   ⚠️  IMPORTANTE: Cambia esta contraseña después del primer login`);
      }
    }

    // Si no hay usuarios admin, crear uno
    if (adminUsers.length === 0) {
      console.log('\n🚨 No se encontraron usuarios administradores. Creando uno...');
      
      const tempPassword = 'Admin123!';
      const hashedPassword = await bcrypt.hash(tempPassword, 10);
      
      const adminUser = new Usuario({
        nombre: 'Administrador',
        email: 'admin@verdenexo.com',
        password: hashedPassword,
        rol: 'admin',
        activo: true,
        emailVerificado: true,
        consentAccepted: true
      });
      
      await adminUser.save();
      console.log('✅ Usuario administrador creado:');
      console.log(`   - Email: admin@verdenexo.com`);
      console.log(`   - Contraseña temporal: ${tempPassword}`);
      console.log(`   ⚠️  IMPORTANTE: Cambia esta contraseña después del primer login`);
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Desconectado de MongoDB');
    process.exit(0);
  }
}

// Ejecutar el script
fixAdminUser();