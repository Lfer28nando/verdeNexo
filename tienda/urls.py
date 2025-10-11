from django.urls import path
from django.conf import settings
from django.conf.urls.static import static
from . import views

app_name = 'tienda'

urlpatterns = [
    # Página principal
    path('', views.home, name='home'),
    
    # Catálogo y productos
    path('catalogo/', views.catalogo, name='catalogo'),
    path('catalogo/ajax/', views.catalogo, name='catalogo_ajax'),
    path('productos/', views.productos, name='productos'),  # Redirige al catálogo
    path('producto/<slug:slug>/', views.producto_detalle, name='producto_detalle'),
    path('producto/<int:producto_id>/quick-view/', views.quick_view, name='quick_view'),
    
    # Carrito
    path('carrito/', views.carrito, name='carrito'),
    path('carrito/ajax/', views.carrito_ajax, name='carrito_ajax'),
    
    # Wishlist
    path('wishlist/', views.mi_wishlist, name='wishlist'),
    path('wishlist/ajax/', views.wishlist_ajax, name='wishlist_ajax'),
    
    # AJAX endpoints
    path('productos/info/', views.productos_info, name='productos_info'),
    
    # Otras páginas
    path('contacto/', views.contacto, name='contacto'),
    
    # URLs antiguas para compatibilidad
    path('agregar-carrito/', views.carrito_ajax, name='agregar_carrito'),
]

# Servir archivos estáticos en desarrollo
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)