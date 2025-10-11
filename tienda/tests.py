from django.test import TestCase, Client
from django.urls import reverse
from .models import Producto


class ApiTestProductos(TestCase):
	def setUp(self):
		# Crear algunos productos de prueba
		Producto.objects.create(nombre='P1', slug='p1', precio=10.0, activo=True)
		Producto.objects.create(nombre='P2', slug='p2', precio=20.0, activo=True)
		Producto.objects.create(nombre='P3', slug='p3', precio=30.0, activo=False)
		self.client = Client()

	def test_api_test_productos(self):
		url = reverse('tienda:api_test_productos')
		resp = self.client.get(url)
		self.assertEqual(resp.status_code, 200)
		data = resp.json()
		self.assertTrue(data.get('success'))
		# Solo los activos deben contar (2)
		self.assertEqual(data.get('count'), 2)
		self.assertIsInstance(data.get('productos'), list)

	def test_api_test_productos_count(self):
		url = reverse('tienda:api_test_productos_count')
		resp = self.client.get(url)
		self.assertEqual(resp.status_code, 200)
		data = resp.json()
		self.assertTrue(data.get('success'))
		self.assertEqual(data.get('total_productos'), 2)
