from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status, permissions
from rest_framework_simplejwt.tokens import RefreshToken
from django.contrib.auth import authenticate, get_user_model
from .serializers import UsuarioSerializer
from django.shortcuts import get_object_or_404

Usuario = get_user_model()


# --------------------
# Registro
# --------------------
class RegistrarUsuario(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        serializer = UsuarioSerializer(data=request.data)
        if serializer.is_valid():
            usuario = serializer.save()
            refresh = RefreshToken.for_user(usuario)
            return Response({
                "status": "ok",
                "email": usuario.email,
                "rol": usuario.rol,
                "tokens": {
                    "refresh": str(refresh),
                    "access": str(refresh.access_token),
                }
            }, status=status.HTTP_201_CREATED)
        return Response({"status": "error", "errors": serializer.errors}, status=status.HTTP_400_BAD_REQUEST)


# --------------------
# Login
# --------------------
class LoginUsuario(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        email = request.data.get("email")
        password = request.data.get("password")
        usuario = authenticate(request, email=email, password=password)
        if usuario:
            if not usuario.is_active:
                return Response({"status": "error", "message": "Usuario inactivo"}, status=status.HTTP_403_FORBIDDEN)
            refresh = RefreshToken.for_user(usuario)
            return Response({
                "status": "ok",
                "email": usuario.email,
                "rol": usuario.rol,
                "tokens": {
                    "refresh": str(refresh),
                    "access": str(refresh.access_token),
                }
            })
        return Response({"status": "error", "message": "Credenciales inválidas"}, status=status.HTTP_401_UNAUTHORIZED)


# --------------------
# Detalle y actualización
# --------------------
class UsuarioDetalleActualizar(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, email):
        usuario = get_object_or_404(Usuario, email=email)
        if request.user.rol != "admin" and request.user.email != email:
            return Response({"status": "error", "message": "No autorizado"}, status=status.HTTP_403_FORBIDDEN)
        serializer = UsuarioSerializer(usuario)
        return Response({"status": "ok", "data": serializer.data})

    def put(self, request, email):
        usuario = get_object_or_404(Usuario, email=email)
        if request.user.rol != "admin" and request.user.email != email:
            return Response({"status": "error", "message": "No autorizado"}, status=status.HTTP_403_FORBIDDEN)
        serializer = UsuarioSerializer(usuario, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response({"status": "ok", "data": serializer.data})
        return Response({"status": "error", "errors": serializer.errors}, status=status.HTTP_400_BAD_REQUEST)


# --------------------
# Eliminar usuario
# --------------------
class UsuarioEliminar(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def delete(self, request, email):
        if request.user.rol != "admin":
            return Response({"status": "error", "message": "No autorizado"}, status=status.HTTP_403_FORBIDDEN)
        usuario = get_object_or_404(Usuario, email=email)
        usuario.delete()
        return Response({"status": "ok", "message": f"Usuario {email} eliminado"})
