// controllers/checkout.controller.js
import mongoose from 'mongoose';
import { Pedido } from "../models/order.model.js";
import { Carrito } from "../models/shopCar.model.js";
import { Producto } from "../models/product.model.js";
import { ZonaEnvio } from "../models/shippingArea.model.js";
import { Comision } from "../models/commission.model.js";
import User from "../models/user.model.js";
import { createError } from "../utils/customError.js";
import { sendOrderConfirmationEmail } from "../utils/emailService.js";
import { crearFacturaDesdePedido, obtenerFactura, obtenerFacturasUsuario, anularFactura } from "../utils/invoiceService.js";
import { actualizarEstadisticasVenta, obtenerEstadisticasVentas, obtenerTopProductosVendidos, obtenerRendimientoVendedores, generarReporteVentas, obtenerMetricasTiempoReal } from "../utils/salesStatsService.js";
import { Preference, Payment } from 'mercadopago';
import config from '../config.js';

// ============================
// FUNCIONES AUXILIARES MODULARES
// ============================

export const helpersCheckout = {
  async obtenerCarritoParaCheckout(sessionId, carritoId = null) {
    let carrito;
    if (carritoId) {
      carrito = await Carrito.findById(carritoId).populate('items.productoId');
      if (!carrito || carrito.estado !== 'activo') {
        throw createError('VAL_INVALID_OBJECT_ID', { field: 'carritoId', message: 'Carrito no encontrado o no válido' });
      }
    } else {
      carrito = await Carrito.findOne({ sessionId, estado: 'activo' }).populate('items.productoId');
      if (!carrito) {
        throw createError('VAL_INVALID_OBJECT_ID', { field: 'sessionId', message: 'No se encontró un carrito activo' });
      }
    }
    if (carrito.items.length === 0) {
      throw createError('VAL_CHECKOUT_CARRITO_VACIO');
    }
    for (const item of carrito.items) {
      if (!item.productoId || !item.productoId.disponibilidad) {
        throw createError('VAL_CHECKOUT_PRODUCTO_NO_DISPONIBLE', {
          message: `El producto "${item.productoId?.nombre || 'Producto no encontrado'}" ya no está disponible`
        });
      }
    }
    return carrito;
  },
  validarFacturacion(facturacion) {
    if (!facturacion) throw createError('VAL_CHECKOUT_FACTURACION_REQUIRED');
    if (!facturacion.tipoDocumento) throw createError('VAL_CHECKOUT_FACTURACION_TIPO_DOCUMENTO');
    if (!facturacion.numeroDocumento) throw createError('VAL_CHECKOUT_FACTURACION_NUMERO_DOCUMENTO');
    if (!facturacion.nombreCompleto) throw createError('VAL_CHECKOUT_FACTURACION_NOMBRE_COMPLETO');
    if (!facturacion.email) throw createError('VAL_CHECKOUT_FACTURACION_EMAIL');
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(facturacion.email)) throw createError('VAL_CHECKOUT_FACTURACION_EMAIL_INVALID');
    if (!facturacion.telefono) throw createError('VAL_CHECKOUT_FACTURACION_TELEFONO');
    const telefonoRegex = /^(\+57|57)?[0-9]{10}$/;
    if (!telefonoRegex.test(facturacion.telefono.replace(/\s+/g, ''))) throw createError('VAL_CHECKOUT_FACTURACION_TELEFONO_INVALID');
  },
  validarEnvio(envio) {
    if (!envio) throw createError('VAL_CHECKOUT_ENVIO_REQUIRED');
    if (!envio.direccionEnvio) throw createError('VAL_CHECKOUT_ENVIO_DIRECCION_ENVIO');
    if (!envio.direccionEnvio.calle) throw createError('VAL_CHECKOUT_ENVIO_CALLE');
    if (!envio.direccionEnvio.barrio) throw createError('VAL_CHECKOUT_ENVIO_BARRIO');
    if (!envio.direccionEnvio.ciudad) throw createError('VAL_CHECKOUT_ENVIO_CIUDAD');
    if (!envio.nombreDestinatario) throw createError('VAL_CHECKOUT_ENVIO_NOMBRE_DESTINATARIO');
    if (!envio.telefonoDestinatario) throw createError('VAL_CHECKOUT_ENVIO_TELEFONO_DESTINATARIO');
  },
  validarPago(pago) {
    if (!pago || pago.metodoPago !== 'mercadopago') {
      throw createError('VAL_CHECKOUT_PAGO_METODO', {
        message: 'Solo se permite Mercado Pago como método de pago.'
      });
    }
  },
  convertirItemsParaPedido(itemsCarrito) {
    return itemsCarrito.map(item => ({
      productoId: item.productoId._id,
      nombreProducto: item.productoId.nombre,
      descripcion: item.productoId.descripcion,
      precioUnitario: item.precioUnitario,
      cantidad: item.cantidad,
      subtotal: item.precioUnitario * item.cantidad,
      esCombo: item.esCombos || false,
      comboItems: item.comboItems || [],
      notas: item.notas
    }));
  }
};

// ============================
// FUNCIONES AUXILIARES
// ============================

/**
 * Obtener carrito válido para checkout
 * @param {string} sessionId - ID de la sesión
 * @param {string} carritoId - ID del carrito (opcional)
 * @returns {Promise<Carrito>} Carrito encontrado
 */
// ...existing code...

// ============================
// RF-CHE-01 - INGRESAR DATOS DE COMPRA
// ============================

/**
 * Iniciar proceso de checkout
 * Obtiene el carrito y prepara la información básica para el checkout
 */
