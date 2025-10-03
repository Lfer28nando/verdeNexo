// controllers/carrito.controller.js
import { Carrito, Cupon, ZonaEnvio } from "../models/carrito/index.js";
import { Producto } from "../models/producto/index.js";
import { BadRequest, NotFound } from "../utils/error.js";

// ============================
// RF-CARRO-01 - CREAR Y MANTENER CARRITO
// ============================

// Obtener o crear carrito por sessionId
export async function obtenerCarrito(req, res) {
  try {
    const { sessionId } = req.params;
    const usuarioId = req.usuario?.id || null; // Del middleware de auth si está autenticado

    if (!sessionId) {
      throw BadRequest("Se requiere sessionId");
    }

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

    res.json({
      ok: true,
      data: carrito,
      mensaje: carrito.items.length === 0 ? "Carrito vacío" : `${carrito.items.length} items en el carrito`
    });

  } catch (error) {
    res.status(400).json({
      ok: false,
      error: error.message
    });
  }
}

// ============================
// RF-CARRO-02 - AGREGAR PRODUCTOS AL CARRITO
// ============================

export async function agregarItem(req, res) {
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
    if (!sessionId || !productoId) {
      throw BadRequest("Se requiere sessionId y productoId");
    }

    if (cantidad < 1 || cantidad > 100) {
      throw BadRequest("La cantidad debe estar entre 1 y 100");
    }

    // Verificar que el producto existe y está disponible
    const producto = await Producto.findById(productoId);
    if (!producto) {
      throw NotFound("Producto no encontrado");
    }

    if (!producto.disponibilidad) {
      throw BadRequest("El producto no está disponible");
    }

    // Obtener carrito
    let carrito = await Carrito.findOne({ sessionId, estado: 'activo' });
    if (!carrito) {
      throw NotFound("Carrito no encontrado");
    }

    // Verificar si el item ya existe en el carrito
    const itemExistente = carrito.items.find(item => 
      item.productoId.toString() === productoId && 
      JSON.stringify(item.variante) === JSON.stringify(variante)
    );

    if (itemExistente) {
      // Si existe, actualizar cantidad
      itemExistente.cantidad += cantidad;
      
      // Verificar límite máximo
      if (itemExistente.cantidad > 100) {
        throw BadRequest("Cantidad máxima excedida para este producto");
      }
    } else {
      // Si no existe, agregar nuevo item
      const nuevoItem = {
        productoId,
        cantidad,
        variante,
        precioUnitario: producto.precioBase, // Precio al momento de agregar
        esCombos,
        comboItems: esCombos ? comboItems : [],
        notas,
        fechaAgregado: new Date()
      };

      carrito.items.push(nuevoItem);
    }

    // Recalcular totales automáticamente (por el middleware pre-save)
    await carrito.save();

    // Repoblar el carrito para la respuesta
    await carrito.populate('items.productoId');

    res.json({
      ok: true,
      data: carrito,
      mensaje: `Producto agregado al carrito. Total items: ${carrito.items.length}`
    });

  } catch (error) {
    res.status(400).json({
      ok: false,
      error: error.message
    });
  }
}

// ============================
// RF-CARRO-03 - MODIFICAR CANTIDADES Y ELIMINAR ÍTEMS
// ============================

// Actualizar cantidad de un item
export async function actualizarCantidad(req, res) {
  try {
    const { sessionId, itemId } = req.params;
    const { cantidad } = req.body;

    if (!cantidad || cantidad < 1 || cantidad > 100) {
      throw BadRequest("La cantidad debe estar entre 1 y 100");
    }

    const carrito = await Carrito.findOne({ sessionId, estado: 'activo' });
    if (!carrito) {
      throw NotFound("Carrito no encontrado");
    }

    const item = carrito.items.id(itemId);
    if (!item) {
      throw NotFound("Item no encontrado en el carrito");
    }

    // Actualizar cantidad
    item.cantidad = cantidad;
    
    // Guardar y recalcular totales
    await carrito.save();
    await carrito.populate('items.productoId');

    res.json({
      ok: true,
      data: carrito,
      mensaje: `Cantidad actualizada a ${cantidad}`
    });

  } catch (error) {
    res.status(400).json({
      ok: false,
      error: error.message
    });
  }
}

// Eliminar item del carrito
export async function eliminarItem(req, res) {
  try {
    const { sessionId, itemId } = req.params;

    const carrito = await Carrito.findOne({ sessionId, estado: 'activo' });
    if (!carrito) {
      throw NotFound("Carrito no encontrado");
    }

    const item = carrito.items.id(itemId);
    if (!item) {
      throw NotFound("Item no encontrado en el carrito");
    }

    // Eliminar item
    carrito.items.pull(itemId);
    
    // Guardar y recalcular totales
    await carrito.save();
    await carrito.populate('items.productoId');

    res.json({
      ok: true,
      data: carrito,
      mensaje: "Item eliminado del carrito"
    });

  } catch (error) {
    res.status(400).json({
      ok: false,
      error: error.message
    });
  }
}

