import Pedido from '../../models/checkout/pedido.model.js';
import { TransaccionPago } from '../../models/checkout/metodo-pago.model.js';
import { Producto } from '../../models/producto/producto.model.js';
import { Carrito } from '../../models/carrito/carrito.model.js';
import { Cupon } from '../../models/carrito/cupon.model.js';
import { ZonaEnvio } from '../../models/carrito/zona-envio.model.js';
import emailService from '../../utils/email.service.js';

class CheckoutService {
  
  // Validación integral de stock y precios
  static async validarStockYPrecios(carritoId) {
    try {
      const carrito = await Carrito.findById(carritoId)
        .populate('items.producto');

      if (!carrito) {
        throw new Error('Carrito no encontrado');
      }

      const validaciones = [];
      let hayErrores = false;
      let totalActualizado = 0;

      for (const item of carrito.items) {
        const producto = item.producto;
        const validacion = {
          itemId: item._id,
          productoId: producto._id,
          nombre: producto.nombre
        };

        // Validar existencia del producto
        if (!producto) {
          validacion.valido = false;
          validacion.razon = 'Producto ya no existe';
          hayErrores = true;
          validaciones.push(validacion);
          continue;
        }

        // Validar estado del producto
        if (!producto.activo) {
          validacion.valido = false;
          validacion.razon = 'Producto no disponible';
          hayErrores = true;
          validaciones.push(validacion);
          continue;
        }

        // Validar stock
        if (producto.stock < item.cantidad) {
          validacion.valido = false;
          validacion.razon = `Stock insuficiente. Disponible: ${producto.stock}, Solicitado: ${item.cantidad}`;
          validacion.stockDisponible = producto.stock;
          validacion.cantidadSolicitada = item.cantidad;
          hayErrores = true;
          validaciones.push(validacion);
          continue;
        }

        // Validar precio
        const diferenciaPrecio = Math.abs(producto.precio - item.precioUnitario);
        if (diferenciaPrecio > 0.01) {
          validacion.valido = false;
          validacion.razon = `Precio cambió. Actual: $${producto.precio.toLocaleString()}, En carrito: $${item.precioUnitario.toLocaleString()}`;
          validacion.precioActual = producto.precio;
          validacion.precioCarrito = item.precioUnitario;
          validacion.requiereActualizacion = true;
          hayErrores = true;
          validaciones.push(validacion);
          continue;
        }

        // Validación exitosa
        validacion.valido = true;
        validacion.stockDisponible = producto.stock;
        validacion.precioActual = producto.precio;
        totalActualizado += producto.precio * item.cantidad;
        validaciones.push(validacion);
      }

      return {
        valido: !hayErrores,
        validaciones,
        resumen: {
          itemsValidados: validaciones.length,
          itemsConErrores: validaciones.filter(v => !v.valido).length,
          totalActualizado: totalActualizado,
          requiereActualizacion: validaciones.some(v => v.requiereActualizacion)
        }
      };

    } catch (error) {
      console.error('Error en validación de stock y precios:', error);
      throw error;
    }
  }

