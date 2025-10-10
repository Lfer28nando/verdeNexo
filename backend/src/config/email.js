import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config({ path: './src/.env' });

// Crear el transporter de nodemailer
export const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: parseInt(process.env.EMAIL_PORT),
  secure: false, // true para 465, false para otros puertos
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// Función para enviar email con código de reset
export const sendPasswordResetEmail = async (email, resetCode) => {
  try {
    const mailOptions = {
      from: process.env.EMAIL_FROM,
      to: email,
      subject: 'VerdeNexo- Código de Verificación - Restablecer Contraseña',
      html: `
        <!DOCTYPE html>
        <html lang="es">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Restablecer Contraseña</title>
        </head>
        <body style="margin: 0; padding: 0; background-color: #f8fdf9; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;">
          <table cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color: #f8fdf9; min-height: 100vh;">
            <tr>
              <td align="center" style="padding: 40px 20px;">
                <!-- Container Principal -->
                <table cellpadding="0" cellspacing="0" border="0" width="600" style="background-color: #ffffff; border-radius: 12px; box-shadow: 0 4px 20px rgba(101, 163, 113, 0.12); overflow: hidden; max-width: 600px;">
                  
                  <!-- Header con gradiente verde -->
                  <tr>
                    <td style="background: linear-gradient(135deg, #497458ff 0%, #65a373 50%, #4ade80 100%); padding: 50px 30px; text-align: center;">
                      <h1 style="margin: 0 0 15px; color: #1f2937; font-size: 42px; font-weight: 700; letter-spacing: -1px; text-shadow: 0 2px 4px rgba(0,0,0,0.3);">
                        VerdeNexo
                      </h1>
                      <h2 style="margin: 0; color: #000000ff; font-size: 24px; font-weight: 500; letter-spacing: -0.3px;">
                        Código de Verificación
                      </h2>
                      <p style="margin: 15px 0 0; color: #000000ff; font-size: 16px; font-weight: 500;">
                        🌱 Restablece tu contraseña de forma segura
                      </p>
                    </td>
                  </tr>
                  
                  <!-- Contenido Principal -->
                  <tr>
                    <td style="padding: 40px 30px;">
                      <div style="text-align: center; margin-bottom: 30px;">
                        <h2 style="margin: 0 0 15px; color: #111827; font-size: 28px; font-weight: 600;">
                          ¡Hola! 👋
                        </h2>
                        <p style="margin: 0; color: #374151; font-size: 16px; line-height: 1.6; font-weight: 500;">
                          Has solicitado restablecer tu contraseña. Usa el siguiente código de verificación para continuar:
                        </p>
                      </div>
                      
                      <!-- Código de Verificación -->
                      <div style="background: linear-gradient(135deg, #86efac 0%, #65a373 50%, #4ade80 100%); padding: 30px; border-radius: 12px; text-align: center; margin: 30px 0; box-shadow: 0 4px 15px rgba(101, 163, 115, 0.25);">
                        <p style="margin: 0 0 10px; color: #111827; font-size: 14px; font-weight: 600; text-transform: uppercase; letter-spacing: 1px;">
                          Tu código es:
                        </p>
                        <div style="background-color: rgba(255,255,255,0.95); padding: 20px; border-radius: 8px; margin: 15px 0; border: 2px solid rgba(17, 24, 39, 0.1);">
                          <span style="font-size: 36px; font-weight: 700; color: #111827; letter-spacing: 8px; font-family: 'Courier New', monospace;">
                            ${resetCode}
                          </span>
                        </div>
                        <p style="margin: 10px 0 0; color: #1f2937; font-size: 13px; font-weight: 500;">
                          ⏰ Este código expira en 15 minutos
                        </p>
                      </div>
                      
                      <!-- Instrucciones -->
                      <div style="background-color: #f9fdfb; padding: 25px; border-radius: 8px; border-left: 4px solid #65a373; border: 1px solid #e5f3e8;">
                        <h3 style="margin: 0 0 15px; color: #111827; font-size: 18px; font-weight: 600;">
                          📋 Instrucciones:
                        </h3>
                        <ol style="margin: 0; padding-left: 20px; color: #374151; line-height: 1.6; font-weight: 500;">
                          <li style="margin-bottom: 8px;">Copia el código de arriba</li>
                          <li style="margin-bottom: 8px;">Pégalo en el formulario de recuperación</li>
                          <li style="margin-bottom: 8px;">Ingresa tu nueva contraseña</li>
                          <li>¡Listo! Ya puedes acceder con tu nueva contraseña</li>
                        </ol>
                      </div>
                    </td>
                  </tr>
                  
                  <!-- Footer -->
                  <tr>
                    <td style="background-color: #fafbfb; padding: 30px; text-align: center; border-top: 1px solid #e5f3e8;">
                      <div style="margin-bottom: 20px;">
                        <p style="margin: 0 0 10px; color: #111827; font-size: 14px; font-weight: 600;">
                          🔒 <strong>Medidas de Seguridad:</strong>
                        </p>
                        <p style="margin: 0; color: #4b5563; font-size: 13px; line-height: 1.5; font-weight: 500;">
                          • Si no solicitaste este cambio, ignora este email<br>
                          • Nunca compartas este código con nadie<br>
                          • El código expira automáticamente en 15 minutos
                        </p>
                      </div>
                      
                      <div style="border-top: 1px solid #e5f3e8; padding-top: 20px;">
                        <p style="margin: 0; color: #6b7280; font-size: 12px; font-weight: 500;">
                          © 2025 VerdeNexo. Todos los derechos reservados.<br>
                          Este es un email automático, no responder.
                        </p>
                      </div>
                    </td>
                  </tr>
                  
                </table>
              </td>
            </tr>
          </table>
        </body>
        </html>
      `,
    };

    const result = await transporter.sendMail(mailOptions);
    return result;
  } catch (error) {
    console.error('Error enviando email:', error);
    throw error;
  }
};

