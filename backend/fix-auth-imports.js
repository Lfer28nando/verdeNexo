import fs from 'fs';
import path from 'path';

const filePath = path.resolve('./routes/checkout/checkout.routes.js');

try {
  // Leer el archivo
  let content = fs.readFileSync(filePath, 'utf8');
  
  // Reemplazar todas las ocurrencias de 'auth' (palabra completa) por 'verificarToken'
  // pero no reemplazar en imports o comentarios
  content = content.replace(/(?<!import.*)\bauth\b(?![a-zA-Z])/g, 'verificarToken');
  
  // Escribir el archivo
  fs.writeFileSync(filePath, content, 'utf8');
  
  console.log('✅ Reemplazos completados en checkout.routes.js');
} catch (error) {
  console.error('❌ Error:', error.message);
}