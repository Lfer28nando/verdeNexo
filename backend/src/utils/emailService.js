// utils/emailService.js
import { transporter } from '../config/email.js';

/**
 * Plantilla HTML para email de confirmación de pedido
 * @param {Object} pedido - Objeto del pedido
 * @returns {string} HTML del email
 */
const generarPlantillaConfirmacionPedido = (pedido) => {
  const itemsHtml = pedido.items.map(item => `
    <tr>
      <td style="padding: 10px; border-bottom: 1px solid #eee;">
        ${item.nombreProducto}
        ${item.variante ? `<br><small style="color: #666;">${item.variante}</small>` : ''}
      </td>
      <td style="padding: 10px; text-align: center; border-bottom: 1px solid #eee;">
        ${item.cantidad}
      </td>
      <td style="padding: 10px; text-align: right; border-bottom: 1px solid #eee;">
        $${item.precioUnitario.toLocaleString('es-CO')}
      </td>
      <td style="padding: 10px; text-align: right; border-bottom: 1px solid #eee;">
        $${item.subtotal.toLocaleString('es-CO')}
      </td>
    </tr>
  `).join('');

  const cuponesHtml = pedido.cupones.length > 0 ? `
    <tr>
      <td colspan="3" style="padding: 10px; text-align: right; font-weight: bold;">
        Descuentos aplicados:
      </td>
      <td style="padding: 10px; text-align: right; color: #28a745;">
        -$${pedido.cupones.reduce((total, cupon) => total + cupon.descuentoAplicado, 0).toLocaleString('es-CO')}
      </td>
    </tr>
  ` : '';

  const envioHtml = pedido.envio.costoEnvio > 0 ? `
    <tr>
      <td colspan="3" style="padding: 10px; text-align: right; font-weight: bold;">
        Costo de envío:
      </td>
      <td style="padding: 10px; text-align: right;">
        $${pedido.envio.costoEnvio.toLocaleString('es-CO')}
      </td>
    </tr>
  ` : '';

  const mayoristaHtml = pedido.mayorista.esPedidoMayorista ? `
    <div style="background-color: #f8f9fa; padding: 15px; margin: 20px 0; border-radius: 5px;">
      <h3 style="color: #495057; margin-top: 0;">Información Mayorista</h3>
      <p><strong>Empresa:</strong> ${pedido.mayorista.informacionEmpresa.nombreEmpresa || 'N/A'}</p>
      ${pedido.mayorista.condicionesEspeciales.descuentoMayorista ?
        `<p><strong>Descuento especial:</strong> ${pedido.mayorista.condicionesEspeciales.descuentoMayorista}%</p>` : ''}
    </div>
  ` : '';

  return `
    <!DOCTYPE html>
    <html lang="es">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Confirmación de Pedido - ${pedido.numeroPedido}</title>
    </head>
    <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background-color: #28a745; color: white; padding: 20px; text-align: center; border-radius: 5px 5px 0 0;">
        <h1 style="margin: 0;">¡Pedido Confirmado!</h1>
        <p style="margin: 5px 0 0 0;">Número de pedido: ${pedido.numeroPedido}</p>
      </div>

      <div style="background-color: white; border: 1px solid #dee2e6; border-radius: 0 0 5px 5px; padding: 20px;">
        <h2 style="color: #495057; border-bottom: 2px solid #28a745; padding-bottom: 10px;">
          Detalles del Pedido
        </h2>

        <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
          <thead>
            <tr style="background-color: #f8f9fa;">
              <th style="padding: 10px; text-align: left; border-bottom: 2px solid #dee2e6;">Producto</th>
              <th style="padding: 10px; text-align: center; border-bottom: 2px solid #dee2e6;">Cant.</th>
              <th style="padding: 10px; text-align: right; border-bottom: 2px solid #dee2e6;">Precio</th>
              <th style="padding: 10px; text-align: right; border-bottom: 2px solid #dee2e6;">Subtotal</th>
            </tr>
          </thead>
          <tbody>
            ${itemsHtml}
            ${cuponesHtml}
            ${envioHtml}
            <tr style="background-color: #f8f9fa; font-weight: bold;">
              <td colspan="3" style="padding: 15px; text-align: right; font-size: 18px;">
                Total a pagar:
              </td>
              <td style="padding: 15px; text-align: right; font-size: 18px; color: #28a745;">
                $${pedido.totales.total.toLocaleString('es-CO')}
              </td>
            </tr>
          </tbody>
        </table>

        <div style="display: flex; justify-content: space-between; margin: 20px 0;">
          <div style="flex: 1; margin-right: 20px;">
            <h3 style="color: #495057; margin-top: 0;">Información de Facturación</h3>
            <p><strong>Nombre:</strong> ${pedido.facturacion.nombreCompleto}</p>
            <p><strong>Documento:</strong> ${pedido.facturacion.tipoDocumento} ${pedido.facturacion.numeroDocumento}</p>
            <p><strong>Email:</strong> ${pedido.facturacion.email}</p>
            <p><strong>Teléfono:</strong> ${pedido.facturacion.telefono}</p>
          </div>

          <div style="flex: 1;">
            <h3 style="color: #495057; margin-top: 0;">Información de Envío</h3>
            <p><strong>Destinatario:</strong> ${pedido.envio.nombreDestinatario}</p>
            <p><strong>Dirección:</strong> ${pedido.envio.direccionEnvio.calle} ${pedido.envio.direccionEnvio.numero}, ${pedido.envio.direccionEnvio.barrio}, ${pedido.envio.direccionEnvio.ciudad}</p>
            <p><strong>Teléfono:</strong> ${pedido.envio.telefonoDestinatario}</p>
            ${pedido.envio.fechaEntregaEstimada ?
              `<p><strong>Fecha estimada:</strong> ${new Date(pedido.envio.fechaEntregaEstimada).toLocaleDateString('es-CO')}</p>` : ''}
          </div>
        </div>

        <div style="margin: 20px 0;">
          <h3 style="color: #495057; margin-top: 0;">Información de Pago</h3>
          <p><strong>Método:</strong> ${pedido.pago.metodoPago.replace('_', ' ').toUpperCase()}</p>
          <p><strong>Estado:</strong> ${pedido.pago.estadoPago.toUpperCase()}</p>
          <p><strong>Monto total:</strong> $${pedido.totales.total.toLocaleString('es-CO')}</p>
        </div>

        ${mayoristaHtml}

        <div style="background-color: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; margin: 20px 0; border-radius: 5px;">
          <h3 style="color: #856404; margin-top: 0;">¿Necesitas ayuda?</h3>
          <p style="margin: 5px 0;">Si tienes alguna pregunta sobre tu pedido, puedes contactarnos:</p>
          <ul style="margin: 5px 0; padding-left: 20px;">
            <li>Email: soporte@verdenexo.com</li>
            <li>Teléfono: +57 300 123 4567</li>
            <li>WhatsApp: +57 301 234 5678</li>
          </ul>
        </div>

        <div style="text-align: center; margin: 30px 0; padding-top: 20px; border-top: 1px solid #dee2e6;">
          <p style="color: #6c757d; font-size: 14px;">
            Gracias por tu compra en VerdeNexo.<br>
            Tu pedido está siendo procesado y te mantendremos informado de su estado.
          </p>
          <p style="color: #6c757d; font-size: 12px;">
            Este es un email automático, por favor no respondas a esta dirección.
          </p>
        </div>
      </div>
    </body>
    </html>
  `;
};

