# 🚀 Guía Completa: Configuración Remota con ngrok

Esta guía te muestra cómo configurar tu app móvil para funcionar de manera remota usando ngrok, exponiendo todos los servicios necesarios (Backend y AI Services).

## 📋 Requisitos Previos

1. **ngrok instalado** (ver instalación abajo)
2. **Docker corriendo** con los servicios:
   - Backend en puerto `3001`
   - AI Services en puerto `8000`
3. **Node.js y npm** instalados

## 🔧 Instalación Rápida de ngrok

### Opción 1: Chocolatey (Recomendado)
```powershell
choco install ngrok
```

### Opción 2: Descarga Manual
1. Ve a https://ngrok.com/download
2. Descarga ngrok para Windows
3. Extrae `ngrok.exe` a una carpeta (ej: `C:\ngrok`)
4. Agrega la carpeta al PATH del sistema

### Opción 3: Automática (el script lo hace por ti)
El script `setup-ngrok-remote.ps1` puede instalar ngrok automáticamente si lo permites.

## 🎯 Configuración Automática (Recomendado)

### Paso 1: Iniciar Servicios Docker

Asegúrate de que todos los servicios estén corriendo:

```powershell
# Desde la raíz del proyecto
docker-compose up -d
```

Verifica que estén corriendo:
```powershell
docker ps
```

Deberías ver:
- `respicare-backend-dev` en puerto 3001
- `respicare-ai-dev` en puerto 8000

### Paso 2: Ejecutar Script de Configuración

```powershell
cd mobile/medical-app
npm run tunnel:ngrok:full
```

Este script:
1. ✅ Verifica que ngrok esté instalado
2. ✅ Verifica que los servicios estén corriendo
3. ✅ Crea configuración de ngrok para múltiples túneles
4. ✅ Inicia ngrok exponiendo Backend (3001) y AI Services (8000)
5. ✅ Obtiene las URLs públicas automáticamente
6. ✅ Actualiza `.env.local` con las URLs correctas

### Paso 3: Verificar Configuración

El script te mostrará las URLs públicas. También puedes verlas en:
- **Panel web de ngrok**: http://localhost:4040
- **Archivo `.env.local`**: Verifica que tenga las URLs correctas

### Paso 4: Recompilar la App

```powershell
npm run build
npm run capacitor:sync
```

### Paso 5: Generar APK

```powershell
npm run apk
```

### Paso 6: Instalar en el Teléfono

Transfiere la APK generada a tu teléfono e instálala. La app funcionará desde cualquier lugar con internet.

## 📝 Configuración Manual (Si prefieres hacerlo paso a paso)

### 1. Iniciar ngrok para Backend

```powershell
ngrok http 3001
```

Copia la URL HTTPS que aparece (ej: `https://abc123.ngrok.io`)

### 2. Iniciar ngrok para AI Services (en otra terminal)

```powershell
ngrok http 8000
```

Copia la URL HTTPS que aparece (ej: `https://xyz789.ngrok.io`)

### 3. Actualizar .env.local

Edita `mobile/medical-app/.env.local`:

```bash
NEXT_PUBLIC_API_URL=https://TU_URL_BACKEND.ngrok.io/api/v1
NEXT_PUBLIC_AI_SERVICE_URL=https://TU_URL_AI.ngrok.io
```

### 4. Recompilar y generar APK

```powershell
npm run build
npm run capacitor:sync
npm run apk
```

## 🔄 Comandos Disponibles

| Comando | Descripción |
|---------|-------------|
| `npm run tunnel:ngrok:full` | Configuración completa automática (Backend + AI Services) |
| `npm run tunnel:ngrok` | Inicia solo el túnel del Backend |
| `npm run tunnel:ngrok:stop` | Detiene todos los procesos de ngrok |

## 🎛️ Panel de Control de ngrok

Mientras ngrok está corriendo, puedes ver:
- **Panel web**: http://localhost:4040
- **URLs públicas**: En la interfaz web
- **Tráfico en tiempo real**: Requests y responses
- **Logs**: Errores y advertencias

## ⚠️ Consideraciones Importantes

