# Guía Rápida: Iniciar ngrok Manualmente

Si el script automático no funciona, puedes iniciar ngrok manualmente de forma muy simple.

## Método Simple (Recomendado)

### Paso 1: Abre DOS ventanas de PowerShell

### Paso 2: En la primera ventana (Backend)
```powershell
& "C:\Users\User\Downloads\ngrok.exe" http 3001
```

### Paso 3: En la segunda ventana (AI Services)
```powershell
& "C:\Users\User\Downloads\ngrok.exe" http 8000
```

### Paso 4: Verifica
- Abre http://localhost:4040 en tu navegador
- Deberías ver el túnel del Backend (puerto 3001)
- Para ver el túnel de AI Services, abre http://localhost:4041 (cada instancia usa un puerto diferente)

## Obtener las URLs

### Opción 1: Desde el navegador
- Backend: http://localhost:4040
- AI Services: http://localhost:4041

### Opción 2: Desde PowerShell
```powershell
# Backend URL
$backend = Invoke-RestMethod -Uri "http://localhost:4040/api/tunnels"
$backend.tunnels[0].public_url

# AI Services URL  
$ai = Invoke-RestMethod -Uri "http://localhost:4041/api/tunnels"
$ai.tunnels[0].public_url
```

## Actualizar .env.local

Una vez que tengas ambas URLs, edita `mobile/medical-app/.env.local`:

```bash
NEXT_PUBLIC_API_URL=https://TU_URL_BACKEND.ngrok.io/api/v1
NEXT_PUBLIC_AI_SERVICE_URL=https://TU_URL_AI.ngrok.io
```

## Nota Importante

Cuando inicias ngrok en ventanas separadas:
- Cada instancia usa su propio puerto de API
- Backend → http://localhost:4040
- AI Services → http://localhost:4041

Por eso el panel web en localhost:4040 solo muestra el Backend.