  // Cálculo de costos de envío
  static async calcularCostosEnvio(direccionId, carritoId, metodosEnvio = []) {
    try {
    const DireccionEntrega = (await import('../../models/checkout/direccion-entrega.model.js')).default;
      
      const direccion = await DireccionEntrega.findById(direccionId)
        .populate('zonaEnvio');
      const carrito = await Carrito.findById(carritoId)
        .populate('items.producto');

      if (!direccion || !carrito) {
        throw new Error('Dirección o carrito no encontrado');
      }

      const zona = direccion.zonaEnvio;
      if (!zona) {
        return {
          error: 'No hay cobertura de envío para esta dirección',
          opciones: []
        };
      }

      const pesoTotal = carrito.totales.pesoTotal || this.calcularPesoCarrito(carrito);
      const valorMercancia = carrito.totales.subtotal;
      
      const opciones = [];

      // Domicilio
      if (zona.tiposEnvio.includes('domicilio')) {
        const costoBase = zona.calcularCostoEnvio(pesoTotal, valorMercancia);
        opciones.push({
          tipo: 'domicilio',
          nombre: 'Entrega a domicilio',
          costo: costoBase,
          tiempoEstimado: zona.tiempoEntrega.domicilio,
          descripcion: `Entrega en ${zona.tiempoEntrega.domicilio} horas hábiles`
        });
      }

      // Punto de recogida
      if (zona.tiposEnvio.includes('punto_recogida') && zona.puntosRecogida?.length > 0) {
        const costoReducido = zona.precioBase * 0.6;
        opciones.push({
          tipo: 'punto_recogida',
          nombre: 'Punto de recogida',
          costo: costoReducido,
          tiempoEstimado: zona.tiempoEntrega.puntoRecogida || zona.tiempoEntrega.domicilio,
          descripcion: 'Recoge en uno de nuestros puntos aliados',
          puntosDisponibles: zona.puntosRecogida.filter(p => p.activo)
        });
      }

      // Recoger en tienda (siempre disponible)
      opciones.push({
        tipo: 'tienda',
        nombre: 'Recoger en tienda',
        costo: 0,
        tiempoEstimado: '2-4 horas',
        descripcion: 'Recoge tu pedido en nuestra tienda principal',
        direccion: 'Calle 123 #45-67, Bogotá'
      });

      return {
        zona: {
          nombre: zona.nombre,
          descripcion: zona.descripcion
        },
        opciones: opciones.sort((a, b) => a.costo - b.costo)
      };

    } catch (error) {
      console.error('Error al calcular costos de envío:', error);
      throw error;
    }
  }

  // Generar número único de pedido
  static generarNumeroPedido() {
    const timestamp = Date.now().toString();
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    const fecha = new Date().toISOString().slice(2, 10).replace(/-/g, '');
    
    return `VN-${fecha}-${timestamp.slice(-6)}-${random}`;
  }

  // Procesar cupones de descuento
  static async procesarCupones(carritoId, codigosCupones = []) {
    try {
      const carrito = await Carrito.findById(carritoId)
        .populate('items.producto');

      if (!carrito) {
        throw new Error('Carrito no encontrado');
      }

      const cuponesAplicados = [];
      let descuentoTotal = 0;

      for (const codigo of codigosCupones) {
        const cupon = await Cupon.findOne({ 
          codigo: codigo,
          activo: true,
          fechaInicio: { $lte: new Date() },
          $or: [
            { fechaFin: { $exists: false } },
            { fechaFin: null },
            { fechaFin: { $gte: new Date() } }
          ]
        });

        if (!cupon) {
          continue; // Cupón no válido, continuar con el siguiente
        }

        // Validar condiciones del cupón
        const validacion = cupon.validarCondiciones(carrito);
        if (!validacion.valido) {
          continue;
        }

        // Calcular descuento
        const descuento = cupon.calcularDescuento(carrito.totales.subtotal);
        
        cuponesAplicados.push({
          cupon: cupon._id,
          codigo: codigo,
          tipo: cupon.tipo,
          valor: cupon.valor,
          descuento: descuento,
          descripcion: cupon.descripcion
        });

        descuentoTotal += descuento;

        // Marcar cupón como usado si es de un solo uso
        if (cupon.limitePorUsuario === 1) {
          await cupon.marcarComoUsado();
        }
      }

      return {
        cuponesAplicados,
        descuentoTotal,
        subtotalConDescuento: carrito.totales.subtotal - descuentoTotal
      };

    } catch (error) {
      console.error('Error al procesar cupones:', error);
      throw error;
    }
  }

