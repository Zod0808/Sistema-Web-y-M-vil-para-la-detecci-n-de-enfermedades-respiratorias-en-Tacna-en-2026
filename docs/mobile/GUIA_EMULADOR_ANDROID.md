# 📱 Guía para ejecutar la app mobile en emulador Android

Esta guía explica cómo levantar la app mobile de RespiCare en un emulador Android usando Windows + PowerShell.

## ✅ Qué app se ejecuta

La app mobile del proyecto está en `mobile/medical-app` y usa:

- Next.js (frontend)
- Capacitor (wrapper nativo Android)
- Android Studio / AVD para emulación

## 📋 Prerrequisitos

Antes de empezar, asegúrate de tener:

- Node.js 18+ y `npm`
- Android Studio instalado
- Android SDK + Android Virtual Device (AVD) instalados desde Android Studio
- JDK 17+ (si Android Studio no lo gestiona automáticamente)

## 1) Preparar el proyecto

En PowerShell, desde la raíz del repo:

```powershell
cd mobile/medical-app
npm install
```

## 2) Configurar variables de entorno

1. Crea `.env.local` basado en `.env.example`.
2. Ajusta las URLs según cómo estés ejecutando backend/IA.

Ejemplo base:

```env
NEXT_PUBLIC_API_URL=http://localhost:3001/api/v1
NEXT_PUBLIC_AI_SERVICE_URL=http://localhost:8000
```

> Si usas emulador Android y los servicios corren en tu máquina host, normalmente funciona mejor `10.0.2.2` en lugar de `localhost` dentro del entorno Android.

Ejemplo para emulador:

```env
NEXT_PUBLIC_API_URL=http://10.0.2.2:3001/api/v1
NEXT_PUBLIC_AI_SERVICE_URL=http://10.0.2.2:8000
```

## 3) Configurar SDK Android local

Desde `mobile/medical-app`:

```powershell
npm run setup:android
```

Este script detecta el SDK y genera/ajusta `android/local.properties`.

## 4) Crear e iniciar un emulador (AVD)

1. Abre Android Studio.
2. Ve a **Device Manager**.
3. Crea un AVD (por ejemplo Pixel + API reciente).
4. Inícialo y espera que termine de arrancar.

Verifica que esté visible para ADB:

```powershell
adb devices
```

Debe aparecer al menos un dispositivo tipo `emulator-5554` con estado `device`.

## 5) Compilar y abrir en Android Studio (opción recomendada)

Desde `mobile/medical-app`:

```powershell
npm run build:static
npm run capacitor:sync
npm run capacitor:open
```

Luego, en Android Studio:

1. Selecciona el emulador en la barra superior.
2. Pulsa **Run**.

## 6) Compilar e instalar por consola (opción rápida)

Alternativa sin abrir Android Studio:

```powershell
npm run android:build
```

El APK debug se genera en:

`mobile/medical-app/android/app/build/outputs/apk/debug/app-debug.apk`

Para instalarlo manualmente en el emulador:

```powershell
adb install -r android/app/build/outputs/apk/debug/app-debug.apk
```

## 7) Flujo recomendado para iterar cambios

Cuando cambies código web (Next.js):

```powershell
npm run build:static
npm run capacitor:sync
```

Y vuelve a ejecutar desde Android Studio o reinstala APK.

## 🔧 Troubleshooting

### El emulador no aparece en `adb devices`

- Confirma que el AVD esté encendido.
- Reinicia ADB:

```powershell
adb kill-server
adb start-server
adb devices
```

### Error de Android SDK / `local.properties`

- Ejecuta:

```powershell
npm run setup:android
```

- Si falla, revisa la ruta del SDK en Android Studio:
  `File > Settings > Android SDK`

### Error de red al consumir backend desde el emulador

- No uses `localhost` en entorno Android para llegar al host.
- Usa `10.0.2.2` en `.env.local`.
- Verifica que backend y AI service estén corriendo en puertos `3001` y `8000`.

### Build de Gradle falla

Desde `mobile/medical-app/android`:

```powershell
.\gradlew.bat clean
cd ..
npm run android:build
```

## 🧪 Verificación mínima de funcionamiento

Checklist rápido:

- App abre en emulador sin crash.
- Puedes navegar pantallas principales.
- Login/llamadas al backend responden (sin errores de red).
- No hay pantallas en blanco por falta de variables de entorno.

