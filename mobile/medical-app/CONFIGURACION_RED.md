# Configuración para Conectar la App Móvil con Docker

## Problema

Cuando la app móvil se ejecuta en un dispositivo físico, no puede conectarse a `localhost` porque se refiere al propio dispositivo, no a la máquina donde corre Docker.

## Solución

Necesitas configurar la IP local de tu computadora en la aplicación móvil.

## Paso 1: Obtener tu IP Local

### En Windows:

1. Abre PowerShell o CMD
2. Ejecuta:
```powershell
ipconfig
```

3. Busca la sección **"Adaptador de Ethernet Wi-Fi"** o **"Adaptador de LAN inalámbrica Wi-Fi"**
4. Busca la línea **"IPv4"** - esa es tu IP local, algo como: `192.168.1.100` o `192.168.0.50`

### En Linux/Mac:

```bash
ifconfig | grep "inet " | grep -v 127.0.0.1
```

O más simple:
```bash
hostname -I
```

## Paso 2: Verificar que los Puertos Estén Expuestos

Asegúrate de que Docker esté exponiendo los puertos correctamente. Verifica tu `docker-compose.dev.yml`:

- **Backend**: Puerto `3001` (debe estar mapeado como `3001:3001`)
- **AI Services**: Puerto `8000` (debe estar mapeado como `8000:8000`)

## Paso 3: Configurar la App Móvil

### Opción 1: Usando archivo .env.local (Recomendado)

1. En la carpeta `mobile/medical-app`, crea o edita el archivo `.env.local`:

```bash
# Reemplaza TU_IP_LOCAL con la IP que obtuviste en el Paso 1
NEXT_PUBLIC_API_URL=http://TU_IP_LOCAL:3001/api/v1
NEXT_PUBLIC_AI_SERVICE_URL=http://TU_IP_LOCAL:8000
```

**Ejemplo** (si tu IP es `192.168.1.100`):
```bash
NEXT_PUBLIC_API_URL=http://192.168.1.100:3001/api/v1
NEXT_PUBLIC_AI_SERVICE_URL=http://192.168.1.100:8000
```

2. Si ya compilaste la APK, necesitas recompilarla:
```bash
npm run build
# Luego regenera la APK con Capacitor
```

### Opción 2: Usando el script de configuración (Automático) ⭐ RECOMENDADO

Ejecuta el script que detecta automáticamente tu IP:

```bash
# Windows PowerShell o CMD
npm run config:ip

# O manualmente
node scripts/config-ip.js

# O solo para ver tu IP en Windows PowerShell:
powershell -ExecutionPolicy Bypass -File scripts/get-local-ip.ps1
```

Este script:
- Detecta tu IP local automáticamente
- Crea/actualiza el archivo `.env.local`
- Te muestra la configuración
- Prioriza conexiones Wi-Fi sobre Ethernet

## Paso 4: Verificar el Firewall de Windows

Es posible que el firewall de Windows esté bloqueando las conexiones. 

1. Abre **"Firewall de Windows Defender"**
2. Ve a **"Configuración avanzada"**
3. Crea una regla de entrada para:
   - Puerto `3001` (Backend)
   - Puerto `8000` (AI Services)
   
O temporalmente desactiva el firewall para probar (solo para desarrollo).

### Opción A: Script automático (Recomendado)

Ejecuta el script que configura el firewall automáticamente:

```powershell
# IMPORTANTE: Ejecutar PowerShell como Administrador
# 1. Cierra PowerShell actual
# 2. Haz clic derecho en PowerShell
# 3. Selecciona "Ejecutar como administrador"
# 4. Ejecuta:

cd mobile/medical-app
powershell -ExecutionPolicy Bypass -File scripts/configure-firewall.ps1
```

### Opción B: Comandos manuales

```powershell
# IMPORTANTE: Ejecutar PowerShell como Administrador
New-NetFirewallRule -DisplayName "RespiCare Backend" -Direction Inbound -LocalPort 3001 -Protocol TCP -Action Allow
New-NetFirewallRule -DisplayName "RespiCare AI Services" -Direction Inbound -LocalPort 8000 -Protocol TCP -Action Allow
```

## Paso 5: Probar la Conexión

### Desde tu teléfono (mientras está en la misma red WiFi):

1. Abre el navegador del teléfono
2. Intenta acceder a: `http://TU_IP_LOCAL:3001/api/v1/health`
   - Si ves una respuesta JSON, el backend es accesible
   - Si no carga, revisa el firewall

### Desde la app móvil:

1. Reinstala la APK después de configurar la IP
2. Intenta iniciar sesión o usar el modo de emergencia
3. Verifica que no aparezca el error de conexión

## Solución de Problemas

### Error: "Network request failed" o "No se puede conectar"

**Posibles causas:**
1. ❌ IP incorrecta → Verifica tu IP con `ipconfig`
2. ❌ Firewall bloqueando → Desactiva temporalmente o agrega reglas
3. ❌ No están en la misma red WiFi → Asegúrate de que teléfono y PC estén en la misma red
4. ❌ Docker no está corriendo → Verifica con `docker ps`
5. ❌ Puertos no expuestos → Verifica `docker-compose.dev.yml`

### Verificar que Docker esté accesible desde la red:

```powershell
# Desde PowerShell en tu PC
docker ps
# Deberías ver los contenedores corriendo

# Probar desde otro dispositivo en la misma red (o desde tu teléfono en el navegador):
# http://TU_IP_LOCAL:3001/api/v1/health
```

### Verificar la configuración de la app:

Si la app ya está instalada, puedes verificar qué URL está usando:
1. Abre la app
2. Ve a Configuración/Perfil
3. O revisa los logs de la consola si tienes acceso a desarrollo

## Configuración para Producción

Para producción, usa un dominio o IP pública estática:

```bash
NEXT_PUBLIC_API_URL=https://api.tudominio.com/api/v1
NEXT_PUBLIC_AI_SERVICE_URL=https://ai.tudominio.com
```

## Nota Importante

⚠️ **La IP local puede cambiar** cada vez que te conectas a una red WiFi diferente. Si cambias de red, necesitarás actualizar la configuración.

✅ **Solución permanente**: Considera usar un dominio local o configurar una IP estática en tu router.