/**
 * Enviar email de confirmación de pedido
 * @param {Object} pedido - Objeto del pedido
 * @returns {Promise<void>}
 */
export const sendOrderConfirmationEmail = async (pedido) => {
  try {
    const mailOptions = {
      from: process.env.EMAIL_FROM || `"VerdeNexo" <${process.env.EMAIL_USER}>`,
      to: pedido.facturacion.email,
      subject: `Confirmación de Pedido - ${pedido.numeroPedido}`,
      html: generarPlantillaConfirmacionPedido(pedido)
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('Email de confirmación enviado:', info.messageId);

    return info;
  } catch (error) {
    console.error('Error enviando email de confirmación:', error);
    throw new Error(`Error enviando email: ${error.message}`);
  }
};

/**
 * Enviar email de actualización de estado de pedido
 * @param {Object} pedido - Objeto del pedido
 * @param {string} nuevoEstado - Nuevo estado del pedido
 * @param {string} mensajeAdicional - Mensaje adicional (opcional)
 * @returns {Promise<void>}
 */
export const sendOrderStatusUpdateEmail = async (pedido, nuevoEstado, mensajeAdicional = '') => {
  try {
    const estadosTraduccion = {
      'pagado': 'Pagado',
      'en_preparacion': 'En Preparación',
      'enviado': 'Enviado',
      'entregado': 'Entregado',
      'cancelado': 'Cancelado'
    };

    const estadoTraducido = estadosTraduccion[nuevoEstado] || nuevoEstado;

    const mailOptions = {
      from: process.env.EMAIL_FROM || `"VerdeNexo" <${process.env.EMAIL_USER}>`,
      to: pedido.facturacion.email,
      subject: `Actualización de Pedido - ${pedido.numeroPedido}`,
      html: `
        <!DOCTYPE html>
        <html lang="es">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Actualización de Pedido - ${pedido.numeroPedido}</title>
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background-color: #17a2b8; color: white; padding: 20px; text-align: center; border-radius: 5px 5px 0 0;">
            <h1 style="margin: 0;">Actualización de Pedido</h1>
            <p style="margin: 5px 0 0 0;">Número de pedido: ${pedido.numeroPedido}</p>
          </div>

          <div style="background-color: white; border: 1px solid #dee2e6; border-radius: 0 0 5px 5px; padding: 20px;">
            <h2 style="color: #495057;">Tu pedido ha cambiado de estado</h2>

            <div style="background-color: #f8f9fa; padding: 15px; margin: 20px 0; border-radius: 5px; text-align: center;">
              <h3 style="color: #17a2b8; margin: 0;">Estado: ${estadoTraducido}</h3>
            </div>

            ${mensajeAdicional ? `
              <div style="background-color: #d1ecf1; border: 1px solid #bee5eb; padding: 15px; margin: 20px 0; border-radius: 5px;">
                <p style="margin: 0;"><strong>Información adicional:</strong></p>
                <p style="margin: 10px 0 0 0;">${mensajeAdicional}</p>
              </div>
            ` : ''}

            <p>Para ver los detalles completos de tu pedido, puedes acceder a tu cuenta en nuestro sitio web.</p>

            <div style="text-align: center; margin: 30px 0;">
              <a href="${process.env.FRONTEND_URL || 'https://verdenexo.com'}/pedidos/${pedido._id}"
                 style="background-color: #28a745; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block;">
                Ver Detalles del Pedido
              </a>
            </div>

            <div style="background-color: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; margin: 20px 0; border-radius: 5px;">
              <h3 style="color: #856404; margin-top: 0;">¿Necesitas ayuda?</h3>
              <p style="margin: 5px 0;">Si tienes alguna pregunta sobre tu pedido, puedes contactarnos:</p>
              <ul style="margin: 5px 0; padding-left: 20px;">
                <li>Email: soporte@verdenexo.com</li>
                <li>Teléfono: +57 300 123 4567</li>
                <li>WhatsApp: +57 301 234 5678</li>
              </ul>
            </div>

            <div style="text-align: center; margin: 30px 0; padding-top: 20px; border-top: 1px solid #dee2e6;">
              <p style="color: #6c757d; font-size: 14px;">
                Gracias por elegir VerdeNexo.<br>
                Te mantendremos informado de cualquier cambio en tu pedido.
              </p>
            </div>
          </div>
        </body>
        </html>
      `
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('Email de actualización enviado:', info.messageId);

    return info;
  } catch (error) {
    console.error('Error enviando email de actualización:', error);
    throw new Error(`Error enviando email: ${error.message}`);
  }
};

/**
 * Verificar conexión con el servidor de email
 * @returns {Promise<boolean>}
 */
export const verifyEmailConnection = async () => {
  try {
    await transporter.verify();
    console.log('Conexión con servidor de email verificada');
    return true;
  } catch (error) {
    console.error('Error verificando conexión de email:', error);
    return false;
  }
};