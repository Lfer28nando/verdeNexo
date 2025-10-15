1) Requerimientos funcionales:
RF-CHE-01	Ingresar datos de compra	Permitir al usuario ingresar su dirección de entrega, método de pago y otros datos necesarios antes de generar el pedido.
RF-CHE-02	Resumir compra	Mostrar un resumen con todos los productos seleccionados, sus precios unitarios, descuentos, costo de envío y total a pagar.
RF-CHE-03	Generar pedido	Registrar el pedido en la base de datos con un número de identificación único y estado inicial “pendiente de pago”.
RF-CHE-04	Enviar notificación de pedido	Enviar un correo o notificación al usuario confirmando la recepción del pedido y mostrando los detalles de la transacción.
RF-CHE-05	Registrar pedidos mayoristas	Permitir el registro y procesamiento de pedidos con cantidades o condiciones especiales para clientes mayoristas.
RF-CHE-06	Registrar información de despacho de pedido	Permitir ingresar datos del envío, como transportadora, número de guía y fecha estimada de entrega.

¿El carrito debe mantenerse cuando el usuario no está logueado? (sí → usar cartSessionId en localStorage y guardar en cookie cuando haga checkout)

¿El carrito debe sincronizarse entre dispositivos al iniciar sesión? (no)

¿Soportas cupones / descuentos? ¿Impuestos / envío? ¿Stock real-time? (si)

¿Múltiples sellers/vendedores? ¿Productos con variantes (talla, color)? (si)


2) Endpoints API necesarios
Rutas del carrito en el BACKEND
\backend\src\routes\shopCart.routes.js
// RF-CARRO-01 - Obtener o crear carrito
router.get('/:sessionId', obtenerCarrito);

// RF-CARRO-02 - Agregar productos al carrito
router.post('/item', agregarItem);

// RF-CARRO-03 - Actualizar cantidad de un item
router.put('/item/:sessionId/:itemId', actualizarCantidad);

// RF-CARRO-03 - Eliminar item del carrito
router.delete('/item/:sessionId/:itemId', eliminarItem);

// RF-CARRO-03 - Vaciar carrito completamente
router.delete('/:sessionId', vaciarCarrito);

// RF-CARRO-04 - Aplicar cupón
router.post('/coupon', aplicarCupon);

// RF-CARRO-04 - Remover cupón
router.delete('/coupon/:sessionId/:codigo', removerCupon);

// RF-CARRO-05 - Calcular precio de envío
router.post('/shipping', calcularEnvio);

// RF-CARRO-06 - Guardar carrito para después (requiere autenticación)
router.post('/:sessionId/save', authRequired, guardarParaDespues);

// RF-CARRO-06 - Obtener carritos guardados (requiere autenticación)
router.get('/saved/list', authRequired, obtenerCarritosGuardados);

// RF-CARRO-07 - Validar límites del carrito
router.get('/:sessionId/validate', validarLimitesCarrito);

// RF-CARRO-08 - Recalcular totales
router.post('/:sessionId/recalculate', recalcularTotales);

// FUNCIONES AUXILIARES - Estadísticas del carrito
router.get('/:sessionId/stats', obtenerEstadisticas);

// CARRITOS DE USUARIOS ANÓNIMOS
// Validar carrito desde localStorage (sin guardar en BD)
router.post('/validate-localstorage', validarCarritoLocalStorage);

// Migrar carrito desde localStorage a BD (requiere autenticación)
router.post('/migrate-localstorage', authRequired, migrarCarritoLocalStorage);

// ADMINISTRACIÓN - Limpieza de carritos abandonados (requiere autenticación)
router.post('/admin/cleanup-abandoned', authRequired, ejecutarLimpiezaCarritos);


3) Lógica / validaciones importantes

Si el producto tiene stock, validar qty <= stock al agregar y al checkout.

Snapshot del precio cuando se añade (para que no rompa si admin cambia precio antes del checkout). Validar en checkout y avisar si cambió.

Recalcular totales en cada cambio (subtotal, descuentos, impuestos, envío).

Manejar race conditions: lock/validate en backend al confirmar orden.

Limitar qty por item (p. ej. 1–99).

Manejar productos deshabilitados/agotados: mostrar mensaje y permitir remover.

4) Persistencia en frontend

Opciones:

localStorage (sencillo, offline) — guarda cartSessionId y cart JSON.

Cookies HttpOnly + server-side (más seguro para usuarios logueados).

Ejemplo mínima estructura en localStorage:
{
  "sessionId":"cart_123",
  "items":[ { "id":"...", "productId":"p1", "price":120000, "qty":2 } ],
  "updatedAt": 1690000000000
}

5) UI / Comportamiento en frontend (qué debo implementar)

Botón Agregar al carrito (debounce / bloquear while request)

Mini-carrito desplegable con lista de items (qty +/-) y botón ver carrito / checkout

Página carrito: editar cantidades, remover items, aplicar cupón, resumen de totales

Validaciones visuales: stock insuficiente, precios cambiados

Animaciones feedback (toast) y estado loading

Delegación de eventos

6) Mensajes y UX (para implementar)

Mensaje cuando se agrega: “Producto agregado”

Si stock insuficiente: “Solo quedan X unidades”

Si precio cambiado: “El precio cambió de $X a $Y — actualizar carrito”

Si sesión expira en checkout: redirigir a login y mantener carrito

7) Integraciones opcionales

Cálculo impuestos (19%)

8) Usar esta metodologia:
Frontend:
Css -> frontend\src\public\css\catalogo.styles.js -> Hecho
js -> frontend\src\public\js
frontend\src\views\pages\carrito.ejs -> Hecho

9) Pregunta antes de hacer cada cosa!