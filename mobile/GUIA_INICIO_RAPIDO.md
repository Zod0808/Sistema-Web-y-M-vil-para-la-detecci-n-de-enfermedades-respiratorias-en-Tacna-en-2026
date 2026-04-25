# 🚀 Guía de Inicio Rápido - RespiCare Mobile

## 📋 Prerrequisitos

1. **Node.js** >= 16 instalado
2. **React Native CLI** instalado globalmente
3. **Android Studio** (para Android) o **Xcode** (para iOS)
4. **Servicios levantados** (Backend, AI Services, MongoDB, Redis)

## 🔧 Paso 1: Instalar Dependencias

```bash
cd mobile
npm install
```

## 🔧 Paso 2: Configurar Variables de Entorno

Copia el archivo de ejemplo:
```bash
copy env.example .env  # Windows
# o
cp env.example .env     # Linux/Mac
```

### ⚠️ IMPORTANTE: Configuración de URLs para Dispositivo/Emulador

La configuración de URLs depende de dónde ejecutes la app:

#### **Opción A: Emulador Android** 🤖

En el emulador Android, `localhost` apunta al emulador mismo, **NO** a tu máquina host. 
Debes usar la IP especial `10.0.2.2`:

```bash
# .env para Emulador Android
API_BASE_URL=http://10.0.2.2:3001/api/v1
AI_SERVICE_URL=http://10.0.2.2:8000/api/v1
WS_URL=ws://10.0.2.2:3001
```

#### **Opción B: Dispositivo Físico Android** 📱

Para un dispositivo físico, usa la IP local de tu máquina:

1. Descubre tu IP local:
   ```bash
   # Windows
   ipconfig
   
   # Linux/Mac
   ifconfig
   # o
   ip addr
   ```

2. Busca tu IP (ej: `192.168.1.100`) y configura:
   ```bash
   # .env para Dispositivo Físico
   API_BASE_URL=http://192.168.1.100:3001/api/v1
   AI_SERVICE_URL=http://192.168.1.100:8000/api/v1
   WS_URL=ws://192.168.1.100:3001
   ```

   ⚠️ **Asegúrate de que tu dispositivo esté en la misma red WiFi que tu computadora**

#### **Opción C: Simulador iOS (solo macOS)** 🍎

En el simulador iOS, `localhost` funciona directamente:

```bash
# .env para iOS Simulator
API_BASE_URL=http://localhost:3001/api/v1
AI_SERVICE_URL=http://localhost:8000/api/v1
WS_URL=ws://localhost:3001
```

## 🚀 Paso 3: Ejecutar la Aplicación

### Para Android:

```bash
# Iniciar Metro Bundler
npm start

# En otra terminal, ejecutar en Android
npm run android
```

### Para iOS (solo macOS):

```bash
# Instalar pods (primera vez)
cd ios && pod install && cd ..

# Iniciar Metro Bundler
npm start

# En otra terminal, ejecutar en iOS
npm run ios
```

## 📱 Verificar la Conexión

Una vez que la app se abra:

1. **Dashboard Inicial**: Deberías ver la pantalla principal
2. **Indicador de Conexión**: Verifica el estado de conexión en la app
3. **Logs**: Revisa los logs en Metro Bundler para ver si hay errores de conexión

## 🐛 Solución de Problemas

### Error: "Network request failed" o "Connection refused"

**Problema**: La app no puede conectarse al backend.

**Solución**:
1. Verifica que los servicios estén corriendo:
   ```bash
   # Verificar servicios Docker
   docker-compose ps
   ```

2. Verifica las URLs en `.env` según tu plataforma (ver arriba)

3. Para dispositivo físico, verifica:
   - Que esté en la misma red WiFi
   - Que el firewall no bloquee los puertos 3001 y 8000
   - Que uses la IP correcta (no `localhost`)

### Error: "Metro bundler failed to start"

```bash
# Limpiar caché y reinstalar
npm start -- --reset-cache
```

### Error: "Build failed" en Android

```bash
# Limpiar proyecto Android
cd android
./gradlew clean
cd ..
npm run android
```

### La app se abre pero no muestra datos

1. Verifica los logs del Metro Bundler
2. Verifica que el backend esté respondiendo:
   ```bash
   curl http://localhost:3001/api/health
   # o desde el navegador: http://localhost:3001/api/health
   ```

3. Verifica que los servicios AI estén respondiendo:
   ```bash
   curl http://localhost:8000/api/v1/health
   ```

## 🔍 Comandos Útiles

```bash
# Ver logs en tiempo real
npm start

# Limpiar caché y reiniciar
npm start -- --reset-cache

# Ejecutar solo en dispositivo específico (Android)
npm run android -- --deviceId=<device-id>

# Ver dispositivos conectados (Android)
adb devices

# Ver logs de Android
adb logcat

# Ver logs de iOS (macOS)
xcrun simctl spawn booted log stream
```

## 📝 Notas Importantes

1. **Metro Bundler debe estar corriendo** antes de abrir la app
2. **Emulador/dispositivo debe estar activo** antes de ejecutar `npm run android/ios`
3. **Puertos**: Asegúrate de que los puertos 3001 y 8000 estén libres
4. **Firewall**: En Windows, es posible que necesites permitir Node.js y el emulador en el firewall

## ✅ Checklist Pre-Ejecución

- [ ] Servicios Docker levantados (`docker-compose ps`)
- [ ] Node.js >= 16 instalado
- [ ] Dependencias instaladas (`npm install`)
- [ ] Archivo `.env` configurado según tu plataforma major
- [ ] Android Studio/Xcode instalado
- [ ] Emulador/dispositivo listo
- [ ] Backend respondiendo en `http://localhost:3001/api/health`
- [ ] AI Services respondiendo en `http://localhost:8000/api/v1/health`

## 🎯 URLs de Servicios

Una vez todo configurado, los servicios deberían estar en:

- **Backend API**: http://localhost:3001
- **AI Services**: http://localhost:8000
- **MongoDB**: localhost:27017
- **Redis**: localhost:6379

---

**¡Listo!** Ahora deberías poder ver y usar la aplicación móvil RespiCare. 🎉