### 1. URLs Cambiantes
- Las URLs de ngrok **cambian cada vez que reinicias** (plan gratuito)
- Si necesitas URL estable, considera:
  - Plan pago de ngrok
  - Cloudflare Tunnel (gratis, URL estable)
  - Servidor en la nube

### 2. Mantener ngrok Corriendo
- **Debes mantener ngrok corriendo** mientras uses la app
- Si cierras ngrok, la app dejará de funcionar remotamente
- Considera usar un servicio como PM2 o un servicio de Windows para mantenerlo corriendo

### 3. Límites del Plan Gratuito
- **40 conexiones por minuto**
- **URLs temporales** (cambian al reiniciar)
- **Sin dominios personalizados**

### 4. Seguridad
- ⚠️ **No uses datos reales sensibles** en desarrollo
- ⚠️ Las URLs son públicas (cualquiera con la URL puede acceder)
- ⚠️ Considera usar autenticación adicional para producción

## 🐛 Solución de Problemas

### Error: "ngrok no está instalado"

**Solución:**
```powershell
# Instalar con Chocolatey
choco install ngrok

# O descargar manualmente desde https://ngrok.com/download
```

### Error: "Backend no responde"

**Solución:**
1. Verifica que Docker esté corriendo:
   ```powershell
   docker ps
   ```
2. Inicia los servicios:
   ```powershell
   docker-compose up -d
   ```
3. Verifica que el backend responda:
   ```powershell
   curl http://localhost:3001/health
   ```

### Error: "No se pueden obtener las URLs"

**Solución:**
1. Abre http://localhost:4040 en tu navegador
2. Copia las URLs manualmente
3. Actualiza `.env.local` manualmente

### La app no se conecta remotamente

**Verifica:**
1. ✅ ngrok está corriendo
2. ✅ Las URLs en `.env.local` son correctas (HTTPS, no HTTP)
3. ✅ Recompilaste la app después de actualizar `.env.local`
4. ✅ Generaste nueva APK después de recompilar

### ngrok se cierra automáticamente

**Solución:**
- Usa el script `setup-ngrok-remote.ps1` que mantiene ngrok corriendo
- O ejecuta ngrok en una ventana separada y no la cierres
- Considera usar un servicio como PM2 para mantenerlo corriendo

## 📊 Verificación de Funcionamiento

### 1. Verificar URLs Públicas

Abre http://localhost:4040 y verifica que veas:
- Túnel para puerto 3001 (Backend)
- Túnel para puerto 8000 (AI Services)

### 2. Probar URLs desde el Navegador

Abre en tu navegador (o teléfono):
- `https://TU_URL_BACKEND.ngrok.io/health`
- `https://TU_URL_AI.ngrok.io/health`

Deberías ver respuestas JSON.

### 3. Verificar .env.local

```powershell
cat mobile/medical-app/.env.local
```

Deberías ver:
```bash
NEXT_PUBLIC_API_URL=https://TU_URL.ngrok.io/api/v1
NEXT_PUBLIC_AI_SERVICE_URL=https://TU_URL.ngrok.io
```

## 🚀 Próximos Pasos

Una vez configurado:

1. **Desarrollo Remoto**: Tu app funcionará desde cualquier lugar
2. **Testing en Dispositivos Reales**: Prueba en múltiples teléfonos
3. **Demostraciones**: Muestra tu app sin necesidad de estar en la misma red

## 📚 Recursos Adicionales

- [Documentación de ngrok](https://ngrok.com/docs)
- [Dashboard de ngrok](https://dashboard.ngrok.com)
- [Guía de Acceso Externo](./GUIA_ACCESO_EXTERNO.md) - Otras opciones (Cloudflare, etc.)

## 💡 Tips

1. **Guarda las URLs**: Si necesitas las mismas URLs, no cierres ngrok
2. **Usa el panel web**: http://localhost:4040 es muy útil para debugging
3. **Monitorea el tráfico**: El panel web muestra todos los requests
4. **Plan pago**: Si necesitas URLs estables, considera el plan pago de ngrok

---

✅ **¡Listo!** Tu app ahora puede funcionar remotamente con ngrok.

