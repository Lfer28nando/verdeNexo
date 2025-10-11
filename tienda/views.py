from django.shortcuts import render, get_object_or_404
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.core.paginator import Paginator
from django.db.models import Q, Count, Avg
from django.contrib.auth.decorators import login_required
from django.views.decorators.http import require_http_methods
from django.utils.decorators import method_decorator
from django.views.generic import ListView
from django.contrib import messages
import json
from .models import (
    Producto, Categoria, Marca, ImagenProducto, 
    Review, Wishlist, CarritoItem, AtributoProducto
)

# Create your views here.

def home(request):
    """Vista principal de la tienda"""
    # Obtener productos destacados reales de la base de datos
    productos_destacados = Producto.objects.filter(
        activo=True, 
        destacado=True
    ).select_related('categoria', 'marca').prefetch_related('imagenes')[:8]
    
    # Obtener categorías principales
    categorias_principales = Categoria.objects.filter(
        activa=True
    ).annotate(
        producto_count=Count('productos', filter=Q(productos__activo=True))
    )[:6]
    
    context = {
        'productos_destacados': productos_destacados,
        'categorias_principales': categorias_principales,
    }
    return render(request, 'tienda/home.html', context)

def catalogo(request):
    """Vista principal del catálogo con filtros avanzados"""
    # Obtener parámetros de filtrado
    categoria_ids = request.GET.getlist('categoria')
    marca_ids = request.GET.getlist('marca')
    precio_min = request.GET.get('precio_min')
    precio_max = request.GET.get('precio_max')
    disponibilidad = request.GET.getlist('disponibilidad')
    rating_min = request.GET.get('rating')
    search_query = request.GET.get('search', '').strip()
    sort_by = request.GET.get('sort', 'default')
    items_per_page = int(request.GET.get('items_per_page', 12))
    
    # Construcción del queryset base
    productos = Producto.objects.filter(activo=True).select_related(
        'categoria', 'marca'
    ).prefetch_related(
        'imagenes', 'reviews', 'atributos'
    )
    
    # Aplicar filtros
    if categoria_ids:
        productos = productos.filter(categoria_id__in=categoria_ids)
    
    if marca_ids:
        productos = productos.filter(marca_id__in=marca_ids)
    
    if precio_min:
        productos = productos.filter(precio_final__gte=precio_min)
    
    if precio_max:
        productos = productos.filter(precio_final__lte=precio_max)
    
    if 'disponible' in disponibilidad:
        productos = productos.filter(stock__gt=0)
    
    if 'ofertas' in disponibilidad:
        productos = productos.filter(precio_descuento__isnull=False)
    
    if 'nuevos' in disponibilidad:
        productos = productos.filter(nuevo=True)
    
    if rating_min:
        productos = productos.annotate(
            avg_rating=Avg('reviews__rating', filter=Q(reviews__activa=True))
        ).filter(avg_rating__gte=rating_min)
    
    if search_query:
        productos = productos.filter(
            Q(nombre__icontains=search_query) |
            Q(descripcion__icontains=search_query) |
            Q(descripcion_corta__icontains=search_query) |
            Q(categoria__nombre__icontains=search_query) |
            Q(marca__nombre__icontains=search_query)
        )
    
    # Aplicar ordenamiento
    if sort_by == 'name_asc':
        productos = productos.order_by('nombre')
    elif sort_by == 'name_desc':
        productos = productos.order_by('-nombre')
    elif sort_by == 'price_asc':
        productos = productos.extra(
            select={'precio_final': 'COALESCE(precio_descuento, precio)'}
        ).order_by('precio_final')
    elif sort_by == 'price_desc':
        productos = productos.extra(
            select={'precio_final': 'COALESCE(precio_descuento, precio)'}
        ).order_by('-precio_final')
    elif sort_by == 'rating_desc':
        productos = productos.annotate(
            avg_rating=Avg('reviews__rating', filter=Q(reviews__activa=True))
        ).order_by('-avg_rating')
    elif sort_by == 'newest':
        productos = productos.order_by('-fecha_creacion')
    elif sort_by == 'popular':
        productos = productos.order_by('-ventas', '-vistas')
    else:
        productos = productos.order_by('-destacado', '-fecha_creacion')
    
    # Paginación
    paginator = Paginator(productos, items_per_page)
    page_number = request.GET.get('page', 1)
    page_obj = paginator.get_page(page_number)
    
    # Obtener datos para filtros
    categorias = Categoria.objects.filter(
        activa=True
    ).annotate(
        producto_count=Count('productos', filter=Q(productos__activo=True))
    ).order_by('orden', 'nombre')
    
    marcas = Marca.objects.filter(
        producto__activo=True
    ).distinct().order_by('nombre')
    
    # Si es petición AJAX, devolver JSON
    if request.headers.get('X-Requested-With') == 'XMLHttpRequest':
        productos_data = []
        for producto in page_obj:
            productos_data.append({
                'id': producto.id,
                'nombre': producto.nombre,
                'precio': str(producto.precio),
                'precio_final': str(producto.precio_final),
                'tiene_descuento': producto.tiene_descuento,
                'porcentaje_descuento': producto.porcentaje_descuento,
                'stock': producto.stock,
                'en_stock': producto.en_stock,
                'imagen': producto.imagenes.first().imagen.url if producto.imagenes.exists() else '',
                'categoria': producto.categoria.nombre,
                'rating_promedio': producto.rating_promedio,
                'total_reviews': producto.total_reviews,
                'nuevo': producto.nuevo,
                'destacado': producto.destacado,
                'url': producto.get_absolute_url(),
            })
        
        return JsonResponse({
            'success': True,
            'products': productos_data,
            'pagination': {
                'has_previous': page_obj.has_previous(),
                'has_next': page_obj.has_next(),
                'previous_page_number': page_obj.previous_page_number() if page_obj.has_previous() else None,
                'next_page_number': page_obj.next_page_number() if page_obj.has_next() else None,
                'number': page_obj.number,
                'num_pages': paginator.num_pages,
            },
            'total': paginator.count
        })
    
    context = {
        'productos': page_obj,
        'categorias': categorias,
        'marcas': marcas,
        'search_query': search_query,
        'current_filters': {
            'categorias': categoria_ids,
            'marcas': marca_ids,
            'precio_min': precio_min,
            'precio_max': precio_max,
            'disponibilidad': disponibilidad,
            'rating': rating_min,
            'sort': sort_by,
        }
    }
    return render(request, 'tienda/catalogo.html', context)

