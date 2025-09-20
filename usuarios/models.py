from django.contrib.auth.models import AbstractBaseUser, PermissionsMixin, BaseUserManager
from django.db import models
from django.core.validators import RegexValidator, MinLengthValidator
from django.core.exceptions import ValidationError
from datetime import date


class UsuarioManager(BaseUserManager):
    def create_user(self, email, password=None, **extra_fields):
        if not email:
            raise ValueError("El usuario debe tener un correo electrónico válido")
        email = self.normalize_email(email)
        extra_fields.setdefault("is_active", True)
        user = self.model(email=email, **extra_fields)
        user.set_password(password)
        user.full_clean()  # Valida antes de guardar
        user.save(using=self._db)
        return user

    def create_superuser(self, email, password=None, **extra_fields):
        extra_fields.setdefault("is_staff", True)
        extra_fields.setdefault("is_superuser", True)
        extra_fields.setdefault("rol", "admin")
        return self.create_user(email, password, **extra_fields)


class Usuario(AbstractBaseUser, PermissionsMixin):
    # ID para compatibilidad con JWT
    id = models.BigAutoField(primary_key=True)
    # Identificación
    email = models.EmailField(unique=True)
    emailVerificado = models.BooleanField(default=False)
    nombre = models.CharField(max_length=150)
    apellido = models.CharField(max_length=150, blank=True, null=True)

    USERNAME_FIELD = 'email'  # login con email
    REQUIRED_FIELDS = ['nombre', 'apellido']

    telefono = models.CharField(
        max_length=15,
        blank=True,
        null=True,
        unique=True,
        db_index=True,
        validators=[
            RegexValidator(r'^\+?\d+$', 'El teléfono debe contener solo números y puede iniciar con +.')
        ]
    )

    cedula = models.CharField(
        max_length=10,
        blank=True,
        null=True,
        unique=True,
        db_index=True,
        validators=[
            RegexValidator(r'^\d+$', 'La cédula solo puede contener números.'),
            MinLengthValidator(6, 'La cédula debe tener al menos 6 dígitos.')
        ]
    )

    rol = models.CharField(
        max_length=20,
        choices=[
            ('admin', 'Administrador'),
            ('vendedor', 'Vendedor'),
            ('cliente', 'Cliente'),
        ],
        default='cliente',
        db_index=True
    )

    # Datos extra
    fechaNacimiento = models.DateField(null=True, blank=True)
    direccion = models.TextField(blank=True, null=True)

    # Login social
    proveedor = models.CharField(max_length=50, blank=True, null=True)  # google, facebook, etc.
    googleId = models.CharField(max_length=255, blank=True, null=True, unique=True)
    fotoPerfil = models.URLField(blank=True, null=True)

    # Flags Django
    is_staff = models.BooleanField(default=False)
    is_active = models.BooleanField(default=True)

    # Auditoría
    creadoEn = models.DateTimeField(auto_now_add=True)
    actualizadoEn = models.DateTimeField(auto_now=True)

    objects = UsuarioManager()

    USERNAME_FIELD = "email"
    REQUIRED_FIELDS = ["nombre"]

    class Meta:
        verbose_name = "Usuario"
        verbose_name_plural = "Usuarios"
        ordering = ["-creadoEn"]
        indexes = [
            models.Index(fields=["rol"]),
            models.Index(fields=["emailVerificado"]),
        ]

    # ------------------------
    # Validaciones
    # ------------------------
    def clean(self):
        # Fecha válida
        if self.fechaNacimiento and self.fechaNacimiento > date.today():
            raise ValidationError("La fecha de nacimiento no puede ser futura.")

        # Cédula obligatoria solo para admin/vendedor
        if self.rol in ["admin", "vendedor"] and not self.cedula:
            raise ValidationError("Los administradores y vendedores deben registrar su cédula.")

    # ------------------------
    # Métodos útiles
    # ------------------------
    def nombre_completo(self):
        return f"{self.nombre} {self.apellido or ''}".strip()

    def edad(self):
        if self.fechaNacimiento:
            today = date.today()
            return today.year - self.fechaNacimiento.year - (
                (today.month, today.day) < (self.fechaNacimiento.month, self.fechaNacimiento.day)
            )
        return None

    def get_full_name(self):
        return self.nombre_completo()

    def get_short_name(self):
        return self.nombre

    # ------------------------
    # Permisos personalizados
    # ------------------------
    def has_perm(self, perm, obj=None):
        if self.is_superuser:
            return True
        if self.rol == "admin":
            return True
        return super().has_perm(perm, obj)

    def has_module_perms(self, app_label):
        return True

    # ------------------------
    # Normalización de valores
    # ------------------------
    def save(self, *args, **kwargs):
        if self.nombre:
            self.nombre = self.nombre.strip().title()
        if self.apellido:
            self.apellido = self.apellido.strip().title()
        if self.email:
            self.email = self.email.lower().strip()
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.email} ({self.rol})"
