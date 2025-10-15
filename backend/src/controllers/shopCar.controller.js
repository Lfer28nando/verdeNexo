import { Carrito } from "../models/shopCar.model.js";
import { Cupon } from "../models/coupon.model.js";
import { ZonaEnvio } from "../models/shippingArea.model.js";
import { Producto } from "../models/product.model.js";
import { createError } from "../utils/customError.js";
import { cleanupAbandonedCarts } from "../utils/cleanup-abandoned-carts.js";

// ============================
// FUNCIONES AUXILIARES
// ============================

/**
 * Busca un carrito activo por sessionId
 * @param {string} sessionId - ID de la sesión
 * @param {boolean} populateItems - Si poblar los items del carrito
 * @returns {Promise<Carrito>} Carrito encontrado
 */
const findActiveCart = async (sessionId, populateItems = false) => {
  const query = Carrito.findOne({ sessionId, estado: 'activo' });
  if (populateItems) {
    query.populate('items.productoId');
  }
  const carrito = await query;
  if (!carrito) {
    throw createError('VAL_INVALID_OBJECT_ID', { field: 'sessionId', value: sessionId });
  }
  return carrito;
};

/**
 * Valida que un producto exista y esté disponible
 * @param {string} productoId - ID del producto
 * @returns {Promise<Producto>} Producto encontrado
 */
const validateProduct = async (productoId) => {
  const producto = await Producto.findById(productoId);
  if (!producto) {
    throw createError('PROD_01');
  }
  if (!producto.disponibilidad) {
    throw createError('VAL_NO_FIELDS_TO_UPDATE'); // Usar código genérico para producto no disponible
  }
  return producto;
};

/**
 * Valida parámetros requeridos
 * @param {Object} params - Parámetros a validar
 * @param {Array<string>} required - Campos requeridos
 */
const validateRequired = (params, required) => {
  for (const field of required) {
    if (!params[field]) {
      throw createError('VAL_NO_FIELDS_TO_UPDATE', { field });
    }
  }
};

/**
 * Valida rango de cantidad
 * @param {number} cantidad - Cantidad a validar
 */
const validateQuantity = (cantidad) => {
  if (!cantidad || cantidad < 1 || cantidad > 100) {
    throw createError('VAL_NO_FIELDS_TO_UPDATE', { field: 'cantidad', min: 1, max: 100 });
  }
};

// ============================
// RF-CARRO-01 - OBTENER O CREAR CARRITO
// ============================

export const obtenerCarrito = async (req, res, next) => {
  try {
    const { sessionId } = req.params;
    const usuarioId = req.usuario?.id || null;

    validateRequired({ sessionId }, ['sessionId']);

    // Buscar carrito existente
    let carrito = await Carrito.findOne({
      sessionId,
      estado: 'activo'
    }).populate('items.productoId');

    // Si no existe, crear uno nuevo
    if (!carrito) {
      carrito = new Carrito({
        sessionId,
        usuarioId,
        items: [],
        cupones: [],
        estado: 'activo',
        origen: req.headers['user-agent']?.includes('Mobile') ? 'mobile' : 'web',
        deviceInfo: {
          userAgent: req.headers['user-agent'],
          ip: req.ip
        }
      });

      await carrito.save();
    } else {
      // Si el usuario se autenticó, asociar el carrito
      if (usuarioId && !carrito.usuarioId) {
        carrito.usuarioId = usuarioId;
        carrito.ultimaActividad = new Date();
        await carrito.save();
      }
    }

    const message = carrito.items.length === 0
      ? "Carrito vacío"
      : `${carrito.items.length} items en el carrito`;

    res.json({
      success: true,
      message,
      data: carrito
    });

  } catch (error) {
    next(error);
  }
};

// ============================
// RF-CARRO-02 - AGREGAR PRODUCTOS AL CARRITO
// ============================

