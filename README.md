# verdeNexo

¡Bienvenido a verdeNexo! Este proyecto es una plataforma integral para la gestión de ventas, pedidos y usuarios, ideal para comercios que buscan digitalizar y optimizar sus operaciones.

## Tabla de Contenidos
- [Descripción](#descripción)
- [Características](#características)
- [Estructura del Proyecto](#estructura-del-proyecto)
- [Instalación](#instalación)
- [Configuración](#configuración)
- [Despliegue](#despliegue)
- [Contribuir](#contribuir)
- [Licencia](#licencia)

## Descripción
**verdeNexo** es una solución modular que integra backend y frontend para la gestión de productos, pedidos, usuarios, carritos de compra y más. Pensado para ser escalable y fácil de mantener.

## Características
- Gestión de productos, carritos y pedidos
- Autenticación de usuarios y administración
- Integración de métodos de pago y zonas de envío
- Notificaciones y generación de facturas
- Panel de administración y vistas públicas
- API RESTful documentada

## Estructura del Proyecto
```
verdeNexo/
├── backend/        # Lógica de negocio, API y modelos
├── frontend/       # Interfaz de usuario
├── uploads/        # Archivos subidos
├── views/          # Plantillas de vistas
├── DEPLOY_GUIDE.md # Guía de despliegue
├── render.yaml     # Configuración de despliegue
└── package.json    # Dependencias y scripts globales
```

## Instalación
1. Clona el repositorio:
   ```bash
   git clone https://github.com/Lfer28nando/verdeNexo.git
   cd verdeNexo
   ```
2. Instala dependencias en backend y frontend:
   ```bash
   cd backend && npm install
   cd ../frontend && npm install
   ```

## Configuración
- Copia y ajusta los archivos de configuración según tus credenciales y entorno.
- Revisa `backend/src/config.js` y variables de entorno necesarias.

## Despliegue
Consulta `DEPLOY_GUIDE.md` para instrucciones detalladas de despliegue en producción.