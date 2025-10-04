import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Generador de facturas PDF
 * Nota: Esta es una implementación básica simulada.
 * En producción se debería usar una librería como puppeteer, jsPDF o similar.
 */
class FacturaPDFGenerator {
  
  constructor() {
    this.baseDir = path.join(__dirname, '../../uploads/facturas');
    this.ensureDirectoryExists();
  }
  
  /**
   * Asegura que el directorio de facturas existe
   */
  ensureDirectoryExists() {
    if (!fs.existsSync(this.baseDir)) {
      fs.mkdirSync(this.baseDir, { recursive: true });
    }
  }
  
  /**
   * Genera un PDF de factura
   * @param {Object} factura - Datos de la factura
   * @returns {Promise<string>} - Ruta del archivo PDF generado
   */
  async generarFacturaPDF(factura) {
    try {
      const nombreArchivo = `Factura-${factura.numeroFactura}.pdf`;
      const rutaArchivo = path.join(this.baseDir, nombreArchivo);
      
      // En una implementación real, aquí se generaría el PDF
      // Por ahora, creamos un archivo simulado con el contenido de la factura
      const contenidoHTML = this.generarHTML(factura);
      
      // Simulamos la generación del PDF escribiendo un archivo HTML
      // En producción, aquí se usaría una librería para convertir HTML a PDF
      fs.writeFileSync(rutaArchivo.replace('.pdf', '.html'), contenidoHTML);
      
      // Simulamos que se creó el PDF
      fs.writeFileSync(rutaArchivo, `PDF simulado para factura ${factura.numeroFactura}`);
      
      console.log(`✅ Factura PDF generada: ${rutaArchivo}`);
      
      return `/uploads/facturas/${nombreArchivo}`;
      
    } catch (error) {
      console.error('Error al generar PDF de factura:', error);
      throw new Error(`Error al generar PDF: ${error.message}`);
    }
  }
  