export const agregarItem = async (req, res, next) => {
  try {
    const {
      sessionId,
      productoId,
      cantidad = 1,
      variante = null,
      esCombos = false,
      comboItems = [],
      notas = ""
    } = req.body;

    // Validaciones básicas
    validateRequired({ sessionId, productoId }, ['sessionId', 'productoId']);
    validateQuantity(cantidad);

    // Verificar que el producto existe y está disponible
    const producto = await validateProduct(productoId);

    // Obtener carrito
    const carrito = await findActiveCart(sessionId);


    // Verificar si el item ya existe en el carrito
    const itemExistente = carrito.items.find(item =>
      item.productoId.toString() === productoId &&
      JSON.stringify(item.variante) === JSON.stringify(variante)
    );

    // Calcular cantidad total actual antes de agregar
    let cantidadTotalActual = carrito.items.reduce((total, item) => total + item.cantidad, 0);

    if (itemExistente) {
      // Si existe, verificar límite antes de actualizar cantidad
      cantidadTotalActual = cantidadTotalActual - itemExistente.cantidad + (itemExistente.cantidad + cantidad);
      if (cantidadTotalActual > 50) {
        throw createError('VAL_NO_FIELDS_TO_UPDATE', {
          field: 'cantidad',
          message: `No se puede agregar esta cantidad. El carrito no puede tener más de 50 productos. Actualmente tiene ${carrito.items.reduce((total, item) => total + item.cantidad, 0)}`
        });
      }
      // Sumar cantidad al item existente
      itemExistente.cantidad += cantidad;
    } else {
      // Si no existe, verificar límite antes de agregar nuevo item
      cantidadTotalActual += cantidad;
      if (cantidadTotalActual > 50) {
        throw createError('VAL_NO_FIELDS_TO_UPDATE', {
          field: 'cantidad',
          message: `No se puede agregar este producto. El carrito no puede tener más de 50 productos. Actualmente tiene ${carrito.items.reduce((total, item) => total + item.cantidad, 0)}`
        });
      }
      // Agregar nuevo item al carrito
      carrito.items.push({
        productoId,
        cantidad,
        variante,
        esCombos,
        comboItems,
        notas,
        precioUnitario: producto.precioBase,
        fechaAgregado: new Date()
      });
    }

    // Recalcular totales automáticamente (por el middleware pre-save)
    await carrito.save();

    // Repoblar el carrito para la respuesta
    await carrito.populate('items.productoId');

    res.json({
      success: true,
      message: `Producto agregado al carrito. Total items: ${carrito.items.length}`,
      data: carrito
    });

  } catch (error) {
    next(error);
  }
};

// ============================
// RF-CARRO-03 - MODIFICAR CANTIDADES Y ELIMINAR ÍTEMS
// ============================

// Actualizar cantidad de un item
export const actualizarCantidad = async (req, res, next) => {
  try {
    const { sessionId, itemId } = req.params;
    const { cantidad } = req.body;

    validateRequired({ sessionId, itemId }, ['sessionId', 'itemId']);
    validateQuantity(cantidad);

    const carrito = await findActiveCart(sessionId);

    const item = carrito.items.id(itemId);
    if (!item) {
      throw createError('VAL_INVALID_OBJECT_ID', { field: 'itemId', value: itemId });
    }

    // Calcular cantidad total actual excluyendo el item que se va a actualizar
    const cantidadTotalSinItem = carrito.items.reduce((total, itemActual) => 
      itemActual._id.toString() !== itemId ? total + itemActual.cantidad : total, 0
    );
    
    // Verificar límite antes de actualizar
    if (cantidadTotalSinItem + cantidad > 50) {
      throw createError('VAL_NO_FIELDS_TO_UPDATE', {
        field: 'cantidad',
        message: `No se puede actualizar a esta cantidad. El carrito no puede tener más de 50 productos. Actualmente tiene ${carrito.items.reduce((total, item) => total + item.cantidad, 0)}`
      });
    }

    // Actualizar cantidad
    item.cantidad = cantidad;

    // Guardar y recalcular totales
    await carrito.save();
    await carrito.populate('items.productoId');

    res.json({
      success: true,
      message: `Cantidad actualizada a ${cantidad}`,
      data: carrito
    });

  } catch (error) {
    next(error);
  }
};

