// utils/invoiceService.js
import { Factura } from '../models/invoice.model.js';
import { Pedido } from '../models/order.model.js';
import User from '../models/user.model.js';
import { createError } from './customError.js';

/**
 * Configuración de la empresa emisora
 */
const CONFIG_EMPRESA = {
  nombreEmpresa: 'VerdeNexo S.A.S.',
  nit: '901.234.567-8',
  direccion: 'Calle 123 #45-67, Bogotá, Colombia',
  telefono: '+57 300 123 4567',
  email: 'facturacion@verdenexo.com',
  regimenTributario: 'comun'
};

/**
 * Crear factura a partir de un pedido confirmado
 * @param {string} pedidoId - ID del pedido
 * @returns {Promise<Factura>} Factura creada
 */
export const crearFacturaDesdePedido = async (pedidoId) => {
  try {
    // Buscar el pedido
    const pedido = await Pedido.findById(pedidoId).populate('items.productoId');
    if (!pedido) {
      throw createError('VAL_INVALID_OBJECT_ID', { field: 'pedidoId' });
    }

    // Verificar que el pedido esté en estado que permita facturación
    if (!['confirmado', 'pagado', 'enviado', 'entregado'].includes(pedido.estado)) {
      throw createError('VAL_NO_FIELDS_TO_UPDATE', {
        message: `No se puede generar factura para un pedido en estado: ${pedido.estado}`
      });
    }

    // Verificar si ya existe una factura para este pedido
    const facturaExistente = await Factura.findOne({ pedidoId: pedido._id });
    if (facturaExistente) {
      throw createError('VAL_NO_FIELDS_TO_UPDATE', {
        message: 'Ya existe una factura para este pedido'
      });
    }

    // Generar número de factura
    const numeroFactura = await Factura.generarNumeroFactura();

    // Convertir items del pedido a detalles de factura
    const detallesFactura = pedido.items.map(item => ({
      productoId: item.productoId._id,
      nombreProducto: item.nombreProducto,
      descripcion: item.descripcion,
      cantidad: item.cantidad,
      precioUnitario: item.precioUnitario,
      descuento: 0, // Por ahora sin descuentos adicionales
      iva: calcularIVA(item.subtotal, item.productoId?.categoria || 'general'),
      subtotal: item.subtotal,
      variante: item.variante
    }));

    // Calcular totales
    const totales = calcularTotalesFactura(detallesFactura);

    // Crear la factura
    const nuevaFactura = new Factura({
      pedidoId: pedido._id,
      usuarioId: pedido.usuarioId,
      numeroFactura,
      tipoFactura: 'venta',

      emisor: CONFIG_EMPRESA,

      receptor: {
        tipoDocumento: pedido.facturacion.tipoDocumento,
        numeroDocumento: pedido.facturacion.numeroDocumento,
        nombreCompleto: pedido.facturacion.nombreCompleto,
        email: pedido.facturacion.email,
        telefono: pedido.facturacion.telefono,
        direccion: pedido.envio.direccionEnvio.calle + ' ' +
                  pedido.envio.direccionEnvio.numero + ', ' +
                  pedido.envio.direccionEnvio.barrio + ', ' +
                  pedido.envio.direccionEnvio.ciudad,
        tipoPersona: pedido.facturacion.tipoDocumento === 'NIT' ? 'juridica' : 'natural'
      },

      detalles: detallesFactura,
      totales,

      metodoPago: pedido.pago.metodoPago,
      estadoPago: pedido.pago.estadoPago === 'completado' ? 'pagado' : 'pendiente',

      notas: pedido.notasInternas,
      terminosPago: pedido.mayorista.esPedidoMayorista ?
        pedido.mayorista.condicionesEspeciales.terminosPago || 'Pago inmediato' :
        'Pago inmediato',

      // Asignar vendedor si existe
      vendedorId: pedido.metadata?.vendedorAsignado,

      estado: 'emitida',
      fechaEmision: new Date()
    });

    // Guardar la factura
    await nuevaFactura.save();

    // Actualizar el pedido con referencia a la factura
    pedido.facturaId = nuevaFactura._id;
    pedido.agregarAlHistorial(
      'factura_generada',
      `Factura ${numeroFactura} generada exitosamente`,
      'sistema'
    );
    await pedido.save();

    return nuevaFactura;

  } catch (error) {
    console.error('Error creando factura:', error);
    throw error;
  }
};

