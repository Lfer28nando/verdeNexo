//Importaciones:
import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

//Variables de entorno:
dotenv.config();

/**
 * Configuración del transporter
 * Opción A: service Gmail (más simple)
 * Opción B: SMTP (si usas otro proveedor) -> usa host, port, secure y auth
 */
const transporter = nodemailer.createTransport(
  process.env.SMTP_HOST
    ? {
        host: process.env.SMTP_HOST,
        port: Number(process.env.SMTP_PORT || 587),
        secure: process.env.SMTP_SECURE === "true", // true: 465, false: 587
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASS
        }
      }
    : {
        service: 'gmail',
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASS
        }
      }
);

// Verificación inicial
transporter.verify((error) => {
  if (error) {
    console.error('Error al conectar con el servicio de correo:', error.message);
  } else {
    console.log('Servicio de correo listo para enviar mensajes');
  }
});

/**
 * Función genérica para enviar correo con HTML
 * @param {string|string[]} destinatario - Email o arreglo de emails
 * @param {string} asunto
 * @param {string} mensajeHtml
 * @param {object} [opcionesAdicionales] - Adjuntos, headers, etc.
 */
export function enviarCorreo(destinatario, asunto, mensajeHtml, opcionesAdicionales = {}) {
  const mailOptions = {
    from: `${process.env.PROJECT_NAME || 'No-Reply'} <${process.env.EMAIL_USER}>`,
    to: destinatario,
    subject: asunto,
    html: mensajeHtml,
    ...opcionesAdicionales
  };

  return transporter.sendMail(mailOptions)
    .then(info => {
      console.log('Correo enviado:', info.response);
      return { ok: true, info };
    })
    .catch(error => {
      console.error('Error al enviar el correo:', error.message);
      return { ok: false, error };
    });
}

/**
 * Genera el HTML del correo de bienvenida de VerdeNexo (estilos inline, 600px, CTA bulletproof)
 * @param {object} cfg
 * @param {string} cfg.projectName
 * @param {string} cfg.logoUrl
 * @param {string} cfg.websiteUrl
 * @param {string} cfg.contactEmail
 * @param {string} cfg.ctaUrl
 * @param {string} [cfg.ctaText]
 * @param {string} [cfg.companyName]
 * @param {string} [cfg.contactPhone]
 * @param {object} [cfg.colors] - { lightBg, primary, accent, text, footerBg }
 * @returns {string} HTML completo
 */
