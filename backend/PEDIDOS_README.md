# Módulo de Pedidos - VerdeNexo

Este módulo implementa todas las funcionalidades de gestión de pedidos post-checkout, cumpliendo con los requerimientos funcionales RF-PED-01 hasta RF-PED-06.

## 📋 Requerimientos Funcionales Implementados

### RF-PED-01: Confirmar Pedido
- **Estado**: ✅ Completado
- **Funcionalidad**: Confirmación automática de pedidos con validaciones exhaustivas
- **Validaciones**:
  - Verificación de stock disponible
  - Validación de productos activos
  - Límite de 50 productos por pedido
  - Actualización automática de estadísticas

### RF-PED-02: Actualizar Stock
- **Estado**: ✅ Completado
- **Funcionalidad**: Reducción automática de inventario al confirmar pedidos
- **Características**:
  - Actualización de stock general y por variante
  - Marcado automático como "no disponible" cuando stock = 0
  - Historial de cambios en productos
  - Manejo de errores sin afectar confirmación

### RF-PED-03: Registrar Comisión de Venta
- **Estado**: ✅ Completado
- **Funcionalidad**: Sistema completo de comisiones para vendedores
- **Modelos**: `Comision`, actualización de `User`
- **Características**:
  - Cálculo automático por porcentaje configurable
  - Estados: pendiente, pagada, cancelada
  - Reportes de rendimiento por vendedor
  - Historial de comisiones pagadas

### RF-PED-04: Emitir Factura de Venta
- **Estado**: ✅ Completado
- **Funcionalidad**: Generación automática de facturas electrónicas
- **Modelos**: `Factura` con soporte DIAN Colombia
- **Características**:
  - Numeración automática por año/mes
  - Cálculo de IVA por categoría de producto
  - Estados: borrador, emitida, enviada, pagada, anulada
  - Información completa emisor/receptor

### RF-PED-05: Mostrar Estado del Pedido
- **Estado**: ✅ Completado
- **Funcionalidad**: Dashboard completo de seguimiento de pedidos
- **Características**:
  - Flujo visual de estados con progreso
  - Información de tiempos y estimaciones
  - Dashboard de métricas por período
  - Estados detallados con iconos y colores

### RF-PED-06: Guardar Información de Venta
- **Estado**: ✅ Completado
- **Funcionalidad**: Sistema completo de estadísticas y reportes
- **Modelos**: `EstadisticasDiarias`, `EstadisticasMensuales`
- **Características**:
  - Estadísticas automáticas por día/mes
  - Top productos y vendedores
  - Reportes completos por período
  - Métricas en tiempo real

## 🚀 Endpoints Implementados

### Gestión de Pedidos
- `POST /api/checkout/confirmar/:pedidoId` - Confirmar pedido
- `GET /api/checkout/mis-pedidos` - Pedidos del usuario
- `GET /api/checkout/detalle/:pedidoId` - Detalle completo
- `GET /api/checkout/dashboard/estados` - Dashboard de estados
- `GET /api/checkout/estado/detallado/:pedidoId` - Estado detallado

### Facturación
- `POST /api/checkout/factura/generar/:pedidoId` - Generar factura
- `GET /api/checkout/factura/:facturaId` - Obtener factura
- `GET /api/checkout/facturas` - Facturas del usuario
- `PUT /api/checkout/factura/anular/:facturaId` - Anular factura

### Estadísticas y Reportes
- `GET /api/checkout/estadisticas/tiempo-real` - Métricas actuales
- `GET /api/checkout/estadisticas/periodo` - Estadísticas por período
- `GET /api/checkout/estadisticas/top-productos` - Top productos
- `GET /api/checkout/estadisticas/rendimiento-vendedores` - Rendimiento vendedores
- `GET /api/checkout/estadisticas/reporte-completo` - Reporte completo

## 📊 Estados del Pedido

1. **`borrador`** - Pedido creado, esperando confirmación
2. **`confirmado`** - Pedido confirmado, stock actualizado
3. **`pagado`** - Pago procesado exitosamente
4. **`en_preparacion`** - Preparando para envío
5. **`enviado`** - Enviado con número de guía
6. **`entregado`** - Entregado al cliente
7. **`cancelado`** - Pedido cancelado

## 💰 Sistema de Comisiones