  // Reservar productos en stock
  static async reservarStock(carritoId, tiempoReserva = 30) {
    try {
      const carrito = await Carrito.findById(carritoId)
        .populate('items.producto');

      if (!carrito) {
        throw new Error('Carrito no encontrado');
      }

      const reservas = [];
      const fechaExpiracion = new Date(Date.now() + tiempoReserva * 60 * 1000);

      for (const item of carrito.items) {
        const producto = item.producto;
        
        // Validar stock disponible
        if (producto.stock < item.cantidad) {
          throw new Error(`Stock insuficiente para ${producto.nombre}`);
        }

        // Crear reserva temporal
        const reserva = {
          producto: producto._id,
          cantidad: item.cantidad,
          fechaReserva: new Date(),
          fechaExpiracion,
          carrito: carritoId
        };

        // Reducir stock disponible temporalmente
        await Producto.findByIdAndUpdate(
          producto._id,
          { 
            $inc: { stockReservado: item.cantidad },
            $push: { reservasTemporales: reserva }
          }
        );

        reservas.push(reserva);
      }

      return {
        reservas,
        expiraEn: tiempoReserva,
        fechaExpiracion
      };

    } catch (error) {
      console.error('Error al reservar stock:', error);
      throw error;
    }
  }

  // Liberar stock reservado
  static async liberarStockReservado(carritoId) {
    try {
      const carrito = await Carrito.findById(carritoId);
      
      if (!carrito) {
        return;
      }

      for (const item of carrito.items) {
        await Producto.findByIdAndUpdate(
          item.producto,
          { 
            $inc: { stockReservado: -item.cantidad },
            $pull: { reservasTemporales: { carrito: carritoId } }
          }
        );
      }

      return true;

    } catch (error) {
      console.error('Error al liberar stock reservado:', error);
      throw error;
    }
  }

  // Confirmar compra y reducir stock definitivamente
  static async confirmarCompra(pedidoId) {
    try {
      const pedido = await Pedido.findById(pedidoId)
        .populate('items.producto');

      if (!pedido) {
        throw new Error('Pedido no encontrado');
      }

      const actualizaciones = [];

      for (const item of pedido.items) {
        const actualizacion = await Producto.findByIdAndUpdate(
          item.producto,
          { 
            $inc: { 
              stock: -item.cantidad,
              stockReservado: -item.cantidad,
              vecesVendido: item.cantidad
            },
            $pull: { reservasTemporales: { carrito: pedido.carrito } }
          },
          { new: true }
        );

        actualizaciones.push({
          producto: item.producto,
          stockAnterior: actualizacion.stock + item.cantidad,
          stockActual: actualizacion.stock,
          cantidadVendida: item.cantidad
        });
      }

      // Marcar pedido como confirmado
      pedido.estado = 'confirmado';
      await pedido.save();

      return {
        pedido: pedido._id,
        estado: 'confirmado',
        actualizaciones
      };

    } catch (error) {
      console.error('Error al confirmar compra:', error);
      throw error;
    }
  }