def producto_detalle(request, slug):
    """Vista de detalle de un producto específico"""
    producto = get_object_or_404(
        Producto.objects.select_related('categoria', 'marca').prefetch_related(
            'imagenes', 'reviews__usuario', 'atributos'
        ),
        slug=slug,
        activo=True
    )
    
    # Incrementar contador de vistas
    producto.vistas += 1
    producto.save(update_fields=['vistas'])
    
    # Obtener productos relacionados
    productos_relacionados = Producto.objects.filter(
        categoria=producto.categoria,
        activo=True
    ).exclude(id=producto.id)[:4]
    
    # Obtener reviews activas
    reviews = producto.reviews.filter(activa=True).order_by('-fecha_creacion')
    
    # Verificar si está en wishlist (si usuario autenticado)
    en_wishlist = False
    if request.user.is_authenticated:
        en_wishlist = Wishlist.objects.filter(
            usuario=request.user,
            producto=producto
        ).exists()
    
    context = {
        'producto': producto,
        'productos_relacionados': productos_relacionados,
        'reviews': reviews,
        'en_wishlist': en_wishlist,
    }
    return render(request, 'tienda/producto_detalle.html', context)

@require_http_methods(["POST"])
def quick_view(request, producto_id):
    """Vista rápida del producto (AJAX)"""
    try:
        producto = get_object_or_404(
            Producto.objects.select_related('categoria', 'marca').prefetch_related('imagenes'),
            id=producto_id,
            activo=True
        )
        
        html = render(request, 'tienda/partials/quick_view.html', {
            'producto': producto
        }).content.decode('utf-8')
        
        return JsonResponse({
            'success': True,
            'html': html
        })
    except Exception as e:
        return JsonResponse({
            'success': False,
            'error': str(e)
        })