// Eliminar item del carrito
export const eliminarItem = async (req, res, next) => {
  try {
    const { sessionId, itemId } = req.params;

    validateRequired({ sessionId, itemId }, ['sessionId', 'itemId']);

    const carrito = await findActiveCart(sessionId);

    const item = carrito.items.id(itemId);
    if (!item) {
      throw createError('VAL_INVALID_OBJECT_ID', { field: 'itemId', value: itemId });
    }

    // Eliminar item
    carrito.items.pull(itemId);

    // Guardar y recalcular totales
    await carrito.save();
    await carrito.populate('items.productoId');

    res.json({
      success: true,
      message: "Item eliminado del carrito",
      data: carrito
    });

  } catch (error) {
    next(error);
  }
};

// Vaciar carrito completamente
export const vaciarCarrito = async (req, res, next) => {
  try {
    const { sessionId } = req.params;

    validateRequired({ sessionId }, ['sessionId']);

    const carrito = await findActiveCart(sessionId);

    carrito.items = [];
    carrito.cupones = [];
    carrito.envio = {};
    carrito.totales = {
      subtotal: 0,
      descuentoCupones: 0,
      costoEnvio: 0,
      total: 0
    };

    await carrito.save();

    res.json({
      success: true,
      message: "Carrito vaciado",
      data: carrito
    });

  } catch (error) {
    next(error);
  }
};

// ============================
// RF-CARRO-04 - APLICAR CUPONES
// ============================

export const aplicarCupon = async (req, res, next) => {
  try {
    const { sessionId, codigo } = req.body;
    const usuario = req.usuario || null;

    validateRequired({ sessionId, codigo }, ['sessionId', 'codigo']);

    // Obtener carrito
    const carrito = await findActiveCart(sessionId, true);

    if (carrito.items.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No se pueden aplicar cupones a un carrito vacío'
      });
    }

    // Buscar cupón
    const cupon = await Cupon.findOne({
      codigo: codigo.toUpperCase(),
      activo: true
    });

    if (!cupon) {
      return res.status(404).json({
        success: false,
        message: 'Cupón no válido o no encontrado'
      });
    }

    // Verificar si el cupón ya está aplicado
    const cuponYaAplicado = carrito.cupones.find(c => c.codigo === cupon.codigo);
    if (cuponYaAplicado) {
      return res.status(409).json({
        success: false,
        message: 'Este cupón ya está aplicado'
      });
    }

    // Validar cupón para este carrito
    const erroresValidacion = cupon.esValidoParaCarrito(carrito, usuario);
    if (erroresValidacion.length > 0) {
      return res.status(400).json({
        success: false,
        message: `Cupón no válido: ${erroresValidacion.join(', ')}`
      });
    }

    // Calcular descuento
    const descuento = cupon.calcularDescuento(carrito);
    if (descuento === 0) {
      return res.status(400).json({
        success: false,
        message: 'Este cupón no aplica descuento a los productos en tu carrito'
      });
    }

    // Aplicar cupón al carrito
    carrito.cupones.push({
      codigo: cupon.codigo,
      descripcion: cupon.descripcion,
      tipo: cupon.tipo,
      valor: cupon.valor,
      descuentoAplicado: descuento,
      fechaAplicado: new Date(),
      aplicadoPor: usuario ? 'cliente' : 'sistema'
    });

    // Registrar uso en el cupón
    await cupon.registrarUso(carrito, usuario, descuento);

    // Guardar carrito (recalculará totales automáticamente)
    await carrito.save();

    res.json({
      success: true,
      message: `Cupón aplicado. Descuento: $${descuento.toLocaleString()}`,
      data: carrito,
      descuentoAplicado: descuento
    });

  } catch (error) {
    // Log detallado para depuración
    console.error('Error al aplicar cupón:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Error interno al aplicar cupón',
      error: error
    });
  }
};

