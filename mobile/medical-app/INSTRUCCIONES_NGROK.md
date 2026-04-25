# Instrucciones para Configurar ngrok y Solucionar Error "Failed to fetch"

## Problema Actual

La app móvil está intentando conectarse a una URL de ngrok que ya no está activa:
- URL en `.env.local`: `https://tearier-unhortatively-drake.ngrok-free.dev`
- Esta URL ya no funciona porque ngrok no está corriendo

## Solución Paso a Paso

### Opción 1: Iniciar ngrok Manualmente (Recomendado)

1. **Abre una nueva terminal de PowerShell**

2. **Navega a la carpeta del proyecto:**
   ```powershell
   cd C:\Users\User\Desktop\construccionI\proyecto-final-sistema_enfermedades_respiratorias\mobile\medical-app
   ```

3. **Inicia ngrok:**
   ```powershell
   & "C:\Users\User\Downloads\ngrok.exe" start --all
   ```

4. **Espera 10-15 segundos** hasta que veas los túneles activos

5. **Abre en tu navegador:** http://localhost:4040

6. **Copia las URLs HTTPS** de los túneles:
   - Backend (puerto 3001) → URL HTTPS
   - AI Services (puerto 8000) → URL HTTPS

7. **Actualiza `.env.local`** con las nuevas URLs:
   ```powershell
   # Edita el archivo .env.local
   notepad .env.local
   ```
   
   O usa el script automático:
   ```powershell
   npm run tunnel:ngrok:get-urls
   ```

8. **Recompila la app:**
   ```powershell
   npm run build
   npm run capacitor:sync
   ```

### Opción 2: Usar IP Local (Solo si estás en la misma red WiFi)

Si tu dispositivo móvil está en la misma red WiFi que tu computadora:

1. **Obtén tu IP local:**
   ```powershell
   ipconfig | findstr IPv4
   ```
   
   Busca algo como: `192.168.x.x`

2. **Actualiza `.env.local`:**
   ```env
   NEXT_PUBLIC_API_URL=http://TU_IP_LOCAL:3001/api/v1
   NEXT_PUBLIC_AI_SERVICE_URL=http://TU_IP_LOCAL:8000
   ```
   
   Ejemplo:
   ```env
   NEXT_PUBLIC_API_URL=http://192.168.18.34:3001/api/v1
   NEXT_PUBLIC_AI_SERVICE_URL=http://192.168.18.34:8000
   ```

3. **Asegúrate de que el firewall permita conexiones en los puertos 3001 y 8000**

4. **Recompila la app:**
   ```powershell
   npm run build
   npm run capacitor:sync
   ```

## Verificación

Después de configurar, verifica que `.env.local` tenga las URLs correctas:

```powershell
Get-Content .env.local
```

## Troubleshooting

### ngrok no inicia

1. Verifica que ngrok esté instalado:
   ```powershell
   & "C:\Users\User\Downloads\ngrok.exe" version
   ```

2. Verifica el archivo de configuración:
   ```powershell
   Get-Content "$env:USERPROFILE\.ngrok2\ngrok.yml"
   ```

3. Si hay errores, configura el authtoken:
   ```powershell
   & "C:\Users\User\Downloads\ngrok.exe" config add-authtoken TU_TOKEN
   ```

### La app sigue mostrando "Failed to fetch"

1. **Verifica que los servicios estén corriendo:**
   ```powershell
   # Backend
   Invoke-WebRequest -Uri "http://localhost:3001/health"
   
   # AI Services
   Invoke-WebRequest -Uri "http://localhost:8000/api/v1/health"
   ```

2. **Verifica que ngrok esté corriendo:**
   - Abre: http://localhost:4040
   - Deberías ver los túneles activos

3. **Verifica que `.env.local` tenga las URLs correctas:**
   ```powershell
   Get-Content .env.local
   ```

4. **IMPORTANTE: Recompila la app después de cambiar `.env.local`:**
   ```powershell
   npm run build
   npm run capacitor:sync
   ```

5. **Prueba la URL directamente en el navegador:**
   - Abre la URL de ngrok en tu navegador
   - Deberías ver una respuesta del backend

## Comandos Rápidos

```powershell
# Iniciar ngrok
& "C:\Users\User\Downloads\ngrok.exe" start --all

# Obtener URLs automáticamente (después de iniciar ngrok)
npm run tunnel:ngrok:get-urls

# Recompilar app
npm run build && npm run capacitor:sync

# Ver configuración actual
Get-Content .env.local
```

## Notas Importantes

- ⚠️ **Las URLs de ngrok cambian cada vez que reinicias ngrok**
- ⚠️ **Debes recompilar la app después de cambiar `.env.local`**
- ⚠️ **Mantén ngrok corriendo mientras uses la app móvil**
- ✅ **Para desarrollo, puedes usar IP local si estás en la misma red**

