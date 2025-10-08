# VerdeNexo - Deploy en Render

## Problemas Solucionados

### 1. Imports incorrectos
- ✅ Corregidos imports de rutas en `app.js`
- ✅ Corregidos imports en controladores y rutas
- ✅ Convertido `checkout.routes.js` de CommonJS a ES6 modules

### 2. Archivos index.js faltantes
- ✅ Creados archivos `index.js` para todas las rutas:
  - `routes/auth/index.js`
  - `routes/productos/index.js`
  - `routes/carrito/index.js`
  - `routes/checkout/index.js`
  - `routes/pedidos/index.js`

### 3. Health Check
- ✅ Agregado endpoint `/health` para Render
- ✅ Configurado middleware de API key para permitir health check

### 4. Configuración de Deploy
- ✅ Creado `render.yaml` con configuración completa
- ✅ Creado `.env.example` con variables necesarias

## Variables de Entorno Requeridas en Render

Configura estas variables en tu dashboard de Render:

### Requeridas:
- `MONGO_URI`: Tu connection string de MongoDB
- `API_KEY`: Clave secreta para proteger la API
- `SESSION_SECRET`: Clave para sesiones (puede ser generada automáticamente)

### Opcionales:
- `MONGO_DB_NAME`: Nombre de la base de datos (default: "verdenexo")
- `NODE_ENV`: "production"
- `PORT`: 10000 (automático en Render)
- `FRONTEND_URL`: URL de tu frontend

## Instrucciones de Deploy

1. **Conecta tu repositorio a Render**
2. **Configura las variables de entorno**
3. **Usa la configuración del render.yaml**
4. **Deploy automático**

## Health Check

El servidor responde en:
- `/health` - Health check público
- `/api/productos` - Endpoint protegido con API key

## Scripts Disponibles

```bash
npm run start       # Iniciar servidor
npm run dev         # Desarrollo con nodemon
npm run check-config # Verificar configuración
```

## Troubleshooting

Si el deploy falla:

1. Verifica que todas las variables de entorno estén configuradas
2. Revisa los logs en Render para errores específicos
3. Usa `npm run check-config` localmente para verificar configuración
4. Asegúrate de que MongoDB esté accesible desde Render