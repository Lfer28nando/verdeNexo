from django.urls import path
from .views import RegistrarUsuario, LoginUsuario, UsuarioDetalleActualizar, UsuarioEliminar
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView
from django.views.generic import TemplateView

urlpatterns = [
    # Usuarios
    path("registrar/", RegistrarUsuario.as_view(), name="registrar_usuario"),
    path("login/", LoginUsuario.as_view(), name="login_usuario"),
    path("<str:email>/", UsuarioDetalleActualizar.as_view(), name="detalle_actualizar_usuario"),
    path("<str:email>/eliminar/", UsuarioEliminar.as_view(), name="eliminar_usuario"),

    # JWT
    path("token/", TokenObtainPairView.as_view(), name="token_obtain_pair"),        # login alternativo
    path("token/refresh/", TokenRefreshView.as_view(), name="token_refresh"),       # refrescar access token
]

# Endpoints frontend simples (páginas de prueba)
urlpatterns += [
    path('login/page/', TemplateView.as_view(template_name='usuarios/login.html'), name='login_page'),
    path('register/page/', TemplateView.as_view(template_name='usuarios/register.html'), name='register_page'),
]