// Remover cupón del carrito
export const removerCupon = async (req, res, next) => {
  try {
    const { sessionId, codigo } = req.params;

    validateRequired({ sessionId, codigo }, ['sessionId', 'codigo']);

    const carrito = await findActiveCart(sessionId);

    const cuponIndex = carrito.cupones.findIndex(c => c.codigo === codigo.toUpperCase());
    if (cuponIndex === -1) {
      throw createError('VAL_INVALID_OBJECT_ID', {
        field: 'codigo',
        message: 'Cupón no encontrado en el carrito'
      });
    }

    // Remover cupón
    carrito.cupones.splice(cuponIndex, 1);

    // Guardar y recalcular totales
    await carrito.save();
    await carrito.populate('items.productoId');

    res.json({
      success: true,
      message: "Cupón removido del carrito",
      data: carrito
    });

  } catch (error) {
    next(error);
  }
};

// ============================
// RF-CARRO-05 - CALCULAR PRECIO DE ENVÍO
// ============================

export const calcularEnvio = async (req, res, next) => {
  try {
    const { sessionId, upz, barrio, direccion } = req.body;

    validateRequired({ sessionId }, ['sessionId']);

    // Obtener carrito
    const carrito = await findActiveCart(sessionId, true);

    if (carrito.items.length === 0) {
      throw createError('VAL_NO_FIELDS_TO_UPDATE', {
        message: 'No se puede calcular envío para un carrito vacío'
      });
    }

    // Buscar zona de envío
    const zonasEnvio = await ZonaEnvio.buscarPorUbicacion(upz, barrio);

    if (zonasEnvio.length === 0) {
      throw createError('VAL_INVALID_OBJECT_ID', {
        field: 'ubicacion',
        message: 'No hay cobertura de envío para esta ubicación'
      });
    }

    // Usar la primera zona (mayor prioridad)
    const zona = zonasEnvio[0];

    // Calcular costo de envío
    const calculoEnvio = zona.calcularCostoEnvio(carrito, direccion);

    // Actualizar información de envío en el carrito
    carrito.envio = {
      zona: zona.nombre,
      upz,
      direccion: direccion || {},
      costoEstimado: calculoEnvio.costo,
      pesoTotal: calculoEnvio.pesoTotal,
      volumenTotal: calculoEnvio.volumenTotal,
      tieneFragiles: calculoEnvio.tieneFragiles,
      tieneVoluminosos: calculoEnvio.tieneVoluminosos,
      tiempoEntregaMin: calculoEnvio.tiempoEntregaMin,
      tiempoEntregaMax: calculoEnvio.tiempoEntregaMax,
      restricciones: []
    };

    // Validar restricciones (RF-CARRO-07)
    const validacionRestricciones = zona.validarRestricciones(carrito, direccion);

    if (validacionRestricciones.errores.length > 0) {
      carrito.envio.restricciones = validacionRestricciones.errores.map(error => ({
        tipo: 'error',
        descripcion: error,
        bloqueante: true
      }));
    }

    if (validacionRestricciones.advertencias.length > 0) {
      carrito.envio.restricciones.push(...validacionRestricciones.advertencias.map(adv => ({
        tipo: 'advertencia',
        descripcion: adv,
        bloqueante: false
      })));
    }

    // Guardar carrito (recalculará totales con costo de envío)
    await carrito.save();

    const message = validacionRestricciones.errores.length > 0
      ? "Hay restricciones que impiden el envío"
      : `Envío calculado: $${calculoEnvio.costo.toLocaleString()}`;

    res.json({
      success: true,
      message,
      data: {
        carrito,
        envio: {
          zona: zona.nombre,
          costo: calculoEnvio.costo,
          detalleCalculo: calculoEnvio.detalleCalculo,
          tiempoEntrega: `${calculoEnvio.tiempoEntregaMin}-${calculoEnvio.tiempoEntregaMax} días`,
          restricciones: validacionRestricciones
        }
      }
    });

  } catch (error) {
    next(error);
  }
};

