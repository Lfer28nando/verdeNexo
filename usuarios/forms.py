from django import forms
from django.contrib.auth.forms import UserCreationForm, UserChangeForm
from .models import Usuario
from django.core.exceptions import ValidationError
from datetime import date
import phonenumbers
import re

# --- Funciones de validación reutilizables ---
def validar_telefono(telefono):
    if telefono:
        try:
            parsed = phonenumbers.parse(telefono, None)
            if not phonenumbers.is_valid_number(parsed):
                raise ValidationError("Número de teléfono inválido.")
            telefono = phonenumbers.format_number(parsed, phonenumbers.PhoneNumberFormat.E164)
        except:
            raise ValidationError("Número de teléfono inválido. Asegúrate de incluir código de país si aplica.")
    return telefono

def validar_cedula(cedula, rol):
    if rol in ["admin", "vendedor"] and not cedula:
        raise ValidationError("La cédula es obligatoria para administradores y vendedores.")
    if cedula and not cedula.isdigit():
        raise ValidationError("La cédula solo puede contener números.")
    return cedula

def validar_fecha(fecha):
    if fecha and fecha > date.today():
        raise ValidationError("La fecha de nacimiento no puede ser futura.")
    return fecha

def validar_password(password):
    if not password:
        raise ValidationError("La contraseña es obligatoria.")
    if len(password) < 8:
        raise ValidationError("La contraseña debe tener al menos 8 caracteres.")
    if not re.search(r"[A-Z]", password):
        raise ValidationError("La contraseña debe contener al menos una letra mayúscula.")
    if not re.search(r"[a-z]", password):
        raise ValidationError("La contraseña debe contener al menos una letra minúscula.")
    if not re.search(r"\d", password):
        raise ValidationError("La contraseña debe contener al menos un número.")
    if not re.search(r"[!@#$%^&*(),.?\":{}|<>]", password):
        raise ValidationError("La contraseña debe contener al menos un carácter especial (!@#$%^&* etc).")
    return password

# --- Formulario de registro ---
class UsuarioRegistroForm(UserCreationForm):
    class Meta:
        model = Usuario
        fields = [
            "email",
            "nombre",
            "apellido",
            "telefono",
            "cedula",
            "fechaNacimiento",
            "direccion",
            "rol",
            "password1",
            "password2"
        ]

    def clean_email(self):
        email = self.cleaned_data.get("email").lower()
        if Usuario.objects.filter(email=email).exists():
            raise ValidationError("¡Ups! Este correo ya está registrado, intenta con otro.")
        return email

    def clean_telefono(self):
        telefono = self.cleaned_data.get("telefono")
        telefono = validar_telefono(telefono)
        if telefono and Usuario.objects.filter(telefono=telefono).exists():
            raise ValidationError("¡Ups! Este teléfono ya está registrado.")
        return telefono

    def clean_cedula(self):
        cedula = self.cleaned_data.get("cedula")
        rol = self.cleaned_data.get("rol")
        return validar_cedula(cedula, rol)

    def clean_fechaNacimiento(self):
        fecha = self.cleaned_data.get("fechaNacimiento")
        return validar_fecha(fecha)

    def clean_password1(self):
        password = self.cleaned_data.get("password1")
        return validar_password(password)

# --- Formulario de actualización ---
class UsuarioUpdateForm(UserChangeForm):
    class Meta:
        model = Usuario
        fields = [
            "email",
            "nombre",
            "apellido",
            "telefono",
            "cedula",
            "fechaNacimiento",
            "direccion",
            "rol",
            "is_active",
        ]

    def clean_email(self):
        email = self.cleaned_data.get("email").lower()
        if Usuario.objects.exclude(pk=self.instance.pk).filter(email=email).exists():
            raise ValidationError("¡Ups! Este correo ya está registrado.")
        return email

    def clean_telefono(self):
        telefono = self.cleaned_data.get("telefono")
        telefono = validar_telefono(telefono)
        if telefono and Usuario.objects.exclude(pk=self.instance.pk).filter(telefono=telefono).exists():
            raise ValidationError("¡Ups! Este teléfono ya está registrado.")
        return telefono

    def clean_cedula(self):
        cedula = self.cleaned_data.get("cedula")
        rol = self.cleaned_data.get("rol")
        return validar_cedula(cedula, rol)

    def clean_fechaNacimiento(self):
        fecha = self.cleaned_data.get("fechaNacimiento")
        return validar_fecha(fecha)
