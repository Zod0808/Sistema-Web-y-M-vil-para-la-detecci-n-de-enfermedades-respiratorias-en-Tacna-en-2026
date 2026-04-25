# Medical App - Aplicación Web Next.js / Mobile APK

Esta es una aplicación web desarrollada con Next.js que simula una interfaz móvil para el sistema de enfermedades respiratorias RespiCare. También puede compilarse como aplicación móvil nativa para Android usando Capacitor.

## 🚀 Ejecutar la aplicación en web

### Requisitos previos
- Node.js instalado (versión 18 o superior recomendada)
- npm o pnpm instalado
- Backend de RespiCare corriendo en `http://localhost:3001`

### Configuración

1. **Instalar dependencias**:
```bash
npm install
# o si prefieres usar pnpm
pnpm install
```

2. **Configurar variables de entorno**:

   **Opción A - Automático (Recomendado para desarrollo móvil)**:
   ```bash
   npm run config:ip
   ```
   Este comando detecta automáticamente tu IP local y crea el archivo `.env.local`.

   **Opción B - Manual**:
   Crea un archivo `.env.local` en la raíz del proyecto:
   ```bash
   # Para desarrollo local (web):
   NEXT_PUBLIC_API_URL=http://localhost:3001/api/v1
   NEXT_PUBLIC_AI_SERVICE_URL=http://localhost:8000

   # Para dispositivo móvil (reemplaza TU_IP_LOCAL con tu IP local):
   NEXT_PUBLIC_API_URL=http://TU_IP_LOCAL:3001/api/v1
   NEXT_PUBLIC_AI_SERVICE_URL=http://TU_IP_LOCAL:8000
   ```
   
   📖 **Más información**: Consulta `CONFIGURACION_RED.md` para instrucciones detalladas sobre cómo conectar la app móvil con Docker.

### Ejecutar en modo desarrollo

3. **Iniciar el servidor de desarrollo**:
```bash
npm run dev
# o
pnpm dev
```

4. **Abrir en el navegador**:
   - La aplicación estará disponible en: `http://localhost:8083`
   - Se abrirá automáticamente en tu navegador predeterminado

### Otros comandos disponibles

- **Construir para producción**:
```bash
npm run build
```

- **Ejecutar versión de producción** (después de construir):
```bash
npm start
```

- **Ejecutar linter**:
```bash
npm run lint
```

## 📁 Estructura del proyecto

- `app/` - Páginas y layouts de Next.js (App Router)
- `components/` - Componentes React reutilizables
- `lib/api/` - Servicios API para comunicación con el backend
- `lib/types/` - Tipos TypeScript compartidos
- `store/` - Store global con Zustand
- `hooks/` - Hooks personalizados
- `public/` - Archivos estáticos (imágenes, iconos)
- `styles/` - Estilos globales

## 🔗 Integración con Backend

La aplicación está completamente integrada con el backend de RespiCare.

### 📱 Conectar App Móvil con Docker

Si vas a usar la app en un dispositivo físico, necesitas configurar la conexión con Docker:

**🚀 Guía Rápida**: Ver `GUIA_RAPIDA_CONEXION.md` para instrucciones paso a paso.

**Pasos rápidos**:
1. Ejecuta `npm run config:ip` para configurar tu IP local
2. Configura el firewall: `powershell -ExecutionPolicy Bypass -File scripts/configure-firewall.ps1` (como Admin)
3. Prueba la conexión: `npm run test:connection`
4. Genera el APK: `npm run apk`

📖 **Guía completa para generar APK**: Ver `GENERAR_APK.md`

Para más detalles, consulta `CONFIGURACION_RED.md`.

### 🌐 Acceso Externo (Sin Cables ni Misma WiFi)

Si quieres usar la app en un teléfono real desde cualquier lugar (sin estar en la misma red WiFi), necesitas exponer tu backend a internet.

**🚀 Guía Completa**: Ver `GUIA_ACCESO_EXTERNO.md` para todas las opciones disponibles.

**Opciones rápidas:**

1. **ngrok - Ambos Endpoints** ⭐ (Recomendado para desarrollo remoto):
   ```bash
   npm run tunnel:ngrok
   ```
   Este comando configura automáticamente:
   - ✅ Túnel para Backend (puerto 3001)
   - ✅ Túnel para AI Services (puerto 8000)
   - ✅ Inicia ambos túneles en ventanas separadas
   - ✅ Obtiene URLs desde ambos paneles (4040 y 4041)
   - ✅ Actualiza `.env.local` automáticamente con ambas URLs
   - ✅ Muestra las URLs públicas obtenidas
   
   📖 **Guía de implementación**: Ver `GUIA_NGROK_IMPLEMENTACION.md` para instrucciones detalladas.

2. **ngrok - Método Simple** (Ventanas separadas):
   ```bash
   npm run tunnel:ngrok:simple
   ```
   Inicia ambos túneles en ventanas separadas (método alternativo)

3. **ngrok - Solo Backend** (Método legacy):
   ```bash
   npm run tunnel:ngrok:legacy
   ```
   Solo inicia el túnel del Backend (requiere configurar AI Services manualmente)

4. **Cloudflare Tunnel** (Recomendado para uso continuo):
   ```bash
   npm run tunnel:cloudflare
   ```
   Requiere configuración inicial (ver guía completa)

5. **Servidor en la nube** (Para producción):
   - Railway, Render, Fly.io, etc.
   - Ver `GUIA_ACCESO_EXTERNO.md` para detalles