  // Enviar notificaciones
  static async enviarNotificaciones(pedidoId, tipos = ['email']) {
    try {
      const pedido = await Pedido.findById(pedidoId)
        .populate('usuario')
        .populate('items.producto');

      if (!pedido) {
        throw new Error('Pedido no encontrado');
      }

      const resultados = {};

      if (tipos.includes('email')) {
        try {
          const emailData = {
            to: pedido.datosPersonales.email,
            subject: `Confirmación de pedido ${pedido.numeroPedido} - VerdeNexo`,
            template: 'confirmacion-pedido',
            data: {
              numeroPedido: pedido.numeroPedido,
              fechaPedido: pedido.fechaPedido,
              cliente: `${pedido.datosPersonales.nombre} ${pedido.datosPersonales.apellido}`,
              items: pedido.items.map(item => ({
                nombre: item.producto?.nombre || 'Producto no disponible',
                cantidad: item.cantidad,
                precio: item.precioUnitario,
                subtotal: item.precioTotal,
                imagen: item.producto?.imagenes?.[0] || null
              })),
              direccion: pedido.direccionEntrega,
              metodoEnvio: pedido.metodoEnvio,
              totales: pedido.totales,
              urlSeguimiento: `${process.env.FRONTEND_URL}/pedidos/${pedido._id}`,
              contacto: {
                telefono: process.env.CONTACT_PHONE || '3001234567',
                email: process.env.CONTACT_EMAIL || 'soporte@verdenexo.com'
              }
            }
          };

          await emailService.enviarEmail(emailData);
          resultados.email = { enviado: true, timestamp: new Date() };
          
          pedido.notificaciones.emailEnviado = true;

        } catch (emailError) {
          console.error('Error al enviar email:', emailError);
          resultados.email = { enviado: false, error: emailError.message };
        }
      }

      if (tipos.includes('whatsapp')) {
        // Aquí integrarías con API de WhatsApp Business
        // Por ahora simulamos el envío
        const mensaje = this.generarMensajeWhatsApp(pedido);
        
        try {
          // await whatsappService.enviarMensaje(pedido.datosPersonales.telefono, mensaje);
          resultados.whatsapp = { enviado: true, timestamp: new Date() };
          pedido.notificaciones.whatsappEnviado = true;
        } catch (whatsappError) {
          console.error('Error al enviar WhatsApp:', whatsappError);
          resultados.whatsapp = { enviado: false, error: whatsappError.message };
        }
      }

      if (tipos.includes('sms')) {
        // Integración con servicio SMS
        const mensajeSMS = `VerdeNexo: Tu pedido ${pedido.numeroPedido} ha sido confirmado. Total: $${pedido.totales.total.toLocaleString()}. Seguimiento: ${process.env.FRONTEND_URL}/pedidos/${pedido._id}`;
        
        try {
          // await smsService.enviarSMS(pedido.datosPersonales.telefono, mensajeSMS);
          resultados.sms = { enviado: true, timestamp: new Date() };
        } catch (smsError) {
          console.error('Error al enviar SMS:', smsError);
          resultados.sms = { enviado: false, error: smsError.message };
        }
      }

      pedido.notificaciones.fechaUltimaNotificacion = new Date();
      await pedido.save();

      return resultados;

    } catch (error) {
      console.error('Error al enviar notificaciones:', error);
      throw error;
    }
  }

  // Validaciones especiales para mayoristas
  static async validarPedidoMayorista(pedidoData) {
    try {
      const validaciones = {
        valido: true,
        errores: [],
        advertencias: []
      };

      // Validar datos de empresa
      if (!pedidoData.datosEmpresa) {
        validaciones.valido = false;
        validaciones.errores.push('Datos de empresa requeridos para pedidos mayoristas');
        return validaciones;
      }

      const empresa = pedidoData.datosEmpresa;

      // Validar NIT
      const nitRegex = /^[0-9]{8,11}-[0-9]$/;
      if (!empresa.nit || !nitRegex.test(empresa.nit)) {
        validaciones.valido = false;
        validaciones.errores.push('NIT inválido. Formato esperado: 123456789-0');
      }

      // Validar campos obligatorios
      const camposObligatorios = ['razonSocial', 'representanteLegal', 'telefono', 'email'];
      for (const campo of camposObligatorios) {
        if (!empresa[campo]) {
          validaciones.valido = false;
          validaciones.errores.push(`${campo} es requerido para empresas`);
        }
      }

      // Validar monto mínimo
      const montoMinimo = 500000;
      if (pedidoData.totales.subtotal < montoMinimo) {
        validaciones.valido = false;
        validaciones.errores.push(`El pedido mayorista debe superar los $${montoMinimo.toLocaleString()} COP`);
      }

      // Validar productos mayoristas
      for (const item of pedidoData.items) {
        const producto = await Producto.findById(item.producto);
        
        if (producto && !producto.ventaMayorista) {
          validaciones.advertencias.push(`${producto.nombre} no está disponible para venta mayorista`);
        }

        // Validar cantidad mínima mayorista
        if (producto && producto.cantidadMinimaMayorista && item.cantidad < producto.cantidadMinimaMayorista) {
          validaciones.valido = false;
          validaciones.errores.push(`${producto.nombre} requiere mínimo ${producto.cantidadMinimaMayorista} unidades para venta mayorista`);
        }
      }

      return validaciones;

    } catch (error) {
      console.error('Error al validar pedido mayorista:', error);
      throw error;
    }
  }

