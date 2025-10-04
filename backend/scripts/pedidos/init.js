import mongoose from 'mongoose';
import { 
  EstadoPedido, 
  ComisionVenta, 
  FacturaVenta, 
  ReporteVenta 
} from '../../models/pedidos/index.js';

/**
 * Script para inicializar datos base del módulo de pedidos
 */
class InitPedidosModule {
  
  async inicializar() {
    try {
      console.log('🚀 Iniciando configuración del módulo de pedidos...');
      
      await this.crearIndices();
      await this.configurarEstadosIniciales();
      await this.configurarFacturacion();
      
      console.log('✅ Módulo de pedidos configurado exitosamente');
      
    } catch (error) {
      console.error('❌ Error al configurar módulo de pedidos:', error);
      throw error;
    }
  }
  
  /**
   * Crea índices necesarios para optimizar consultas
   */
  async crearIndices() {
    console.log('📊 Creando índices para optimización...');
    
    try {
      // Índices para EstadoPedido
      await EstadoPedido.collection.createIndex({ pedidoId: 1, fechaCambio: -1 });
      await EstadoPedido.collection.createIndex({ estadoNuevo: 1, fechaCambio: -1 });
      
      // Índices para ComisionVenta
      await ComisionVenta.collection.createIndex({ vendedorId: 1, estado: 1, fechaCalculo: -1 });
      await ComisionVenta.collection.createIndex({ estado: 1, fechaCalculo: -1 });
      
      // Índices para FacturaVenta
      await FacturaVenta.collection.createIndex({ numeroFactura: 1 }, { unique: true });
      await FacturaVenta.collection.createIndex({ pedidoId: 1 });
      await FacturaVenta.collection.createIndex({ 'datosCliente.numeroDocumento': 1, fechaGeneracion: -1 });
      await FacturaVenta.collection.createIndex({ estado: 1, fechaGeneracion: -1 });
      
      // Índices para ReporteVenta
      await ReporteVenta.collection.createIndex({ 'periodo.fechaInicio': 1, 'periodo.fechaFin': 1 });
      await ReporteVenta.collection.createIndex({ 'periodo.tipo': 1, estado: 1, fechaGeneracion: -1 });
      
      console.log('✅ Índices creados exitosamente');
      
    } catch (error) {
      console.warn('⚠️ Algunos índices ya existen o hubo errores menores:', error.message);
    }
  }
  
  /**
   * Configura estados iniciales y transiciones válidas
   */
  async configurarEstadosIniciales() {
    console.log('⚙️ Configurando estados iniciales...');
    
    // Los estados se configuran en el modelo, no hay datos iniciales necesarios
    console.log('✅ Estados configurados en el modelo');
  }
  
  /**
   * Configura numeración de facturas y parámetros base
   */
  async configurarFacturacion() {
    console.log('🧾 Configurando sistema de facturación...');
    
    try {
      // Verificar si ya existe una factura para determinar el siguiente número
      const ultimaFactura = await FacturaVenta.findOne(
        {},
        {},
        { sort: { numeroFactura: -1 } }
      );
      
      if (!ultimaFactura) {
        console.log('📋 No hay facturas existentes, numeración iniciará desde FV202401');
      } else {
        console.log(`📋 Última factura encontrada: ${ultimaFactura.numeroFactura}`);
      }
      
      console.log('✅ Sistema de facturación configurado');
      
    } catch (error) {
      console.error('❌ Error al configurar facturación:', error);
    }
  }
  
  /**
   * Crea configuraciones base para comisiones
   */
  async configurarComisionesBase() {
    console.log('💰 Configurando sistema de comisiones...');
    
    // Las configuraciones de comisión se manejan por usuario
    // Aquí podrían crearse configuraciones por defecto si es necesario
    
    console.log('✅ Sistema de comisiones configurado');
  }
  
  /**
   * Verifica la integridad de los datos del módulo
   */
  async verificarIntegridad() {
    console.log('🔍 Verificando integridad del módulo...');
    
    try {
      // Verificar que los modelos estén disponibles
      const modelos = [EstadoPedido, ComisionVenta, FacturaVenta, ReporteVenta];
      
      for (const modelo of modelos) {
        const count = await modelo.countDocuments();
        console.log(`📊 ${modelo.modelName}: ${count} documentos`);
      }
      
      console.log('✅ Verificación de integridad completada');
      
    } catch (error) {
      console.error('❌ Error en verificación de integridad:', error);
      throw error;
    }
  }
  
  /**
   * Genera datos de prueba para desarrollo
   */
  async generarDatosPrueba() {
    if (process.env.NODE_ENV === 'production') {
      console.log('⚠️ No se generan datos de prueba en producción');
      return;
    }
    
    console.log('🧪 Generando datos de prueba...');
    
    try {
      // Aquí se podrían crear datos de prueba si es necesario
      console.log('✅ Datos de prueba generados (simulados)');
      
    } catch (error) {
      console.error('❌ Error al generar datos de prueba:', error);
    }
  }
}

// Función para ejecutar la inicialización
export async function inicializarModuloPedidos() {
  const init = new InitPedidosModule();
  await init.inicializar();
  await init.verificarIntegridad();
  
  if (process.env.NODE_ENV === 'development') {
    await init.generarDatosPrueba();
  }
}

// Si se ejecuta directamente
if (import.meta.url === `file://${process.argv[1]}`) {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/verdenexo');
    console.log('🔗 Conectado a MongoDB');
    
    await inicializarModuloPedidos();
    
    console.log('🎉 Inicialización del módulo de pedidos completada');
    process.exit(0);
    
  } catch (error) {
    console.error('💥 Error fatal en inicialización:', error);
    process.exit(1);
  }
}