/**
 * Calcular IVA según la categoría del producto
 * @param {number} subtotal - Subtotal del producto
 * @param {string} categoria - Categoría del producto
 * @returns {number} IVA calculado
 */
const calcularIVA = (subtotal, categoria) => {
  // Tasas de IVA en Colombia (2024)
  const tasasIVA = {
    'general': 0.19,    // 19% para productos generales
    'alimentos': 0.05,  // 5% para alimentos
    'medicamentos': 0.05, // 5% para medicamentos
    'educacion': 0,     // Exento para educación
    'exento': 0         // Exento
  };

  const tasa = tasasIVA[categoria] || tasasIVA.general;
  return subtotal * tasa;
};

/**
 * Calcular totales de la factura
 * @param {Array} detalles - Detalles de la factura
 * @returns {Object} Totales calculados
 */
const calcularTotalesFactura = (detalles) => {
  let subtotal = 0;
  let descuentoTotal = 0;
  let ivaTotal = 0;

  detalles.forEach(detalle => {
    subtotal += detalle.subtotal;
    descuentoTotal += detalle.descuento;
    ivaTotal += detalle.iva;
  });

  return {
    subtotal,
    descuentoTotal,
    ivaTotal,
    total: subtotal - descuentoTotal + ivaTotal
  };
};

/**
 * Obtener factura por ID
 * @param {string} facturaId - ID de la factura
 * @returns {Promise<Factura>} Factura encontrada
 */
export const obtenerFactura = async (facturaId) => {
  const factura = await Factura.findById(facturaId)
    .populate('pedidoId')
    .populate('usuarioId', 'username email')
    .populate('vendedorId', 'username informacionVendedor');

  if (!factura) {
    throw createError('VAL_INVALID_OBJECT_ID', { field: 'facturaId' });
  }

  return factura;
};

/**
 * Obtener facturas de un usuario
 * @param {string} usuarioId - ID del usuario
 * @param {Object} filtros - Filtros adicionales
 * @returns {Promise<Array>} Lista de facturas
 */
export const obtenerFacturasUsuario = async (usuarioId, filtros = {}) => {
  const query = { usuarioId };

  if (filtros.estado) query.estado = filtros.estado;
  if (filtros.fechaInicio && filtros.fechaFin) {
    query.fechaEmision = {
      $gte: new Date(filtros.fechaInicio),
      $lte: new Date(filtros.fechaFin)
    };
  }

  return await Factura.find(query)
    .populate('pedidoId', 'numeroPedido estado')
    .sort({ fechaEmision: -1 })
    .limit(filtros.limite || 50);
};

/**
 * Anular factura
 * @param {string} facturaId - ID de la factura
 * @param {string} motivo - Motivo de la anulación
 * @returns {Promise<Factura>} Factura anulada
 */
export const anularFactura = async (facturaId, motivo) => {
  const factura = await Factura.findById(facturaId);

  if (!factura) {
    throw createError('VAL_INVALID_OBJECT_ID', { field: 'facturaId' });
  }

  if (factura.estado === 'anulada') {
    throw createError('VAL_NO_FIELDS_TO_UPDATE', {
      message: 'La factura ya está anulada'
    });
  }

  // Solo permitir anular facturas en ciertos estados
  if (!['emitida', 'enviada'].includes(factura.estado)) {
    throw createError('VAL_NO_FIELDS_TO_UPDATE', {
      message: `No se puede anular una factura en estado: ${factura.estado}`
    });
  }

  await factura.anularFactura(motivo);

  // Actualizar el pedido relacionado
  if (factura.pedidoId) {
    const pedido = await Pedido.findById(factura.pedidoId);
    if (pedido) {
      pedido.agregarAlHistorial(
        'factura_anulada',
        `Factura ${factura.numeroFactura} anulada: ${motivo}`,
        'sistema'
      );
      await pedido.save();
    }
  }

  return factura;
};