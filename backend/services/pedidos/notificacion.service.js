import { EstadoPedido } from '../../models/pedidos/index.js';
import Pedido from '../../models/checkout/pedido.model.js';
import emailService from '../../utils/email.service.js';

class NotificacionService {
  
  /**
   * Envía notificación de confirmación de pedido
   * @param {String} pedidoId - ID del pedido
   * @param {Object} opciones - Opciones de notificación
   * @returns {Object} - Resultado del envío
   */
  async enviarNotificacionConfirmacion(pedidoId, opciones = {}) {
    try {
      const pedido = await Pedido.findById(pedidoId)
        .populate('clienteId', 'nombre email telefono')
        .populate('items.productoId', 'nombre imagen');
      
      if (!pedido) {
        throw new Error('Pedido no encontrado');
      }
      
      const cliente = pedido.clienteId || pedido.datosCliente;
      const email = opciones.email || cliente.email;
      
      if (!email) {
        throw new Error('Email del cliente no disponible');
      }
      
      const datosEmail = {
        destinatario: email,
        asunto: `¡Pedido confirmado! #${pedido.numeroPedido} - VerdeNexo`,
        plantilla: 'pedido-confirmado',
        datos: {
          nombreCliente: cliente.nombre || 'Cliente',
          numeroPedido: pedido.numeroPedido,
          fechaPedido: pedido.createdAt,
          items: pedido.items.map(item => ({
            nombre: item.productoId.nombre,
            cantidad: item.cantidad,
            precio: item.precioUnitario,
            subtotal: item.cantidad * item.precioUnitario
          })),
          totales: pedido.totales,
          direccionEntrega: pedido.direccionEntrega,
          fechaEstimadaEntrega: this.calcularFechaEstimadaEntrega(pedido),
          urlSeguimiento: `${process.env.FRONTEND_URL}/seguimiento/${pedidoId}`
        }
      };
      
      const resultado = await emailService.enviarEmail(datosEmail);
      
      if (resultado.success) {
        // Marcar notificación como enviada en el estado
        await EstadoPedido.findOneAndUpdate(
          { pedidoId, estadoNuevo: 'confirmado' },
          { notificacionEnviada: true }
        );
      }
      
      return {
        success: resultado.success,
        message: resultado.success ? 
          'Notificación de confirmación enviada' : 
          'Error al enviar notificación',
        detalles: resultado
      };
      
    } catch (error) {
      console.error('Error al enviar notificación de confirmación:', error);
      throw new Error(`Error al enviar notificación: ${error.message}`);
    }
  }
  
  /**
   * Envía notificación de cambio de estado
   * @param {String} pedidoId - ID del pedido
   * @param {String} estadoAnterior - Estado anterior
   * @param {String} estadoNuevo - Estado nuevo
   * @param {Object} opciones - Opciones de notificación
   * @returns {Object} - Resultado del envío
   */
  async enviarNotificacionCambioEstado(pedidoId, estadoAnterior, estadoNuevo, opciones = {}) {
    try {
      const pedido = await Pedido.findById(pedidoId)
        .populate('clienteId', 'nombre email telefono');
      
      if (!pedido) {
        throw new Error('Pedido no encontrado');
      }
      
      // Verificar si el estado requiere notificación
      const estadosNotificables = [
        'confirmado', 'en_proceso', 'empacado', 'enviado', 
        'en_transito', 'entregado', 'cancelado', 'devuelto'
      ];
      
      if (!estadosNotificables.includes(estadoNuevo)) {
        return {
          success: true,
          message: 'Estado no requiere notificación',
          notificacionEnviada: false
        };
      }
      
      const cliente = pedido.clienteId || pedido.datosCliente;
      const email = opciones.email || cliente.email;
      
      if (!email) {
        console.warn(`No se puede enviar notificación para pedido ${pedidoId}: email no disponible`);
        return {
          success: false,
          message: 'Email del cliente no disponible',
          notificacionEnviada: false
        };
      }
      
      // Obtener información adicional del estado
      const estadoInfo = await EstadoPedido.obtenerEstadoActual(pedidoId);
      
      const datosEmail = {
        destinatario: email,
        asunto: this.generarAsuntoNotificacion(estadoNuevo, pedido.numeroPedido),
        plantilla: this.obtenerPlantillaNotificacion(estadoNuevo),
        datos: {
          nombreCliente: cliente.nombre || 'Cliente',
          numeroPedido: pedido.numeroPedido,
          estadoAnterior: this.formatearEstado(estadoAnterior),
          estadoNuevo: this.formatearEstado(estadoNuevo),
          fechaCambio: estadoInfo?.fechaCambio || new Date(),
          comentarios: estadoInfo?.comentarios,
          metadatos: estadoInfo?.metadatos || {},
          totales: pedido.totales,
          urlSeguimiento: `${process.env.FRONTEND_URL}/seguimiento/${pedidoId}`,
          mensajePersonalizado: this.generarMensajePersonalizado(estadoNuevo, pedido)
        }
      };
      
      const resultado = await emailService.enviarEmail(datosEmail);
      
      if (resultado.success) {
        // Marcar notificación como enviada
        await EstadoPedido.findOneAndUpdate(
          { pedidoId, estadoNuevo },
          { notificacionEnviada: true }
        );
      }
      
      return {
        success: resultado.success,
        message: resultado.success ? 
          `Notificación de ${estadoNuevo} enviada` : 
          'Error al enviar notificación',
        notificacionEnviada: resultado.success,
        detalles: resultado
      };
      
    } catch (error) {
      console.error('Error al enviar notificación de cambio:', error);
      throw new Error(`Error al enviar notificación: ${error.message}`);
    }
  }
  
