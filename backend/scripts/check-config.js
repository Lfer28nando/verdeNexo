#!/usr/bin/env node

// Script para verificar la configuración antes del deploy
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Cargar variables de entorno
dotenv.config({ path: path.resolve(__dirname, '.env') });

console.log('🔍 Verificando configuración para deploy...\n');

// Variables requeridas para producción
const requiredVars = [
  'MONGO_URI',
  'API_KEY', 
  'SESSION_SECRET'
];

const optionalVars = [
  'MONGO_DB_NAME',
  'FRONTEND_URL',
  'NODE_ENV',
  'PORT'
];

let hasErrors = false;

console.log('📋 Variables requeridas:');
requiredVars.forEach(varName => {
  const value = process.env[varName];
  if (!value) {
    console.log(`  ❌ ${varName}: NO CONFIGURADA`);
    hasErrors = true;
  } else {
    console.log(`  ✅ ${varName}: CONFIGURADA`);
  }
});

console.log('\n📋 Variables opcionales:');
optionalVars.forEach(varName => {
  const value = process.env[varName];
  if (!value) {
    console.log(`  ⚠️  ${varName}: NO CONFIGURADA (usando valor por defecto)`);
  } else {
    console.log(`  ✅ ${varName}: ${varName === 'SESSION_SECRET' ? '[HIDDEN]' : value}`);
  }
});

console.log('\n🔧 Configuración calculada:');
console.log(`  PORT: ${process.env.PORT || 3000}`);
console.log(`  NODE_ENV: ${process.env.NODE_ENV || 'development'}`);
console.log(`  MONGO_DB_NAME: ${process.env.MONGO_DB_NAME || 'mi_base_datos'}`);

if (hasErrors) {
  console.log('\n❌ Error: Faltan variables de entorno requeridas');
  console.log('💡 Asegúrate de configurar estas variables en tu servicio de deploy');
  process.exit(1);
} else {
  console.log('\n✅ Configuración válida para deploy');
  process.exit(0);
}