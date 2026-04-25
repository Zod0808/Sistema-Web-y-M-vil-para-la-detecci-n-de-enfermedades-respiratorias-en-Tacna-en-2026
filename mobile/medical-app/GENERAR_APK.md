# 📱 Guía para Generar APK

Esta guía te ayudará a generar el APK de la aplicación móvil RespiCare.

## 🚀 Generar APK (Método Rápido)

### Opción 1: Comando Simple (Recomendado)

```bash
npm run apk
```

Este comando hace todo automáticamente:
1. ✅ Compila la app Next.js
2. ✅ Sincroniza con Capacitor
3. ✅ Genera el APK de debug

### Opción 2: Comandos Específicos

**APK de Debug** (para pruebas):
```bash
npm run apk:debug
```

**APK de Release** (para distribución):
```bash
npm run apk:release
```

## 📍 Ubicación del APK Generado

Después de ejecutar el comando, el APK se generará en:

**APK Debug:**
```
android/app/build/outputs/apk/debug/app-debug.apk
```

**APK Release:**
```
android/app/build/outputs/apk/release/app-release.apk
```

## 📋 Pasos Detallados (Manual)

Si prefieres hacerlo paso a paso:

### 1. Compilar la App Next.js

```bash
npm run build:static
```

Esto genera los archivos estáticos en la carpeta `out/`.

### 2. Sincronizar con Capacitor

```bash
npm run capacitor:sync
```

Esto copia los archivos compilados a la carpeta `android/`.

### 3. Generar el APK

**Para Debug:**
```bash
cd android
gradlew.bat assembleDebug
```

**Para Release:**
```bash
cd android
gradlew.bat assembleRelease
```

## ⚙️ Configuración Antes de Generar APK

### 0. Configurar Android SDK (Primera vez o si hay error)

Si es la primera vez que generas el APK o ves un error sobre "SDK location not found":

```bash
npm run setup:android
```

Este script busca automáticamente tu Android SDK y crea el archivo `android/local.properties`.

**Si el script no encuentra el SDK automáticamente:**

1. **Instala Android Studio** (si no lo tienes):
   - Descarga desde: https://developer.android.com/studio
   - Durante la instalación, se instalará el Android SDK

2. **Configurar manualmente**:
   - Crea el archivo `android/local.properties` con:
   ```
   sdk.dir=C:/Users/TU_USUARIO/AppData/Local/Android/Sdk
   ```
   - Reemplaza `TU_USUARIO` con tu nombre de usuario de Windows
   - La ruta típica es: `C:\Users\[TU_USUARIO]\AppData\Local\Android\Sdk`

3. **Obtener la ruta del SDK desde Android Studio**:
   - Abre Android Studio
   - Ve a: File > Settings > Appearance & Behavior > System Settings > Android SDK
   - Copia la ruta "Android SDK Location"

### 1. Configurar IP Local (Importante)

Si vas a usar la app en un dispositivo físico, primero configura la IP:

```bash
npm run config:ip
```

Esto actualiza el archivo `.env.local` con tu IP local.

### 2. Verificar Conexión

```bash
npm run test:connection
```

Asegúrate de que ambos servicios (Backend y AI Service) estén accesibles.

### 3. Configurar Firewall (Si es necesario)

Si la app no puede conectarse desde tu teléfono:

```powershell
# Ejecutar PowerShell como Administrador
powershell -ExecutionPolicy Bypass -File scripts/configure-firewall.ps1
```

## 🔄 Proceso Completo (Desde Cero)

Si es la primera vez o cambiaste la configuración:

```bash
# 0. Configurar Android SDK (solo primera vez o si hay error)
npm run setup:android

# 1. Configurar IP
npm run config:ip

# 2. Verificar conexión
npm run test:connection

# 3. Generar APK
npm run apk

# 4. El APK estará en:
# android/app/build/outputs/apk/debug/app-debug.apk
```

## 📲 Instalar el APK en tu Teléfono

### Método 1: Transferencia USB

1. Conecta tu teléfono por USB
2. Copia el archivo `app-debug.apk` a tu teléfono
3. Abre el archivo en tu teléfono
4. Permite la instalación de fuentes desconocidas si te lo pide

### Método 2: Transferencia por WiFi/Red

1. Comparte el archivo por WhatsApp, email, o servicio en la nube
2. Descarga el APK en tu teléfono
3. Instala el APK

### Método 3: ADB (Android Debug Bridge)

Si tienes ADB instalado:

```bash
adb install android/app/build/outputs/apk/debug/app-debug.apk
```

## 🐛 Solución de Problemas

### Error: "SDK location not found" o "ANDROID_HOME not found"

**Solución Automática:**
El comando `npm run apk` ahora configura automáticamente ANDROID_HOME. Si aún falla:

1. **Verifica que el SDK existe:**
   ```powershell
   Test-Path "C:\Users\User\AppData\Local\Android\Sdk"
   ```

2. **Si no existe, instala Android Studio:**
   - Descarga desde: https://developer.android.com/studio
   - Durante la instalación se instalará el SDK

3. **Configuración manual:**
   - Crea `android/local.properties` con:
   ```
   sdk.dir=C:/Users/TU_USUARIO/AppData/Local/Android/Sdk
   ```
   - Reemplaza `TU_USUARIO` con tu usuario de Windows

### Error: "gradlew.bat no se reconoce"

**Solución:**
```bash
cd android
.\gradlew.bat assembleDebug
```

O asegúrate de estar en la carpeta `android` antes de ejecutar.

### Error: "No se encuentra el archivo build.gradle"

**Solución:**
Asegúrate de que la carpeta `android` existe. Si no existe, inicializa Capacitor:

```bash
npx cap add android
npx cap sync
```

### El APK no se actualiza en el teléfono

**Solución:**
1. Desinstala la versión anterior de la app
2. Genera un nuevo APK: `npm run apk`
3. Instala el nuevo APK

### La app no se conecta al backend

**Solución:**
1. Verifica que ejecutaste `npm run config:ip`
2. Verifica que el firewall está configurado
3. Asegúrate de que tu teléfono está en la misma red WiFi
4. Prueba la conexión: `npm run test:connection`

## 📝 Notas Importantes

- ⚠️ **Cada vez que cambies la configuración de red** (IP), necesitas regenerar el APK
- ⚠️ **El APK de debug** es más grande pero más fácil de generar
- ⚠️ **El APK de release** requiere configuración de firma para distribución
- ✅ **El APK se genera en**: `android/app/build/outputs/apk/debug/` o `release/`

## 🔗 Comandos Relacionados

- `npm run config:ip` - Configurar IP local
- `npm run test:connection` - Probar conexión con servicios
- `npm run build` - Solo compilar Next.js (sin generar APK)
- `npm run capacitor:sync` - Sincronizar con Capacitor
- `npm run capacitor:open` - Abrir proyecto Android en Android Studio