  /**
   * Envía notificaciones masivas de recordatorio
   * @param {Object} criterios - Criterios para seleccionar pedidos
   * @param {String} tipoRecordatorio - Tipo de recordatorio
   * @returns {Object} - Resultado del envío masivo
   */
  async enviarNotificacionesMasivas(criterios, tipoRecordatorio) {
    try {
      let pedidos = [];
      
      switch (tipoRecordatorio) {
        case 'entrega_pendiente':
          // Pedidos enviados hace más de 3 días
          const fechaLimite = new Date();
          fechaLimite.setDate(fechaLimite.getDate() - 3);
          
          pedidos = await this.obtenerPedidosPorEstadoYFecha(
            ['enviado', 'en_transito'], 
            fechaLimite
          );
          break;
          
        case 'seguimiento':
          // Pedidos activos sin seguimiento reciente
          pedidos = await this.obtenerPedidosSinSeguimiento();
          break;
          
        case 'satisfaccion':
          // Pedidos entregados en los últimos 7 días
          const fechaEntrega = new Date();
          fechaEntrega.setDate(fechaEntrega.getDate() - 7);
          
          pedidos = await this.obtenerPedidosPorEstadoYFecha(
            ['entregado'], 
            fechaEntrega
          );
          break;
          
        default:
          throw new Error(`Tipo de recordatorio no válido: ${tipoRecordatorio}`);
      }
      
      const resultados = [];
      
      for (const pedido of pedidos) {
        try {
          const resultado = await this.enviarRecordatorioEspecifico(
            pedido, 
            tipoRecordatorio
          );
          resultados.push({
            pedidoId: pedido._id,
            numeroPedido: pedido.numeroPedido,
            cliente: pedido.clienteId?.email || pedido.datosCliente?.email,
            success: resultado.success,
            error: resultado.error
          });
        } catch (error) {
          resultados.push({
            pedidoId: pedido._id,
            numeroPedido: pedido.numeroPedido,
            success: false,
            error: error.message
          });
        }
      }
      
      const exitosos = resultados.filter(r => r.success).length;
      const fallidos = resultados.length - exitosos;
      
      return {
        success: true,
        mensaje: `Notificaciones masivas procesadas: ${exitosos} exitosas, ${fallidos} fallidas`,
        estadisticas: {
          total: resultados.length,
          exitosos,
          fallidos
        },
        resultados
      };
      
    } catch (error) {
      console.error('Error en notificaciones masivas:', error);
      throw new Error(`Error en notificaciones masivas: ${error.message}`);
    }
  }
  
  // Métodos auxiliares
  
  calcularFechaEstimadaEntrega(pedido) {
    const fechaBase = new Date();
    let diasEntrega = 3; // Por defecto 3 días
    
    // Ajustar según método de envío o zona
    if (pedido.metodoEnvio === 'express') {
      diasEntrega = 1;
    } else if (pedido.metodoEnvio === 'estandar') {
      diasEntrega = 5;
    }
    
    fechaBase.setDate(fechaBase.getDate() + diasEntrega);
    return fechaBase;
  }
  
  generarAsuntoNotificacion(estado, numeroPedido) {
    const asuntos = {
      'confirmado': `¡Pedido confirmado! #${numeroPedido}`,
      'en_proceso': `Tu pedido #${numeroPedido} está en proceso`,
      'empacado': `Tu pedido #${numeroPedido} está listo para envío`,
      'enviado': `¡Tu pedido #${numeroPedido} ha sido enviado!`,
      'en_transito': `Tu pedido #${numeroPedido} está en camino`,
      'entregado': `¡Tu pedido #${numeroPedido} ha sido entregado!`,
      'cancelado': `Pedido #${numeroPedido} cancelado`,
      'devuelto': `Devolución de pedido #${numeroPedido} procesada`
    };
    
    return asuntos[estado] || `Actualización de pedido #${numeroPedido}`;
  }
  