export function generarHtmlBienvenida(cfg) {
  const {
    projectName = 'VerdeNexo',
    logoUrl = 'http://localhost:4444/img/logo.png',
    websiteUrl = 'http://localhost:4444',
    contactEmail = 'lquevedo030702@gmail.com',
    ctaUrl = 'http://localhost:4444',
    ctaText = 'Explorar Catálogo',
    companyName = 'VerdeNexo',
    contactPhone = '+57 3161753807',
    colors = {}
  } = cfg || {};

  const palette = {
    lightBg: colors.lightBg || '#F0F9F4',
    primary: colors.primary || '#166534',
    accent: colors.accent || '#22C55E',
    text: colors.text || '#1F2937',
    footerBg: colors.footerBg || '#F9FAFB'
  };

  // HTML listo para Nodemailer
  return `<!doctype html>
<html lang="es">
  <head>
    <meta charset="utf-8">
    <meta name="x-apple-disable-message-reformatting">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Bienvenida a VerdeNexo</title>
    <style>
      @media (max-width: 620px) {
        .container { width: 100% !important; }
        .p-sm-0 { padding: 0 !important; }
        .px-sm-16 { padding-left: 16px !important; padding-right: 16px !important; }
        .py-sm-16 { padding-top: 16px !important; padding-bottom: 16px !important; }
        .h1 { font-size: 24px !important; line-height: 30px !important; }
        .h2 { font-size: 16px !important; line-height: 22px !important; }
        .btn { width: 100% !important; }
      }
    </style>
  </head>
  <body style="margin:0; padding:0; background-color: ${palette.lightBg};">
    <!-- Preheader -->
    <div style="display:none; font-size:1px; color:#fff; line-height:1px; max-height:0; max-width:0; opacity:0; overflow:hidden;">
      ¡Bienvenido a VerdeNexo! Verde que inspira, calidad que crece.
    </div>

    <!-- Wrapper -->
    <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background-color: ${palette.lightBg};">
      <tr>
        <td align="center" style="padding: 24px;">
          <!-- Container -->
          <table role="presentation" class="container" cellpadding="0" cellspacing="0" width="600" style="width:600px; max-width:600px; background:#FFFFFF; border-radius:12px; overflow:hidden; box-shadow: 0 2px 10px rgba(0,0,0,0.04);">
            <!-- Header con logo -->
            <tr>
              <td align="center" style="padding: 32px 24px 16px 24px; background:#FFFFFF;">
                <img src="${logoUrl}" width="150" alt="VerdeNexo logo" style="display:block; border:0; outline:none; text-decoration:none; width:150px; height:auto;"/>
              </td>
            </tr>

            <!-- Banner -->
            <tr>
              <td align="center" style="background: ${palette.primary}; padding: 32px 24px;">
                <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
                  <tr>
                    <td align="center" style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, Arial, sans-serif; color:#FFFFFF; text-align:center;">
                      <div class="h1" style="font-size:32px; line-height:38px; font-weight:700; margin:0; letter-spacing: -0.5px;">
                        Bienvenido a VerdeNexo
                      </div>
                      <div class="h2" style="font-size:18px; line-height:26px; font-weight:400; margin:12px 0 0 0; opacity:0.95;">
                        Verde que inspira, calidad que crece
                      </div>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>

            <!-- Cuerpo -->
            <tr>
              <td class="px-sm-16 py-sm-16" style="padding: 32px 32px 16px 32px; background:#FFFFFF; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, Arial, sans-serif; color: ${palette.text};">
                <p style="margin:0 0 16px 0; font-size:16px; line-height:26px;">
                  ¡Gracias por unirte a <strong>VerdeNexo</strong>! Nos emociona tenerte como parte de nuestra comunidad de amantes de las plantas.
                </p>
                <p style="margin:0 0 16px 0; font-size:16px; line-height:26px;">
                  Somos una plataforma digital especializada en plantas ubicada en Medellín, dedicada a conectarte con la naturaleza desde la comodidad de tu hogar. En nuestro catálogo encontrarás:
                </p>
                <ul style="padding-left:20px; margin:0 0 20px 0; font-size:15px; line-height:24px;">
                  <li style="margin-bottom: 8px;">Plantas de interior y exterior de la más alta calidad</li>
                  <li style="margin-bottom: 8px;">Variedad única seleccionada cuidadosamente</li>
                  <li style="margin-bottom: 8px;">Asesoría personalizada para el cuidado de tus plantas</li>
                  <li style="margin-bottom: 8px;">Entrega segura en Medellín y área metropolitana</li>
                </ul>
                <p style="margin:0 0 20px 0; font-size:15px; line-height:24px;">
                  Estamos aquí para acompañarte en tu viaje hacia un espacio más verde y lleno de vida.
                </p>
              </td>
            </tr>

            <!-- Botón CTA (bulletproof) -->
            <tr>
              <td align="center" style="padding: 8px 32px 32px 32px; background:#FFFFFF;">
                <!--[if mso]>
                <v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" href="${ctaUrl}" style="height:52px; v-text-anchor:middle; width:260px;" arcsize="12%" fillcolor="${palette.accent}" stroke="f">
                  <w:anchorlock/>
                  <center style="color:#FFFFFF; font-family: Arial, sans-serif; font-size:16px; font-weight:bold;">
                    ${ctaText}
                  </center>
                </v:roundrect>
                <![endif]-->
                <!--[if !mso]><!-- -->
                <a href="${ctaUrl}" class="btn"
                   style="display:inline-block; background: ${palette.accent}; color:#FFFFFF; text-decoration:none; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, Arial, sans-serif; font-size:16px; font-weight:700; line-height:52px; border-radius:8px; padding:0 32px; min-width:240px; text-align:center; transition: background-color 0.3s ease;">
                   ${ctaText}
                </a>
                <!--<![endif]-->
              </td>
            </tr>

            <!-- Separador -->
            <tr>
              <td style="padding:0 32px;">
                <hr style="border:none; border-top:1px solid #E5E7EB; margin:0;">
              </td>
            </tr>

            <!-- Contacto / Soporte -->
            <tr>
              <td class="px-sm-16" style="padding: 24px 32px 16px 32px; background:#FFFFFF; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, Arial, sans-serif; color: ${palette.text};">
                <p style="margin:0; font-size:14px; line-height:22px; color:#374151; text-align: center;">
                  ¿Tienes preguntas sobre nuestras plantas? <br>
                  Escríbenos por WhatsApp al <a href="https://wa.me/573161753807" style="color: ${palette.primary}; text-decoration:underline; font-weight: 600;">${contactPhone}</a>
                  <br>o envíanos un correo a <a href="mailto:${contactEmail}" style="color: ${palette.primary}; text-decoration:underline;">${contactEmail}</a>
                </p>
              </td>
            </tr>

            <!-- Footer -->
            <tr>
              <td style="background: ${palette.footerBg}; padding: 24px 24px; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, Arial, sans-serif; text-align:center;">
                <p style="margin:0 0 8px 0; font-size:14px; line-height:20px; color:#6B7280; font-weight: 600;">
                  ${companyName}
                </p>
                <p style="margin:0 0 12px 0; font-size:12px; line-height:18px; color:#6B7280;">
                  Plataforma digital de plantas · Medellín, Colombia<br>
                  WhatsApp: <a href="https://wa.me/573161753807" style="color: ${palette.primary}; text-decoration:none;">${contactPhone}</a>
                </p>
                <p style="margin:0; font-size:11px; line-height:18px; color:#9CA3AF;">
                  Transformamos espacios con vida verde desde 2024
                </p>
              </td>
            </tr>
          </table>
          <!-- /Container -->

          <!-- Nota legal mínima -->
          <table role="presentation" cellpadding="0" cellspacing="0" width="600" class="container" style="width:600px; max-width:600px; margin-top:16px;">
            <tr>
              <td style="text-align:center; padding:12px 16px; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, Arial, sans-serif; color:#9CA3AF; font-size:11px; line-height:16px;">
                Si no reconoces este registro, contáctanos por WhatsApp al <a href="https://wa.me/573161753807" style="color:#6B7280; text-decoration:underline;">${contactPhone}</a>
              </td>
            </tr>
          </table>

        </td>
      </tr>
    </table>
  </body>
</html>`;
}