// ============================
// RF-CARRO-06 - GUARDAR PARA DESPUÉS
// ============================

export const guardarParaDespues = async (req, res, next) => {
  try {
    const { sessionId } = req.params;
    const { nombre, notas } = req.body;

    validateRequired({ sessionId }, ['sessionId']);

    const carrito = await findActiveCart(sessionId);

    if (carrito.items.length === 0) {
      throw createError('VAL_NO_FIELDS_TO_UPDATE', {
        message: 'No se puede guardar un carrito vacío'
      });
    }

    // Cambiar estado a guardado
    carrito.estado = 'guardado';
    carrito.fechaGuardado = new Date();
    carrito.nombreCarritoGuardado = nombre || `Lista guardada ${new Date().toLocaleDateString()}`;
    carrito.notasGuardado = notas || "";

    await carrito.save();

    res.json({
      success: true,
      message: "Carrito guardado exitosamente",
      data: carrito
    });

  } catch (error) {
    next(error);
  }
};

// Obtener carritos guardados del usuario
export const obtenerCarritosGuardados = async (req, res, next) => {
  try {
    const usuarioId = req.usuario?.id;
    const { sessionId } = req.query;

    if (!usuarioId && !sessionId) {
      throw createError('AUTH_TOKEN_MISSING');
    }

    const filtros = { estado: 'guardado' };
    if (usuarioId) {
      filtros.usuarioId = usuarioId;
    } else {
      filtros.sessionId = sessionId;
    }

    const carritosGuardados = await Carrito.find(filtros)
      .populate('items.productoId')
      .sort({ fechaGuardado: -1 });

    res.json({
      success: true,
      message: `${carritosGuardados.length} carritos guardados encontrados`,
      data: carritosGuardados,
      total: carritosGuardados.length
    });

  } catch (error) {
    next(error);
  }
};

// ============================
// RF-CARRO-07 - VALIDAR LÍMITES
// ============================

export const validarLimitesCarrito = async (req, res, next) => {
  try {
    const { sessionId } = req.params;

    validateRequired({ sessionId }, ['sessionId']);

    const carrito = await findActiveCart(sessionId, true);

    // Validar límites del carrito
    const erroresCarrito = carrito.validarLimites();

    // Si hay información de envío, validar también restricciones de zona
    let erroresZona = [];
    if (carrito.envio?.zona) {
      const zona = await ZonaEnvio.findOne({
        nombre: carrito.envio.zona,
        activa: true
      });

      if (zona) {
        const validacion = zona.validarRestricciones(carrito);
        erroresZona = [...validacion.errores, ...validacion.advertencias];
      }
    }

    const todosLosErrores = [...erroresCarrito, ...erroresZona];
    const esValido = todosLosErrores.length === 0;

    const message = esValido
      ? "Carrito válido para proceder"
      : "Hay restricciones que deben resolverse";

    res.json({
      success: true,
      message,
      data: {
        valido: esValido,
        errores: todosLosErrores,
        carrito: carrito
      }
    });

  } catch (error) {
    next(error);
  }
};

// ============================
// RF-CARRO-08 - CALCULAR TOTALES
// ============================

export const recalcularTotales = async (req, res, next) => {
  try {
    const { sessionId } = req.params;

    validateRequired({ sessionId }, ['sessionId']);

    const carrito = await findActiveCart(sessionId, true);

    // Forzar recálculo de totales
    const totales = carrito.calcularTotales();
    await carrito.save();

    res.json({
      success: true,
      message: "Totales recalculados",
      data: {
        totales,
        carrito
      }
    });

  } catch (error) {
    next(error);
  }
};

// ============================
// FUNCIONES AUXILIARES
// ============================

