# 📱 Guía para Generar APK - RespiCare Medical App

Esta guía te ayudará a generar un archivo APK para instalar la aplicación RespiCare Medical en dispositivos Android.

## 📋 Prerrequisitos

### 1. Instalar Android Studio
- Descarga e instala [Android Studio](https://developer.android.com/studio)
- Durante la instalación, asegúrate de instalar:
  - Android SDK
  - Android SDK Platform
  - Android Virtual Device (AVD)

### 2. Configurar Variables de Entorno

**Windows (PowerShell):**
```powershell
# Configurar JAVA_HOME (ajusta la ruta según tu instalación)
[System.Environment]::SetEnvironmentVariable('JAVA_HOME', 'C:\Program Files\Java\jdk-17', 'User')

# Configurar ANDROID_HOME (ajusta la ruta según tu instalación)
[System.Environment]::SetEnvironmentVariable('ANDROID_HOME', "$env:LOCALAPPDATA\Android\Sdk", 'User')

# Agregar a PATH
$env:Path += ";$env:ANDROID_HOME\platform-tools;$env:ANDROID_HOME\tools;$env:ANDROID_HOME\tools\bin"
[System.Environment]::SetEnvironmentVariable('Path', $env:Path, 'User')
```

**Linux/Mac:**
```bash
# Agregar a ~/.bashrc o ~/.zshrc
export ANDROID_HOME=$HOME/Android/Sdk
export PATH=$PATH:$ANDROID_HOME/platform-tools
export PATH=$PATH:$ANDROID_HOME/tools
export PATH=$PATH:$ANDROID_HOME/tools/bin
```

### 3. Verificar Instalación

```bash
# Verificar Java
java -version  # Debe ser JDK 17 o superior

# Verificar Android SDK
echo $ANDROID_HOME  # Linux/Mac
echo %ANDROID_HOME% # Windows

# Verificar adb
adb version
```

## 🚀 Pasos para Generar el APK

### Paso 1: Instalar Dependencias

```bash
cd mobile/medical-app
npm install
```

### Paso 2: Construir la Aplicación Next.js

```bash
npm run build:static
```

Esto generará la carpeta `out/` con los archivos estáticos.

### Paso 3: Sincronizar con Capacitor

```bash
npm run capacitor:sync
```

Esto copiará los archivos estáticos a la carpeta `android/` y sincronizará los plugins.

### Paso 4: Generar APK Debug (Para Testing)

```bash
npm run android:build
```

O manualmente:
```bash
cd android
./gradlew assembleDebug
```

El APK estará en: `android/app/build/outputs/apk/debug/app-debug.apk`

### Paso 5: Generar APK Release (Para Producción)

**⚠️ IMPORTANTE:** Para producción, necesitas firmar el APK con un keystore.

#### 5.1. Generar Keystore (Solo primera vez)

```bash
cd android/app
keytool -genkeypair -v -storetype PKCS12 -keystore respicare-release-key.keystore -alias respicare-key -keyalg RSA -keysize 2048 -validity 10000
```

**Guarda la contraseña del keystore en un lugar seguro.**

#### 5.2. Configurar Gradle para Release

Edita `android/gradle.properties` y agrega:

```properties
RESPICARE_RELEASE_STORE_FILE=respicare-release-key.keystore
RESPICARE_RELEASE_KEY_ALIAS=respicare-key
RESPICARE_RELEASE_STORE_PASSWORD=tu_contraseña_aquí
RESPICARE_RELEASE_KEY_PASSWORD=tu_contraseña_aquí
```

**⚠️ IMPORTANTE:** Agrega `gradle.properties` a `.gitignore` para no subir las contraseñas.

#### 5.3. Configurar build.gradle

Edita `android/app/build.gradle` y agrega la configuración de signing:

```gradle
android {
    // ... configuración existente ...
    
    signingConfigs {
        release {
            if (project.hasProperty('RESPICARE_RELEASE_STORE_FILE')) {
                storeFile file(RESPICARE_RELEASE_STORE_FILE)
                storePassword RESPICARE_RELEASE_STORE_PASSWORD
                keyAlias RESPICARE_RELEASE_KEY_ALIAS
                keyPassword RESPICARE_RELEASE_KEY_PASSWORD
            }
        }
    }
    
    buildTypes {
        release {
            signingConfig signingConfigs.release
            minifyEnabled true
            proguardFiles getDefaultProguardFile('proguard-android-optimize.txt'), 'proguard-rules.pro'
        }
    }
}
```

#### 5.4. Generar APK Release

```bash
npm run android:release
```

O manualmente:
```bash
cd android
./gradlew assembleRelease
```

El APK estará en: `android/app/build/outputs/apk/release/app-release.apk`

## 📲 Instalar el APK en tu Teléfono

### Opción 1: USB Debugging

1. Habilita "Opciones de desarrollador" en tu teléfono Android
2. Activa "Depuración USB"
3. Conecta tu teléfono por USB
4. Ejecuta:
   ```bash
   adb install android/app/build/outputs/apk/debug/app-debug.apk
   ```

### Opción 2: Transferir Archivo

1. Copia el archivo APK a tu teléfono (USB, email, cloud, etc.)
2. En tu teléfono, ve a Configuración > Seguridad
3. Activa "Orígenes desconocidos" o "Instalar aplicaciones desconocidas"
4. Abre el archivo APK desde el administrador de archivos
5. Sigue las instrucciones para instalar

## 🔧 Solución de Problemas

### Error: "ANDROID_HOME no está configurado"

```bash
# Windows PowerShell
$env:ANDROID_HOME = "$env:LOCALAPPDATA\Android\Sdk"

# Linux/Mac
export ANDROID_HOME=$HOME/Android/Sdk
```

### Error: "Gradle no encontrado"

Asegúrate de que Android Studio esté instalado y que `ANDROID_HOME` esté configurado correctamente.

### Error: "No se puede encontrar el SDK de Android"

1. Abre Android Studio
2. Ve a Tools > SDK Manager
3. Instala Android SDK Platform-Tools
4. Verifica que `ANDROID_HOME` apunte a la carpeta correcta

### Error: "Keystore no encontrado"

Asegúrate de que el archivo `respicare-release-key.keystore` esté en `android/app/` y que las rutas en `gradle.properties` sean correctas.

### Error: "Build failed"

1. Limpia el proyecto:
   ```bash
   cd android
   ./gradlew clean
   ```
2. Reconstruye:
   ```bash
   ./gradlew assembleDebug
   ```

## 📝 Notas Importantes

- **APK Debug**: Más grande, no optimizado, fácil de instalar. Ideal para testing.
- **APK Release**: Optimizado, firmado, listo para distribución. Requiere keystore.
- **Tamaño del APK**: Puede ser grande (50-100MB) debido a que incluye todos los assets y dependencias.
- **Permisos**: La app solicitará permisos para cámara, almacenamiento, etc. cuando sea necesario.

## 🎯 Próximos Pasos

Una vez que tengas el APK funcionando:

1. **Probar en diferentes dispositivos** Android
2. **Optimizar el tamaño** del APK si es necesario
3. **Configurar actualizaciones** OTA si planeas distribuir la app
4. **Preparar para Google Play Store** si planeas publicarla

## 📚 Recursos Adicionales

- [Documentación de Capacitor](https://capacitorjs.com/docs)
- [Documentación de Android](https://developer.android.com/)
- [Guía de firma de APK](https://developer.android.com/studio/publish/app-signing)