export const iniciarCheckout = async (req, res, next) => {
  try {
    const { sessionId, carritoId } = req.query;
    const usuarioId = req.usuario?.id;

    // Obtener carrito
    const carrito = await obtenerCarritoParaCheckout(sessionId, carritoId);

    // Preparar resumen del carrito
    const resumenCarrito = {
      items: carrito.items.map(item => ({
        id: item._id,
        productoId: item.productoId._id,
        nombre: item.productoId.nombre,
        precioUnitario: item.precioUnitario,
        cantidad: item.cantidad,
        subtotal: item.precioUnitario * item.cantidad,
        imagen: item.productoId.imagenes?.[0] || null
      })),
      totales: carrito.totales,
      cupones: carrito.cupones,
      envio: carrito.envio
    };

    // Información del usuario si está autenticado
    let informacionUsuario = null;
    if (usuarioId) {
      // Aquí podrías obtener información adicional del usuario
      informacionUsuario = {
        id: usuarioId,
        // Agregar campos como nombre, email, direcciones guardadas, etc.
      };
    }

    res.json({
      success: true,
      message: "Checkout iniciado exitosamente",
      data: {
        carrito: resumenCarrito,
        usuario: informacionUsuario,
        checkoutId: `checkout_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      }
    });

  } catch (error) {
    next(error);
  }
};

/**
 * Guardar datos de facturación, envío y pago
 * Crea un borrador del pedido con toda la información
 */
export const guardarDatosCheckout = async (req, res, next) => {
  try {
    // Log de datos recibidos
    console.log('--- [Checkout] Datos recibidos en guardarDatosCheckout ---');
    console.log('req.body:', JSON.stringify(req.body, null, 2));

    const {
      sessionId,
      carritoId,
      facturacion,
      envio,
      pago,
      esPedidoMayorista = false,
      informacionMayorista = null
    } = req.body;

    console.log('--- [Checkout] Estructura extraída ---');
    console.log('sessionId:', sessionId);
    console.log('carritoId:', carritoId);
    console.log('facturacion:', JSON.stringify(facturacion, null, 2));
    console.log('envio:', JSON.stringify(envio, null, 2));
    console.log('pago:', JSON.stringify(pago, null, 2));
    console.log('esPedidoMayorista:', esPedidoMayorista);
    console.log('informacionMayorista:', JSON.stringify(informacionMayorista, null, 2));

    const usuarioId = req.usuario?.id;

  // Validaciones
  helpersCheckout.validarFacturacion(facturacion);
  helpersCheckout.validarEnvio(envio);
  helpersCheckout.validarPago(pago);

  // Obtener carrito
  const carrito = await helpersCheckout.obtenerCarritoParaCheckout(sessionId, carritoId);

    // Verificar límite de 50 productos
    const cantidadTotal = carrito.items.reduce((total, item) => total + item.cantidad, 0);
    if (cantidadTotal > 50) {
      throw createError('VAL_CHECKOUT_LIMITE_PRODUCTOS', {
        message: `El pedido excede el límite de 50 productos (${cantidadTotal})`
      });
    }

    // Calcular costos de envío si no están definidos
    let costoEnvio = envio.costoEnvio || 0;
    if (!costoEnvio && envio.direccionEnvio) {
      try {
        const zonasEnvio = await ZonaEnvio.buscarPorUbicacion(
          envio.direccionEnvio.barrio,
          envio.direccionEnvio.ciudad
        );

        if (zonasEnvio.length > 0) {
          const zona = zonasEnvio[0];
          const calculoEnvio = zona.calcularCostoEnvio(carrito, envio.direccionEnvio);
          costoEnvio = calculoEnvio.costo;
          envio.zonaEnvio = zona.nombre;
        }
      } catch (error) {
        console.warn('No se pudo calcular envío automáticamente:', error.message);
      }
    }

    // Crear dirección de facturación a partir de datos de envío si no viene en facturacion
    const direccionFacturacion = facturacion.direccionFacturacion || {
      calle: envio.direccionEnvio.calle,
      numero: envio.direccionEnvio.numero || '',
      complemento: envio.direccionEnvio.complemento || '',
      barrio: envio.direccionEnvio.barrio,
      ciudad: envio.direccionEnvio.ciudad,
      departamento: envio.direccionEnvio.departamento,
      codigoPostal: envio.direccionEnvio.codigoPostal || ''
    };

    // Crear pedido en estado borrador
    const nuevoPedido = new Pedido({
      usuarioId,
      carritoId: carrito._id,
      origen: req.headers['user-agent']?.includes('Mobile') ? 'mobile' : 'web',
      canalVenta: esPedidoMayorista ? 'mayorista' : 'b2c',

    // Items del pedido
    items: helpersCheckout.convertirItemsParaPedido(carrito.items),
      cupones: carrito.cupones.map(c => ({
        codigo: c.codigo,
        descripcion: c.descripcion,
        tipo: c.tipo,
        valor: c.valor,
        descuentoAplicado: c.descuentoAplicado,
        fechaAplicado: c.fechaAplicado
      })),

      // Información del cliente
      facturacion: {
        ...facturacion,
        direccionFacturacion
      },
      envio: {
        ...envio,
        costoEnvio,
        estadoEnvio: 'pendiente'
      },
      pago: {
        metodoPago: 'mercadopago',
        montoTotal: carrito.totales.total + costoEnvio,
        estadoPago: 'pendiente'
      },

      // Pedido mayorista si aplica
      mayorista: esPedidoMayorista ? {
        esPedidoMayorista: true,
        informacionEmpresa: informacionMayorista?.empresa || {},
        condicionesEspeciales: informacionMayorista?.condiciones || {},
        contactoComercial: informacionMayorista?.contacto || {}
      } : { esPedidoMayorista: false },

      // Metadatos
      metadata: {
        userAgent: req.headers['user-agent'],
        ip: req.ip,
        sessionId,
        urlOrigen: req.headers['referer']
      }
    });

    // Forzar generación de número de pedido si no existe
    if (!nuevoPedido.numeroPedido) {
      nuevoPedido.numeroPedido = nuevoPedido.generarNumeroPedido();
    }

    // Calcular totales
    nuevoPedido.calcularTotales();

    // Agregar al historial
    nuevoPedido.agregarAlHistorial(
      'creado',
      'Pedido creado en estado borrador',
      usuarioId || 'invitado'
    );

    // Guardar pedido
    await nuevoPedido.save();

    res.json({
      success: true,
      message: "Datos de checkout guardados exitosamente",
      data: {
        pedidoId: nuevoPedido._id,
        numeroPedido: nuevoPedido.numeroPedido,
        totales: nuevoPedido.totales,
        estado: nuevoPedido.estado
      }
    });

  } catch (error) {
    // Log detallado para depuración
    console.error('Error al guardar datos de checkout:', error);
    if (error.errors) {
      Object.keys(error.errors).forEach(key => {
        console.error(`Campo con error: ${key} -`, error.errors[key].message);
      });
    }
    next(error);
  }
};

// ============================
// RF-CHE-02 - RESUMIR COMPRA
// ============================

/**
 * Obtener resumen completo del pedido antes de confirmar
 */
export const obtenerResumenPedido = async (req, res, next) => {
  try {
    const { pedidoId } = req.params;
    const usuarioId = req.usuario?.id;

    // Buscar pedido
    const pedido = await Pedido.findById(pedidoId).populate('items.productoId');
    if (!pedido) {
      throw createError('VAL_INVALID_OBJECT_ID', { field: 'pedidoId' });
    }

    // Verificar permisos (solo el propietario o admin pueden ver el pedido)
    if (usuarioId && pedido.usuarioId && pedido.usuarioId.toString() !== usuarioId) {
      throw createError('AUTH_ACCESS_DENIED');
    }

    // Preparar resumen detallado
    const resumen = {
      numeroPedido: pedido.numeroPedido,
      estado: pedido.estado,
      fechaCreacion: pedido.fechaCreacion,

      // Items detallados
      items: pedido.items.map(item => ({
        nombreProducto: item.nombreProducto,
        descripcion: item.descripcion,
        precioUnitario: item.precioUnitario,
        cantidad: item.cantidad,
        subtotal: item.subtotal,
        variante: item.variante
      })),

      // Información del cliente
      cliente: {
        nombre: pedido.facturacion.nombreCompleto,
        email: pedido.facturacion.email,
        telefono: pedido.facturacion.telefono
      },

      // Dirección de envío
      envio: {
        destinatario: pedido.envio.nombreDestinatario,
        telefono: pedido.envio.telefonoDestinatario,
        direccion: pedido.envio.direccionEnvio,
        costoEnvio: pedido.envio.costoEnvio,
        fechaEntregaEstimada: pedido.envio.fechaEntregaEstimada
      },

      // Método de pago
      pago: {
        metodo: pedido.pago.metodoPago,
        estado: pedido.pago.estadoPago,
        montoTotal: pedido.pago.montoTotal
      },

      // Descuentos y cupones
      descuentos: pedido.cupones.map(cupon => ({
        codigo: cupon.codigo,
        descripcion: cupon.descripcion,
        descuento: cupon.descuentoAplicado
      })),

      // Totales finales
      totales: pedido.totales,

      // Información mayorista si aplica
      mayorista: pedido.mayorista.esPedidoMayorista ? {
        empresa: pedido.mayorista.informacionEmpresa.nombreEmpresa,
        descuentoEspecial: pedido.mayorista.condicionesEspeciales.descuentoMayorista
      } : null
    };

    res.json({
      success: true,
      message: "Resumen del pedido obtenido exitosamente",
      data: resumen
    });

  } catch (error) {
    next(error);
  }
};

// ============================
// RF-CHE-03 - GENERAR PEDIDO
// ============================

/**
 * Confirmar y generar el pedido formal
 * Cambia el estado de borrador a confirmado
 */
export const confirmarPedido = async (req, res, next) => {
  try {
    const { pedidoId } = req.params;
    const { notasAdicionales } = req.body;
    const usuarioId = req.usuario?.id;

    // Buscar pedido
    const pedido = await Pedido.findById(pedidoId);
    if (!pedido) {
      throw createError('VAL_INVALID_OBJECT_ID', { field: 'pedidoId' });
    }

    // Verificar permisos
    if (usuarioId && pedido.usuarioId && pedido.usuarioId.toString() !== usuarioId) {
      throw createError('AUTH_ACCESS_DENIED');
    }

    // Verificar que el pedido esté en estado borrador
    if (pedido.estado !== 'borrador') {
      throw createError('VAL_CHECKOUT_PEDIDO_ESTADO_INVALIDO', {
        message: `El pedido no puede ser confirmado. Estado actual: ${pedido.estado}`
      });
    }

    // Verificar stock de productos (última validación)
    for (const item of pedido.items) {
      const producto = await Producto.findById(item.productoId);
      if (!producto || !producto.disponibilidad) {
        throw createError('VAL_NO_FIELDS_TO_UPDATE', {
          message: `El producto "${item.nombreProducto}" ya no está disponible`
        });
      }

      // Validar stock disponible
      if (producto.stock < item.cantidad) {
        throw createError('VAL_CHECKOUT_STOCK_INSUFICIENTE', {
          message: `Stock insuficiente para "${item.nombreProducto}". Disponible: ${producto.stock}, solicitado: ${item.cantidad}`
        });
      }

      // Validar stock por variante si aplica
      if (item.variante && producto.variantes && producto.variantes.length > 0) {
        const variante = producto.variantes.find(v =>
          v.atributo === item.variante.atributo && v.valor === item.variante.valor
        );
        if (variante && variante.stock < item.cantidad) {
          throw createError('VAL_CHECKOUT_STOCK_INSUFICIENTE', {
            message: `Stock insuficiente para variante "${item.variante.atributo}: ${item.variante.valor}" de "${item.nombreProducto}". Disponible: ${variante.stock}, solicitado: ${item.cantidad}`
          });
        }
      }
    }

    // Cambiar estado a confirmado
    pedido.estado = 'confirmado';
    pedido.fechaConfirmacion = new Date();

    if (notasAdicionales) {
      pedido.notasInternas = (pedido.notasInternas || '') + '\n' + notasAdicionales;
    }

    // Agregar al historial
    pedido.agregarAlHistorial(
      'confirmado',
      'Pedido confirmado por el cliente',
      usuarioId || 'invitado'
    );

    await pedido.save();

    // RF-PED-02: Actualizar stock de productos
    try {
      for (const item of pedido.items) {
        const producto = await Producto.findById(item.productoId);
        if (producto) {
          // Actualizar stock general
          producto.stock = Math.max(0, producto.stock - item.cantidad);

          // Actualizar stock por variante si aplica
          if (item.variante && producto.variantes && producto.variantes.length > 0) {
            const varianteIndex = producto.variantes.findIndex(v =>
              v.atributo === item.variante.atributo && v.valor === item.variante.valor
            );
            if (varianteIndex !== -1) {
              producto.variantes[varianteIndex].stock = Math.max(0,
                producto.variantes[varianteIndex].stock - item.cantidad
              );
            }
          }

          // Marcar como no disponible si stock llega a 0
          if (producto.stock <= 0) {
            producto.disponibilidad = false;
          }

          await producto.save();
        }
      }

      // Agregar al historial que se actualizó el stock
      pedido.agregarAlHistorial(
        'stock_actualizado',
        'Stock de productos actualizado exitosamente',
        'sistema'
      );
      await pedido.save();

    } catch (stockError) {
      console.error('Error actualizando stock:', stockError);
      // No fallar la confirmación del pedido por error de stock
      // pero sí registrar el error en el historial
      pedido.agregarAlHistorial(
        'error_stock',
        `Error actualizando stock: ${stockError.message}`,
        'sistema'
      );
      await pedido.save();
    }

    // RF-PED-03: Registrar comisiones de venta
    try {
      // Determinar el vendedor (por ahora usamos un vendedor por defecto o el asignado)
      // En un sistema real, esto podría venir del carrito o asignarse automáticamente
      let vendedorId = null;

      // Buscar un vendedor activo para asignar la venta
      if (!vendedorId) {
        const vendedorPorDefecto = await User.findOne({
          role: 'seller',
          'informacionVendedor.activo': true
        }).sort({ 'informacionVendedor.ventasTotales': 1 }); // Asignar al que tenga menos ventas

        vendedorId = vendedorPorDefecto?._id;
      }

      if (vendedorId) {
        // Registrar comisión para cada item del pedido
        for (const item of pedido.items) {
          const vendedor = await User.findById(vendedorId);
          if (vendedor && vendedor.role === 'seller') {
            const porcentajeComision = vendedor.informacionVendedor?.porcentajeComision || 5.0;
            const montoComision = (item.subtotal * porcentajeComision) / 100;

            // Crear registro de comisión
            const nuevaComision = new Comision({
              pedidoId: pedido._id,
              vendedorId: vendedor._id,
              productoId: item.productoId,
              nombreProducto: item.nombreProducto,
              cantidadVendida: item.cantidad,
              precioUnitario: item.precioUnitario,
              subtotal: item.subtotal,
              porcentajeComision,
              montoComision,
              tipoVenta: pedido.canalVenta,
              canalVenta: pedido.origen,
              metadata: {
                userAgent: pedido.metadata?.userAgent,
                ip: pedido.metadata?.ip,
                sessionId: pedido.metadata?.sessionId
              }
            });

            await nuevaComision.save();

            // Actualizar estadísticas del vendedor
            vendedor.informacionVendedor.comisionesAcumuladas += montoComision;
            vendedor.informacionVendedor.comisionesPendientes += montoComision;
            vendedor.informacionVendedor.ventasTotales += 1;
            vendedor.informacionVendedor.ultimaVenta = new Date();
            await vendedor.save();
          }
        }

        // Agregar al historial que se registraron las comisiones
        pedido.agregarAlHistorial(
          'comisiones_registradas',
          `Comisiones registradas para vendedor ${vendedorId}`,
          'sistema'
        );
        await pedido.save();
      }

    } catch (comisionError) {
      console.error('Error registrando comisiones:', comisionError);
      // No fallar la confirmación del pedido por error de comisiones
      pedido.agregarAlHistorial(
        'error_comisiones',
        `Error registrando comisiones: ${comisionError.message}`,
        'sistema'
      );
      await pedido.save();
    }

    // RF-PED-04: Generar factura de venta
    try {
      const factura = await crearFacturaDesdePedido(pedido._id);

      // Agregar al historial que se generó la factura
      pedido.agregarAlHistorial(
        'factura_generada',
        `Factura ${factura.numeroFactura} generada exitosamente`,
        'sistema'
      );
      await pedido.save();

    } catch (facturaError) {
      console.error('Error generando factura:', facturaError);
      // No fallar la confirmación del pedido por error de facturación
      pedido.agregarAlHistorial(
        'error_factura',
        `Error generando factura: ${facturaError.message}`,
        'sistema'
      );
      await pedido.save();
    }

    // RF-PED-06: Actualizar estadísticas de venta
    try {
      await actualizarEstadisticasVenta(pedido);

      // Agregar al historial que se actualizaron las estadísticas
      pedido.agregarAlHistorial(
        'estadisticas_actualizadas',
        'Estadísticas de venta actualizadas exitosamente',
        'sistema'
      );
      await pedido.save();

    } catch (estadisticasError) {
      console.error('Error actualizando estadísticas:', estadisticasError);
      // No fallar la confirmación del pedido por error en estadísticas
    }

    res.json({
      success: true,
      message: "Pedido confirmado exitosamente",
      data: {
        numeroPedido: pedido.numeroPedido,
        estado: pedido.estado,
        fechaConfirmacion: pedido.fechaConfirmacion,
        total: pedido.totales.total
      }
    });

  } catch (error) {
    next(error);
  }
};

// ============================
// RF-CHE-04 - ENVIAR NOTIFICACIÓN DE PEDIDO
// ============================

/**
 * Enviar confirmación de pedido por email
 */
export const enviarNotificacionPedido = async (req, res, next) => {
  try {
    const { pedidoId } = req.params;

    // Buscar pedido
    const pedido = await Pedido.findById(pedidoId).populate('items.productoId');
    if (!pedido) {
      throw createError('VAL_INVALID_OBJECT_ID', { field: 'pedidoId' });
    }

    // Verificar que el pedido esté confirmado
    if (!['confirmado', 'pagado', 'enviado', 'entregado'].includes(pedido.estado)) {
      throw createError('VAL_CHECKOUT_PEDIDO_ESTADO_INVALIDO', {
        message: 'Solo se pueden enviar notificaciones de pedidos confirmados'
      });
    }

    // Enviar email de confirmación
    try {
      await sendOrderConfirmationEmail(pedido);

      // Actualizar estado de notificaciones
      pedido.notificaciones.emailEnviado = true;
      pedido.notificaciones.fechaUltimaNotificacion = new Date();

      // Agregar al historial
      pedido.agregarAlHistorial(
        'notificacion_enviada',
        'Confirmación de pedido enviada por email',
        'sistema'
      );

      await pedido.save();

      res.json({
        success: true,
        message: "Notificación de pedido enviada exitosamente",
        data: {
          numeroPedido: pedido.numeroPedido,
          email: pedido.facturacion.email,
          fechaNotificacion: pedido.notificaciones.fechaUltimaNotificacion
        }
      });

    } catch (emailError) {
      console.error('Error enviando email:', emailError);

      // No fallar la petición, solo loggear el error
      res.json({
        success: true,
        message: "Pedido procesado pero hubo un error enviando la notificación por email",
        warning: "La notificación por email no pudo ser enviada",
        data: {
          numeroPedido: pedido.numeroPedido,
          emailError: emailError.message
        }
      });
    }

  } catch (error) {
    next(error);
  }
};

// ============================
// RF-CHE-05 - MANEJAR PEDIDOS MAYORISTAS
// ============================

/**
 * Procesar pedido mayorista con condiciones especiales
 */
export const procesarPedidoMayorista = async (req, res, next) => {
  try {
    const { pedidoId } = req.params;
    const {
      descuentoEspecial,
      plazoPagoEspecial,
      terminosPago,
      requiereFacturaEspecial
    } = req.body;

    // Buscar pedido
    const pedido = await Pedido.findById(pedidoId);
    if (!pedido) {
      throw createError('VAL_INVALID_OBJECT_ID', { field: 'pedidoId' });
    }

    // Verificar que sea un pedido mayorista
    if (!pedido.mayorista.esPedidoMayorista) {
      throw createError('VAL_CHECKOUT_PEDIDO_ESTADO_INVALIDO', {
        message: 'Este pedido no está marcado como mayorista'
      });
    }

    // Aplicar condiciones especiales
    if (descuentoEspecial && descuentoEspecial > 0) {
      pedido.mayorista.condicionesEspeciales.descuentoMayorista = descuentoEspecial;

      // Recalcular totales con descuento mayorista
      const descuentoAdicional = (pedido.totales.subtotal * descuentoEspecial) / 100;
      pedido.totales.descuentoCupones += descuentoAdicional;
      pedido.totales.total = Math.max(0, pedido.totales.total - descuentoAdicional);
    }

    if (plazoPagoEspecial) {
      pedido.mayorista.condicionesEspeciales.plazoPagoEspecial = plazoPagoEspecial;
    }

    if (terminosPago) {
      pedido.mayorista.condicionesEspeciales.terminosPago = terminosPago;
    }

    if (requiereFacturaEspecial !== undefined) {
      pedido.mayorista.condicionesEspeciales.requiereFacturaEspecial = requiereFacturaEspecial;
    }

    // Cambiar prioridad del pedido
    pedido.prioridad = 'alta';

    // Agregar al historial
    pedido.agregarAlHistorial(
      'procesamiento_mayorista',
      'Pedido procesado con condiciones mayoristas especiales',
      'sistema',
      { descuentoEspecial, plazoPagoEspecial, terminosPago }
    );

    await pedido.save();

    res.json({
      success: true,
      message: "Pedido mayorista procesado exitosamente",
      data: {
        numeroPedido: pedido.numeroPedido,
        descuentoMayorista: descuentoEspecial,
        totalActualizado: pedido.totales.total,
        prioridad: pedido.prioridad
      }
    });

  } catch (error) {
    next(error);
  }
};

// ============================
// RF-CHE-06 - REGISTRAR INFORMACIÓN DE DESPACHO
// ============================

/**
 * Actualizar información de despacho del pedido
 */
export const actualizarInformacionDespacho = async (req, res, next) => {
  try {
    const { pedidoId } = req.params;
    const {
      fechaEntregaEstimada,
      rangoHorarioEntrega,
      instruccionesEspeciales,
      transportadora,
      numeroGuia
    } = req.body;

    // Buscar pedido
    const pedido = await Pedido.findById(pedidoId);
    if (!pedido) {
      throw createError('VAL_INVALID_OBJECT_ID', { field: 'pedidoId' });
    }

    // Verificar que el pedido esté en estado que permita despacho
    if (!['pagado', 'en_preparacion', 'enviado'].includes(pedido.estado)) {
      throw createError('VAL_CHECKOUT_PEDIDO_ESTADO_INVALIDO', {
        message: `No se puede actualizar información de despacho para un pedido en estado: ${pedido.estado}`
      });
    }

    // Actualizar información de envío
    if (fechaEntregaEstimada) {
      pedido.envio.fechaEntregaEstimada = new Date(fechaEntregaEstimada);
    }

    if (rangoHorarioEntrega) {
      pedido.envio.rangoHorarioEntrega = rangoHorarioEntrega;
    }

    if (instruccionesEspeciales) {
      pedido.envio.instruccionesEspeciales = instruccionesEspeciales;
    }

    if (transportadora) {
      pedido.envio.transportadora = transportadora;
    }

    if (numeroGuia) {
      pedido.envio.numeroGuia = numeroGuia;
      pedido.envio.estadoEnvio = 'enviado';
      pedido.fechaEnvio = new Date();
    }

    // Agregar al historial
    pedido.agregarAlHistorial(
      numeroGuia ? 'enviado' : 'despacho_actualizado',
      numeroGuia ? `Pedido enviado con guía ${numeroGuia}` : 'Información de despacho actualizada',
      'sistema',
      { transportadora, numeroGuia, fechaEntregaEstimada }
    );

    await pedido.save();

    res.json({
      success: true,
      message: "Información de despacho actualizada exitosamente",
      data: {
        numeroPedido: pedido.numeroPedido,
        estadoEnvio: pedido.envio.estadoEnvio,
        fechaEntregaEstimada: pedido.envio.fechaEntregaEstimada,
        transportadora: pedido.envio.transportadora,
        numeroGuia: pedido.envio.numeroGuia
      }
    });

  } catch (error) {
    next(error);
  }
};

// ============================
// FUNCIONES ADICIONALES
// ============================

/**
 * Obtener pedidos del usuario
 */
export const obtenerPedidosUsuario = async (req, res, next) => {
  try {
    const usuarioId = req.usuario?.id;
    const { estado, pagina = 1, limite = 10 } = req.query;

    if (!usuarioId) {
      throw createError('AUTH_TOKEN_MISSING');
    }

    const filtros = { usuarioId };
    if (estado) {
      filtros.estado = estado;
    }

    const skip = (pagina - 1) * limite;

    const pedidos = await Pedido.find(filtros)
      .sort({ fechaCreacion: -1 })
      .skip(skip)
      .limit(parseInt(limite))
      .select('numeroPedido estado fechaCreacion totales items envio');

    const total = await Pedido.countDocuments(filtros);

    res.json({
      success: true,
      message: `${pedidos.length} pedidos encontrados`,
      data: {
        pedidos,
        paginacion: {
          pagina: parseInt(pagina),
          limite: parseInt(limite),
          total,
          paginas: Math.ceil(total / limite)
        }
      }
    });

  } catch (error) {
    next(error);
  }
};

/**
 * Obtener detalle completo de un pedido
 */
export const obtenerDetallePedido = async (req, res, next) => {
  try {
    const { pedidoId } = req.params;
    const usuarioId = req.usuario?.id;

    const pedido = await Pedido.findById(pedidoId).populate('items.productoId');
    if (!pedido) {
      throw createError('VAL_INVALID_OBJECT_ID', { field: 'pedidoId' });
    }

    // Verificar permisos
    if (usuarioId && pedido.usuarioId && pedido.usuarioId.toString() !== usuarioId) {
      throw createError('AUTH_ACCESS_DENIED');
    }

    res.json({
      success: true,
      message: "Detalle del pedido obtenido exitosamente",
      data: pedido
    });

  } catch (error) {
    next(error);
  }
};

// ============================
// RF-PED-04 - FUNCIONES DE FACTURACIÓN
// ============================

/**
 * Generar factura para un pedido confirmado
 */
export const generarFacturaPedido = async (req, res, next) => {
  try {
    const { pedidoId } = req.params;

    const factura = await crearFacturaDesdePedido(pedidoId);

    res.json({
      success: true,
      message: "Factura generada exitosamente",
      data: {
        numeroFactura: factura.numeroFactura,
        total: factura.totales.total,
        fechaEmision: factura.fechaEmision,
        estado: factura.estado
      }
    });

  } catch (error) {
    next(error);
  }
};

/**
 * Obtener factura por ID
 */
export const obtenerFacturaPorId = async (req, res, next) => {
  try {
    const { facturaId } = req.params;
    const usuarioId = req.usuario?.id;

    const factura = await obtenerFactura(facturaId);

    // Verificar permisos (solo el propietario o admin pueden ver la factura)
    if (usuarioId && factura.usuarioId && factura.usuarioId.toString() !== usuarioId) {
      // Verificar si es admin
      const usuario = await User.findById(usuarioId);
      if (!usuario || usuario.role !== 'admin') {
        throw createError('AUTH_ACCESS_DENIED');
      }
    }

    res.json({
      success: true,
      message: "Factura obtenida exitosamente",
      data: factura
    });

  } catch (error) {
    next(error);
  }
};

/**
 * Obtener facturas del usuario
 */
export const obtenerFacturasDelUsuario = async (req, res, next) => {
  try {
    const usuarioId = req.usuario?.id;
    const { estado, fechaInicio, fechaFin, pagina = 1, limite = 10 } = req.query;

    if (!usuarioId) {
      throw createError('AUTH_TOKEN_MISSING');
    }

    const filtros = {
      estado,
      fechaInicio,
      fechaFin,
      limite: parseInt(limite)
    };

    const facturas = await obtenerFacturasUsuario(usuarioId, filtros);
    const total = facturas.length; // En un caso real, implementar paginación completa

    res.json({
      success: true,
      message: `${facturas.length} facturas encontradas`,
      data: {
        facturas,
        paginacion: {
          pagina: parseInt(pagina),
          limite: parseInt(limite),
          total,
          paginas: Math.ceil(total / limite)
        }
      }
    });

  } catch (error) {
    next(error);
  }
};

/**
 * Anular factura
 */
export const anularFacturaPedido = async (req, res, next) => {
  try {
    const { facturaId } = req.params;
    const { motivo } = req.body;

    if (!motivo) {
      throw createError('VAL_CHECKOUT_FACTURA_ANULAR_MOTIVO');
    }

    const factura = await anularFactura(facturaId, motivo);

    res.json({
      success: true,
      message: "Factura anulada exitosamente",
      data: {
        numeroFactura: factura.numeroFactura,
        estado: factura.estado,
        motivo
      }
    });

  } catch (error) {
    next(error);
  }
};

// ============================
// RF-PED-05 - DASHBOARD DE ESTADOS DE PEDIDO
// ============================

/**
 * Obtener dashboard de estados de pedidos
 */
export const obtenerDashboardEstados = async (req, res, next) => {
  try {
    const usuarioId = req.usuario?.id;
    const { fechaInicio, fechaFin } = req.query;

    if (!usuarioId) {
      throw createError('AUTH_TOKEN_MISSING');
    }

    // Definir rango de fechas (últimos 30 días por defecto)
    const fechaFinFiltro = fechaFin ? new Date(fechaFin) : new Date();
    const fechaInicioFiltro = fechaInicio ? new Date(fechaInicio) :
      new Date(fechaFinFiltro.getTime() - (30 * 24 * 60 * 60 * 1000)); // 30 días atrás

    // Obtener estadísticas de pedidos
    const estadisticasPedidos = await Pedido.aggregate([
      {
        $match: {
          usuarioId: mongoose.Types.ObjectId(usuarioId),
          fechaCreacion: {
            $gte: fechaInicioFiltro,
            $lte: fechaFinFiltro
          }
        }
      },
      {
        $group: {
          _id: '$estado',
          cantidad: { $sum: 1 },
          totalValor: { $sum: '$totales.total' },
          promedioValor: { $avg: '$totales.total' }
        }
      }
    ]);

    // Obtener timeline de pedidos recientes
    const pedidosRecientes = await Pedido.find({
      usuarioId,
      fechaCreacion: {
        $gte: fechaInicioFiltro,
        $lte: fechaFinFiltro
      }
    })
    .sort({ fechaCreacion: -1 })
    .limit(10)
    .select('numeroPedido estado fechaCreacion totales.total fechaConfirmacion fechaEnvio fechaEntrega');

    // Calcular métricas adicionales
    const metricas = {
      totalPedidos: estadisticasPedidos.reduce((sum, stat) => sum + stat.cantidad, 0),
      valorTotal: estadisticasPedidos.reduce((sum, stat) => sum + stat.totalValor, 0),
      promedioPorPedido: estadisticasPedidos.length > 0 ?
        estadisticasPedidos.reduce((sum, stat) => sum + stat.totalValor, 0) /
        estadisticasPedidos.reduce((sum, stat) => sum + stat.cantidad, 0) : 0,
      pedidosEntregados: estadisticasPedidos.find(s => s._id === 'entregado')?.cantidad || 0,
      pedidosEnProceso: estadisticasPedidos.filter(s =>
        ['confirmado', 'pagado', 'en_preparacion', 'enviado'].includes(s._id)
      ).reduce((sum, stat) => sum + stat.cantidad, 0)
    };

    // Traducciones de estados
    const traduccionesEstados = {
      'borrador': 'Borrador',
      'confirmado': 'Confirmado',
      'pagado': 'Pagado',
      'en_preparacion': 'En Preparación',
      'enviado': 'Enviado',
      'entregado': 'Entregado',
      'cancelado': 'Cancelado'
    };

    // Formatear estadísticas
    const estadisticasFormateadas = estadisticasPedidos.map(stat => ({
      estado: stat._id,
      nombreEstado: traduccionesEstados[stat._id] || stat._id,
      cantidad: stat.cantidad,
      totalValor: stat.totalValor,
      promedioValor: stat.promedioValor
    }));

    res.json({
      success: true,
      message: "Dashboard de estados obtenido exitosamente",
      data: {
        estadisticas: estadisticasFormateadas,
        metricas,
        pedidosRecientes,
        filtros: {
          fechaInicio: fechaInicioFiltro,
          fechaFin: fechaFinFiltro
        }
      }
    });

  } catch (error) {
    next(error);
  }
};

/**
 * Obtener estado detallado de un pedido específico
 */
export const obtenerEstadoPedidoDetallado = async (req, res, next) => {
  try {
    const { pedidoId } = req.params;
    const usuarioId = req.usuario?.id;

    const pedido = await Pedido.findById(pedidoId);
    if (!pedido) {
      throw createError('VAL_INVALID_OBJECT_ID', { field: 'pedidoId' });
    }

    // Verificar permisos
    if (usuarioId && pedido.usuarioId && pedido.usuarioId.toString() !== usuarioId) {
      throw createError('AUTH_ACCESS_DENIED');
    }

    // Definir flujo de estados
    const flujoEstados = {
      'borrador': {
        nombre: 'Borrador',
        descripcion: 'Pedido creado pero no confirmado',
        icono: '📝',
        color: '#6c757d',
        orden: 1,
        completado: true
      },
      'confirmado': {
        nombre: 'Confirmado',
        descripcion: 'Pedido confirmado por el cliente',
        icono: '✅',
        color: '#28a745',
        orden: 2,
        completado: ['confirmado', 'pagado', 'en_preparacion', 'enviado', 'entregado'].includes(pedido.estado)
      },
      'pagado': {
        nombre: 'Pagado',
        descripcion: 'Pago procesado exitosamente',
        icono: '💳',
        color: '#007bff',
        orden: 3,
        completado: ['pagado', 'en_preparacion', 'enviado', 'entregado'].includes(pedido.estado)
      },
      'en_preparacion': {
        nombre: 'En Preparación',
        descripcion: 'Pedido siendo preparado para envío',
        icono: '📦',
        color: '#ffc107',
        orden: 4,
        completado: ['en_preparacion', 'enviado', 'entregado'].includes(pedido.estado)
      },
      'enviado': {
        nombre: 'Enviado',
        descripcion: 'Pedido enviado a dirección de entrega',
        icono: '🚚',
        color: '#17a2b8',
        orden: 5,
        completado: ['enviado', 'entregado'].includes(pedido.estado)
      },
      'entregado': {
        nombre: 'Entregado',
        descripcion: 'Pedido entregado exitosamente',
        icono: '🎉',
        color: '#28a745',
        orden: 6,
        completado: pedido.estado === 'entregado'
      }
    };

    // Obtener estado actual
    const estadoActual = flujoEstados[pedido.estado] || {
      nombre: pedido.estado,
      descripcion: 'Estado desconocido',
      icono: '❓',
      color: '#6c757d',
      orden: 99,
      completado: false
    };

    // Calcular progreso
    const estadosCompletados = Object.values(flujoEstados).filter(estado => estado.completado).length;
    const progresoTotal = Object.keys(flujoEstados).length;
    const porcentajeProgreso = Math.round((estadosCompletados / progresoTotal) * 100);

    // Obtener información de tiempos
    const tiempos = {
      tiempoCreacion: pedido.fechaCreacion,
      tiempoConfirmacion: pedido.fechaConfirmacion,
      tiempoPago: pedido.fechaPago,
      tiempoEnvio: pedido.fechaEnvio,
      tiempoEntrega: pedido.fechaEntrega,
      tiempoEstimadoEntrega: pedido.envio.fechaEntregaEstimada
    };

    // Calcular tiempo transcurrido
    const ahora = new Date();
    const tiempoTranscurrido = pedido.fechaCreacion ?
      Math.floor((ahora - pedido.fechaCreacion) / (1000 * 60 * 60)) : 0; // horas

    // Obtener último evento del historial
    const ultimoEvento = pedido.historial.length > 0 ?
      pedido.historial[pedido.historial.length - 1] : null;

    res.json({
      success: true,
      message: "Estado detallado del pedido obtenido exitosamente",
      data: {
        numeroPedido: pedido.numeroPedido,
        estadoActual,
        flujoEstados: Object.values(flujoEstados).sort((a, b) => a.orden - b.orden),
        progreso: {
          completado: estadosCompletados,
          total: progresoTotal,
          porcentaje: porcentajeProgreso
        },
        tiempos,
        tiempoTranscurridoHoras: tiempoTranscurrido,
        ultimoEvento,
        informacionAdicional: {
          total: pedido.totales.total,
          metodoPago: pedido.pago.metodoPago,
          transportadora: pedido.envio.transportadora,
          numeroGuia: pedido.envio.numeroGuia,
          direccionEntrega: pedido.envio.direccionEnvio
        }
      }
    });

  } catch (error) {
    next(error);
  }
};

// ============================
// RF-PED-06 - ESTADÍSTICAS DE VENTA
// ============================

/**
 * Obtener métricas de ventas en tiempo real
 */
export const obtenerMetricasVentasTiempoReal = async (req, res, next) => {
  try {
    const metricas = await obtenerMetricasTiempoReal();

    res.json({
      success: true,
      message: "Métricas de ventas obtenidas exitosamente",
      data: metricas
    });

  } catch (error) {
    next(error);
  }
};

/**
 * Obtener estadísticas de ventas por período
 */
export const obtenerEstadisticasVentasPeriodo = async (req, res, next) => {
  try {
    const { fechaInicio, fechaFin } = req.query;

    if (!fechaInicio || !fechaFin) {
      throw createError('VAL_CHECKOUT_FECHAS_REQUERIDAS');
    }

    const estadisticas = await obtenerEstadisticasVentas(
      new Date(fechaInicio),
      new Date(fechaFin)
    );

    res.json({
      success: true,
      message: "Estadísticas de ventas obtenidas exitosamente",
      data: estadisticas
    });

  } catch (error) {
    next(error);
  }
};

/**
 * Obtener top productos más vendidos
 */
export const obtenerTopProductos = async (req, res, next) => {
  try {
    const { fechaInicio, fechaFin, limite = 10 } = req.query;

    if (!fechaInicio || !fechaFin) {
      throw createError('VAL_CHECKOUT_FECHAS_REQUERIDAS');
    }

    const topProductos = await obtenerTopProductosVendidos(
      new Date(fechaInicio),
      new Date(fechaFin),
      parseInt(limite)
    );

    res.json({
      success: true,
      message: "Top productos obtenidos exitosamente",
      data: {
        productos: topProductos,
        periodo: { fechaInicio, fechaFin },
        limite: parseInt(limite)
      }
    });

  } catch (error) {
    next(error);
  }
};

/**
 * Obtener rendimiento de vendedores
 */
export const obtenerRendimientoVendedoresEndpoint = async (req, res, next) => {
  try {
    const { fechaInicio, fechaFin, limite = 10 } = req.query;

    if (!fechaInicio || !fechaFin) {
      throw createError('VAL_CHECKOUT_FECHAS_REQUERIDAS');
    }

    const rendimiento = await obtenerRendimientoVendedores(
      new Date(fechaInicio),
      new Date(fechaFin),
      parseInt(limite)
    );

    res.json({
      success: true,
      message: "Rendimiento de vendedores obtenido exitosamente",
      data: {
        vendedores: rendimiento,
        periodo: { fechaInicio, fechaFin },
        limite: parseInt(limite)
      }
    });

  } catch (error) {
    next(error);
  }
};

/**
 * Generar reporte completo de ventas
 */
export const generarReporteCompletoVentas = async (req, res, next) => {
  try {
    const { fechaInicio, fechaFin } = req.query;

    if (!fechaInicio || !fechaFin) {
      throw createError('VAL_CHECKOUT_FECHAS_REQUERIDAS');
    }

    const reporte = await generarReporteVentas(
      new Date(fechaInicio),
      new Date(fechaFin)
    );

    res.json({
      success: true,
      message: "Reporte de ventas generado exitosamente",
      data: reporte
    });

  } catch (error) {
    next(error);
  }
};

// ============================
// RF-CHE-07 - INTEGRACIÓN MERCADO PAGO
// ============================

/**
 * Crear preferencia de pago con Mercado Pago
 */
export const crearPreferenciaPago = async (req, res, next) => {
  try {
    const { pedidoId } = req.params;
    // Buscar pedido
    const pedido = await Pedido.findById(pedidoId).populate('items.productoId');
    if (!pedido) {
      throw createError('VAL_INVALID_OBJECT_ID', { field: 'pedidoId' });
    }
    // Verificar que el pedido esté en estado borrador
    if (pedido.estado !== 'borrador') {
      throw createError('VAL_CHECKOUT_PEDIDO_ESTADO_INVALIDO', {
        message: `No se puede crear preferencia para un pedido en estado: ${pedido.estado}`
      });
    }
    // Preparar items para Mercado Pago
    const mpItems = pedido.items.map(item => ({
      id: item.productoId._id.toString(),
      title: item.nombreProducto,
      description: item.descripcion,
      picture_url: item.productoId.imagenes?.[0] || null,
      quantity: item.cantidad,
      currency_id: 'COP',
      unit_price: item.precioUnitario
    }));
    // Crear objeto de preferencia
    const frontendUrl = process.env.FRONTEND_URL && process.env.FRONTEND_URL.trim() !== ''
      ? process.env.FRONTEND_URL.trim()
      : 'https://verdenexo-frontend.onrender.com/';
    const safePedidoId = pedidoId ? pedidoId : '';
    const preferenceData = {
      items: mpItems,
      payer: {
        name: pedido.facturacion.nombreCompleto,
        email: pedido.facturacion.email,
        phone: {
          area_code: '',
          number: pedido.facturacion.telefono.replace(/\D/g, '')
        }
      },
      back_urls: {
        success: `${frontendUrl}/pedido-confirmado?pedido=${safePedidoId}`,
        failure: `${frontendUrl}/checkout?error=pago_fallido&pedido=${safePedidoId}`,
        pending: `${frontendUrl}/checkout?status=pendiente&pedido=${safePedidoId}`
      },
      auto_return: 'approved',
      external_reference: safePedidoId,
      notification_url: `${process.env.BACKEND_URL || 'https://verdenexo-backend.onrender.com'}/api/webhooks/mercadopago`,
      statement_descriptor: 'VerdeNexo - Compra en línea'
    };
    // Log obligatorio para depuración
    console.log('DEBUG MP - back_urls.success:', preferenceData.back_urls.success);
    console.log('DEBUG MP - preferenceData:', JSON.stringify(preferenceData, null, 2));
    // Validar back_urls.success
    if (!frontendUrl || frontendUrl.trim() === '' || !safePedidoId) {
      return res.status(400).json({
        success: false,
        message: 'URL de éxito para Mercado Pago no definida correctamente. Verifica FRONTEND_URL y pedidoId.'
      });
    }
    // Crear preferencia en Mercado Pago
    const preference = new Preference(config.mercadopago);
    const response = await preference.create({ body: preferenceData });
    res.json({
      success: true,
      message: "Preferencia de pago creada exitosamente",
      data: {
        preferenceId: response.id,
        initPoint: response.init_point,
        pedidoId
      }
    });
  } catch (error) {
    console.error('Error creando preferencia de pago:', error);
    next(error);
  }
};

// ============================
// RF-CHE-08 - WEBHOOKS MERCADO PAGO
// ============================

/**
 * Webhook para notificaciones de Mercado Pago
 */
export const webhookMercadoPago = async (req, res, next) => {
  try {
    const { action, data } = req.body;

    // Solo procesar pagos
    if (action !== 'payment.created' && action !== 'payment.updated') {
      return res.status(200).send('OK');
    }

    const paymentId = data.id;

    // Obtener detalles del pago desde Mercado Pago
    const payment = new Payment(config.mercadopago);
    const response = await payment.get({ id: paymentId });
    const paymentData = response;

    // Obtener pedido por external_reference
    const pedidoId = paymentData.external_reference;
    const pedido = await Pedido.findById(pedidoId);

    if (!pedido) {
      console.error('Pedido no encontrado para payment:', paymentId);
      return res.status(404).send('Pedido not found');
    }

    // Procesar según estado del pago
    const status = paymentData.status;
    const statusDetail = paymentData.status_detail;

    console.log(`Pago ${paymentId} para pedido ${pedidoId}: ${status} (${statusDetail})`);

    if (status === 'approved') {
      // Pago aprobado - confirmar pedido
      pedido.estado = 'pagado';
      pedido.fechaPago = new Date();
      pedido.pago.estadoPago = 'completado';
      pedido.pago.idTransaccion = paymentId;

      // Agregar al historial
      pedido.agregarAlHistorial(
        'pago_aprobado',
        `Pago aprobado - ID: ${paymentId}`,
        'mercadopago'
      );

      // Confirmar pedido automáticamente
      await confirmarPedidoInterno(pedido);

    } else if (status === 'rejected') {
      // Pago rechazado
      pedido.pago.estadoPago = 'rechazado';
      pedido.pago.idTransaccion = paymentId;

      // Agregar al historial
      pedido.agregarAlHistorial(
        'pago_rechazado',
        `Pago rechazado - ${statusDetail} - ID: ${paymentId}`,
        'mercadopago'
      );

    } else if (status === 'pending') {
      // Pago pendiente
      pedido.pago.estadoPago = 'pendiente';
      pedido.pago.idTransaccion = paymentId;

      // Agregar al historial
      pedido.agregarAlHistorial(
        'pago_pendiente',
        `Pago pendiente - ${statusDetail} - ID: ${paymentId}`,
        'mercadopago'
      );
    }

    await pedido.save();

    res.status(200).send('OK');

  } catch (error) {
    console.error('Error procesando webhook de Mercado Pago:', error);
    res.status(500).send('Error');
  }
};

/**
 * Función interna para confirmar pedido (similar a confirmarPedido pero sin validaciones)
 */
async function confirmarPedidoInterno(pedido) {
  try {
    // Cambiar estado a confirmado
    pedido.estado = 'confirmado';
    pedido.fechaConfirmacion = new Date();

    // Agregar al historial
    pedido.agregarAlHistorial(
      'confirmado',
      'Pedido confirmado automáticamente por pago aprobado',
      'sistema'
    );

    // Aquí iría la lógica de stock, comisiones, facturación, etc. (igual que en confirmarPedido)

    await pedido.save();

  } catch (error) {
    console.error('Error confirmando pedido internamente:', error);
  }
}