// Obtener estadísticas del carrito
export const obtenerEstadisticas = async (req, res, next) => {
  try {
    const { sessionId } = req.params;

    validateRequired({ sessionId }, ['sessionId']);

    const carrito = await findActiveCart(sessionId, true);

    const estadisticas = {
      totalItems: carrito.items.length,
      cantidadTotalProductos: carrito.items.reduce((total, item) => total + item.cantidad, 0),
      categorias: {},
      pesoEstimado: 0,
      productosFragiles: 0,
      productosVoluminosos: 0,
      tiempoEnCarrito: Math.round((new Date() - carrito.fechaCreacion) / (1000 * 60)), // minutos
      cuponesAplicados: carrito.cupones.length,
      descuentoTotal: carrito.totales.descuentoCupones
    };

    // Estadísticas por categoría
    carrito.items.forEach(item => {
      const categoria = item.productoId?.categoria || 'otros';
      estadisticas.categorias[categoria] = (estadisticas.categorias[categoria] || 0) + item.cantidad;

      // Simular peso y características
      estadisticas.pesoEstimado += 500 * item.cantidad; // 500g por item

      if (item.notas?.includes('frágil') || categoria === 'plantas') {
        estadisticas.productosFragiles += item.cantidad;
      }

      if (item.notas?.includes('voluminoso') || categoria === 'macetas') {
        estadisticas.productosVoluminosos += item.cantidad;
      }
    });

    res.json({
      success: true,
      message: "Estadísticas del carrito obtenidas",
      data: estadisticas
    });

  } catch (error) {
    next(error);
  }
};

// ============================
// CARRITOS DE USUARIOS ANÓNIMOS (localStorage)
// ============================

/**
 * Valida un carrito desde localStorage sin guardarlo en BD
 * Útil para usuarios anónimos que manejan el carrito en el frontend
 */
export const validarCarritoLocalStorage = async (req, res, next) => {
  try {
    const { items, cupones = [] } = req.body;

    // Validar estructura básica
    if (!Array.isArray(items)) {
      throw createError('VAL_NO_FIELDS_TO_UPDATE', { field: 'items', message: 'Items debe ser un array' });
    }

    // Validar límite de productos
    const cantidadTotal = items.reduce((total, item) => total + (item.cantidad || 0), 0);
    if (cantidadTotal > 50) {
      throw createError('VAL_NO_FIELDS_TO_UPDATE', {
        message: `El carrito no puede tener más de 50 productos. Actualmente tiene ${cantidadTotal}`
      });
    }

    // Crear carrito temporal para validaciones
    const carritoTemporal = {
      items: items.map(item => ({
        productoId: item.productoId,
        cantidad: item.cantidad || 1,
        variante: item.variante || null,
        precioUnitario: item.precioUnitario || 0,
        notas: item.notas || ""
      })),
      cupones: cupones,
      envio: {},
      totales: { subtotal: 0, descuentoCupones: 0, costoEnvio: 0, total: 0 }
    };

    // Calcular totales temporales
    let subtotal = 0;
    carritoTemporal.items.forEach(item => {
      subtotal += item.precioUnitario * item.cantidad;
    });

    let descuentoTotal = 0;
    // Aquí podrías validar cupones si es necesario

    carritoTemporal.totales = {
      subtotal,
      descuentoCupones: descuentoTotal,
      costoEnvio: 0,
      total: subtotal - descuentoTotal
    };

    // Validar límites básicos
    const errores = [];
    if (cantidadTotal > 50) {
      errores.push(`Límite de 50 productos excedido (${cantidadTotal})`);
    }

    // Aquí podrías agregar más validaciones específicas

    res.json({
      success: true,
      message: "Carrito validado exitosamente",
      data: {
        valido: errores.length === 0,
        errores,
        totales: carritoTemporal.totales,
        cantidadTotal
      }
    });

  } catch (error) {
    next(error);
  }
};

/**
 * Migra un carrito desde localStorage a la base de datos
 * Se ejecuta cuando un usuario anónimo se registra o inicia sesión
 */
