import { connectDB } from './db.js';
import { ZonaEnvio } from './models/shippingArea.model.js';

(async () => {
  await connectDB();

  // Crear zona de envío para Medellín
  const zonaMedellin = new ZonaEnvio({
    nombre: 'Medellín',
    codigo: 'MEDELLIN',
    descripcion: 'Cobertura urbana Medellín',
    upzs: ['Medellín'],
    barrios: ['El Poblado', 'Laureles', 'Envigado', 'Belen', 'Robledo', 'Castilla'],
    centroGeografico: { lat: 6.2442, lng: -75.5812 },
    tarifaBase: 12000,
    tarifaPorKg: 1500,
    tarifaPorKm: 0,
    tarifasProductos: [
      { categoria: 'plantas', tarifaBase: 12000 },
      { categoria: 'macetas', tarifaBase: 12000 },
      { categoria: 'sustratos', tarifaBase: 12000 },
      { categoria: 'combos', tarifaBase: 12000 },
      { categoria: 'accesorios', tarifaBase: 12000 },
      { categoria: 'herramientas', tarifaBase: 12000 }
    ],
    recargoFragiles: 2000,
    recargoVoluminosos: 3000,
    pesoMaximo: 50000,
    volumenMaximo: 1000000,
    distanciaMaxima: 50,
    restricciones: [],
    tiempoEntregaMin: 1,
    tiempoEntregaMax: 3,
    entregaMismoDia: { disponible: true, horarioLimite: '14:00', recargo: 5000 },
    activa: true,
    prioridad: 10,
    estadisticas: {},
    fechaCreacion: new Date(),
    fechaActualizacion: new Date()
  });

  await zonaMedellin.save();
  console.log('Zona de envío Medellín creada correctamente');
  process.exit(0);
})();
