from rest_framework import serializers
from .models import Usuario
from .forms import validar_telefono, validar_cedula, validar_fecha, validar_password

class UsuarioSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, required=True)

    class Meta:
        model = Usuario
        # Incluimos 'id' para JWT y referencias internas
        fields = [
            "id",
            "email",
            "nombre",
            "apellido",
            "telefono",
            "cedula",
            "fechaNacimiento",
            "direccion",
            "rol",
            "password",
            "is_active",
        ]
        read_only_fields = ["id", "is_active"]

    # --- Validaciones ---
    def validate_telefono(self, value):
        return validar_telefono(value)

    def validate_cedula(self, value):
        rol = self.initial_data.get("rol")
        return validar_cedula(value, rol)

    def validate_fechaNacimiento(self, value):
        return validar_fecha(value)

    def validate_password(self, value):
        return validar_password(value)

    # --- Crear usuario ---
    def create(self, validated_data):
        password = validated_data.pop("password")
        usuario = Usuario(**validated_data)
        usuario.set_password(password)  # encripta la contraseña
        usuario.save()
        return usuario

    # --- Actualizar usuario ---
    def update(self, instance, validated_data):
        password = validated_data.pop("password", None)
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        if password:
            instance.set_password(password)
        instance.save()
        return instance