export const migrarCarritoLocalStorage = async (req, res, next) => {
  try {
    const { items, cupones = [], sessionId } = req.body;
    const usuarioId = req.usuario?.id;

    if (!usuarioId) {
      throw createError('AUTH_TOKEN_MISSING');
    }

    validateRequired({ sessionId }, ['sessionId']);

    if (!Array.isArray(items) || items.length === 0) {
      throw createError('VAL_NO_FIELDS_TO_UPDATE', { message: 'No hay items para migrar' });
    }

    // Verificar que los productos existen
    const productosIds = [...new Set(items.map(item => item.productoId))];
    const productos = await Producto.find({ _id: { $in: productosIds } });

    if (productos.length !== productosIds.length) {
      throw createError('VAL_INVALID_OBJECT_ID', { message: 'Algunos productos no existen' });
    }

    // Crear mapa de productos para validación rápida
    const productosMap = new Map(productos.map(p => [p._id.toString(), p]));

    // Validar y limpiar items
    const itemsValidados = [];
    for (const item of items) {
      const producto = productosMap.get(item.productoId);
      if (!producto || !producto.disponibilidad) {
        continue; // Omitir productos no disponibles
      }

      itemsValidados.push({
        productoId: item.productoId,
        cantidad: Math.min(item.cantidad || 1, 50), // Limitar cantidad máxima
        variante: item.variante || null,
        precioUnitario: producto.precioBase,
        esCombos: item.esCombos || false,
        comboItems: item.comboItems || [],
        notas: item.notas || "",
        fechaAgregado: new Date()
      });
    }

    // Verificar límite total
    const cantidadTotal = itemsValidados.reduce((total, item) => total + item.cantidad, 0);
    if (cantidadTotal > 50) {
      throw createError('VAL_NO_FIELDS_TO_UPDATE', {
        message: `El carrito migrado excede el límite de 50 productos (${cantidadTotal})`
      });
    }

    // Buscar carrito existente del usuario o crear uno nuevo
    let carrito = await Carrito.findOne({
      $or: [
        { usuarioId, estado: 'activo' },
        { sessionId, estado: 'activo' }
      ]
    });

    if (carrito) {
      // Si existe, fusionar items (priorizando los del localStorage)
      carrito.items = itemsValidados;
      carrito.usuarioId = usuarioId; // Asegurar que esté asignado al usuario
    } else {
      // Crear nuevo carrito
      carrito = new Carrito({
        usuarioId,
        sessionId,
        items: itemsValidados,
        cupones: [],
        estado: 'activo',
        origen: 'migracion',
        deviceInfo: {
          userAgent: req.headers['user-agent'],
          ip: req.ip
        }
      });
    }

    // Aplicar cupones válidos si se proporcionaron
    if (cupones.length > 0) {
      // Aquí iría la lógica para validar y aplicar cupones
      // Por simplicidad, se omiten por ahora
    }

    // Guardar carrito (calculará totales automáticamente)
    await carrito.save();
    await carrito.populate('items.productoId');

    res.json({
      success: true,
      message: `Carrito migrado exitosamente. ${itemsValidados.length} items agregados`,
      data: carrito
    });

  } catch (error) {
    next(error);
  }
};

// ============================
// ADMINISTRACIÓN Y MANTENIMIENTO
// ============================

// Ejecutar limpieza de carritos abandonados (solo administradores)
export const ejecutarLimpiezaCarritos = async (req, res, next) => {
  try {
    // Aquí podrías agregar validación de permisos de administrador
    // Por ahora, cualquier usuario autenticado puede ejecutarlo

    const resultado = await cleanupAbandonedCarts();

    res.json({
      success: true,
      message: "Limpieza de carritos abandonados ejecutada exitosamente",
      data: {
        carritosMarcadosComoAbandonados: resultado.marcadosComoAbandonados,
        carritosEliminados: resultado.eliminados,
        fechaEjecucion: new Date()
      }
    });

  } catch (error) {
    next(error);
  }
};