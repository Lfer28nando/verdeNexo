from decimal import Decimal
from django.db import models
from django.conf import settings
from django.utils import timezone
from django.urls import reverse
from django.db.models import Avg, Count


class Categoria(models.Model):
	nombre = models.CharField(max_length=200)
	slug = models.SlugField(unique=True)
	activa = models.BooleanField(default=True)
	orden = models.IntegerField(default=0)

	def __str__(self):
		return self.nombre


class Marca(models.Model):
	nombre = models.CharField(max_length=200)
	slug = models.SlugField(unique=True)

	def __str__(self):
		return self.nombre


class Producto(models.Model):
	nombre = models.CharField(max_length=255)
	slug = models.SlugField(unique=True)
	descripcion = models.TextField(blank=True)
	descripcion_corta = models.CharField(max_length=255, blank=True)
	precio = models.DecimalField(max_digits=10, decimal_places=2, default=Decimal('0.00'))
	precio_descuento = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
	stock = models.IntegerField(default=0)
	nuevo = models.BooleanField(default=False)
	destacado = models.BooleanField(default=False)
	activo = models.BooleanField(default=True)
	ventas = models.IntegerField(default=0)
	vistas = models.IntegerField(default=0)
	fecha_creacion = models.DateTimeField(default=timezone.now)
	categoria = models.ForeignKey(Categoria, related_name='productos', on_delete=models.SET_NULL, null=True, blank=True)
	marca = models.ForeignKey(Marca, related_name='producto', on_delete=models.SET_NULL, null=True, blank=True)

	class Meta:
		ordering = ['-destacado', '-fecha_creacion']

	def __str__(self):
		return self.nombre

	@property
	def precio_final(self):
		return self.precio_descuento if self.precio_descuento is not None else self.precio

	@property
	def tiene_descuento(self):
		return self.precio_descuento is not None and self.precio_descuento < self.precio

	@property
	def porcentaje_descuento(self):
		if self.tiene_descuento:
			try:
				return int((1 - (self.precio_descuento / self.precio)) * 100)
			except Exception:
				return 0
		return 0

	@property
	def en_stock(self):
		return self.stock > 0

	def get_absolute_url(self):
		try:
			return reverse('tienda:producto_detalle', args=[self.slug])
		except Exception:
			return f'/producto/{self.slug}/'

	@property
	def rating_promedio(self):
		agg = self.reviews.filter(activa=True).aggregate(avg=Avg('rating'))
		return float(agg['avg']) if agg and agg['avg'] is not None else 0.0

	@property
	def total_reviews(self):
		return self.reviews.filter(activa=True).count()


class ImagenProducto(models.Model):
	producto = models.ForeignKey(Producto, related_name='imagenes', on_delete=models.CASCADE)
	imagen = models.ImageField(upload_to='productos/', null=True, blank=True)

	def __str__(self):
		return f'Imagen de {self.producto.nombre}'


class Review(models.Model):
	producto = models.ForeignKey(Producto, related_name='reviews', on_delete=models.CASCADE)
	usuario = models.ForeignKey(settings.AUTH_USER_MODEL, related_name='reviews', on_delete=models.CASCADE)
	rating = models.IntegerField(default=5)
	comentario = models.TextField(blank=True)
	activa = models.BooleanField(default=True)
	fecha_creacion = models.DateTimeField(default=timezone.now)

	def __str__(self):
		return f'Review {self.rating} - {self.producto.nombre}'


class Wishlist(models.Model):
	usuario = models.ForeignKey(settings.AUTH_USER_MODEL, related_name='wishlist', on_delete=models.CASCADE)
	producto = models.ForeignKey(Producto, related_name='wishlist_items', on_delete=models.CASCADE)
	fecha_creacion = models.DateTimeField(default=timezone.now)

	class Meta:
		unique_together = ('usuario', 'producto')

	def __str__(self):
		return f'{self.usuario} - {self.producto.nombre}'


class CarritoItem(models.Model):
	usuario = models.ForeignKey(settings.AUTH_USER_MODEL, related_name='carrito_items', on_delete=models.CASCADE, null=True, blank=True)
	session_key = models.CharField(max_length=255, null=True, blank=True)
	producto = models.ForeignKey(Producto, related_name='carrito_items', on_delete=models.CASCADE)
	cantidad = models.IntegerField(default=1)
	fecha_creacion = models.DateTimeField(default=timezone.now)

	@property
	def subtotal(self):
		try:
			return self.producto.precio_final * Decimal(self.cantidad)
		except Exception:
			return Decimal('0.00')

	def __str__(self):
		return f'{self.cantidad} x {self.producto.nombre}'


class AtributoProducto(models.Model):
	producto = models.ForeignKey(Producto, related_name='atributos', on_delete=models.CASCADE)
	nombre = models.CharField(max_length=100)
	valor = models.CharField(max_length=255)

	def __str__(self):
		return f'{self.nombre}: {self.valor}'