// Función para enviar email de verificación de cuenta
export const sendEmailVerificationCode = async (email, verificationCode, username) => {
  try {
    const mailOptions = {
      from: process.env.EMAIL_FROM,
      to: email,
      subject: 'VerdeNexo - Verifica tu Cuenta - Código de Activación',
      html: `
        <!DOCTYPE html>
        <html lang="es">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Verificar Cuenta</title>
        </head>
        <body style="margin: 0; padding: 0; background-color: #f8fdf9; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;">
          <table cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color: #f8fdf9; min-height: 100vh;">
            <tr>
              <td align="center" style="padding: 40px 20px;">
                <!-- Container Principal -->
                <table cellpadding="0" cellspacing="0" border="0" width="600" style="background-color: #ffffff; border-radius: 12px; box-shadow: 0 4px 20px rgba(101, 163, 113, 0.12); overflow: hidden; max-width: 600px;">
                  
                  <!-- Header con gradiente verde -->
                  <tr>
                    <td style="background: linear-gradient(135deg, #497458ff 0%, #65a373 50%, #4ade80 100%); padding: 50px 30px; text-align: center;">
                      <h1 style="margin: 0 0 15px; color: #1f2937; font-size: 42px; font-weight: 700; letter-spacing: -1px; text-shadow: 0 2px 4px rgba(0,0,0,0.3);">
                        VerdeNexo
                      </h1>
                      <h2 style="margin: 0; color: #000000ff; font-size: 24px; font-weight: 500; letter-spacing: -0.3px;">
                        Activa tu Cuenta
                      </h2>
                      <p style="margin: 15px 0 0; color: #000000ff; font-size: 16px; font-weight: 500;">
                        🌱 Bienvenido a nuestra comunidad verde
                      </p>
                    </td>
                  </tr>
                  
                  <!-- Contenido Principal -->
                  <tr>
                    <td style="padding: 40px 30px;">
                      <div style="text-align: center; margin-bottom: 30px;">
                        <h2 style="margin: 0 0 15px; color: #111827; font-size: 28px; font-weight: 600;">
                          ¡Hola ${username}! 🎉
                        </h2>
                        <p style="margin: 0; color: #374151; font-size: 16px; line-height: 1.6; font-weight: 500;">
                          ¡Gracias por registrarte en VerdeNexo! Para activar tu cuenta y comenzar a disfrutar de nuestros servicios, usa el siguiente código de verificación:
                        </p>
                      </div>
                      
                      <!-- Código de Verificación -->
                      <div style="background: linear-gradient(135deg, #86efac 0%, #65a373 50%, #4ade80 100%); padding: 30px; border-radius: 12px; text-align: center; margin: 30px 0; box-shadow: 0 4px 15px rgba(101, 163, 115, 0.25);">
                        <p style="margin: 0 0 10px; color: #111827; font-size: 14px; font-weight: 600; text-transform: uppercase; letter-spacing: 1px;">
                          Tu código de activación es:
                        </p>
                        <div style="background-color: rgba(255,255,255,0.95); padding: 20px; border-radius: 8px; margin: 15px 0; border: 2px solid rgba(17, 24, 39, 0.1);">
                          <span style="font-size: 36px; font-weight: 700; color: #111827; letter-spacing: 8px; font-family: 'Courier New', monospace;">
                            ${verificationCode}
                          </span>
                        </div>
                        <p style="margin: 10px 0 0; color: #1f2937; font-size: 13px; font-weight: 500;">
                          ⏰ Este código expira en 24 horas
                        </p>
                      </div>
                      
                      <!-- Instrucciones -->
                      <div style="background-color: #f9fdfb; padding: 25px; border-radius: 8px; border-left: 4px solid #65a373; border: 1px solid #e5f3e8;">
                        <h3 style="margin: 0 0 15px; color: #111827; font-size: 18px; font-weight: 600;">
                          📋 Pasos para activar tu cuenta:
                        </h3>
                        <ol style="margin: 0; padding-left: 20px; color: #374151; line-height: 1.6; font-weight: 500;">
                          <li style="margin-bottom: 8px;">Copia el código de arriba</li>
                          <li style="margin-bottom: 8px;">Ve al formulario de verificación en la app</li>
                          <li style="margin-bottom: 8px;">Pega el código y confirma</li>
                          <li>¡Listo! Tu cuenta estará activada y podrás iniciar sesión</li>
                        </ol>
                      </div>
                      
                      <!-- Beneficios -->
                      <div style="background-color: #ecfdf5; padding: 25px; border-radius: 8px; margin-top: 25px; border: 1px solid #a7f3d0;">
                        <h3 style="margin: 0 0 15px; color: #111827; font-size: 18px; font-weight: 600;">
                          🌿 ¿Qué puedes hacer con tu cuenta activada?
                        </h3>
                        <ul style="margin: 0; padding-left: 20px; color: #374151; line-height: 1.6; font-weight: 500;">
                          <li style="margin-bottom: 8px;">Acceder a todas las funcionalidades</li>
                          <li style="margin-bottom: 8px;">Personalizar tu perfil</li>
                          <li style="margin-bottom: 8px;">Recibir notificaciones importantes</li>
                          <li>Disfrutar de una experiencia completa</li>
                        </ul>
                      </div>
                    </td>
                  </tr>
                  
                  <!-- Footer -->
                  <tr>
                    <td style="background-color: #fafbfb; padding: 30px; text-align: center; border-top: 1px solid #e5f3e8;">
                      <div style="margin-bottom: 20px;">
                        <p style="margin: 0 0 10px; color: #111827; font-size: 14px; font-weight: 600;">
                          🔒 <strong>Medidas de Seguridad:</strong>
                        </p>
                        <p style="margin: 0; color: #4b5563; font-size: 13px; line-height: 1.5; font-weight: 500;">
                          • Si no te registraste en VerdeNexo, ignora este email<br>
                          • Nunca compartas este código con nadie<br>
                          • El código expira automáticamente en 24 horas
                        </p>
                      </div>
                      
                      <div style="border-top: 1px solid #e5f3e8; padding-top: 20px;">
                        <p style="margin: 0; color: #6b7280; font-size: 12px; font-weight: 500;">
                          © 2025 VerdeNexo. Todos los derechos reservados.<br>
                          Este es un email automático, no responder.
                        </p>
                      </div>
                    </td>
                  </tr>
                  
                </table>
              </td>
            </tr>
          </table>
        </body>
        </html>
      `,
    };

    const result = await transporter.sendMail(mailOptions);
    return result;
  } catch (error) {
    console.error('Error enviando email de verificación:', error);
    throw error;
  }
};