# 🚀 Guía Rápida: Conectar App Móvil con Docker

## Problema
La app móvil no puede conectarse a los servicios Docker desde tu teléfono.

## Solución en 3 Pasos

### ✅ Paso 1: Configurar IP Local (2 minutos)

```bash
cd mobile/medical-app
npm run config:ip
```

Esto detecta automáticamente tu IP y crea el archivo `.env.local`.

**IP detectada**: `192.168.18.34` ✅

---

### ✅ Paso 2: Configurar Firewall de Windows (1 minuto)

**IMPORTANTE**: Ejecuta PowerShell como **Administrador**

1. Cierra PowerShell actual
2. Haz clic derecho en PowerShell → "Ejecutar como administrador"
3. Ejecuta:

```powershell
cd "C:\Users\User\Desktop\construccionI\proyecto-final-sistema_enfermedades_respiratorias\mobile\medical-app"
powershell -ExecutionPolicy Bypass -File scripts/configure-firewall.ps1
```

O manualmente:

```powershell
New-NetFirewallRule -DisplayName "RespiCare Backend" -Direction Inbound -LocalPort 3001 -Protocol TCP -Action Allow
New-NetFirewallRule -DisplayName "RespiCare AI Services" -Direction Inbound -LocalPort 8000 -Protocol TCP -Action Allow
```

---

### ✅ Paso 3: Verificar y Recompilar (2 minutos)

1. **Verificar conexión**:
```bash
npm run test:connection
```

2. **Verificar que Docker esté corriendo**:
```bash
docker ps
```
Debes ver `respicare-backend-dev` y `respicare-ai-dev` corriendo.

3. **Regenerar el APK** (si ya generaste la APK):
```bash
npm run apk
```

El APK se generará en: `android/app/build/outputs/apk/debug/app-debug.apk`

📖 **Guía completa para generar APK**: Ver `GENERAR_APK.md`

---

## ✅ Verificación Final

### Desde tu PC (verificar que funciona):

```bash
npm run test:connection
```

Deberías ver:
- ✅ Backend accesible (Status 200)
- ✅ AI Service accesible (Status 200)

Si ambos muestran ✅, todo está funcionando correctamente.

### Desde tu teléfono (en la misma red WiFi):

1. Abre el navegador del teléfono
2. Visita: `http://192.168.18.34:3001/api/health`
   - ✅ Si ves una respuesta JSON → **Todo funciona**
   - ❌ Si no carga → Verifica el firewall (ejecuta el script del Paso 2)

### Desde la app móvil:

1. Reinstala la APK después de recompilar
2. Abre la app
3. Intenta usar el modo de emergencia o iniciar sesión
4. ✅ No debería aparecer el error de conexión

---

## 🐛 Solución de Problemas

### Error: "Error al conectar con el asistente médico"

**Causas posibles:**

1. ❌ **Firewall bloqueando** → Ejecuta el script del Paso 2
2. ❌ **IP incorrecta** → Ejecuta `npm run config:ip` nuevamente
3. ❌ **No están en la misma red** → Asegúrate de que PC y teléfono estén en la misma WiFi
4. ❌ **Docker no corriendo** → Ejecuta `docker-compose up -d`

### Verificar manualmente:

```powershell
# Desde tu PC, prueba:
curl http://192.168.18.34:3001/health
curl http://192.168.18.34:8000/health

# Desde tu teléfono (en el navegador):
# Visita: http://192.168.18.34:3001/health
```

---

## 📝 Notas Importantes

- ⚠️ **La IP puede cambiar** si cambias de red WiFi
  - Solución: Ejecuta `npm run config:ip` nuevamente

- ⚠️ **Solo funciona en desarrollo**
  - Para producción, usa un dominio o IP pública estática

- ✅ **Configuración actual**:
  - Backend: `http://192.168.18.34:3001/api/v1`
  - AI Service: `http://192.168.18.34:8000`

---

## 📞 Soporte

Si después de seguir estos pasos aún no funciona:

1. Verifica los logs de Docker: `docker logs respicare-backend-dev`
2. Verifica que los puertos estén expuestos: `docker ps`
3. Revisa `CONFIGURACION_RED.md` para más detalles