/**
 * Envía un correo de bienvenida usando la plantilla anterior.
 * @param {string|string[]} destinatario
 * @param {object} cfg - Mismos campos que generarHtmlBienvenida
 */
export function enviarCorreoBienvenida(destinatario, cfg = {}) {
  const html = generarHtmlBienvenida({
    projectName: cfg.projectName || process.env.PROJECT_NAME || 'VerdeNexo',
    logoUrl: cfg.logoUrl || process.env.LOGO_URL || 'http://localhost:4444/img/logo.png',
    websiteUrl: cfg.websiteUrl || process.env.WEBSITE_URL || 'http://localhost:4444',
    contactEmail: cfg.contactEmail || process.env.CONTACT_EMAIL || process.env.EMAIL_USER,
    ctaUrl: cfg.ctaUrl || process.env.CTA_URL || 'http://localhost:4444',
    ctaText: cfg.ctaText || 'Explorar Catálogo',
    companyName: cfg.companyName || process.env.COMPANY_NAME || 'VerdeNexo',
    contactPhone: cfg.contactPhone || process.env.CONTACT_PHONE || '+57 3161753807',
    colors: cfg.colors || {
      lightBg: process.env.COLOR_LIGHT_BG || '#F0F9F4',
      primary: process.env.COLOR_PRIMARY || '#166534',
      accent: process.env.COLOR_ACCENT || '#22C55E',
      text: process.env.COLOR_TEXT || '#1F2937',
      footerBg: process.env.COLOR_FOOTER_BG || '#F9FAFB'
    }
  });

  const asunto = `¡Bienvenido a ${cfg.projectName || process.env.PROJECT_NAME || 'VerdeNexo'}!`;
  return enviarCorreo(destinatario, asunto, html);
}

export default enviarCorreo;