### Configuración por Vendedor
```javascript
{
  porcentajeComision: 5.0, // 5%
  comisionesAcumuladas: 0,
  comisionesPendientes: 0,
  ventasTotales: 0,
  ultimaVenta: Date,
  activo: true
}
```

### Estados de Comisión
- **`pendiente`** - Comisión calculada pero no pagada
- **`pagada`** - Comisión pagada al vendedor
- **`cancelada`** - Comisión cancelada (pedido devuelto)

## 📄 Sistema de Facturación

### Información de Factura
```javascript
{
  numeroFactura: "2024120001",
  tipoFactura: "venta",
  emisor: {...}, // Datos de VerdeNexo
  receptor: {...}, // Datos del cliente
  detalles: [...], // Items facturados
  totales: {
    subtotal: 100000,
    descuentoTotal: 0,
    ivaTotal: 19000,
    total: 119000
  }
}
```

### IVA por Categoría
- **General**: 19%
- **Alimentos/Medicamentos**: 5%
- **Educación/Exento**: 0%

## 📈 Estadísticas y Reportes

### Estadísticas Diarias
- Ventas totales y por canal
- Productos más vendidos
- Rendimiento de vendedores
- Tasa de cancelación y entrega

### Estadísticas Mensuales
- Crecimiento vs mes anterior
- Ticket promedio
- Top productos del mes
- Resumen ejecutivo

### Reportes Disponibles
- **Tiempo Real**: Métricas del día actual
- **Por Período**: Estadísticas personalizadas
- **Top Productos**: Ranking de ventas
- **Rendimiento**: Análisis de vendedores
- **Completo**: Reporte integral

## 🔒 Permisos y Roles

### Cliente (client)
- Ver sus propios pedidos y facturas
- Dashboard de estados personales

### Vendedor (seller)
- Acceso a estadísticas de ventas
- Reportes de rendimiento personal
- Gestión de pedidos asignados

### Administrador (admin)
- Acceso completo a todos los módulos
- Generación y anulación de facturas
- Reportes completos del sistema

## 📧 Notificaciones Automáticas

### Al Confirmar Pedido
- Email de confirmación con detalles
- Actualización de estadísticas
- Registro de comisiones

### Al Cambiar Estado
- Notificación de envío con número de guía
- Confirmación de entrega
- Actualización automática de métricas

## 🗃️ Modelos de Datos

### Nuevos Modelos
- **`Comision`** - Gestión de comisiones de venta
- **`Factura`** - Facturas electrónicas
- **`EstadisticasDiarias`** - Estadísticas diarias
- **`EstadisticasMensuales`** - Resúmenes mensuales

### Modelos Actualizados
- **`User`** - Información de vendedores y comisiones
- **`Producto`** - Actualización automática de stock
- **`Pedido`** - Historial completo y referencias

## 🔄 Procesos Automáticos

### Al Confirmar Pedido
1. ✅ Validar stock disponible
2. ✅ Reducir inventario
3. ✅ Registrar comisiones
4. ✅ Generar factura
5. ✅ Actualizar estadísticas
6. ✅ Enviar notificación

### Fin de Día/Mes
1. ✅ Calcular estadísticas diarias
2. ✅ Generar resúmenes mensuales
3. ✅ Actualizar métricas de rendimiento

## 🧪 Testing

Para ejecutar pruebas del módulo:

```bash
# Pruebas específicas de pedidos
npm test tests/checkout.test.js

# Verificar integración completa
npm test
```

## 📚 Próximos Pasos

1. **Integración DIAN** - Validación electrónica de facturas
2. **Pasarelas de Pago** - Conexión con WebPay, PayU, etc.
3. **Sistema de Envíos** - Integración con transportadoras
4. **Devoluciones** - Gestión de pedidos devueltos
5. **Dashboard Admin** - Interfaz gráfica para gestión
6. **API Externa** - Conexión con sistemas contables

## 🚨 Consideraciones Importantes

- **Transaccionalidad**: Los procesos críticos están protegidos contra fallos
- **Performance**: Estadísticas calculadas en background
- **Escalabilidad**: Índices optimizados para consultas frecuentes
- **Auditoría**: Historial completo de cambios en pedidos
- **Concurrencia**: Manejo seguro de actualizaciones simultáneas

---

**Estado del Módulo**: ✅ **COMPLETADO**
**Cobertura RF**: 100% (6/6 requerimientos)
**Endpoints**: 20+ implementados
**Modelos**: 4 nuevos + 3 actualizados
**Testing**: Suite completa incluida