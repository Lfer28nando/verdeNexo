import Pedido from '../models/checkout/pedido.model.js';
import DireccionEntrega from '../models/checkout/direccion-entrega.model.js';
import { MetodoPago, TransaccionPago } from '../models/checkout/metodo-pago.model.js';
import { VentanaEntrega, SlotEntrega } from '../models/checkout/ventana-entrega.model.js';
import { Carrito } from '../models/carrito/carrito.model.js';
import { Producto } from '../models/producto/producto.model.js';
import Usuario from '../models/usuario/usuario.model.js';
import { ZonaEnvio } from '../models/carrito/zona-envio.model.js';
import emailService from '../utils/email.service.js';

// RF-CHECK-01: Ingresar datos de compra
const ingresarDatosCompra = async (req, res) => {
  try {
    const { datosPersonales, datosEmpresa, tipoCliente } = req.body;
    const usuarioId = req.usuario.id;

    // Validar que exista un carrito activo
    const carrito = await Carrito.findOne({ 
      usuario: usuarioId, 
      estado: 'activo' 
    }).populate('items.producto');

    if (!carrito || carrito.items.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No hay productos en el carrito'
      });
    }

    // Validar datos según tipo de cliente
    if (tipoCliente === 'mayorista') {
      if (!datosEmpresa || !datosEmpresa.nit || !datosEmpresa.razonSocial) {
        return res.status(400).json({
          success: false,
          message: 'Datos de empresa requeridos para clientes mayoristas'
        });
      }
      
      // Validar monto mínimo mayorista
      if (carrito.totales.subtotal < 500000) {
        return res.status(400).json({
          success: false,
          message: 'El pedido mayorista debe superar los $500,000 COP'
        });
      }
    }

    // Crear sesión de checkout temporal
    const sesionCheckout = {
      usuario: usuarioId,
      carrito: carrito._id,
      datosPersonales,
      datosEmpresa: tipoCliente === 'mayorista' ? datosEmpresa : undefined,
      tipoCliente: tipoCliente || 'particular',
      paso: 'datos_compra',
      fechaCreacion: new Date(),
      expiracion: new Date(Date.now() + 30 * 60 * 1000) // 30 minutos
    };

    // Guardar en sesión o cache (por simplicidad usamos req.session)
    req.session.checkout = sesionCheckout;

    res.json({
      success: true,
      message: 'Datos de compra registrados correctamente',
      data: {
        sesionId: req.session.id,
        carrito: {
          items: carrito.items.length,
          subtotal: carrito.totales.subtotal,
          total: carrito.totales.total
        },
        siguientePaso: 'direccion_entrega'
      }
    });

  } catch (error) {
    console.error('Error al ingresar datos de compra:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// RF-CHECK-02: Guardar direcciones
const guardarDireccion = async (req, res) => {
  try {
    const usuarioId = req.usuario.id;
    const direccionData = req.body;

    // Validar límite de direcciones por usuario
    const validacionLimite = await DireccionEntrega.validarLimitePorUsuario(usuarioId);
    if (!validacionLimite.valido) {
      return res.status(400).json({
        success: false,
        message: `Has alcanzado el límite de ${validacionLimite.limite} direcciones`
      });
    }

    // Crear nueva dirección
    const nuevaDireccion = new DireccionEntrega({
      ...direccionData,
      usuario: usuarioId
    });

    // Calcular zona de envío automáticamente
    await nuevaDireccion.calcularZonaEnvio();
    await nuevaDireccion.save();

    res.status(201).json({
      success: true,
      message: 'Dirección guardada correctamente',
      data: nuevaDireccion.obtenerResumen()
    });

  } catch (error) {
    console.error('Error al guardar dirección:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

const obtenerDirecciones = async (req, res) => {
  try {
    const usuarioId = req.usuario.id;
    
    const direcciones = await DireccionEntrega.obtenerTodasDelUsuario(usuarioId);
    
    res.json({
      success: true,
      data: direcciones.map(dir => dir.obtenerResumen())
    });

  } catch (error) {
    console.error('Error al obtener direcciones:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

const establecerDireccionPrincipal = async (req, res) => {
  try {
    const { direccionId } = req.params;
    const usuarioId = req.usuario.id;

    const direccion = await DireccionEntrega.findOne({
      _id: direccionId,
      usuario: usuarioId
    });

    if (!direccion) {
      return res.status(404).json({
        success: false,
        message: 'Dirección no encontrada'
      });
    }

    await direccion.marcarComoPrincipal();

    res.json({
      success: true,
      message: 'Dirección principal actualizada',
      data: direccion.obtenerResumen()
    });

  } catch (error) {
    console.error('Error al establecer dirección principal:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

// RF-CHECK-03: Seleccionar método de envío
const obtenerMetodosEnvio = async (req, res) => {
  try {
    const { direccionId } = req.query;
    const usuarioId = req.usuario.id;

    if (!direccionId) {
      return res.status(400).json({
        success: false,
        message: 'ID de dirección requerido'
      });
    }

    // Obtener dirección
    const direccion = await DireccionEntrega.findOne({
      _id: direccionId,
      usuario: usuarioId
    }).populate('zonaEnvio');

    if (!direccion) {
      return res.status(404).json({
        success: false,
        message: 'Dirección no encontrada'
      });
    }

    if (!direccion.zonaEnvio) {
      return res.status(400).json({
        success: false,
        message: 'No hay cobertura de envío para esta dirección'
      });
    }

    // Obtener carrito para calcular peso y volumen
    const carrito = await Carrito.findOne({ 
      usuario: usuarioId, 
      estado: 'activo' 
    }).populate('items.producto');

    // Calcular opciones de envío
    const zona = direccion.zonaEnvio;
    const metodosEnvio = [];

    // Domicilio
    if (zona.tiposEnvio.includes('domicilio')) {
      const costoEnvio = zona.calcularCostoEnvio(carrito.totales.pesoTotal || 0, carrito.totales.subtotal);
      metodosEnvio.push({
        tipo: 'domicilio',
        nombre: 'Entrega a domicilio',
        descripcion: `Entrega en ${zona.tiempoEntrega.domicilio} horas hábiles`,
        precio: costoEnvio,
        tiempoEstimado: `${zona.tiempoEntrega.domicilio} horas hábiles`,
        disponible: true
      });
    }

    // Punto de recogida
    if (zona.tiposEnvio.includes('punto_recogida') && zona.puntosRecogida.length > 0) {
      metodosEnvio.push({
        tipo: 'punto_recogida',
        nombre: 'Punto de recogida',
        descripcion: 'Recoge en uno de nuestros puntos aliados',
        precio: zona.precioBase * 0.5, // 50% descuento
        tiempoEstimado: `${zona.tiempoEntrega.puntoRecogida || zona.tiempoEntrega.domicilio} horas hábiles`,
        puntosDisponibles: zona.puntosRecogida.filter(p => p.activo),
        disponible: true
      });
    }

    // Recoger en tienda
    metodosEnvio.push({
      tipo: 'tienda',
      nombre: 'Recoger en tienda',
      descripcion: 'Recoge tu pedido en nuestra tienda principal',
      precio: 0,
      tiempoEstimado: '2-4 horas',
      direccionTienda: 'Calle 123 #45-67, Bogotá',
      disponible: true
    });

    res.json({
      success: true,
      data: {
        direccion: direccion.obtenerResumen(),
        zona: {
          nombre: zona.nombre,
          cobertura: zona.descripcion
        },
        metodosEnvio
      }
    });

  } catch (error) {
    console.error('Error al obtener métodos de envío:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

// RF-CHECK-10: Programar entrega
const obtenerVentanasEntrega = async (req, res) => {
  try {
    const { direccionId, metodoEnvio } = req.query;
    const usuarioId = req.usuario.id;

    if (metodoEnvio !== 'domicilio') {
      return res.json({
        success: true,
        data: {
          message: 'Programación de entrega solo disponible para domicilios',
          ventanasDisponibles: []
        }
      });
    }

    const direccion = await DireccionEntrega.findOne({
      _id: direccionId,
      usuario: usuarioId
    }).populate('zonaEnvio');

    if (!direccion || !direccion.zonaEnvio) {
      return res.status(404).json({
        success: false,
        message: 'Dirección o zona de envío no encontrada'
      });
    }

    // Obtener carrito para validaciones
    const carrito = await Carrito.findOne({ 
      usuario: usuarioId, 
      estado: 'activo' 
    });

    const tipoCliente = req.session.checkout?.tipoCliente || 'particular';

    // Obtener ventanas disponibles para la zona
    const ventanas = await VentanaEntrega.obtenerDisponiblesPorZona(
      direccion.zonaEnvio._id, 
      tipoCliente
    );

    const ventanasDisponibles = [];

    for (const ventana of ventanas) {
      if (ventana.esDisponiblePara(tipoCliente, carrito.totales.subtotal)) {
        // Generar slots para los próximos 7 días
        await ventana.generarSlotsParaSemana(new Date());
        
        // Obtener slots disponibles
        const slots = await SlotEntrega.obtenerDisponiblesPorFecha(
          new Date(), 
          direccion.zonaEnvio._id
        );

        if (slots.length > 0) {
          ventanasDisponibles.push({
            id: ventana._id,
            nombre: ventana.nombre,
            descripcion: ventana.descripcion,
            horaInicio: ventana.horaInicio,
            horaFin: ventana.horaFin,
            costoAdicional: ventana.costoAdicional,
            slotsDisponibles: slots.map(slot => ({
              id: slot._id,
              fecha: slot.fecha,
              horaInicio: slot.horaInicio,
              horaFin: slot.horaFin,
              capacidadDisponible: slot.capacidadDisponible
            }))
          });
        }
      }
    }

    res.json({
      success: true,
      data: {
        ventanasDisponibles,
        recomendacion: ventanasDisponibles.length > 0 
          ? 'Selecciona tu ventana de entrega preferida'
          : 'No hay ventanas de entrega disponibles para esta zona'
      }
    });

  } catch (error) {
    console.error('Error al obtener ventanas de entrega:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

// RF-CHECK-04: Resumir compra
const obtenerResumenCompra = async (req, res) => {
  try {
    const usuarioId = req.usuario.id;
    const sesionCheckout = req.session.checkout;

    if (!sesionCheckout) {
      return res.status(400).json({
        success: false,
        message: 'No hay una sesión de checkout activa'
      });
    }

    const { direccionId, metodoEnvio, slotEntregaId, metodoPagoId } = req.body;

    // Obtener carrito
    const carrito = await Carrito.findById(sesionCheckout.carrito)
      .populate('items.producto')
      .populate('cuponesAplicados.cupon');

    // Obtener dirección
    const direccion = await DireccionEntrega.findById(direccionId)
      .populate('zonaEnvio');

    // Obtener método de pago
    const metodoPago = await MetodoPago.findById(metodoPagoId);

    // Calcular totales finales
    let costoEnvio = 0;
    let costoAdicionalVentana = 0;

    if (metodoEnvio === 'domicilio' && direccion.zonaEnvio) {
      costoEnvio = direccion.zonaEnvio.calcularCostoEnvio(
        carrito.totales.pesoTotal || 0,
        carrito.totales.subtotal
      );
    }

    if (slotEntregaId) {
      const slot = await SlotEntrega.findById(slotEntregaId)
        .populate('ventanaEntrega');
      if (slot) {
        costoAdicionalVentana = slot.ventanaEntrega.costoAdicional || 0;
      }
    }

    // Calcular comisión del método de pago
    const subtotalConEnvio = carrito.totales.subtotal + costoEnvio + costoAdicionalVentana;
    const comisionPago = metodoPago ? metodoPago.calcularComision(subtotalConEnvio) : 0;

    const resumen = {
      datosPersonales: sesionCheckout.datosPersonales,
      datosEmpresa: sesionCheckout.datosEmpresa,
      tipoCliente: sesionCheckout.tipoCliente,
      
      productos: carrito.items.map(item => ({
        nombre: item.producto.nombre,
        cantidad: item.cantidad,
        precioUnitario: item.precioUnitario,
        subtotal: item.subtotal,
        imagen: item.producto.imagenes?.[0]
      })),
      
      direccionEntrega: direccion ? direccion.obtenerResumen() : null,
      metodoEnvio: {
        tipo: metodoEnvio,
        costo: costoEnvio + costoAdicionalVentana
      },
      
      metodoPago: metodoPago ? {
        nombre: metodoPago.nombre,
        tipo: metodoPago.tipo,
        comision: comisionPago
      } : null,
      
      totales: {
        subtotal: carrito.totales.subtotal,
        descuentos: carrito.totales.descuentos,
        envio: costoEnvio + costoAdicionalVentana,
        comisionPago: comisionPago,
        total: carrito.totales.subtotal - carrito.totales.descuentos + costoEnvio + costoAdicionalVentana + comisionPago
      },
      
      cuponesAplicados: carrito.cuponesAplicados.map(ca => ({
        codigo: ca.cupon.codigo,
        descuento: ca.descuento
      })),
      
      terminosCondiciones: {
        texto: 'Al confirmar el pedido, acepto los términos y condiciones de VerdeNexo',
        url: '/terminos-condiciones'
      }
    };

    // Actualizar sesión
    req.session.checkout = {
      ...sesionCheckout,
      direccionId,
      metodoEnvio,
      slotEntregaId,
      metodoPagoId,
      resumen,
      paso: 'resumen'
    };

    res.json({
      success: true,
      data: resumen
    });

  } catch (error) {
    console.error('Error al obtener resumen de compra:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

// RF-CHECK-06: Validar stock y precios
const validarStockPrecios = async (req, res) => {
  try {
    const usuarioId = req.usuario.id;
    
    const carrito = await Carrito.findOne({ 
      usuario: usuarioId, 
      estado: 'activo' 
    }).populate('items.producto');

    if (!carrito) {
      return res.status(404).json({
        success: false,
        message: 'Carrito no encontrado'
      });
    }

    const validaciones = [];
    let hayErrores = false;

    for (const item of carrito.items) {
      const producto = item.producto;
      
      if (!producto) {
        validaciones.push({
          productoId: item.producto,
          nombre: 'Producto no encontrado',
          valido: false,
          razon: 'El producto ya no existe'
        });
        hayErrores = true;
        continue;
      }

      // Validar stock
      if (producto.stock < item.cantidad) {
        validaciones.push({
          productoId: producto._id,
          nombre: producto.nombre,
          valido: false,
          razon: `Stock insuficiente. Disponible: ${producto.stock}, Solicitado: ${item.cantidad}`
        });
        hayErrores = true;
        continue;
      }

      // Validar precio
      if (Math.abs(producto.precio - item.precioUnitario) > 0.01) {
        validaciones.push({
          productoId: producto._id,
          nombre: producto.nombre,
          valido: false,
          razon: `Precio cambió. Actual: $${producto.precio}, En carrito: $${item.precioUnitario}`,
          precioActual: producto.precio,
          precioCarrito: item.precioUnitario
        });
        hayErrores = true;
        continue;
      }

      validaciones.push({
        productoId: producto._id,
        nombre: producto.nombre,
        valido: true,
        stockDisponible: producto.stock,
        precioActual: producto.precio
      });
    }

    res.json({
      success: !hayErrores,
      data: {
        validaciones,
        resumen: {
          productosValidados: validaciones.length,
          productosConErrores: validaciones.filter(v => !v.valido).length,
          todoValido: !hayErrores
        }
      },
      message: hayErrores 
        ? 'Se encontraron problemas con algunos productos' 
        : 'Todos los productos están disponibles'
    });

  } catch (error) {
    console.error('Error al validar stock y precios:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

// RF-CHECK-05: Generar pedido
const generarPedido = async (req, res) => {
  try {
    const usuarioId = req.usuario.id;
    const sesionCheckout = req.session.checkout;
    const { terminosAceptados } = req.body;

    if (!sesionCheckout || !sesionCheckout.resumen) {
      return res.status(400).json({
        success: false,
        message: 'Debe completar el proceso de checkout'
      });
    }

    if (!terminosAceptados) {
      return res.status(400).json({
        success: false,
        message: 'Debe aceptar los términos y condiciones'
      });
    }

    // Validar stock y precios una vez más
    const validacion = await validarStockPreciosInterno(usuarioId);
    if (!validacion.success) {
      return res.status(400).json(validacion);
    }

    // Obtener datos necesarios
    const carrito = await Carrito.findById(sesionCheckout.carrito)
      .populate('items.producto')
      .populate('cuponesAplicados.cupon');

    const direccion = await DireccionEntrega.findById(sesionCheckout.direccionId);
    const metodoPago = await MetodoPago.findById(sesionCheckout.metodoPagoId);

    // Crear el pedido
    const pedido = new Pedido({
      usuario: usuarioId,
      carrito: carrito._id,
      items: carrito.items.map(item => ({
        producto: item.producto._id,
        cantidad: item.cantidad,
        precioUnitario: item.precioUnitario,
        precioTotal: item.subtotal,
        descuento: item.descuento || 0
      })),
      
      datosPersonales: sesionCheckout.datosPersonales,
      datosEmpresa: sesionCheckout.datosEmpresa,
      tipoCliente: sesionCheckout.tipoCliente,
      
      direccionEntrega: {
        alias: direccion.alias,
        nombreCompleto: direccion.nombreCompleto,
        telefono: direccion.telefono,
        direccion: direccion.direccion,
        ciudad: direccion.ciudad,
        departamento: direccion.departamento,
        codigoPostal: direccion.codigoPostal,
        referencia: direccion.referencia
      },
      
      metodoEnvio: {
        tipo: sesionCheckout.metodoEnvio,
        precio: sesionCheckout.resumen.totales.envio,
        zona: direccion.zonaEnvio
      },
      
      metodoPago: {
        tipo: metodoPago.tipo,
        detalle: metodoPago.nombre
      },
      
      totales: sesionCheckout.resumen.totales,
      cuponesAplicados: carrito.cuponesAplicados,
      terminosAceptados: true
    });

    // Programar entrega si se seleccionó slot
    if (sesionCheckout.slotEntregaId) {
      const slot = await SlotEntrega.findById(sesionCheckout.slotEntregaId)
        .populate('ventanaEntrega');
      
      if (slot) {
        pedido.ventanaEntrega = {
          fecha: slot.fecha,
          horaInicio: slot.horaInicio,
          horaFin: slot.horaFin
        };
        
        // Reservar el slot
        await slot.reservarPedido(pedido._id);
      }
    }

    await pedido.save();

    // Crear transacción de pago
    const transaccion = new TransaccionPago({
      pedido: pedido._id,
      metodoPago: metodoPago._id,
      usuario: usuarioId,
      monto: pedido.totales.total,
      comision: sesionCheckout.resumen.totales.comisionPago || 0,
      montoNeto: pedido.totales.total - (sesionCheckout.resumen.totales.comisionPago || 0)
    });

    await transaccion.save();

    // Reducir stock de productos
    for (const item of carrito.items) {
      await Producto.findByIdAndUpdate(
        item.producto._id,
        { $inc: { stock: -item.cantidad } }
      );
    }

    // Marcar carrito como procesado
    carrito.estado = 'procesado';
    carrito.fechaProcesado = new Date();
    await carrito.save();

    // Incrementar uso de dirección
    await direccion.incrementarUso();

    // Actualizar estadísticas del método de pago
    await metodoPago.actualizarEstadisticas(pedido.totales.total);

    // Limpiar sesión de checkout
    delete req.session.checkout;

    res.status(201).json({
      success: true,
      message: 'Pedido creado exitosamente',
      data: {
        pedido: {
          id: pedido._id,
          numeroPedido: pedido.numeroPedido,
          total: pedido.totales.total,
          estado: pedido.estado
        },
        transaccion: {
          id: transaccion._id,
          numeroTransaccion: transaccion.numeroTransaccion,
          estado: transaccion.estado
        },
        siguientePaso: metodoPago.tipo === 'efectivo' ? 'confirmacion' : 'pago'
      }
    });

  } catch (error) {
    console.error('Error al generar pedido:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// RF-CHECK-07: Enviar notificación de pedido
const enviarNotificacionPedido = async (req, res) => {
  try {
    const { pedidoId } = req.params;
    const { tipo } = req.body; // 'email' o 'whatsapp'

    const pedido = await Pedido.findById(pedidoId)
      .populate('usuario')
      .populate('items.producto');

    if (!pedido) {
      return res.status(404).json({
        success: false,
        message: 'Pedido no encontrado'
      });
    }

    let notificacionEnviada = false;

    if (tipo === 'email' || !tipo) {
      // Enviar email de confirmación
      const emailData = {
        to: pedido.datosPersonales.email,
        subject: `Confirmación de pedido ${pedido.numeroPedido}`,
        template: 'confirmacion-pedido',
        data: {
          numeroPedido: pedido.numeroPedido,
          cliente: pedido.datosPersonales.nombre,
          items: pedido.items,
          total: pedido.totales.total,
          direccionEntrega: pedido.direccionEntrega
        }
      };

      try {
        await emailService.enviarEmail(emailData);
        pedido.notificaciones.emailEnviado = true;
        notificacionEnviada = true;
      } catch (emailError) {
        console.error('Error al enviar email:', emailError);
      }
    }

    if (tipo === 'whatsapp' || !tipo) {
      // Aquí integrarías con API de WhatsApp
      // Por ahora solo marcamos como enviado
      pedido.notificaciones.whatsappEnviado = true;
      notificacionEnviada = true;
    }

    pedido.notificaciones.fechaUltimaNotificacion = new Date();
    await pedido.save();

    res.json({
      success: notificacionEnviada,
      message: notificacionEnviada 
        ? 'Notificación enviada correctamente'
        : 'Error al enviar notificación',
      data: {
        emailEnviado: pedido.notificaciones.emailEnviado,
        whatsappEnviado: pedido.notificaciones.whatsappEnviado
      }
    });

  } catch (error) {
    console.error('Error al enviar notificación:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

// RF-CHECK-09: Manejar pedidos mayoristas
const validarPedidoMayorista = async (req, res) => {
  try {
    const { datosEmpresa, items } = req.body;

    // Validar datos de empresa
    if (!datosEmpresa.nit || !datosEmpresa.razonSocial || !datosEmpresa.representanteLegal) {
      return res.status(400).json({
        success: false,
        message: 'Datos de empresa incompletos'
      });
    }

    // Validar formato NIT
    const nitRegex = /^[0-9]{8,11}-[0-9]$/;
    if (!nitRegex.test(datosEmpresa.nit)) {
      return res.status(400).json({
        success: false,
        message: 'Formato de NIT inválido (ejemplo: 123456789-0)'
      });
    }

    // Calcular total del pedido
    const subtotal = items.reduce((sum, item) => sum + (item.precio * item.cantidad), 0);
    const minimoMayorista = 500000;

    if (subtotal < minimoMayorista) {
      return res.status(400).json({
        success: false,
        message: `El pedido mayorista debe superar los $${minimoMayorista.toLocaleString()} COP`
      });
    }

    // Validar disponibilidad de productos para venta mayorista
    const validaciones = [];
    for (const item of items) {
      const producto = await Producto.findById(item.productoId);
      
      if (!producto) {
        validaciones.push({
          productoId: item.productoId,
          valido: false,
          razon: 'Producto no encontrado'
        });
        continue;
      }

      if (!producto.ventaMayorista) {
        validaciones.push({
          productoId: item.productoId,
          nombre: producto.nombre,
          valido: false,
          razon: 'Producto no disponible para venta mayorista'
        });
        continue;
      }

      if (producto.stock < item.cantidad) {
        validaciones.push({
          productoId: item.productoId,
          nombre: producto.nombre,
          valido: false,
          razon: `Stock insuficiente. Disponible: ${producto.stock}`
        });
        continue;
      }

      validaciones.push({
        productoId: item.productoId,
        nombre: producto.nombre,
        valido: true,
        precioMayorista: producto.precioMayorista || producto.precio * 0.8
      });
    }

    const hayErrores = validaciones.some(v => !v.valido);

    res.json({
      success: !hayErrores,
      data: {
        validaciones,
        subtotal,
        minimoMayorista,
        cumpleMonto: subtotal >= minimoMayorista,
        descuentoAplicable: !hayErrores ? 15 : 0 // 15% descuento mayorista
      },
      message: hayErrores 
        ? 'Se encontraron problemas con el pedido mayorista'
        : 'Pedido mayorista válido'
    });

  } catch (error) {
    console.error('Error al validar pedido mayorista:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

// Función auxiliar para validación interna
const validarStockPreciosInterno = async (usuarioId) => {
  try {
    const carrito = await Carrito.findOne({ 
      usuario: usuarioId, 
      estado: 'activo' 
    }).populate('items.producto');

    if (!carrito) {
      return {
        success: false,
        message: 'Carrito no encontrado'
      };
    }

    for (const item of carrito.items) {
      const producto = item.producto;
      
      if (!producto) {
        return {
          success: false,
          message: `Producto ${item.producto} ya no existe`
        };
      }

      if (producto.stock < item.cantidad) {
        return {
          success: false,
          message: `Stock insuficiente para ${producto.nombre}. Disponible: ${producto.stock}`
        };
      }

      if (Math.abs(producto.precio - item.precioUnitario) > 0.01) {
        return {
          success: false,
          message: `El precio de ${producto.nombre} ha cambiado`
        };
      }
    }

    return { success: true };
  } catch (error) {
    return {
      success: false,
      message: 'Error al validar productos'
    };
  }
};

export default {
  ingresarDatosCompra,
  guardarDireccion,
  obtenerDirecciones,
  establecerDireccionPrincipal,
  obtenerMetodosEnvio,
  obtenerVentanasEntrega,
  obtenerResumenCompra,
  validarStockPrecios,
  generarPedido,
  enviarNotificacionPedido,
  validarPedidoMayorista
};