# 🚀 Inicio Rápido - Generar APK

## Pasos Rápidos para Generar tu Primer APK

### 1️⃣ Instalar Android Studio (Si no lo tienes)

1. Descarga [Android Studio](https://developer.android.com/studio)
2. Instala Android SDK durante la instalación
3. Abre Android Studio y completa el setup inicial

### 2️⃣ Configurar Variables de Entorno (Windows PowerShell)

```powershell
# Configurar ANDROID_HOME
[System.Environment]::SetEnvironmentVariable('ANDROID_HOME', "$env:LOCALAPPDATA\Android\Sdk", 'User')

# Agregar a PATH
$currentPath = [System.Environment]::GetEnvironmentVariable('Path', 'User')
$newPath = "$currentPath;$env:LOCALAPPDATA\Android\Sdk\platform-tools;$env:LOCALAPPDATA\Android\Sdk\tools"
[System.Environment]::SetEnvironmentVariable('Path', $newPath, 'User')

# Reiniciar PowerShell después de esto
```

### 3️⃣ Instalar y Configurar Capacitor

```powershell
cd mobile/medical-app
.\instalar-capacitor.ps1
```

Este script:
- ✅ Instala todas las dependencias
- ✅ Instala Capacitor y plugins
- ✅ Crea el proyecto Android
- ✅ Sincroniza todo

### 4️⃣ Generar APK Debug (Para Probar)

```powershell
.\generar-apk.ps1 debug
```

El APK estará en: `android/app/build/outputs/apk/debug/app-debug.apk`

### 5️⃣ Instalar en tu Teléfono

**Opción A: USB Debugging**
```powershell
# Conecta tu teléfono por USB
# Habilita "Depuración USB" en tu teléfono
adb install android/app/build/outputs/apk/debug/app-debug.apk
```

**Opción B: Transferir Archivo**
1. Copia `app-debug.apk` a tu teléfono
2. Activa "Orígenes desconocidos" en Configuración > Seguridad
3. Abre el archivo APK en tu teléfono e instala

## ⚠️ Problemas Comunes

### "ANDROID_HOME no está configurado"
```powershell
$env:ANDROID_HOME = "$env:LOCALAPPDATA\Android\Sdk"
```

### "Gradle no encontrado"
Asegúrate de que Android Studio esté instalado y que hayas abierto el proyecto al menos una vez.

### "Error al construir"
```powershell
cd android
.\gradlew.bat clean
cd ..
.\generar-apk.ps1 debug
```

## 📚 Más Información

- Ver `GUIA_GENERAR_APK.md` para instrucciones detalladas
- Ver `README.md` para información general de la app

## 🎯 Próximos Pasos

Una vez que tengas el APK funcionando:
1. Prueba todas las funcionalidades en tu teléfono
2. Genera un APK Release para producción (ver `GUIA_GENERAR_APK.md`)
3. Optimiza el tamaño si es necesario

