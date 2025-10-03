import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Configurar variables de entorno
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../.env') });

// Importar modelos
import { MetodoPago } from '../models/checkout/metodo-pago.model.js';
import { VentanaEntrega } from '../models/checkout/ventana-entrega.model.js';
import { ZonaEnvio } from '../models/carrito/zona-envio.model.js';

// Conectar a MongoDB
mongoose.connect(process.env.MONGO_URI, {
  dbName: process.env.MONGO_DB_NAME || "mi_base_datos",
});

async function inicializarDatosCheckout() {
  try {
    console.log('🚀 Inicializando datos básicos de checkout...');

    // 1. Crear métodos de pago básicos
    const metodosExistentes = await MetodoPago.countDocuments();
    
    if (metodosExistentes === 0) {
      const metodosPago = [
        {
          nombre: 'Efectivo contra entrega',
          tipo: 'efectivo',
          descripcion: 'Paga en efectivo al recibir tu pedido',
          activo: true,
          disponiblePara: ['particular', 'mayorista'],
          configuracion: {
            montoMinimo: 0,
            montoMaximo: 1000000,
            comision: { tipo: 'fijo', valor: 0 }
          },
          instrucciones: 'Ten el dinero exacto preparado para facilitar la entrega',
          orden: 1
        },
        {
          nombre: 'Transferencia bancaria',
          tipo: 'transferencia',
          descripcion: 'Realiza una transferencia a nuestra cuenta bancaria',
          activo: true,
          disponiblePara: ['particular', 'mayorista'],
          configuracion: {
            montoMinimo: 50000,
            requiereVerificacion: true,
            tiempoExpiracion: 60, // 1 hora
            cuentaBancaria: {
              banco: 'Banco de Bogotá',
              numeroCuenta: '123456789',
              tipoCuenta: 'ahorros',
              titular: 'VerdeNexo SAS',
              documento: '900123456-7'
            },
            comision: { tipo: 'fijo', valor: 0 }
          },
          instrucciones: 'Envía el comprobante de transferencia por WhatsApp al 300-123-4567',
          orden: 2
        },
        {
          nombre: 'PSE - Pagos Seguros en Línea',
          tipo: 'pse',
          descripcion: 'Paga directamente desde tu banco por internet',
          activo: true,
          disponiblePara: ['particular', 'mayorista'],
          configuracion: {
            montoMinimo: 10000,
            montoMaximo: 5000000,
            tiempoExpiracion: 15, // 15 minutos
            comision: { tipo: 'porcentaje', valor: 2.5 }
          },
          instrucciones: 'Serás redirigido a tu banco para completar el pago',
          orden: 3
        },
        {
          nombre: 'Daviplata',
          tipo: 'daviplata',
          descripcion: 'Paga desde tu app Daviplata',
          activo: true,
          disponiblePara: ['particular'],
          configuracion: {
            montoMinimo: 5000,
            montoMaximo: 2000000,
            tiempoExpiracion: 30,
            comision: { tipo: 'fijo', valor: 2000 }
          },
          instrucciones: 'Usa el código QR o el número de referencia en tu app Daviplata',
          orden: 4
        },
        {
          nombre: 'Nequi',
          tipo: 'nequi',
          descripcion: 'Paga desde tu app Nequi',
          activo: true,
          disponiblePara: ['particular'],
          configuracion: {
            montoMinimo: 5000,
            montoMaximo: 2000000,
            tiempoExpiracion: 30,
            comision: { tipo: 'fijo', valor: 2000 }
          },
          instrucciones: 'Usa el código QR o envía el dinero al número indicado',
          orden: 5
        }
      ];

      await MetodoPago.insertMany(metodosPago);
      console.log('✅ Métodos de pago creados correctamente');
    } else {
      console.log('ℹ️ Los métodos de pago ya existen');
    }

    // 2. Crear ventanas de entrega básicas
    const ventanasExistentes = await VentanaEntrega.countDocuments();
    
    if (ventanasExistentes === 0) {
      // Primero verificar que existan zonas de envío
      const zonas = await ZonaEnvio.find({ activa: true }).limit(1);
      
      if (zonas.length > 0) {
        const zonaId = zonas[0]._id;
        
        const ventanasEntrega = [
          {
            nombre: 'Entrega Mañana',
            descripcion: 'Entrega en horario de la mañana',
            zona: zonaId,
            diasSemana: ['lunes', 'martes', 'miercoles', 'jueves', 'viernes'],
            horaInicio: '08:00',
            horaFin: '12:00',
            capacidadMaxima: 15,
            tiempoEntrega: 24,
            costoAdicional: 0,
            activa: true,
            restricciones: {
              montoMinimo: 0,
              tiposCliente: ['particular', 'mayorista']
            },
            configuracionEspecial: {
              requierePreparacionExtra: false,
              disponibleFestivos: false
            }
          },
          {
            nombre: 'Entrega Tarde',
            descripcion: 'Entrega en horario de la tarde',
            zona: zonaId,
            diasSemana: ['lunes', 'martes', 'miercoles', 'jueves', 'viernes'],
            horaInicio: '14:00',
            horaFin: '18:00',
            capacidadMaxima: 15,
            tiempoEntrega: 24,
            costoAdicional: 0,
            activa: true,
            restricciones: {
              montoMinimo: 0,
              tiposCliente: ['particular', 'mayorista']
            },
            configuracionEspecial: {
              requierePreparacionExtra: false,
              disponibleFestivos: false
            }
          },
          {
            nombre: 'Entrega Sábado',
            descripcion: 'Entrega especial para fines de semana',
            zona: zonaId,
            diasSemana: ['sabado'],
            horaInicio: '09:00',
            horaFin: '15:00',
            capacidadMaxima: 10,
            tiempoEntrega: 48,
            costoAdicional: 5000,
            activa: true,
            restricciones: {
              montoMinimo: 100000,
              tiposCliente: ['particular', 'mayorista']
            },
            configuracionEspecial: {
              requierePreparacionExtra: true,
              horasPreparacion: 2,
              disponibleFestivos: false,
              mensajeEspecial: 'Entrega especial de fin de semana con costo adicional'
            }
          }
        ];

        await VentanaEntrega.insertMany(ventanasEntrega);
        console.log('✅ Ventanas de entrega creadas correctamente');
      } else {
        console.log('⚠️ No se encontraron zonas de envío activas. Crea zonas primero para poder crear ventanas de entrega.');
      }
    } else {
      console.log('ℹ️ Las ventanas de entrega ya existen');
    }

    console.log('🎉 Inicialización de datos de checkout completada');
    
  } catch (error) {
    console.error('❌ Error al inicializar datos de checkout:', error);
  }
}

// Función para limpiar datos de prueba
async function limpiarDatosPrueba() {
  try {
    console.log('🧹 Limpiando datos de prueba...');
    
    await MetodoPago.deleteMany({});
    await VentanaEntrega.deleteMany({});
    
    console.log('✅ Datos de prueba limpiados');
  } catch (error) {
    console.error('❌ Error al limpiar datos:', error);
  }
}

// Ejecutar según argumentos de línea de comandos
if (process.argv.includes('--clean')) {
  limpiarDatosPrueba().then(() => process.exit(0));
} else {
  inicializarDatosCheckout().then(() => process.exit(0));
}

export { inicializarDatosCheckout, limpiarDatosPrueba };