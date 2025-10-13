# Módulo de Checkout - VerdeNexo

Este módulo implementa el sistema completo de checkout para la plataforma VerdeNexo, cumpliendo con los requerimientos funcionales RF-CHE-01 hasta RF-CHE-06.

## 📋 Requerimientos Funcionales Implementados

### RF-CHE-01: Ingresar Datos de Compra
- **Endpoint**: `GET /api/checkout/iniciar`
- **Descripción**: Inicia el proceso de checkout obteniendo el carrito activo
- **Parámetros**: `sessionId` (query), `carritoId` (opcional)
- **Respuesta**: Información del carrito y datos del usuario si está autenticado

### RF-CHE-02: Resumir Compra
- **Endpoint**: `GET /api/checkout/resumen/:pedidoId`
- **Descripción**: Obtiene resumen completo del pedido antes de confirmar
- **Parámetros**: `pedidoId` (URL)
- **Respuesta**: Detalle completo del pedido con totales y datos de envío

### RF-CHE-03: Generar Pedido
- **Endpoint**: `POST /api/checkout/confirmar/:pedidoId`
- **Descripción**: Confirma y genera el pedido formal
- **Parámetros**: `pedidoId` (URL), `notasAdicionales` (opcional)
- **Respuesta**: Confirmación del pedido con número de pedido

### RF-CHE-04: Enviar Notificación de Pedido
- **Endpoint**: `POST /api/checkout/notificar/:pedidoId`
- **Descripción**: Envía confirmación de pedido por email
- **Parámetros**: `pedidoId` (URL)
- **Respuesta**: Confirmación de envío de notificación

### RF-CHE-05: Manejar Pedidos Mayoristas
- **Endpoint**: `POST /api/checkout/mayorista/:pedidoId`
- **Descripción**: Procesa pedidos mayoristas con condiciones especiales
- **Parámetros**: `pedidoId` (URL), descuentos y condiciones especiales
- **Respuesta**: Confirmación de procesamiento mayorista

### RF-CHE-06: Registrar Información de Despacho
- **Endpoint**: `PUT /api/checkout/despacho/:pedidoId`
- **Descripción**: Actualiza información de despacho del pedido
- **Parámetros**: `pedidoId` (URL), datos de envío y despacho
- **Respuesta**: Confirmación de actualización de despacho

## 🚀 Endpoints Adicionales

### Endpoints Públicos
- `POST /api/checkout/guardar-datos` - Guarda datos de facturación, envío y pago
- `GET /api/checkout/iniciar` - Inicia proceso de checkout

### Endpoints Protegidos (Requieren Autenticación)
- `GET /api/checkout/mis-pedidos` - Obtiene pedidos del usuario
- `GET /api/checkout/detalle/:pedidoId` - Obtiene detalle completo de un pedido
- `POST /api/checkout/notificar/:pedidoId` - Envía notificación por email

### Endpoints Administrativos
- `POST /api/checkout/mayorista/:pedidoId` - Procesa pedidos mayoristas (Admin/Vendedor)
- `PUT /api/checkout/despacho/:pedidoId` - Actualiza despacho (Admin/Logística)

## 📊 Estados del Pedido

Los pedidos pueden tener los siguientes estados:

1. **`borrador`** - Pedido creado pero no confirmado
2. **`confirmado`** - Pedido confirmado por el cliente
3. **`pagado`** - Pago procesado exitosamente
4. **`en_preparacion`** - Pedido en preparación para envío
5. **`enviado`** - Pedido enviado con número de guía
6. **`entregado`** - Pedido entregado al cliente
7. **`cancelado`** - Pedido cancelado

## 💳 Métodos de Pago Soportados

- **`tarjeta_credito`** - Tarjeta de crédito
- **`tarjeta_debito`** - Tarjeta débito
- **`pse`** - Pago por PSE
- **`transferencia`** - Transferencia bancaria

## 📦 Estructura de Datos

### Datos de Facturación
```json
{
  "tipoDocumento": "CC|CE|NIT",
  "numeroDocumento": "string",
  "nombreCompleto": "string",
  "email": "string",
  "telefono": "string"
}
```

