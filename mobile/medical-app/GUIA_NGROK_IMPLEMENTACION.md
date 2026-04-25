# 🚀 Guía de Implementación de ngrok para Mobile App

Esta guía explica cómo usar ngrok para exponer ambos endpoints (Backend y AI Services) a internet para que la app móvil funcione desde cualquier lugar.

## 📋 Requisitos Previos

1. **ngrok instalado**
   - Descarga desde: https://ngrok.com/download
   - O instala con Chocolatey: `choco install ngrok`

2. **Authtoken de ngrok** (recomendado)
   - Crea cuenta gratuita en: https://dashboard.ngrok.com
   - Obtén tu authtoken: https://dashboard.ngrok.com/get-started/your-authtoken
   - Configura: `ngrok config add-authtoken TU_TOKEN`

3. **Servicios corriendo**
   - Backend en puerto 3001: `docker-compose up -d`
   - AI Services en puerto 8000: `docker-compose up -d`

## 🎯 Método Recomendado: Script Automático

### Uso Simple

```powershell
cd mobile/medical-app
npm run tunnel:ngrok
```

Este comando:
- ✅ Verifica que ngrok esté instalado
- ✅ Copia el archivo de configuración automáticamente
- ✅ Inicia ambos túneles (Backend + AI Services)
- ✅ Obtiene las URLs públicas automáticamente
- ✅ Actualiza `.env.local` con ambas URLs

### Qué Hace el Script

1. **Configuración automática:**
   - Copia `ngrok-config.yml` a `~/.ngrok2/ngrok.yml`
   - Verifica que los servicios estén corriendo

2. **Inicio de túneles:**
   - Usa `ngrok start --all` para iniciar ambos túneles
   - Abre una nueva ventana de PowerShell con ngrok

3. **Obtención de URLs:**
   - Consulta la API de ngrok en `http://localhost:4040/api/tunnels`
   - Extrae las URLs HTTPS de ambos túneles

4. **Actualización de .env.local:**
   - Actualiza `NEXT_PUBLIC_API_URL` con la URL del backend
   - Actualiza `NEXT_PUBLIC_AI_SERVICE_URL` con la URL de AI Services

## 📝 Archivo de Configuración

El archivo `ngrok-config.yml` contiene:

```yaml
version: "2"
authtoken: TU_AUTH_TOKEN_AQUI
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

Este archivo define:
- **backend**: Túnel para el backend en puerto 3001 con HTTPS
- **ai-services**: Túnel para AI Services en puerto 8000 con HTTPS

## 🔧 Comandos Disponibles

### Iniciar ngrok (método recomendado)

```powershell
npm run tunnel:ngrok
# o
npm run tunnel:ngrok:full
```

### Iniciar con método simple (ventanas separadas)

```powershell
npm run tunnel:ngrok:simple
```

### Detener ngrok

```powershell
npm run tunnel:ngrok:stop
```

### Iniciar método legacy (solo backend)

```powershell
npm run tunnel:ngrok:legacy
```

## 📱 Configuración en .env.local

Después de ejecutar el script, `.env.local` se actualiza automáticamente:

```bash
NEXT_PUBLIC_API_URL=https://abc123.ngrok.io/api/v1
NEXT_PUBLIC_AI_SERVICE_URL=https://def456.ngrok.io
```

## 🔄 Próximos Pasos Después de Iniciar ngrok

1. **Recompilar la app:**
   ```powershell
   npm run build
   npm run capacitor:sync
   ```

2. **Generar APK:**
   ```powershell
   npm run apk
   ```

3. **Instalar en el teléfono:**
   - Transfiere la APK generada a tu teléfono
   - Instálala manualmente

## ⚠️ Importante

### Mantener ngrok Activo

- **Mantén la ventana de ngrok abierta** mientras uses la app móvil
- Si cierras ngrok, las URLs dejarán de funcionar

### URLs Cambiantes

- En el plan gratuito de ngrok, las URLs cambian cada vez que reinicias
- Después de reiniciar ngrok, debes:
  1. Ejecutar `npm run tunnel:ngrok` de nuevo
  2. Recompilar la app
  3. Regenerar la APK

### Panel Web de ngrok

- Accede a `http://localhost:4040` para ver:
  - URLs públicas de ambos túneles
  - Tráfico en tiempo real
  - Estadísticas de uso