  /**
   * Genera el HTML de la factura
   * @param {Object} factura - Datos de la factura
   * @returns {string} - HTML de la factura
   */
  generarHTML(factura) {
    const fechaFormateada = new Date(factura.fechaGeneracion).toLocaleDateString('es-CO');
    const fechaVencimiento = new Date(factura.fechaVencimiento).toLocaleDateString('es-CO');
    
    return `
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Factura ${factura.numeroFactura}</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            margin: 0;
            padding: 20px;
            color: #333;
        }
        .header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            border-bottom: 2px solid #4CAF50;
            padding-bottom: 20px;
            margin-bottom: 30px;
        }
        .logo {
            font-size: 24px;
            font-weight: bold;
            color: #4CAF50;
        }
        .factura-info {
            text-align: right;
        }
        .factura-numero {
            font-size: 20px;
            font-weight: bold;
            color: #4CAF50;
        }
        .empresa-info, .cliente-info {
            margin-bottom: 20px;
        }
        .info-box {
            background-color: #f9f9f9;
            padding: 15px;
            border-radius: 5px;
            margin-bottom: 20px;
        }
        .tabla-productos {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 20px;
        }
        .tabla-productos th, .tabla-productos td {
            border: 1px solid #ddd;
            padding: 10px;
            text-align: left;
        }
        .tabla-productos th {
            background-color: #4CAF50;
            color: white;
        }
        .totales {
            text-align: right;
            margin-top: 20px;
        }
        .total-row {
            display: flex;
            justify-content: space-between;
            margin-bottom: 5px;
        }
        .total-final {
            font-size: 18px;
            font-weight: bold;
            border-top: 2px solid #4CAF50;
            padding-top: 10px;
        }
        .footer {
            margin-top: 40px;
            text-align: center;
            font-size: 12px;
            color: #666;
        }
    </style>
</head>
<body>
    <div class="header">
        <div class="logo">VerdeNexo</div>
        <div class="factura-info">
            <div class="factura-numero">FACTURA ${factura.numeroFactura}</div>
            <div>Fecha: ${fechaFormateada}</div>
            <div>Vencimiento: ${fechaVencimiento}</div>
        </div>
    </div>

    <div class="empresa-info info-box">
        <h3>Información de la Empresa</h3>
        <p><strong>${factura.datosEmpresa.nombre}</strong></p>
        <p>NIT: ${factura.datosEmpresa.nit}</p>
        <p>Dirección: ${factura.datosEmpresa.direccion}</p>
        <p>Teléfono: ${factura.datosEmpresa.telefono}</p>
        <p>Email: ${factura.datosEmpresa.email}</p>
    </div>

    <div class="cliente-info info-box">
        <h3>Información del Cliente</h3>
        <p><strong>${factura.datosCliente.nombre}</strong></p>
        <p>${factura.datosCliente.tipoDocumento}: ${factura.datosCliente.numeroDocumento}</p>
        <p>Email: ${factura.datosCliente.email}</p>
        <p>Teléfono: ${factura.datosCliente.telefono}</p>
        <p>Dirección: ${factura.datosCliente.direccion.calle}, ${factura.datosCliente.direccion.ciudad}, ${factura.datosCliente.direccion.departamento}</p>
    </div>

    <table class="tabla-productos">
        <thead>
            <tr>
                <th>Producto</th>
                <th>Cantidad</th>
                <th>Precio Unitario</th>
                <th>Descuento</th>
                <th>IVA (%)</th>
                <th>Subtotal</th>
            </tr>
        </thead>
        <tbody>
            ${factura.detalleProductos.map(item => `
                <tr>
                    <td>${item.nombre}</td>
                    <td>${item.cantidad}</td>
                    <td>$${item.precioUnitario.toLocaleString('es-CO')}</td>
                    <td>$${item.descuento.toLocaleString('es-CO')}</td>
                    <td>${item.iva.porcentaje}%</td>
                    <td>$${item.subtotal.toLocaleString('es-CO')}</td>
                </tr>
            `).join('')}
        </tbody>
    </table>

    <div class="totales">
        <div class="total-row">
            <span>Subtotal:</span>
            <span>$${factura.totales.subtotal.toLocaleString('es-CO')}</span>
        </div>
        <div class="total-row">
            <span>Descuento Total:</span>
            <span>$${factura.totales.descuentoTotal.toLocaleString('es-CO')}</span>
        </div>
        <div class="total-row">
            <span>IVA Total:</span>
            <span>$${factura.totales.ivaTotal.toLocaleString('es-CO')}</span>
        </div>
        <div class="total-row">
            <span>Costo de Envío:</span>
            <span>$${factura.totales.costoEnvio.toLocaleString('es-CO')}</span>
        </div>
        <div class="total-row total-final">
            <span>TOTAL:</span>
            <span>$${factura.totales.total.toLocaleString('es-CO')}</span>
        </div>
    </div>

    ${factura.metodoPago ? `
    <div class="info-box">
        <h3>Método de Pago</h3>
        <p><strong>Tipo:</strong> ${this.formatearMetodoPago(factura.metodoPago.tipo)}</p>
        ${factura.metodoPago.detalle ? `<p><strong>Detalle:</strong> ${factura.metodoPago.detalle}</p>` : ''}
        ${factura.metodoPago.numeroTransaccion ? `<p><strong>Transacción:</strong> ${factura.metodoPago.numeroTransaccion}</p>` : ''}
    </div>
    ` : ''}

    ${factura.observaciones ? `
    <div class="info-box">
        <h3>Observaciones</h3>
        <p>${factura.observaciones}</p>
    </div>
    ` : ''}

    <div class="footer">
        <p>Gracias por su compra en VerdeNexo</p>
        <p>Esta es una factura generada electrónicamente</p>
    </div>
</body>
</html>
    `;
  }
  
  /**
   * Formatea el método de pago para mostrar
   * @param {string} tipo - Tipo de método de pago
   * @returns {string} - Método de pago formateado
   */
  formatearMetodoPago(tipo) {
    const metodos = {
      'efectivo': 'Efectivo',
      'tarjeta_credito': 'Tarjeta de Crédito',
      'tarjeta_debito': 'Tarjeta de Débito',
      'transferencia': 'Transferencia Bancaria',
      'pse': 'PSE',
      'contraentrega': 'Contraentrega'
    };
    
    return metodos[tipo] || tipo;
  }
  
  /**
   * Elimina un archivo PDF de factura
   * @param {string} numeroFactura - Número de la factura
   * @returns {boolean} - True si se eliminó exitosamente
   */
  async eliminarFacturaPDF(numeroFactura) {
    try {
      const nombreArchivo = `Factura-${numeroFactura}.pdf`;
      const rutaArchivo = path.join(this.baseDir, nombreArchivo);
      
      if (fs.existsSync(rutaArchivo)) {
        fs.unlinkSync(rutaArchivo);
        console.log(`✅ Factura PDF eliminada: ${nombreArchivo}`);
        return true;
      }
      
      return false;
      
    } catch (error) {
      console.error('Error al eliminar PDF de factura:', error);
      return false;
    }
  }
  
  /**
   * Verifica si existe un PDF de factura
   * @param {string} numeroFactura - Número de la factura
   * @returns {boolean} - True si existe el archivo
   */
  existeFacturaPDF(numeroFactura) {
    const nombreArchivo = `Factura-${numeroFactura}.pdf`;
    const rutaArchivo = path.join(this.baseDir, nombreArchivo);
    return fs.existsSync(rutaArchivo);
  }
}

export default new FacturaPDFGenerator();