### Datos de Envío
```json
{
  "direccionEnvio": {
    "calle": "string",
    "numero": "string",
    "barrio": "string",
    "ciudad": "string"
  },
  "nombreDestinatario": "string",
  "telefonoDestinatario": "string",
  "costoEnvio": "number",
  "instruccionesEspeciales": "string (opcional)"
}
```

### Datos de Pago
```json
{
  "metodoPago": "tarjeta_credito|tarjeta_debito|pse|transferencia",
  "informacionTarjeta": {
    "tipoTarjeta": "visa|mastercard|amex",
    "nombreTitular": "string"
  },
  "informacionBancaria": {
    "banco": "string",
    "tipoCuenta": "ahorros|corriente"
  },
  "montoTotal": "number",
  "estadoPago": "pendiente|procesando|completado|fallido"
}
```

## 🏢 Pedidos Mayoristas

Los pedidos mayoristas incluyen campos adicionales:

```json
{
  "esPedidoMayorista": true,
  "informacionEmpresa": {
    "nombreEmpresa": "string",
    "nit": "string",
    "sector": "string"
  },
  "condicionesEspeciales": {
    "descuentoMayorista": "number (porcentaje)",
    "plazoPagoEspecial": "string",
    "terminosPago": "string",
    "requiereFacturaEspecial": "boolean"
  }
}
```

## 📧 Sistema de Notificaciones

### Email de Confirmación
- Se envía automáticamente al confirmar el pedido
- Incluye detalles completos del pedido
- Plantilla HTML responsive

### Email de Actualización de Estado
- Se puede enviar manualmente para pedidos en estados avanzados
- Incluye información del nuevo estado
- Mensajes personalizables

## 🔒 Validaciones Implementadas

### Validaciones de Carrito
- Carrito debe existir y estar activo
- No debe exceder 50 productos
- Productos deben estar disponibles

### Validaciones de Datos
- Email con formato válido
- Teléfono colombiano (10 dígitos)
- Documento requerido según tipo
- Dirección de envío completa

### Validaciones de Seguridad
- Rate limiting en todos los endpoints
- Validación de propiedad del pedido
- Roles requeridos para operaciones administrativas

## 🧪 Testing

Para ejecutar las pruebas del módulo checkout:

```bash
npm test tests/checkout.test.js
```

Las pruebas incluyen:
- Creación de pedidos
- Validación de datos
- Confirmación de pedidos
- Manejo de errores

## 📈 Monitoreo y Logs

El módulo incluye logging para:
- Creación de pedidos
- Cambios de estado
- Envío de emails
- Errores de validación

Los logs se almacenan en la colección `historial_pedidos` del pedido.

## 🔧 Configuración

### Variables de Entorno Requeridas
```env
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=tu-email@gmail.com
EMAIL_PASS=tu-password-app
EMAIL_FROM=VerdeNexo <noreply@verdenexo.com>
```

### Dependencias
- `nodemailer` - Para envío de emails
- `express-rate-limit` - Rate limiting
- `mongoose` - Modelado de datos

## 🚨 Manejo de Errores

El módulo utiliza un sistema centralizado de errores:

- **`VAL_INVALID_OBJECT_ID`** - ID inválido
- **`VAL_NO_FIELDS_TO_UPDATE`** - Datos requeridos faltantes
- **`AUTH_ACCESS_DENIED`** - Sin permisos para acceder al pedido
- **`AUTH_TOKEN_MISSING`** - Token de autenticación requerido

## 📚 Próximos Pasos

1. **Integración con Pasarelas de Pago**
   - Implementar WebPay, PayU, o similar
   - Webhooks para confirmación de pagos

2. **Sistema de Inventario**
   - Actualización automática de stock
   - Alertas de productos agotados

3. **Tracking de Envíos**
   - Integración con transportadoras
   - Actualización automática de estados

4. **Dashboard Administrativo**
   - Gestión de pedidos
   - Reportes y estadísticas

5. **API de Transportadoras**
   - Cálculo automático de costos
   - Generación de guías de envío