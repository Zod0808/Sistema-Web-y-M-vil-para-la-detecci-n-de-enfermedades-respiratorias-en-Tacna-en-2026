# 🚀 Guía: Ejecutar ngrok Manualmente con Múltiples Túneles

## 📋 ¿Por qué usar un archivo de configuración?

Cuando inicias ngrok en **ventanas separadas**, cada instancia usa su propio puerto de API:
- Primera ventana → http://localhost:4040
- Segunda ventana → http://localhost:4041

Por eso solo ves un túnel en cada panel.

**Solución:** Usar un **archivo de configuración** para que **una sola instancia** de ngrok maneje **ambos túneles** en el mismo puerto 4040.

---

## 🎯 Método 1: Usar Archivo de Configuración (Recomendado)

### Paso 1: Verificar el archivo de configuración

El archivo `ngrok-config.yml` ya está creado en:
```
mobile/medical-app/ngrok-config.yml
```

Contenido:
```yaml
version: "2"
authtoken: 362CNKhwU0O1pxDWaGwDJzOzRec_NpxTqYPMF8fgK7gdpQ12
tunnels:
  backend:
    addr: 3001
    proto: http
    bind_tls: true
  ai-services:
    addr: 8000
    proto: http
    bind_tls: true
```

### Paso 2: Copiar el archivo a la ubicación de ngrok

Abre PowerShell y ejecuta:

```powershell
# Crear directorio si no existe
New-Item -ItemType Directory -Path "$env:USERPROFILE\.ngrok2" -Force

# Copiar el archivo de configuración
Copy-Item -Path "mobile\medical-app\ngrok-config.yml" -Destination "$env:USERPROFILE\.ngrok2\ngrok.yml" -Force
```

O manualmente:
1. Abre: `C:\Users\User\.ngrok2\` (crea la carpeta si no existe)
2. Copia `ngrok-config.yml` y renómbralo a `ngrok.yml`

### Paso 3: Iniciar ngrok con la configuración

Abre PowerShell y ejecuta:

```powershell
& "C:\Users\User\Downloads\ngrok.exe" start --all
```

O si ngrok está en tu PATH:

```powershell
ngrok start --all
```

### Paso 4: Verificar

1. Espera 10 segundos
2. Abre http://localhost:4040 en tu navegador
3. **Deberías ver AMBOS túneles:**
   - `backend` → puerto 3001
   - `ai-services` → puerto 8000

---

## 🎯 Método 2: Ventanas Separadas (Alternativa)

Si prefieres usar ventanas separadas:

### Terminal 1 - Backend:
```powershell
& "C:\Users\User\Downloads\ngrok.exe" http 3001
```

**Panel web:** http://localhost:4040

### Terminal 2 - AI Services:
```powershell
& "C:\Users\User\Downloads\ngrok.exe" http 8000
```

**Panel web:** http://localhost:4041 (¡diferente puerto!)

### Obtener las URLs:

**Desde PowerShell:**
```powershell
# Backend URL
$backend = Invoke-RestMethod -Uri "http://localhost:4040/api/tunnels"
$backend.tunnels[0].public_url