  // Generar factura electrónica
  static async generarFactura(pedidoId) {
    try {
      const pedido = await Pedido.findById(pedidoId)
        .populate('items.producto');

      if (!pedido) {
        throw new Error('Pedido no encontrado');
      }

      const factura = {
        numero: this.generarNumeroFactura(),
        fecha: new Date(),
        pedido: pedidoId,
        cliente: {
          tipo: pedido.tipoCliente,
          nombre: pedido.tipoCliente === 'mayorista' 
            ? pedido.datosEmpresa.razonSocial 
            : `${pedido.datosPersonales.nombre} ${pedido.datosPersonales.apellido}`,
          documento: pedido.tipoCliente === 'mayorista' 
            ? pedido.datosEmpresa.nit 
            : pedido.datosPersonales.documento.numero,
          email: pedido.datosPersonales.email,
          telefono: pedido.datosPersonales.telefono
        },
        items: pedido.items.map(item => ({
          descripcion: item.producto?.nombre || 'Producto no disponible',
          cantidad: item.cantidad,
          valorUnitario: item.precioUnitario,
          valorTotal: item.precioTotal,
          iva: item.precioTotal * 0.19 // 19% IVA
        })),
        totales: {
          subtotal: pedido.totales.subtotal,
          descuentos: pedido.totales.descuentos,
          iva: pedido.totales.subtotal * 0.19,
          total: pedido.totales.total
        }
      };

      // Aquí integrarías con proveedor de facturación electrónica
      // Por ahora simulamos la generación
      
      return factura;

    } catch (error) {
      console.error('Error al generar factura:', error);
      throw error;
    }
  }

  // Métodos auxiliares
  static calcularPesoCarrito(carrito) {
    return carrito.items.reduce((peso, item) => {
      const pesoProducto = item.producto?.peso || 0.5; // peso por defecto 500g
      return peso + (pesoProducto * item.cantidad);
    }, 0);
  }

  static generarNumeroFactura() {
    const fecha = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const secuencial = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    return `FE-${fecha}-${secuencial}`;
  }

  static generarMensajeWhatsApp(pedido) {
    return `🌱 *VerdeNexo*\n\n✅ Tu pedido ha sido confirmado\n\n📋 *Pedido:* ${pedido.numeroPedido}\n💰 *Total:* $${pedido.totales.total.toLocaleString()}\n📍 *Entrega:* ${pedido.direccionEntrega.direccion}\n\nPuedes hacer seguimiento en: ${process.env.FRONTEND_URL}/pedidos/${pedido._id}\n\n¡Gracias por tu compra! 🌿`;
  }

  // Limpiar reservas expiradas (para ejecutar periódicamente)
  static async limpiarReservasExpiradas() {
    try {
      const ahora = new Date();
      
      const productos = await Producto.find({
        'reservasTemporales.fechaExpiracion': { $lt: ahora }
      });

      let reservasLiberadas = 0;

      for (const producto of productos) {
        const reservasExpiradas = producto.reservasTemporales.filter(
          r => r.fechaExpiracion < ahora
        );

        for (const reserva of reservasExpiradas) {
          producto.stockReservado -= reserva.cantidad;
          reservasLiberadas++;
        }

        producto.reservasTemporales = producto.reservasTemporales.filter(
          r => r.fechaExpiracion >= ahora
        );

        await producto.save();
      }

      console.log(`Se liberaron ${reservasLiberadas} reservas expiradas`);
      return reservasLiberadas;

    } catch (error) {
      console.error('Error al limpiar reservas expiradas:', error);
      throw error;
    }
  }
}

export default CheckoutService;