**Comandos útiles:**
- `npm run tunnel:ngrok:stop` - Detiene todos los procesos de ngrok

📖 **Guías detalladas**: 
- `GUIA_NGROK_IMPLEMENTACION.md` ⭐ - **Nueva guía completa de implementación**
- `GUIA_NGROK_COMPLETA.md` - Configuración completa con ngrok
- `GUIA_ACCESO_EXTERNO.md` - Todas las opciones disponibles

### Funcionalidades Integradas

✅ **Autenticación**
- Login y registro de usuarios
- Refresh token automático
- Logout
- Gestión de perfil

✅ **Historias Médicas**
- CRUD completo
- Listado con filtros
- Sincronización offline

✅ **Análisis de Síntomas**
- Análisis con IA
- Historial de análisis
- Recomendaciones

✅ **Citas Médicas**
- Crear, listar, reprogramar, cancelar citas
- Próximas citas
- Disponibilidad de doctores

✅ **Alertas**
- Listado de alertas
- Reconocer alertas
- Dashboard de alertas

✅ **Dashboard**
- Dashboard personalizado por rol (paciente, doctor, admin)
- Estadísticas en tiempo real
- Analytics

✅ **Wearables**
- Métricas de salud
- Sincronización de datos

## 🌐 Acceso

Una vez que el servidor esté corriendo, puedes acceder a la aplicación en:
- **URL local**: http://localhost:8083
- El servidor se recarga automáticamente cuando haces cambios en el código (Hot Reload)

## 🔧 Solución de problemas

### Error: "Unable to acquire lock"

Si ves el error:
```
⨯ Unable to acquire lock at .next/dev/lock, is another instance of next dev running?
```

**Solución rápida (Windows PowerShell):**

1. **Opción 1: Usar el script de limpieza automática**
   ```powershell
   cd mobile/medical-app
   .\limpiar-y-ejecutar.ps1
   ```

2. **Opción 2: Limpiar manualmente**
   ```powershell
   # Eliminar archivo de lock
   Remove-Item -Path mobile/medical-app/.next/dev/lock -Force -ErrorAction SilentlyContinue
   
   # O eliminar todo el directorio .next
   Remove-Item -Path mobile/medical-app/.next -Recurse -Force -ErrorAction SilentlyContinue
   
   # Terminar procesos de Node.js si es necesario
   Get-Process node -ErrorAction SilentlyContinue | Stop-Process -Force
   
   # Luego ejecutar normalmente
   cd mobile/medical-app
   npm run dev
   ```

3. **Opción 3: Usar el Administrador de tareas**
   - Abre el Administrador de tareas (Ctrl + Shift + Esc)
   - Busca procesos de "Node.js"
   - Termínalos manualmente
   - Luego ejecuta `npm run dev` nuevamente

### Puerto 8083 en uso

Si el puerto 8083 está ocupado, puedes:

1. **Ver qué proceso está usando el puerto:**
   ```powershell
   netstat -ano | Select-String ":8083"
   ```

2. **Terminar el proceso (reemplaza PID con el número que encuentres):**
   ```powershell
   Stop-Process -Id <PID> -Force
   ```

### Error de conexión con el backend

Asegúrate de que:
1. El backend esté corriendo en `http://localhost:3001`
2. La variable `NEXT_PUBLIC_API_URL` en `.env.local` apunte al backend correcto
3. El backend tenga CORS configurado para permitir `http://localhost:8083`

## 🛠️ Tecnologías utilizadas

- **Next.js 16** - Framework de React
- **React 19** - Biblioteca de UI
- **TypeScript** - Tipado estático
- **Tailwind CSS** - Estilos
- **Radix UI** - Componentes accesibles
- **shadcn/ui** - Componentes UI modernos
- **Zustand** - Estado global
- **Sonner** - Notificaciones toast

## 📱 Generar APK para Android

Esta aplicación puede compilarse como APK para instalar en dispositivos Android.

### Opción Rápida (Recomendada)

1. **Instalar y configurar Capacitor:**
   ```powershell
   .\instalar-capacitor.ps1
   ```

2. **Generar APK Debug (para testing):**
   ```powershell
   .\generar-apk.ps1 debug
   ```

3. **Generar APK Release (para producción):**
   ```powershell
   .\generar-apk.ps1 release
   ```

### Requisitos Previos

- **Android Studio** instalado
- **Android SDK** configurado
- Variables de entorno `ANDROID_HOME` configurada
- **Java JDK 17** o superior

### Documentación Completa

Ver [docs/mobile/GUIA_GENERAR_APK.md](../../docs/mobile/GUIA_GENERAR_APK.md) para instrucciones detalladas paso a paso.

## 📚 Documentación Adicional

- [docs/mobile/GUIA_GENERAR_APK.md](../../docs/mobile/GUIA_GENERAR_APK.md) - Guía completa para generar APK
- [docs/mobile/INICIO_RAPIDO_APK.md](../../docs/mobile/INICIO_RAPIDO_APK.md) - Inicio rápido para generar APK
- [docs/mobile/ANALISIS_ROADMAP.md](../../docs/mobile/ANALISIS_ROADMAP.md) - Análisis del roadmap y estado de funcionalidades
- `INTEGRACION_BACKEND.md` - Guía completa de integración con el backend
- Ver también: `/backend/README.md` - Documentación del backend
