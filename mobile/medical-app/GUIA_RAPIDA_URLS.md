# 🚀 Guía Rápida: Obtener URLs de ngrok para la App Móvil

## 📋 Problema Resuelto

Si ngrok ya está corriendo con los puertos 3001 (Backend) y 8000 (AI Services), pero necesitas actualizar las URLs en `.env.local`, este script lo hace automáticamente.

## ✅ Solución Simple

### Opción 1: Usar el script automático (Recomendado)

```powershell
npm run tunnel:ngrok:get-urls
```

O directamente:

```powershell
powershell -ExecutionPolicy Bypass -File scripts/get-ngrok-urls.ps1
```

### Opción 2: Iniciar ngrok y obtener URLs en un solo paso

```powershell
npm run tunnel:ngrok
```

Este comando:
1. ✅ Verifica que los servicios estén corriendo (puertos 3001 y 8000)
2. ✅ Inicia ngrok con ambos túneles
3. ✅ Obtiene las URLs automáticamente
4. ✅ Actualiza `.env.local` con las URLs correctas

## 📝 Requisitos Previos

1. **Servicios corriendo:**
   - Backend en puerto 3001
   - AI Services en puerto 8000

2. **ngrok corriendo:**
   - Si usas `get-ngrok-urls.ps1`: ngrok debe estar corriendo
   - Si usas `start-ngrok-full.ps1`: el script inicia ngrok por ti

## 🔧 Cómo Funciona

El script:
1. Se conecta a la API de ngrok en `http://localhost:4040`
2. Obtiene todos los túneles activos
3. Identifica cuál es para el puerto 3001 (Backend)
4. Identifica cuál es para el puerto 8000 (AI Services)
5. Actualiza `.env.local` con:
   - `NEXT_PUBLIC_API_URL=https://tu-url.ngrok.io/api/v1`
   - `NEXT_PUBLIC_AI_SERVICE_URL=https://tu-url.ngrok.io`

## 📱 Próximos Pasos

Después de ejecutar el script:

1. **Recompila la app:**
   ```powershell
   npm run build
   npm run capacitor:sync
   ```

2. **Genera la APK:**
   ```powershell
   npm run apk
   ```

## ⚠️ Notas Importantes

- **Las URLs cambian cada vez que reinicias ngrok** (a menos que tengas plan pago)
- **Debes recompilar la app** después de cambiar las URLs
- **Mantén ngrok corriendo** mientras uses la app móvil

## 🐛 Solución de Problemas

### Error: "ngrok no está corriendo"

**Solución:**
1. Inicia ngrok primero:
   ```powershell
   ngrok start --all
   ```
2. O usa el script completo:
   ```powershell
   npm run tunnel:ngrok
   ```

### Error: "No se pudieron obtener las URLs"

**Solución:**
1. Verifica que ngrok esté corriendo: http://localhost:4040
2. Verifica que los túneles estén activos para puertos 3001 y 8000
3. Espera unos segundos y vuelve a ejecutar el script

### Las URLs no se actualizan en la app

**Solución:**
1. Verifica que `.env.local` tenga las URLs correctas
2. Recompila la app: `npm run build && npm run capacitor:sync`
3. Regenera la APK: `npm run apk`

## 📚 Comandos Útiles

```powershell
# Obtener URLs cuando ngrok ya está corriendo
npm run tunnel:ngrok:get-urls

# Iniciar ngrok y obtener URLs
npm run tunnel:ngrok

# Detener ngrok
npm run tunnel:ngrok:stop

# Ver panel de ngrok
# Abre: http://localhost:4040
```

## 🎯 Flujo Completo

```powershell
# 1. Asegúrate de que los servicios estén corriendo
docker-compose up -d

# 2. Inicia ngrok y obtén las URLs
npm run tunnel:ngrok

# 3. Recompila la app
npm run build
npm run capacitor:sync

# 4. Genera la APK
npm run apk
```

---

**¿Problemas?** Verifica:
- ✅ Servicios corriendo en puertos 3001 y 8000
- ✅ ngrok corriendo y accesible en puerto 4040
- ✅ Archivo `.env.local` actualizado
- ✅ App recompilada después de cambiar URLs

