// utils/cleanup-abandoned-carts.js
import { Carrito } from '../models/shopCar.model.js';
import { createError } from './customError.js';

/**
 * Limpieza automática de carritos abandonados
 * Se ejecuta periódicamente para marcar como 'abandonado' los carritos
 * que no han tenido actividad por más de 30 días
 */
export const cleanupAbandonedCarts = async () => {
  try {
    console.log('🧹 Iniciando limpieza de carritos abandonados...');

    const diasAbandonado = 30; // Configurable
    const fechaLimite = new Date();
    fechaLimite.setDate(fechaLimite.getDate() - diasAbandonado);

    // Usar el método estático del modelo
    const resultado = await Carrito.limpiarAbandonados(diasAbandonado);

    console.log(`✅ Limpieza completada: ${resultado.modifiedCount} carritos marcados como abandonados`);

    // Opcional: Eliminar carritos abandonados muy antiguos (ej: más de 90 días)
    const diasEliminar = 90;
    const fechaEliminar = new Date();
    fechaEliminar.setDate(fechaEliminar.getDate() - diasEliminar);

    const resultadoEliminacion = await Carrito.deleteMany({
      estado: 'abandonado',
      ultimaActividad: { $lt: fechaEliminar }
    });

    if (resultadoEliminacion.deletedCount > 0) {
      console.log(`🗑️ Eliminados ${resultadoEliminacion.deletedCount} carritos abandonados antiguos`);
    }

    return {
      marcadosComoAbandonados: resultado.modifiedCount,
      eliminados: resultadoEliminacion.deletedCount
    };

  } catch (error) {
    console.error('❌ Error en limpieza de carritos abandonados:', error);
    throw createError('INTERNAL_ERROR', { message: 'Error en limpieza de carritos abandonados' });
  }
};

/**
 * Función para ejecutar limpieza manual desde línea de comandos
 */
export const runManualCleanup = async () => {
  try {
    const resultado = await cleanupAbandonedCarts();
    console.log('Resultados de limpieza:', resultado);
    process.exit(0);
  } catch (error) {
    console.error('Error ejecutando limpieza manual:', error);
    process.exit(1);
  }
};

// Si se ejecuta directamente como script
if (import.meta.url === `file://${process.argv[1]}`) {
  runManualCleanup();
}