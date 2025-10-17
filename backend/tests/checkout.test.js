// tests/checkout.test.js
import request from 'supertest';
import app from '../src/app.js';
import { Pedido } from '../src/models/order.model.js';
import { Carrito } from '../src/models/shopCar.model.js';
import { Usuario } from '../src/models/user.model.js';
import { Producto } from '../src/models/product.model.js';
import { Factura } from '../src/models/invoice.model.js';

describe('Checkout API Tests', () => {
  let testUser;
  let testProduct;
  let testCart;
  let authToken;

  beforeAll(async () => {
    // Crear usuario de prueba
    testUser = new Usuario({
      nombre: 'Usuario Test Checkout',
      email: 'checkout@test.com',
      password: 'password123',
      telefono: '3001234567'
    });
    await testUser.save();

    // Crear producto de prueba
    testProduct = new Producto({
      nombre: 'Producto Test Checkout',
      descripcion: 'Descripción del producto de prueba',
      precio: 50000,
      disponibilidad: true,
      categoria: 'test',
      imagenes: ['test.jpg']
    });
    await testProduct.save();

    // Crear carrito de prueba
    testCart = new Carrito({
      usuarioId: testUser._id,
      sessionId: 'test-session-checkout',
      items: [{
        productoId: testProduct._id,
        nombreProducto: testProduct.nombre,
        precioUnitario: testProduct.precio,
        cantidad: 2,
        subtotal: testProduct.precio * 2
      }],
      totales: {
        subtotal: testProduct.precio * 2,
        descuentoCupones: 0,
        costoEnvio: 0,
        total: testProduct.precio * 2
      },
      estado: 'activo'
    });
    await testCart.save();

    // Login para obtener token
    const loginResponse = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'checkout@test.com',
        password: 'password123'
      });

    authToken = loginResponse.body.token;
  });

  afterAll(async () => {
    // Limpiar datos de prueba
    await Pedido.deleteMany({ usuarioId: testUser._id });
    await Carrito.deleteMany({ usuarioId: testUser._id });
    await Producto.deleteMany({ nombre: 'Producto Test Checkout' });
    await Usuario.deleteMany({ email: 'checkout@test.com' });
  });

  describe('POST /api/checkout/guardar-datos', () => {
    it('debería guardar datos de checkout exitosamente', async () => {
      const checkoutData = {
        sessionId: 'test-session-checkout',
        carritoId: testCart._id.toString(),
        facturacion: {
          tipoDocumento: 'CC',
          numeroDocumento: '1234567890',
          nombreCompleto: 'Usuario Test Checkout',
          email: 'checkout@test.com',
          telefono: '3001234567'
        },
        envio: {
          direccionEnvio: {
            calle: 'Calle 123',
            numero: '45-67',
            barrio: 'Centro',
            ciudad: 'Bogotá'
          },
          nombreDestinatario: 'Usuario Test Checkout',
          telefonoDestinatario: '3001234567'
        },
        pago: {
          metodoPago: 'tarjeta_credito',
          informacionTarjeta: {
            tipoTarjeta: 'visa',
            nombreTitular: 'Usuario Test'
          }
        }
      };

      const response = await request(app)
        .post('/api/checkout/guardar-datos')
        .send(checkoutData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.pedidoId).toBeDefined();
      expect(response.body.data.numeroPedido).toMatch(/^PED-\d{8}-\d{4}$/);
    });

    it('debería validar datos de facturación requeridos', async () => {
      const invalidData = {
        sessionId: 'test-session-checkout',
        facturacion: {},
        envio: {},
        pago: {}
      };

      const response = await request(app)
        .post('/api/checkout/guardar-datos')
        .send(invalidData)
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/checkout/resumen/:pedidoId', () => {
    let testOrder;

    beforeAll(async () => {
      // Crear pedido de prueba
      testOrder = new Pedido({
        usuarioId: testUser._id,
        carritoId: testCart._id,
        numeroPedido: 'PED-20241201-0001',
        estado: 'borrador',
        items: [{
          productoId: testProduct._id,
          nombreProducto: testProduct.nombre,
          precioUnitario: testProduct.precio,
          cantidad: 2,
          subtotal: testProduct.precio * 2
        }],
        facturacion: {
          tipoDocumento: 'CC',
          numeroDocumento: '1234567890',
          nombreCompleto: 'Usuario Test Checkout',
          email: 'checkout@test.com',
          telefono: '3001234567'
        },
        envio: {
          direccionEnvio: {
            calle: 'Calle 123',
            numero: '45-67',
            barrio: 'Centro',
            ciudad: 'Bogotá'
          },
          nombreDestinatario: 'Usuario Test Checkout',
          telefonoDestinatario: '3001234567'
        },
        pago: {
          metodoPago: 'tarjeta_credito',
          estadoPago: 'pendiente',
          montoTotal: testProduct.precio * 2
        },
        totales: {
          subtotal: testProduct.precio * 2,
          descuentoCupones: 0,
          costoEnvio: 0,
          total: testProduct.precio * 2
        }
      });
      await testOrder.save();
    });

    it('debería obtener resumen del pedido', async () => {
      const response = await request(app)
        .get(`/api/checkout/resumen/${testOrder._id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.numeroPedido).toBe('PED-20241201-0001');
      expect(response.body.data.totales.total).toBe(testProduct.precio * 2);
    });
  });

  describe('RF-PED-02: Actualizar Stock', () => {
    it('debería reducir el stock al confirmar pedido', async () => {
      // Crear pedido confirmado
      const draftOrder = new Pedido({
        usuarioId: testUser._id,
        carritoId: testCart._id,
        numeroPedido: 'PED-20241201-0003',
        estado: 'borrador',
        items: [{
          productoId: testProduct._id,
          nombreProducto: testProduct.nombre,
          precioUnitario: testProduct.precio,
          cantidad: 2,
          subtotal: testProduct.precio * 2
        }],
        facturacion: {
          tipoDocumento: 'CC',
          numeroDocumento: '1234567890',
          nombreCompleto: 'Usuario Test Checkout',
          email: 'checkout@test.com',
          telefono: '3001234567'
        },
        envio: {
          direccionEnvio: {
            calle: 'Calle 123',
            numero: '45-67',
            barrio: 'Centro',
            ciudad: 'Bogotá'
          },
          nombreDestinatario: 'Usuario Test Checkout',
          telefonoDestinatario: '3001234567'
        },
        pago: {
          metodoPago: 'tarjeta_credito',
          estadoPago: 'pendiente',
          montoTotal: testProduct.precio * 2
        },
        totales: {
          subtotal: testProduct.precio * 2,
          descuentoCupones: 0,
          costoEnvio: 0,
          total: testProduct.precio * 2
        }
      });
      await draftOrder.save();

      const stockInicial = testProduct.stock;

      const response = await request(app)
        .post(`/api/checkout/confirmar/${draftOrder._id}`)
        .send({ notasAdicionales: 'Prueba de actualización de stock' })
        .expect(200);

      expect(response.body.success).toBe(true);

      // Verificar que el stock se redujo
      const productoActualizado = await Producto.findById(testProduct._id);
      expect(productoActualizado.stock).toBe(stockInicial - 2);
    });
  });

  describe('RF-PED-04: Facturación', () => {
    let confirmedOrder;

    beforeAll(async () => {
      // Crear y confirmar un pedido para pruebas de facturación
      confirmedOrder = new Pedido({
        usuarioId: testUser._id,
        carritoId: testCart._id,
        numeroPedido: 'PED-20241201-0004',
        estado: 'confirmado',
        fechaConfirmacion: new Date(),
        items: [{
          productoId: testProduct._id,
          nombreProducto: testProduct.nombre,
          precioUnitario: testProduct.precio,
          cantidad: 1,
          subtotal: testProduct.precio
        }],
        facturacion: {
          tipoDocumento: 'CC',
          numeroDocumento: '1234567890',
          nombreCompleto: 'Usuario Test Checkout',
          email: 'checkout@test.com',
          telefono: '3001234567'
        },
        envio: {
          direccionEnvio: {
            calle: 'Calle 123',
            numero: '45-67',
            barrio: 'Centro',
            ciudad: 'Bogotá'
          },
          nombreDestinatario: 'Usuario Test Checkout',
          telefonoDestinatario: '3001234567'
        },
        pago: {
          metodoPago: 'tarjeta_credito',
          estadoPago: 'pagado',
          montoTotal: testProduct.precio
        },
        totales: {
          subtotal: testProduct.precio,
          descuentoCupones: 0,
          costoEnvio: 0,
          total: testProduct.precio
        }
      });
      await confirmedOrder.save();
    });

    it('debería generar factura para pedido confirmado', async () => {
      const response = await request(app)
        .post(`/api/checkout/factura/generar/${confirmedOrder._id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.numeroFactura).toMatch(/^2024/);
      expect(response.body.data.total).toBe(testProduct.precio);
    });

    it('debería obtener factura generada', async () => {
      // Primero generar la factura
      await request(app)
        .post(`/api/checkout/factura/generar/${confirmedOrder._id}`)
        .set('Authorization', `Bearer ${authToken}`);

      // Obtener facturas del usuario
      const response = await request(app)
        .get('/api/checkout/facturas')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.facturas.length).toBeGreaterThan(0);
    });
  });

  describe('RF-PED-05: Dashboard de Estados', () => {
    it('debería obtener dashboard de estados de pedidos', async () => {
      const response = await request(app)
        .get('/api/checkout/dashboard/estados')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('estadisticas');
      expect(response.body.data).toHaveProperty('metricas');
      expect(response.body.data).toHaveProperty('pedidosRecientes');
    });

    it('debería obtener estado detallado de un pedido', async () => {
      // Crear un pedido de prueba
      const testOrder = new Pedido({
        usuarioId: testUser._id,
        numeroPedido: 'PED-20241201-0005',
        estado: 'confirmado',
        fechaCreacion: new Date(),
        totales: { total: 50000 }
      });
      await testOrder.save();

      const response = await request(app)
        .get(`/api/checkout/estado/detallado/${testOrder._id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('estadoActual');
      expect(response.body.data).toHaveProperty('flujoEstados');
      expect(response.body.data).toHaveProperty('progreso');
    });
  });
});