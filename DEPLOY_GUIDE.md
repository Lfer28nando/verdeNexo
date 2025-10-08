# Guía de Deploy en Render para verdeNexo

## 📋 Preparativos antes del deploy

### 1. Configurar MongoDB Atlas (Base de datos en la nube)
- Ve a [MongoDB Atlas](https://www.mongodb.com/atlas)
- Crea una cuenta gratuita si no tienes
- Crea un nuevo cluster (puedes usar el tier gratuito)
- Configura un usuario de base de datos
- Obtén la URL de conexión (formato: `mongodb+srv://usuario:password@cluster.mongodb.net/`)
- **IMPORTANTE**: En Network Access, agrega `0.0.0.0/0` para permitir conexiones desde Render

### 2. Preparar el código
- Asegúrate de que todos los cambios estén commiteados en Git
- Sube tu código a GitHub, GitLab o Bitbucket

## 🚀 Proceso de Deploy en Render

### Paso 1: Crear cuenta en Render
1. Ve a [render.com](https://render.com)
2. Regístrate usando tu cuenta de GitHub (recomendado)

### Paso 2: Crear un nuevo Web Service
1. En el dashboard de Render, haz clic en "New +"
2. Selecciona "Web Service"
3. Conecta tu repositorio de GitHub
4. Busca y selecciona tu repositorio `verdeNexo`

### Paso 3: Configurar el servicio
Llena los siguientes campos:

**Configuración básica:**
- **Name**: `verdenexo` (o el nombre que prefieras)
- **Environment**: `Node`
- **Region**: `Frankfurt` (o la más cercana a tus usuarios)
- **Branch**: `main` (o la rama que quieras deployar)

**Comandos de build y start:**
- **Build Command**: `npm install && cd backend && npm install && cd ../frontend && npm install`
- **Start Command**: `cd backend && npm start`

**Plan:**
- Selecciona el plan "Free" (para comenzar)

### Paso 4: Configurar Variables de Entorno
En la sección "Environment Variables", agrega las siguientes variables:

| Variable | Valor | Descripción |
|----------|-------|-------------|
| `NODE_ENV` | `production` | Entorno de producción |
| `PORT` | `10000` | Puerto por defecto de Render |
| `MONGO_URI` | `tu_url_de_mongodb_atlas` | URL de conexión a MongoDB |
| `MONGO_DB_NAME` | `verdenexo_production` | Nombre de tu base de datos |
| `SESSION_SECRET` | `tu_session_secret_seguro` | Secreto para sesiones |
| `JWT_SECRET` | `tu_jwt_secret_seguro` | Secreto para JWT |
| `API_KEY` | `tu_api_key_segura` | Tu API key |
| `EMAIL_USER` | `tu_email@gmail.com` | Email para notificaciones |
| `EMAIL_PASS` | `tu_password_de_email` | Password del email |
| `FRONTEND_URL` | `https://tu-app-name.onrender.com` | URL de tu app |

**⚠️ IMPORTANTE**: 
- No uses valores de prueba en producción
- Genera secretos seguros para SESSION_SECRET y JWT_SECRET
- El FRONTEND_URL lo sabrás después del primer deploy

### Paso 5: Deployar
1. Haz clic en "Create Web Service"
2. Render comenzará a buildear tu aplicación
3. El proceso puede tomar 5-15 minutos la primera vez
4. Una vez completado, obtendrás una URL como `https://verdenexo.onrender.com`

### Paso 6: Actualizar FRONTEND_URL
1. Copia la URL que te asignó Render
2. Ve a "Environment" en el dashboard de tu servicio
3. Actualiza la variable `FRONTEND_URL` con tu URL real
4. Haz clic en "Save Changes" (esto redeploy automáticamente)

## 🔧 Configuraciones adicionales

### Dominios personalizados
Si tienes un dominio propio:
1. Ve a "Settings" → "Custom Domains"
2. Agrega tu dominio
3. Configura los DNS según las instrucciones de Render

### Monitoreo
- Render te proporciona logs en tiempo real
- Puedes configurar notificaciones de deploy
- El servicio se reinicia automáticamente si falla

### Actualizaciones
- Cada push a la rama `main` triggerea un nuevo deploy automáticamente
- Puedes configurar deploys manuales si prefieres

## 🐛 Solución de problemas comunes

### Error de conexión a MongoDB
- Verifica que la URL de MongoDB esté correcta
- Asegúrate de que Network Access en MongoDB Atlas permita conexiones desde `0.0.0.0/0`
- Verifica que el usuario de BD tenga permisos de lectura/escritura

### Error de CORS
- Verifica que `FRONTEND_URL` esté configurado correctamente
- Asegúrate de que coincida exactamente con la URL de Render

### Error de variables de entorno
- Todas las variables deben estar configuradas en Render
- No uses archivos `.env` en producción, solo variables de entorno de Render

### Aplicación lenta o que se duerme
- El plan gratuito de Render "duerme" la aplicación después de 15 minutos de inactividad
- Para apps de producción, considera upgrading a un plan pagado

## 📝 Checklist final

- [ ] MongoDB Atlas configurado y accesible
- [ ] Código subido a repositorio Git
- [ ] Web Service creado en Render
- [ ] Todas las variables de entorno configuradas
- [ ] Primera build exitosa
- [ ] URL actualizada en FRONTEND_URL
- [ ] Aplicación funcionando correctamente
- [ ] Pruebas de funcionalidad realizadas

## 🎉 ¡Listo!

Tu aplicación verdeNexo ahora está disponible en internet. Los usuarios pueden acceder tanto al frontend como a la API desde la misma URL de Render.

**URLs disponibles:**
- Frontend: `https://tu-app.onrender.com/`
- Admin: `https://tu-app.onrender.com/admin`
- API: `https://tu-app.onrender.com/api/`
- Uploads: `https://tu-app.onrender.com/uploads/`