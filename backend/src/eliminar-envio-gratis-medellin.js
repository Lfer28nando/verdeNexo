// Script para eliminar el campo envioGratisPor de la zona Medellín
import { connectDB } from './db.js';
import { ZonaEnvio } from './models/shippingArea.model.js';

(async () => {
  await connectDB();
  const result = await ZonaEnvio.updateOne(
    { codigo: 'MEDELLIN' },
    { $unset: { envioGratisPor: "" } }
  );
  console.log('Campo envioGratisPor eliminado:', result);
  process.exit(0);
})();