// Vaciar carrito completamente
export async function vaciarCarrito(req, res) {
  try {
    const { sessionId } = req.params;

    const carrito = await Carrito.findOne({ sessionId, estado: 'activo' });
    if (!carrito) {
      throw NotFound("Carrito no encontrado");
    }

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
      ok: true,
      data: carrito,
      mensaje: "Carrito vaciado"
    });

  } catch (error) {
    res.status(400).json({
      ok: false,
      error: error.message
    });
  }
}

// ============================
// RF-CARRO-04 - APLICAR CUPONES
// ============================

export async function aplicarCupon(req, res) {
  try {
    const { sessionId, codigo } = req.body;
    const usuario = req.usuario || null;

    if (!sessionId || !codigo) {
      throw BadRequest("Se requiere sessionId y código de cupón");
    }

    // Obtener carrito
    const carrito = await Carrito.findOne({ sessionId, estado: 'activo' })
      .populate('items.productoId');
    
    if (!carrito) {
      throw NotFound("Carrito no encontrado");
    }

    if (carrito.items.length === 0) {
      throw BadRequest("No se pueden aplicar cupones a un carrito vacío");
    }

    // Buscar cupón
    const cupon = await Cupon.findOne({ 
      codigo: codigo.toUpperCase(),
      activo: true 
    });

    if (!cupon) {
      throw NotFound("Cupón no válido o no encontrado");
    }

    // Verificar si el cupón ya está aplicado
    const cuponYaAplicado = carrito.cupones.find(c => c.codigo === cupon.codigo);
    if (cuponYaAplicado) {
      throw BadRequest("Este cupón ya está aplicado");
    }

    // Validar cupón para este carrito
    const erroresValidacion = cupon.esValidoParaCarrito(carrito, usuario);
    if (erroresValidacion.length > 0) {
      throw BadRequest(`Cupón no válido: ${erroresValidacion.join(', ')}`);
    }

    // Calcular descuento
    const descuento = cupon.calcularDescuento(carrito);
    if (descuento === 0) {
      throw BadRequest("Este cupón no aplica descuento a los productos en tu carrito");
    }

    // Aplicar cupón al carrito
    carrito.cupones.push({
      codigo: cupon.codigo,
      descripcion: cupon.descripcion,
      tipo: cupon.tipo,
      valor: cupon.valor,
      descuentoAplicado: descuento,
      fechaAplicado: new Date(),
      aplicadoPor: usuario ? 'cliente' : 'visitante'
    });

    // Registrar uso en el cupón
    await cupon.registrarUso(carrito, usuario, descuento);

    // Guardar carrito (recalculará totales automáticamente)
    await carrito.save();

    res.json({
      ok: true,
      data: carrito,
      mensaje: `Cupón aplicado. Descuento: $${descuento.toLocaleString()}`,
      descuentoAplicado: descuento
    });

  } catch (error) {
    res.status(400).json({
      ok: false,
      error: error.message
    });
  }
}

// Remover cupón del carrito
export async function removerCupon(req, res) {
  try {
    const { sessionId, codigo } = req.params;

    const carrito = await Carrito.findOne({ sessionId, estado: 'activo' });
    if (!carrito) {
      throw NotFound("Carrito no encontrado");
    }

    const cuponIndex = carrito.cupones.findIndex(c => c.codigo === codigo.toUpperCase());
    if (cuponIndex === -1) {
      throw NotFound("Cupón no encontrado en el carrito");
    }

    // Remover cupón
    carrito.cupones.splice(cuponIndex, 1);
    
    // Guardar y recalcular totales
    await carrito.save();
    await carrito.populate('items.productoId');

    res.json({
      ok: true,
      data: carrito,
      mensaje: "Cupón removido del carrito"
    });

  } catch (error) {
    res.status(400).json({
      ok: false,
      error: error.message
    });
  }
}

// ============================
// RF-CARRO-05 - CALCULAR PRECIO DE ENVÍO
// ============================

