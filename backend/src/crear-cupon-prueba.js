import { connectDB } from './db.js';
import { Cupon } from './models/coupon.model.js';

(async () => {
  await connectDB();

  const ahora = new Date();
  const unAnioDespues = new Date(ahora.getTime() + 365 * 24 * 60 * 60 * 1000);

  const cupon = new Cupon({
    codigo: 'PRUEBA10',
    nombre: 'Cupón de prueba 10%',
    descripcion: 'Descuento de prueba para el carrito',
    tipo: 'porcentaje',
    valor: 10,
    descuentoMaximo: 0,
    condiciones: {
      montoMinimo: 0,
      categorias: [],
      segmentos: [],
      maxUsos: null,
      maxUsosPorUsuario: 10,
      productosIncluidos: [],
      productosExcluidos: [],
      soloPlantasDelicadas: false,
      soloMacetasGrandes: false,
      soloCombos: false,
      soloPrimeraCompra: false,
      zonasEnvio: [],
      diasValidos: [],
      horaInicio: '',
      horaFin: ''
    },
    fechaInicio: ahora,
    fechaVencimiento: unAnioDespues,
    activo: true,
    estadisticas: {
      vecesUsado: 0,
      montoTotalDescontado: 0,
      ultimoUso: null,
      usuariosUsaron: [],
      usosPorCategoria: []
    }
  });

  await cupon.save();
  console.log('Cupón de prueba creado: PRUEBA10');
  process.exit(0);
})();
