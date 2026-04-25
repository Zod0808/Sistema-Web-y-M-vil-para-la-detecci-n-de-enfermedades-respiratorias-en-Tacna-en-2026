# Solución para Error "Failed to fetch" en App Móvil

## Problema

El error "Failed to fetch" ocurre porque la app móvil está intentando conectarse a `localhost:3001`, pero cuando la app se ejecuta en un dispositivo móvil, "localhost" se refiere al dispositivo, no a tu computadora donde está corriendo el backend.

## Solución: Configurar ngrok

### Paso 1: Verificar que los servicios estén corriendo

```powershell
# Desde la raíz del proyecto
docker-compose -f docker-compose.yml -f docker-compose.dev.yml up -d
```

Verifica que estén corriendo:
- Backend: http://localhost:3001/health
- AI Services: http://localhost:8000/api/v1/health

### Paso 2: Iniciar ngrok

**Opción A: Usar el script automático (Recomendado)**

```powershell
cd mobile/medical-app
npm run tunnel:ngrok
```

Este script:
- ✅ Verifica que los servicios estén corriendo
- ✅ Inicia ngrok con ambos túneles (3001 y 8000)
- ✅ Obtiene las URLs automáticamente
- ✅ Actualiza `.env.local` con las URLs correctas

**Opción B: Manualmente**

1. Abre una terminal y ejecuta:
   ```powershell
   ngrok start --all
   ```

2. Espera 10 segundos y abre: http://localhost:4040

3. Copia las URLs HTTPS de los túneles:
   - Backend (puerto 3001)
   - AI Services (puerto 8000)

4. Crea o edita `mobile/medical-app/.env.local`:
   ```env
   NEXT_PUBLIC_API_URL=https://tu-url-backend.ngrok.io/api/v1
   NEXT_PUBLIC_AI_SERVICE_URL=https://tu-url-ai.ngrok.io
   ```

### Paso 3: Obtener URLs automáticamente (si ngrok ya está corriendo)

Si ngrok ya está corriendo pero no tienes las URLs en `.env.local`:

```powershell
cd mobile/medical-app
npm run tunnel:ngrok:get-urls
```

O directamente:
```powershell
powershell -ExecutionPolicy Bypass -File scripts/get-ngrok-urls.ps1
```

### Paso 4: Recompilar la app

Después de actualizar `.env.local`, **debes recompilar la app**:

```powershell
cd mobile/medical-app
npm run build
npm run capacitor:sync
```

### Paso 5: Generar APK (opcional)

```powershell
npm run apk
```

## Verificación

Después de recompilar, verifica que `.env.local` tenga las URLs correctas:

```powershell
Get-Content mobile/medical-app/.env.local
```

Deberías ver algo como:
```
NEXT_PUBLIC_API_URL=https://abc123.ngrok.io/api/v1
NEXT_PUBLIC_AI_SERVICE_URL=https://def456.ngrok.io
```

## Notas Importantes

1. **Las URLs de ngrok cambian cada vez que reinicias ngrok** (a menos que tengas plan pago)
2. **Debes recompilar la app** después de cambiar las URLs
3. **Mantén ngrok corriendo** mientras uses la app móvil
4. **Para desarrollo local en emulador**, puedes usar tu IP local en lugar de ngrok:
   ```env
   NEXT_PUBLIC_API_URL=http://TU_IP_LOCAL:3001/api/v1
   NEXT_PUBLIC_AI_SERVICE_URL=http://TU_IP_LOCAL:8000
   ```

## Solución Rápida

Si solo quieres probar rápidamente:

1. Inicia ngrok: `ngrok start --all`
2. Espera 10 segundos
3. Abre http://localhost:4040 y copia las URLs
4. Ejecuta: `npm run tunnel:ngrok:get-urls` (esto actualizará `.env.local` automáticamente)
5. Recompila: `npm run build && npm run capacitor:sync`

## Troubleshooting

### Error: "ngrok no está corriendo"
- Verifica que ngrok esté instalado: `ngrok version`
- Inicia ngrok: `ngrok start --all`
- Verifica en: http://localhost:4040

### Error: "No se pudieron obtener las URLs"
- Espera 10-15 segundos después de iniciar ngrok
- Verifica que los túneles estén activos en http://localhost:4040
- Verifica que los servicios estén corriendo (puertos 3001 y 8000)

### La app sigue mostrando "Failed to fetch"
- Verifica que `.env.local` tenga las URLs correctas
- **Recompila la app**: `npm run build && npm run capacitor:sync`
- Verifica que ngrok esté corriendo
- Prueba las URLs directamente en el navegador