export async function calcularEnvio(req, res) {
  try {
    const { sessionId, upz, barrio, direccion } = req.body;

    if (!sessionId) {
      throw BadRequest("Se requiere sessionId");
    }

    // Obtener carrito
    const carrito = await Carrito.findOne({ sessionId, estado: 'activo' })
      .populate('items.productoId');
    
    if (!carrito) {
      throw NotFound("Carrito no encontrado");
    }

    if (carrito.items.length === 0) {
      throw BadRequest("No se puede calcular envío para un carrito vacío");
    }

    // Buscar zona de envío
    const zonasEnvio = await ZonaEnvio.buscarPorUbicacion(upz, barrio);
    
    if (zonasEnvio.length === 0) {
      throw NotFound("No hay cobertura de envío para esta ubicación");
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

    res.json({
      ok: true,
      data: {
        carrito,
        envio: {
          zona: zona.nombre,
          costo: calculoEnvio.costo,
          detalleCalculo: calculoEnvio.detalleCalculo,
          tiempoEntrega: `${calculoEnvio.tiempoEntregaMin}-${calculoEnvio.tiempoEntregaMax} días`,
          restricciones: validacionRestricciones
        }
      },
      mensaje: validacionRestricciones.errores.length > 0 
        ? "Hay restricciones que impiden el envío" 
        : `Envío calculado: $${calculoEnvio.costo.toLocaleString()}`
    });

  } catch (error) {
    res.status(400).json({
      ok: false,
      error: error.message
    });
  }
}

// ============================
// RF-CARRO-06 - GUARDAR PARA DESPUÉS
// ============================

export async function guardarParaDespues(req, res) {
  try {
    const { sessionId } = req.params;
    const { nombre, notas } = req.body;

    const carrito = await Carrito.findOne({ sessionId, estado: 'activo' });
    if (!carrito) {
      throw NotFound("Carrito no encontrado");
    }

    if (carrito.items.length === 0) {
      throw BadRequest("No se puede guardar un carrito vacío");
    }

    // Cambiar estado a guardado
    carrito.estado = 'guardado';
    carrito.fechaGuardado = new Date();
    carrito.nombreCarritoGuardado = nombre || `Lista guardada ${new Date().toLocaleDateString()}`;
    carrito.notasGuardado = notas || "";

    await carrito.save();

    res.json({
      ok: true,
      data: carrito,
      mensaje: "Carrito guardado exitosamente"
    });

  } catch (error) {
    res.status(400).json({
      ok: false,
      error: error.message
    });
  }
}

// Obtener carritos guardados del usuario
export async function obtenerCarritosGuardados(req, res) {
  try {
    const usuarioId = req.usuario?.id;
    const { sessionId } = req.query;

    if (!usuarioId && !sessionId) {
      throw BadRequest("Se requiere autenticación o sessionId");
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
      ok: true,
      data: carritosGuardados,
      total: carritosGuardados.length
    });

  } catch (error) {
    res.status(400).json({
      ok: false,
      error: error.message
    });
  }
}

// ============================
// RF-CARRO-07 - VALIDAR LÍMITES
// ============================

export async function validarLimitesCarrito(req, res) {
  try {
    const { sessionId } = req.params;

    const carrito = await Carrito.findOne({ sessionId, estado: 'activo' })
      .populate('items.productoId');
    
    if (!carrito) {
      throw NotFound("Carrito no encontrado");
    }

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

    res.json({
      ok: true,
      data: {
        valido: todosLosErrores.length === 0,
        errores: todosLosErrores,
        carrito: carrito
      },
      mensaje: todosLosErrores.length === 0 
        ? "Carrito válido para proceder" 
        : "Hay restricciones que deben resolverse"
    });

  } catch (error) {
    res.status(400).json({
      ok: false,
      error: error.message
    });
  }
}

// ============================
// RF-CARRO-08 - CALCULAR TOTALES
// ============================

export async function recalcularTotales(req, res) {
  try {
    const { sessionId } = req.params;

    const carrito = await Carrito.findOne({ sessionId, estado: 'activo' })
      .populate('items.productoId');
    
    if (!carrito) {
      throw NotFound("Carrito no encontrado");
    }

    // Forzar recálculo de totales
    const totales = carrito.calcularTotales();
    await carrito.save();

    res.json({
      ok: true,
      data: {
        totales,
        carrito
      },
      mensaje: "Totales recalculados"
    });

  } catch (error) {
    res.status(400).json({
      ok: false,
      error: error.message
    });
  }
}

// ============================
// FUNCIONES AUXILIARES
// ============================

// Obtener estadísticas del carrito
export async function obtenerEstadisticas(req, res) {
  try {
    const { sessionId } = req.params;

    const carrito = await Carrito.findOne({ sessionId, estado: 'activo' })
      .populate('items.productoId');
    
    if (!carrito) {
      throw NotFound("Carrito no encontrado");
    }

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
      ok: true,
      data: estadisticas
    });

  } catch (error) {
    res.status(400).json({
      ok: false,
      error: error.message
    });
  }
}