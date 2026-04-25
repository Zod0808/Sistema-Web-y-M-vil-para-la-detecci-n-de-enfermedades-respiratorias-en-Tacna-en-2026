# 🚀 Guía de Configuración - RespiCare Backend

## ⚠️ Solución de Errores de TypeScript

Si encuentras errores de TypeScript al ejecutar `npm run dev`, sigue estos pasos:

### 1. Instalar Dependencias de Tipos Faltantes

**Opción A: Usar el script automático (Windows)**
```bash
# En el directorio backend
install-types.bat
```

**Opción B: Usar el script automático (Linux/Mac)**
```bash
# En el directorio backend
chmod +x install-types.sh
./install-types.sh
```

**Opción C: Instalación manual**
```bash
# En el directorio backend
npm install --save-dev @types/hpp @types/xss-clean @types/swagger-ui-express
```

### 2. Verificar Instalación

Después de instalar las dependencias, ejecuta:

```bash
npm run dev
```

## 📋 Pasos de Configuración Completa

### 1. Instalar Dependencias
```bash
cd backend
npm install
```

### 2. Configurar Variables de Entorno
```bash
# Copiar archivo de configuración
cp env.example .env

# Editar variables de entorno
nano .env  # o usar tu editor preferido
```

### 3. Configurar Base de Datos

**MongoDB:**
- Asegúrate de que MongoDB esté ejecutándose
- La URL por defecto es: `mongodb://localhost:27017/respicare`

**Redis (Opcional):**
- Para cache y sesiones
- URL por defecto: `redis://localhost:6379`

### 4. Compilar TypeScript
```bash
npm run build
```

### 5. Ejecutar en Desarrollo
```bash
npm run dev
```

### 6. Poblar Base de Datos (Opcional)
```bash
npm run seed
```

## 🔧 Configuración de Variables de Entorno

Crea un archivo `.env` en el directorio `backend/` con el siguiente contenido:

```env
# Servidor
NODE_ENV=development
PORT=3001
HOST=localhost

# Base de datos
MONGODB_URI=mongodb://localhost:27017/respicare
REDIS_URL=redis://localhost:6379

# JWT
JWT_SECRET=your_super_secret_jwt_key_here
JWT_EXPIRE=7d
JWT_REFRESH_SECRET=your_refresh_secret_key_here
JWT_REFRESH_EXPIRE=30d

# Seguridad
BCRYPT_ROUNDS=12
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# CORS
CORS_ORIGINS=http://localhost:3000,http://localhost:3001,http://localhost:8080

# IA Services
AI_SERVICE_URL=http://localhost:8000
OPENAI_API_KEY=your_openai_api_key_here

# Email (Opcional)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_app_password
FROM_EMAIL=noreply@respicare.com

# Logging
LOG_LEVEL=info
LOG_FILE=./logs/app.log
```

## 🐛 Solución de Problemas Comunes

### Error: "Could not find a declaration file for module"
```bash
# Instalar tipos faltantes
npm install --save-dev @types/[nombre-del-modulo]
```

### Error: "Cannot find module"
```bash
# Reinstalar dependencias
rm -rf node_modules package-lock.json
npm install
```

### Error: "MongoDB connection failed"
- Verificar que MongoDB esté ejecutándose
- Verificar la URL de conexión en `.env`
- Verificar permisos de acceso

### Error: "Port already in use"
```bash
# Cambiar puerto en .env
PORT=3002
```

## 📚 Endpoints Disponibles

Una vez que el servidor esté ejecutándose:

- **API Base**: `http://localhost:3001`
- **Documentación**: `http://localhost:3001/api/docs`
- **Health Check**: `http://localhost:3001/health`

### Endpoints Principales:
- `POST /api/v1/auth/register` - Registrar usuario
- `POST /api/v1/auth/login` - Iniciar sesión
- `GET /api/v1/medical-histories` - Listar historias médicas
- `POST /api/v1/symptom-analyzer/analyze` - Analizar síntomas
- `GET /api/v1/dashboard/admin` - Dashboard de administrador

## 🔑 Credenciales de Prueba

Después de ejecutar `npm run seed`:

- **Admin**: admin@respicare.com / admin123
- **Doctor**: doctor@respicare.com / password123
- **Paciente**: ana.lopez@email.com / password123

## 📝 Logs

Los logs se guardan en:
- `logs/app.log` - Logs de la aplicación
- Consola - Logs en tiempo real durante desarrollo

## 🚀 Próximos Pasos

1. Verificar que el backend esté funcionando
2. Configurar el frontend web
3. Configurar la aplicación móvil
4. Configurar los servicios de IA
5. Configurar la base de datos de producción

## 📞 Soporte

Si encuentras problemas:
1. Verificar los logs en `logs/app.log`
2. Verificar la configuración en `.env`
3. Verificar que todas las dependencias estén instaladas
4. Verificar que MongoDB esté ejecutándose