## 🐛 Solución de Problemas

### Error: "ngrok no está instalado"

**Solución:**
```powershell
# Opción 1: Chocolatey
choco install ngrok

# Opción 2: Descargar manualmente
# Ve a https://ngrok.com/download y descarga ngrok.exe
```

### Error: "Backend no responde"

**Solución:**
```powershell
# Verifica que Docker esté corriendo
docker ps

# Inicia los servicios
docker-compose up -d

# Verifica que respondan
curl http://localhost:3001/health
curl http://localhost:8000/health
```

### Error: "No se pueden obtener las URLs"

**Solución:**
1. Espera 10-15 segundos después de iniciar ngrok
2. Abre manualmente `http://localhost:4040` en tu navegador
3. Copia las URLs manualmente y actualiza `.env.local`

### Solo aparece un túnel en el panel

**Causa:** El archivo de configuración no está en la ubicación correcta

**Solución:**
```powershell
# Verifica que el archivo existe
Test-Path "$env:USERPROFILE\.ngrok2\ngrok.yml"

# Si no existe, copia manualmente
Copy-Item "mobile\medical-app\ngrok-config.yml" -Destination "$env:USERPROFILE\.ngrok2\ngrok.yml" -Force
```

### Los túneles no se inician

**Solución:**
1. Detén todos los procesos de ngrok:
   ```powershell
   npm run tunnel:ngrok:stop
   ```

2. Verifica el archivo de configuración:
   ```powershell
   cat "$env:USERPROFILE\.ngrok2\ngrok.yml"
   ```

3. Verifica el authtoken:
   ```powershell
   ngrok config check
   ```

4. Reinicia ngrok:
   ```powershell
   npm run tunnel:ngrok
   ```

## 📊 Comparación de Métodos

| Método | Ventajas | Desventajas |
|--------|----------|-------------|
| `tunnel:ngrok` (recomendado) | ✅ Ambos túneles en un panel<br>✅ Actualización automática de .env<br>✅ Más fácil de usar | Requiere archivo de configuración |
| `tunnel:ngrok:simple` | ✅ No requiere configuración<br>✅ Fácil de entender | ⚠️ Dos paneles separados<br>⚠️ Actualización manual de .env |
| `tunnel:ngrok:legacy` | ✅ Solo backend<br>✅ Simple | ⚠️ No incluye AI Services |

## 🎯 Flujo de Trabajo Recomendado

1. **Inicia los servicios:**
   ```powershell
   docker-compose up -d
   ```

2. **Inicia ngrok:**
   ```powershell
   cd mobile/medical-app
   npm run tunnel:ngrok
   ```

3. **Espera a que se actualice .env.local** (automático)

4. **Recompila la app:**
   ```powershell
   npm run build
   npm run capacitor:sync
   ```

5. **Genera la APK:**
   ```powershell
   npm run apk
   ```

6. **Instala en el teléfono y prueba**

7. **Cuando termines, detén ngrok:**
   ```powershell
   npm run tunnel:ngrok:stop
   ```

## 📚 Recursos Adicionales

- [Documentación oficial de ngrok](https://ngrok.com/docs)
- [Panel web de ngrok](http://localhost:4040)
- [Guía de acceso externo completa](./GUIA_ACCESO_EXTERNO.md)
- [Guía manual de ngrok](./GUIA_NGROK_MANUAL.md)

## ✅ Checklist

- [ ] ngrok instalado
- [ ] Authtoken configurado (recomendado)
- [ ] Servicios Docker corriendo
- [ ] Archivo `ngrok-config.yml` presente
- [ ] ngrok iniciado con `npm run tunnel:ngrok`
- [ ] URLs obtenidas y `.env.local` actualizado
- [ ] App recompilada
- [ ] APK generada e instalada en el teléfono