@csrf_exempt
@require_http_methods(["POST"])
def carrito_ajax(request):
    """Manejo del carrito via AJAX"""
    try:
        data = json.loads(request.body)
        action = data.get('action')
        producto_id = data.get('product_id')
        cantidad = data.get('quantity', 1)
        
        producto = get_object_or_404(Producto, id=producto_id, activo=True)
        
        # Obtener o crear item del carrito
        if request.user.is_authenticated:
            carrito_item, created = CarritoItem.objects.get_or_create(
                usuario=request.user,
                producto=producto,
                defaults={'cantidad': 0}
            )
        else:
            session_key = request.session.session_key
            if not session_key:
                request.session.create()
                session_key = request.session.session_key
            
            carrito_item, created = CarritoItem.objects.get_or_create(
                session_key=session_key,
                producto=producto,
                defaults={'cantidad': 0}
            )
        
        if action == 'add':
            carrito_item.cantidad += cantidad
            carrito_item.save()
        elif action == 'update':
            carrito_item.cantidad = cantidad
            carrito_item.save()
        elif action == 'remove':
            carrito_item.delete()
            return JsonResponse({'success': True, 'message': 'Producto eliminado del carrito'})
        
        # Calcular totales del carrito
        if request.user.is_authenticated:
            items_carrito = CarritoItem.objects.filter(usuario=request.user)
        else:
            items_carrito = CarritoItem.objects.filter(session_key=session_key)
        
        total_items = sum(item.cantidad for item in items_carrito)
        subtotal = sum(item.subtotal for item in items_carrito)
        
        return JsonResponse({
            'success': True,
            'message': 'Carrito actualizado correctamente',
            'cart_count': total_items,
            'subtotal': str(subtotal)
        })
        
    except Exception as e:
        return JsonResponse({
            'success': False,
            'error': str(e)
        })

@require_http_methods(["POST"])
def productos_info(request):
    """Obtener información de productos para el carrito (AJAX)"""
    try:
        data = json.loads(request.body)
        product_ids = data.get('product_ids', [])
        
        productos = Producto.objects.filter(
            id__in=product_ids,
            activo=True
        ).prefetch_related('imagenes')
        
        productos_data = []
        for producto in productos:
            productos_data.append({
                'id': producto.id,
                'nombre': producto.nombre,
                'precio_final': float(producto.precio_final),
                'imagen': producto.imagenes.first().imagen.url if producto.imagenes.exists() else '',
                'en_stock': producto.en_stock,
                'stock': producto.stock
            })
        
        return JsonResponse(productos_data, safe=False)
        
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=400)

@login_required
@csrf_exempt
@require_http_methods(["POST"])
def wishlist_ajax(request):
    """Manejo de wishlist via AJAX"""
    try:
        data = json.loads(request.body)
        producto_id = data.get('product_id')
        action = data.get('action')
        
        producto = get_object_or_404(Producto, id=producto_id, activo=True)
        
        if action == 'add':
            wishlist_item, created = Wishlist.objects.get_or_create(
                usuario=request.user,
                producto=producto
            )
            message = 'Producto agregado a favoritos' if created else 'Producto ya estaba en favoritos'
        elif action == 'remove':
            Wishlist.objects.filter(
                usuario=request.user,
                producto=producto
            ).delete()
            message = 'Producto eliminado de favoritos'
        
        return JsonResponse({
            'success': True,
            'message': message
        })
        
    except Exception as e:
        return JsonResponse({
            'success': False,
            'error': str(e)
        })

def carrito(request):
    """Vista del carrito de compras"""
    if request.user.is_authenticated:
        items_carrito = CarritoItem.objects.filter(
            usuario=request.user
        ).select_related('producto').prefetch_related('producto__imagenes')
    else:
        session_key = request.session.session_key
        if session_key:
            items_carrito = CarritoItem.objects.filter(
                session_key=session_key
            ).select_related('producto').prefetch_related('producto__imagenes')
        else:
            items_carrito = CarritoItem.objects.none()
    
    subtotal = sum(item.subtotal for item in items_carrito)
    
    context = {
        'items_carrito': items_carrito,
        'subtotal': subtotal,
        'total': subtotal,  # Aquí puedes agregar impuestos, envío, etc.
    }
    return render(request, 'tienda/carrito.html', context)

@login_required
def mi_wishlist(request):
    """Vista de la lista de deseos del usuario"""
    wishlist_items = Wishlist.objects.filter(
        usuario=request.user
    ).select_related('producto').prefetch_related('producto__imagenes')
    
    context = {
        'wishlist_items': wishlist_items,
    }
    return render(request, 'tienda/wishlist.html', context)

def productos(request):
    """Vista de lista de productos (redirige al catálogo)"""
    return catalogo(request)

def contacto(request):
    """Vista de contacto"""
    if request.method == 'POST':
        # Aquí procesarías el formulario de contacto
        messages.success(request, 'Mensaje enviado correctamente. Te contactaremos pronto.')
    
    context = {
        'titulo': 'Contacto'
    }
    return render(request, 'tienda/contacto.html', context)