  obtenerPlantillaNotificacion(estado) {
    const plantillas = {
      'confirmado': 'pedido-confirmado',
      'en_proceso': 'pedido-en-proceso',
      'empacado': 'pedido-empacado',
      'enviado': 'pedido-enviado',
      'en_transito': 'pedido-en-transito',
      'entregado': 'pedido-entregado',
      'cancelado': 'pedido-cancelado',
      'devuelto': 'pedido-devuelto'
    };
    
    return plantillas[estado] || 'pedido-actualizacion';
  }
  
  formatearEstado(estado) {
    const estados = {
      'pendiente': 'Pendiente',
      'confirmado': 'Confirmado',
      'en_proceso': 'En Proceso',
      'empacado': 'Empacado',
      'enviado': 'Enviado',
      'en_transito': 'En Tránsito',
      'entregado': 'Entregado',
      'cancelado': 'Cancelado',
      'devuelto': 'Devuelto'
    };
    
    return estados[estado] || estado;
  }
  
  generarMensajePersonalizado(estado, pedido) {
    const mensajes = {
      'confirmado': '¡Gracias por tu compra! Hemos confirmado tu pedido y comenzaremos a prepararlo pronto.',
      'en_proceso': 'Estamos preparando cuidadosamente tu pedido con nuestras mejores plantas.',
      'empacado': 'Tu pedido está empacado y listo para ser enviado. ¡Pronto estará en camino!',
      'enviado': 'Tu pedido ha salido de nuestras instalaciones y está en camino hacia ti.',
      'en_transito': 'Tu pedido está viajando hacia su destino. ¡Ya casi llega!',
      'entregado': '¡Esperamos que disfrutes tus nuevas plantas! No olvides seguir nuestros consejos de cuidado.',
      'cancelado': 'Lamentamos que hayas cancelado tu pedido. Si hubo algún problema, estamos aquí para ayudarte.',
      'devuelto': 'Hemos procesado la devolución de tu pedido según nuestras políticas.'
    };
    
    return mensajes[estado] || 'Tu pedido ha sido actualizado.';
  }
  
  async obtenerPedidosPorEstadoYFecha(estados, fechaLimite) {
    return await Pedido.find({
      estado: { $in: estados },
      updatedAt: { $lte: fechaLimite },
      activo: true
    }).populate('clienteId', 'nombre email telefono');
  }
  
  async obtenerPedidosSinSeguimiento() {
    // Lógica para obtener pedidos que no han tenido seguimiento reciente
    const fechaLimite = new Date();
    fechaLimite.setDate(fechaLimite.getDate() - 2);
    
    return await Pedido.find({
      estado: { $in: ['confirmado', 'en_proceso', 'enviado', 'en_transito'] },
      updatedAt: { $lte: fechaLimite },
      activo: true
    }).populate('clienteId', 'nombre email telefono');
  }
  
  async enviarRecordatorioEspecifico(pedido, tipo) {
    const cliente = pedido.clienteId || pedido.datosCliente;
    const email = cliente.email;
    
    if (!email) {
      throw new Error('Email no disponible');
    }
    
    const plantillas = {
      'entrega_pendiente': 'recordatorio-entrega',
      'seguimiento': 'recordatorio-seguimiento',
      'satisfaccion': 'encuesta-satisfaccion'
    };
    
    const asuntos = {
      'entrega_pendiente': `Recordatorio: Tu pedido #${pedido.numeroPedido} está en camino`,
      'seguimiento': `Seguimiento de tu pedido #${pedido.numeroPedido}`,
      'satisfaccion': `¿Cómo fue tu experiencia con el pedido #${pedido.numeroPedido}?`
    };
    
    const datosEmail = {
      destinatario: email,
      asunto: asuntos[tipo],
      plantilla: plantillas[tipo],
      datos: {
        nombreCliente: cliente.nombre || 'Cliente',
        numeroPedido: pedido.numeroPedido,
        fechaPedido: pedido.createdAt,
        totales: pedido.totales,
        urlSeguimiento: `${process.env.FRONTEND_URL}/seguimiento/${pedido._id}`,
        urlEncuesta: `${process.env.FRONTEND_URL}/encuesta/${pedido._id}`
      }
    };
    
    return await emailService.enviarEmail(datosEmail);
  }
}

export default new NotificacionService();