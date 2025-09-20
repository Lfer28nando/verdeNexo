from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from django.utils.html import format_html
from .models import Usuario


@admin.register(Usuario)
class UsuarioAdmin(UserAdmin):
    model = Usuario
    ordering = ("-creadoEn",)
    list_display = (
        "email",
        "nombre",
        "apellido",
        "rol_coloreado",
        "telefono",
        "cedula",
        "is_active",
        "is_staff",
        "creadoEn",
    )
    list_filter = ("rol", "is_active", "is_staff")
    search_fields = ("email", "nombre", "apellido", "telefono", "cedula")
    readonly_fields = ("creadoEn", "actualizadoEn")

    # -----------------------------
    # Campos para detalle y edición
    # -----------------------------
    fieldsets = (
        ("Credenciales", {"fields": ("email", "password", "emailVerificado")}),
        (
            "Información Personal",
            {
                "fields": (
                    "nombre",
                    "apellido",
                    "telefono",
                    "cedula",
                    "fechaNacimiento",
                    "direccion",
                )
            },
        ),
        (
            "Rol y permisos",
            {
                "fields": (
                    "rol",
                    "is_active",
                    "is_staff",
                    "is_superuser",
                    "groups",
                    "user_permissions",
                )
            },
        ),
        ("Login Social", {"fields": ("proveedor", "googleId", "fotoPerfil")}),
        ("Auditoría", {"fields": ("creadoEn", "actualizadoEn")}),
    )

    # -----------------------------
    # Campos para agregar usuario
    # -----------------------------
    add_fieldsets = (
        (
            None,
            {
                "classes": ("wide",),
                "fields": (
                    "email",
                    "nombre",
                    "apellido",
                    "password1",
                    "password2",
                    "rol",
                    "is_active",
                    "is_staff",
                ),
            },
        ),
    )

    # -----------------------------
    # Acciones personalizadas
    # -----------------------------
    actions = [
        "marcar_email_verificado",
        "activar_usuarios",
        "desactivar_usuarios",
        "asignar_rol_admin",
    ]

    # -----------------------------
    # Métodos auxiliares
    # -----------------------------
    def rol_coloreado(self, obj):
        color = {
            "admin": "red",
            "vendedor": "orange",
            "cliente": "green",
        }.get(obj.rol, "black")
        return format_html('<span style="color: {};">{}</span>', color, obj.rol)

    rol_coloreado.short_description = "Rol"

    def marcar_email_verificado(self, request, queryset):
        updated = queryset.update(emailVerificado=True)
        self.message_user(request, f"{updated} usuario(s) marcado(s) como verificado(s).")
    marcar_email_verificado.short_description = "Marcar email como verificado"

    def activar_usuarios(self, request, queryset):
        updated = queryset.update(is_active=True)
        self.message_user(request, f"{updated} usuario(s) activado(s).")
    activar_usuarios.short_description = "Activar usuarios seleccionados"

    def desactivar_usuarios(self, request, queryset):
        updated = queryset.update(is_active=False)
        self.message_user(request, f"{updated} usuario(s) desactivado(s).")
    desactivar_usuarios.short_description = "Desactivar usuarios seleccionados"

    def asignar_rol_admin(self, request, queryset):
        updated = queryset.update(rol="admin")
        self.message_user(request, f"{updated} usuario(s) asignado(s) como administrador.")
    asignar_rol_admin.short_description = "Asignar rol de Administrador"

    # -----------------------------
    # Protección extra para no perder admin
    # -----------------------------
    def save_model(self, request, obj, form, change):
        # Evitar que el último admin se quede sin rol admin
        if obj.pk and obj.rol != "admin" and obj.is_superuser:
            obj.rol = "admin"
        super().save_model(request, obj, form, change)