# AI Services URL
$ai = Invoke-RestMethod -Uri "http://localhost:4041/api/tunnels"
$ai.tunnels[0].public_url
```

---

## 🔧 Solución de Problemas

### Error: "No se puede encontrar el archivo de configuración"

**Solución:**
1. Verifica que el archivo existe en: `C:\Users\User\.ngrok2\ngrok.yml`
2. O especifica la ruta completa:
   ```powershell
   & "C:\Users\User\Downloads\ngrok.exe" start --all --config="C:\Users\User\.ngrok2\ngrok.yml"
   ```

### Error: "Authtoken no válido"

**Solución:**
```powershell
& "C:\Users\User\Downloads\ngrok.exe" config add-authtoken 362CNKhwU0O1pxDWaGwDJzOzRec_NpxTqYPMF8fgK7gdpQ12
```

### Solo aparece un túnel en el panel

**Causas posibles:**
1. El archivo de configuración no está en la ubicación correcta
2. ngrok no está leyendo el archivo de configuración
3. Hay un error en el archivo YAML

**Solución:**
1. Verifica el archivo: `C:\Users\User\.ngrok2\ngrok.yml`
2. Verifica la sintaxis YAML (sin tabs, solo espacios)
3. Reinicia ngrok completamente:
   ```powershell
   # Detener todos los procesos
   Get-Process -Name "ngrok" | Stop-Process -Force
   
   # Esperar 2 segundos
   Start-Sleep -Seconds 2
   
   # Iniciar de nuevo
   & "C:\Users\User\Downloads\ngrok.exe" start --all
   ```

### ngrok no inicia

**Verifica:**
1. ¿Está ngrok.exe en la ruta correcta?
2. ¿Tienes permisos para ejecutarlo?
3. ¿Hay algún firewall bloqueando?

**Prueba:**
```powershell
# Verificar que ngrok funciona
& "C:\Users\User\Downloads\ngrok.exe" version

# Iniciar solo un túnel para probar
& "C:\Users\User\Downloads\ngrok.exe" http 3001
```

---

## 📝 Actualizar .env.local Automáticamente

Una vez que tengas ambas URLs, puedes actualizar `.env.local` manualmente o usar este script:

```powershell
# Obtener URLs
$backend = Invoke-RestMethod -Uri "http://localhost:4040/api/tunnels"
$backendUrl = $backend.tunnels[0].public_url

$ai = Invoke-RestMethod -Uri "http://localhost:4041/api/tunnels"  # Si usas ventanas separadas
# O si usas --all:
$aiUrl = ($backend.tunnels | Where-Object { $_.name -eq "ai-services" }).public_url

# Actualizar .env.local
$envPath = "mobile\medical-app\.env.local"
$content = Get-Content $envPath -Raw
$content = $content -replace "NEXT_PUBLIC_API_URL=.*", "NEXT_PUBLIC_API_URL=$backendUrl/api/v1"
$content = $content -replace "NEXT_PUBLIC_AI_SERVICE_URL=.*", "NEXT_PUBLIC_AI_SERVICE_URL=$aiUrl"
$content | Out-File -FilePath $envPath -Encoding UTF8 -NoNewline

Write-Host "✅ .env.local actualizado!"
```

---

## ✅ Checklist Final

- [ ] Archivo `ngrok-config.yml` creado
- [ ] Archivo copiado a `C:\Users\User\.ngrok2\ngrok.yml`
- [ ] Authtoken configurado
- [ ] ngrok iniciado con `ngrok start --all`
- [ ] Panel web muestra 2 túneles en http://localhost:4040
- [ ] URLs obtenidas y guardadas
- [ ] `.env.local` actualizado con ambas URLs

---

## 🎯 Comandos Rápidos de Referencia

```powershell
# Iniciar con configuración (MÉTODO RECOMENDADO)
& "C:\Users\User\Downloads\ngrok.exe" start --all

# Iniciar solo Backend
& "C:\Users\User\Downloads\ngrok.exe" http 3001

# Iniciar solo AI Services
& "C:\Users\User\Downloads\ngrok.exe" http 8000

# Detener todos los procesos de ngrok
Get-Process -Name "ngrok" | Stop-Process -Force

# Ver túneles activos
Invoke-RestMethod -Uri "http://localhost:4040/api/tunnels" | ConvertTo-Json

# Verificar configuración
& "C:\Users\User\Downloads\ngrok.exe" config check
```

---

## 📚 Recursos

- **Panel web de ngrok:** http://localhost:4040
- **Documentación oficial:** https://ngrok.com/docs
- **Archivo de configuración:** `mobile/medical-app/ngrok-config.yml`

