# Guía Técnica — Módulo Mobile RespiCare
**Stack:** Next.js 14 (export estático) + Capacitor 6 + Android APK  
**Versión:** 1.0 | Auditado: Abril 2026

---

## 1. Arquitectura General

```text
  ┌──────────────────────────────────────────────────────────────────────┐
  │                    APK Android (Capacitor WebView)                   │
  │                                                                      │
  │  ┌─────────────────────────────────────────────────────────────┐    │
  │  │                Next.js (export estático /out)               │    │
  │  │                                                             │    │
  │  │  Providers: CapacitorProvider → OfflineSyncProvider         │    │
  │  │  Store:     Zustand (useAppStore)                           │    │
  │  │  Hooks:     useNetworkStatus · useGeolocation               │    │
  │  │             useBiometricAuth · useCapacitorApp              │    │
  │  │             useOfflineSync                                  │    │
  │  │                                                             │    │
  │  └───────────────────┬─────────────────────────────────────────┘    │
  │                      │ Capacitor Bridge                              │
  │  ┌───────────────────▼─────────────────────────────────────────┐    │
  │  │              Plugins nativos de Capacitor                    │    │
  │  │  @capacitor/network · @capacitor/geolocation                │    │
  │  │  @capacitor/preferences · @capacitor/local-notifications    │    │
  │  │  @capacitor/splash-screen · @capacitor/status-bar           │    │
  │  │  @capacitor/keyboard · @capacitor-community/sqlite          │    │
  │  │  capacitor-native-biometric                                 │    │
  │  └─────────────────────────────────────────────────────────────┘    │
  └──────────────────────────────────────────────────────────────────────┘
             │ HTTPS                              │ HTTPS
             ▼                                    ▼
  ┌────────────────────┐              ┌─────────────────────┐
  │  Backend Node.js   │              │  IA FastAPI Python   │
  │  :3001/api/v1      │              │  :8000/ai/predict   │
  └────────────────────┘              └─────────────────────┘
             │                                    │
             ▼                                    ▼
  ┌────────────────────┐              ┌─────────────────────┐
  │  MongoDB + Redis   │              │  Modelos ML         │
  └────────────────────┘              │  (Random Forest,    │
                                      │   CNN tos, LSTM)    │
                                      └─────────────────────┘
```

---

## 2. Estructura de Carpetas

```text
mobile/medical-app/
├── app/
│   ├── layout.tsx              ← Árbol de providers
│   ├── page.tsx                ← Entrada principal
│   └── globals.css
├── components/
│   ├── providers/
│   │   ├── capacitor-provider.tsx   ← Inicializa nativos + recupera sesión
│   │   └── offline-sync-provider.tsx
│   ├── tabs/                   ← Vistas por sección (appointments, alerts…)
│   ├── views/                  ← Pantallas detalladas
│   ├── forms/                  ← Formularios (medical-history, appointment)
│   └── ui/                     ← Componentes Radix + shadcn/ui
├── hooks/
│   ├── useCapacitorApp.ts      ← Back button, deep links, lifecycle
│   ├── useNetworkStatus.ts     ← Estado de red nativo
│   ├── useGeolocation.ts       ← GPS + emergencias
│   ├── useBiometricAuth.ts     ← Touch ID / Face ID / huella
│   └── useOfflineSync.ts       ← Sincroniza cola offline al reconectar
├── lib/
│   ├── api/
│   │   ├── client.ts           ← ApiClient (timeout, refresh token)
│   │   ├── config.ts           ← URLs, endpoints, gestión de tokens
│   │   └── services/           ← Servicios por dominio
│   ├── services/
│   │   ├── nativeStorage.ts    ← Preferences + localStorage fallback
│   │   ├── sqliteDatabase.ts   ← SQLite para cola offline
│   │   ├── offlineQueue.ts     ← Cola con backoff exponencial
│   │   ├── offlineOperations.ts← Wrappers online/offline automáticos
│   │   └── notificationService.ts
│   └── types/                  ← Tipos globales (User, Appointment…)
├── store/
│   └── useAppStore.ts          ← Estado global Zustand
├── android/                    ← Proyecto Android nativo
├── capacitor.config.ts
└── next.config.mjs
```

---

## 3. Variables de Entorno

Crear `mobile/medical-app/.env.local`:

```bash
# URL del backend Node.js
NEXT_PUBLIC_API_URL=http://192.168.1.X:3001

# URL del servicio IA FastAPI
NEXT_PUBLIC_AI_SERVICE_URL=http://192.168.1.X:8000
```

> **Para APK física:** usar la IP de la PC en la red WiFi local, no `localhost`.  
> El emulador usa `10.0.2.2` para alcanzar `localhost` del host.

---

## 4. Flujo de Arranque de la App

```text
  APK abre  →  WebView carga /out/index.html
       │
       ▼
  CapacitorProvider.mount()
       ├── recoverTokensFromNativeStorage()   ← restaura sesión si localStorage fue limpiado
       ├── StatusBar.setStyle(Dark)
       ├── SplashScreen.hide(fadeOut 300ms)
       └── Keyboard.setAccessoryBarVisible()
       │
       ▼
  useCapacitorApp()
       ├── App.addListener('backButton')      ← navega atrás o exitApp()
       ├── App.addListener('appUrlOpen')      ← deep links respicare://
       └── App.addListener('appStateChange')  ← emite app:resume / app:pause
       │
       ▼
  OfflineSyncProvider.mount()
       └── Si isOnline y hay pendientes → syncPendingOperations()
       │
       ▼
  Zustand store hidratado → UI renderiza
```

---

## 5. Gestión de Sesión y Tokens

### Problema que resuelve

Android puede limpiar el `localStorage` del WebView cuando el sistema tiene poca memoria. Si los tokens solo están en `localStorage`, el usuario pierde la sesión aunque no haya cerrado sesión.

### Solución: Dual-Write

```text
  setAuthTokens(token, refresh)
        │
        ├── localStorage.setItem('auth_token', token)     ← lectura síncrona rápida
        └── NativeStorage.setItem('respicare:auth_token') ← SharedPreferences Android
                                                            (persiste hasta desinstalación)
```

### Recuperación al arrancar

```text
  recoverTokensFromNativeStorage()       ← llamada en CapacitorProvider
        │
        ├── ¿localStorage tiene token? → NO hacer nada (ya está)
        │
        └── ¿NativeStorage tiene token? → copiar a localStorage
                                           → setUser(getUser()) en Zustand store
                                           → usuario sigue "logueado"
```

### Funciones en `lib/api/config.ts`

| Función | Tipo | Descripción |
|:---|:---:|:---|
| `getAuthToken()` | sync | Lee token de localStorage (para el cliente HTTP) |
| `getRefreshToken()` | sync | Lee refresh token de localStorage |
| `setAuthTokens(t, r)` | void | Escribe en localStorage + NativeStorage (async) |
| `clearAuthTokens()` | void | Elimina de ambos almacenes |
| `getUser()` | sync | Lee perfil de usuario desde localStorage |
| `setUser(u)` | void | Escribe en localStorage + NativeStorage (async) |
| `recoverTokensFromNativeStorage()` | async | Restaura localStorage desde SharedPreferences |

---

## 6. Estado de Red — `useNetworkStatus`

```typescript
const { isOnline, connectionType } = useNetworkStatus()
// connectionType: 'wifi' | '4g' | '3g' | '2g' | 'none' | 'unknown'
```

- En **APK**: usa `@capacitor/network` (ConnectivityManager nativo — más fiable que `window.online`)
- En **web**: usa `window.addEventListener('online'/'offline')`
- Se sincroniza automáticamente con `useAppStore.setOnlineStatus()`

---

## 7. Modo Offline — Cola de Operaciones

### Cómo funciona

```text
  Usuario hace acción (crear cita, registrar síntomas…)
        │
        ├── ¿Hay conexión? ─── SÍ ──► llama servicio directo
        │                              ├── OK → listo
        │                              └── Error de red → encola offline
        │
        └── NO ──────────────────────► encola offline (SQLite)

  Al reconectar:
        useOfflineSync detecta isOnline=true
        processQueue() con backoff exponencial:
          retry 1: inmediato
          retry 2: espera 2 s
          retry 3: espera 4 s
          → failed: se muestra en UI para acción manual
```

### Operaciones Soportadas Offline

| Tipo | Descripción |
|:---|:---|
| `create_medical_history` | Nueva entrada de historial clínico |
| `update_medical_history` | Actualizar diagnóstico o síntomas |
| `create_appointment` | Solicitar cita médica |
| `update_appointment` | Modificar cita |
| `cancel_appointment` | Cancelar cita con motivo |
| `reschedule_appointment` | Reagendar a nueva fecha |
| `acknowledge_alert` | Marcar alerta como vista |
| `upload_images` | Subir fotos de síntomas |
| `upload_audio` | Subir audio de tos para análisis IA |
| `create_prescription` | Nueva prescripción |
| `cancel_prescription` | Cancelar medicación |
| `create_referral` | Generar referido médico |
| `create_emergency` | Registrar emergencia |
| `create_lab_order` | Solicitar examen de laboratorio |
| `create_chat_message` | Mensaje al asistente IA (se envía al reconectar) |

### Funciones disponibles

```typescript
const { isSyncing, queueStats, syncNow, pendingCount } = useOfflineSync()

// syncNow()        → sincroniza manualmente (comprueba conexión primero)
// queueStats       → { total, pending, processing, completed, failed }
// pendingCount     → número de operaciones pendientes (para badge en UI)
```

---

## 8. Biometría — `useBiometricAuth`

```typescript
const { isAvailable, biometryType, biometryLabel, isEnabled,
        authenticate, toggleBiometric } = useBiometricAuth()
```

### Flujo de autenticación

```text
  authenticate({ reason: 'Confirma tu identidad' })
        │
        ├── Android: BiometricPrompt (huella / cara / iris)
        ├── iOS:     Face ID / Touch ID
        │
        ├── OK → retorna true
        ├── Cancelado por usuario → retorna false (sin error visible)
        └── Fallo (3 intentos) → retorna false + error en estado
```

### Activar/desactivar biometría

```typescript
await toggleBiometric(true)
// 1. Lanza prompt biométrico para verificar identidad
// 2. Si OK → persiste isEnabled=true en NativeStorage
// 3. Si cancela → no activa
```

### Tipos de biometría (`BiometryType`)

| Valor | Hardware |
|:---|:---|
| `touchId` | Touch ID (iPhone/iPad) |
| `faceId` | Face ID (iPhone X+) |
| `fingerprintAuthentication` | Huella dactilar (Android) |
| `faceAuthentication` | Reconocimiento facial (Android) |
| `irisAuthentication` | Reconocimiento de iris (Samsung) |
| `none` | No disponible |

---

## 9. Geolocalización — `useGeolocation`

```typescript
const { position, isWatching, permissionStatus,
        getCurrentLocation, startWatching, stopWatching,
        requestPermission, getEmergencyLocationUrl } = useGeolocation()
```

### Uso en emergencias

```typescript
// Obtener ubicación una vez
const pos = await getCurrentLocation()
// → { latitude, longitude, accuracy, altitude, speed }

// URL para compartir en emergencia
const url = getEmergencyLocationUrl()
// → 'https://maps.google.com/?q=-18.0146,-70.2536'

// Seguimiento continuo (actualiza cada vez que el usuario se mueve)
await startWatching()
// ...cuando termine:
stopWatching()
```

---

## 10. Notificaciones Locales — `notificationService`

### Canales Android (obligatorios en Android 8+)

| Canal ID | Nombre | Importancia | Uso |
|:---|:---|:---:|:---|
| `respicare-alerts` | Alertas Médicas | 5 (MAX) | Signos vitales críticos, SpO₂ bajo |
| `respicare-reminders` | Recordatorios | 4 (HIGH) | Medicación, citas próximas |
| `respicare-sync` | Sincronización | 2 (LOW) | Sync offline silenciosa |

### API del servicio

```typescript
import { notificationService } from '@/lib/services/notificationService'

// Inicializar (llamar una vez al arrancar)
await notificationService.init()

// Alerta crítica inmediata
await notificationService.sendAlert({
  title: 'SpO₂ Crítico',
  body: 'Nivel de oxígeno en sangre: 88%',
  urgency: 'critical',   // 'critical' | 'high' | 'medium'
})

// Recordatorio de medicación diario a las 08:00
await notificationService.scheduleMedicationReminder('Salbutamol', 8, 0)

// Recordatorio de cita 30 minutos antes
await notificationService.scheduleAppointmentReminder(
  'Dr. García',
  new Date('2026-04-25T10:00:00'),
  30
)
```

---

## 11. Integración con Backend y Servicios IA

### Endpoints configurados

| Servicio | Base URL | Autenticación |
|:---|:---|:---:|
| Backend REST | `NEXT_PUBLIC_API_URL/api/v1` | Bearer JWT |
| Servicio IA | `NEXT_PUBLIC_AI_SERVICE_URL` | — (red interna) |
| Chat | `NEXT_PUBLIC_API_URL/api/chat-conversations` | Bearer JWT |

### Análisis de síntomas con IA

```typescript
import { symptomAnalyzerService } from '@/lib/api/services/symptomAnalyzerService'

// Enviar síntomas al servicio IA (FastAPI → Random Forest)
const result = await symptomAnalyzerService.analyze({
  symptoms: ['tos', 'fiebre', 'disnea'],
  duration: 3,       // días
  severity: 'moderate',
})
// result → { disease, confidence, recommendations[] }
```

### Refresh automático de token (401)

El `ApiClient` detecta respuestas `401` y automáticamente:
1. Llama a `POST /api/v1/auth/refresh-token`
2. Si OK → reintenta la petición original con el nuevo token
3. Si falla → `clearAuthTokens()` + error de sesión expirada

---

## 12. Build — Generar APK

### Prerrequisitos

```bash
# Instalar dependencias
cd mobile/medical-app
npm install

# Generar keystore de firma (solo primera vez)
powershell -File ../../scripts/generate-keystore.ps1
# → crea android/keystore.properties (NO commitear)
```

### Comandos

```bash
# 1. Build estático de Next.js
npm run build
# → genera /out con el HTML/JS/CSS

# 2. Sincronizar con Android
npx cap sync android

# 3. Compilar APK debug (pruebas)
cd android
./gradlew assembleDebug
# → android/app/build/outputs/apk/debug/app-debug.apk

# 4. Compilar APK release (distribución)
./gradlew assembleRelease
# → android/app/build/outputs/apk/release/app-release.apk

# 5. Instalar en dispositivo conectado por USB
adb install app/build/outputs/apk/debug/app-debug.apk
```

### Tunnel para desarrollo (dispositivo físico ↔ backend local)

```bash
# Opción A — ngrok
ngrok http 3001
# Copiar URL en capacitor.config.ts:  server.url = 'https://xxxx.ngrok-free.app'

# Opción B — red WiFi local
# PC y dispositivo en la misma WiFi
# En .env.local: NEXT_PUBLIC_API_URL=http://192.168.1.X:3001
# En capacitor.config.ts: server.url = 'http://192.168.1.X:8083'
#                          cleartext: true  (solo dev)
```

---

## 13. Problemas Resueltos en esta Auditoría

| # | Problema | Severidad | Archivo | Solución Aplicada |
|:---:|:---|:---:|:---|:---|
| 1 | `ignoreBuildErrors: true` ocultaba errores TS | 🔴 Crítico | `next.config.mjs` | Cambiado a `false` |
| 2 | Tokens solo en `localStorage` (se pierde en Android) | 🔴 Crítico | `lib/api/config.ts` | Dual-write + `recoverTokensFromNativeStorage()` |
| 3 | `recoverTokens` no se llamaba al arrancar | 🔴 Crítico | `capacitor-provider.tsx` | Llamada en `initNativeServices()` + restaura `useAppStore` |
| 4 | `isOnline = useNetworkStatus()` sin destructurar | 🟠 Alto | `hooks/useOfflineSync.ts` | `const { isOnline } = useNetworkStatus()` |
| 5 | `create_lab_order` no hacía nada (vacío) | 🟡 Medio | `hooks/useOfflineSync.ts` | Llama `apiClient.post(API_ENDPOINTS.lab.createOrder)` |
| 6 | Chat offline sin tipo en la cola | 🟡 Medio | `lib/services/offlineQueue.ts` | Añadido `create_chat_message` a `OperationType` |
| 7 | Sin case de chat en el procesador offline | 🟡 Medio | `hooks/useOfflineSync.ts` | Añadido `case 'create_chat_message'` con `chatService.sendMessage` |
| 8 | Sin backoff exponencial en reintentos offline | 🟡 Medio | `lib/services/offlineQueue.ts` | Backoff `2^retries × 1s`, máximo 30 s |
| 9 | `labService` sin método `createOrder` | 🟡 Medio | `lib/api/services/labService.ts` | Añadido `createOrder(data)` |

---

## 14. Checklist de Verificación Final

### Antes de generar APK

- [ ] `npm run build` sin errores (TypeScript strict activado)
- [ ] `npx tsc --noEmit` → 0 errores
- [ ] `NEXT_PUBLIC_API_URL` apunta a IP alcanzable desde el dispositivo
- [ ] `keystore.properties` existe y no está en el repo (en `.gitignore`)
- [ ] Capacitor tunnel configurado si se prueba contra backend local

### En el dispositivo físico (Android 10+)

- [ ] App instala sin error de firma
- [ ] Splash screen aparece y desaparece con fade
- [ ] Status bar oscura (slate-900)
- [ ] Botón atrás navega correctamente (no cierra la app en pantallas internas)
- [ ] Login funciona y sesión persiste al matar la app y volver
- [ ] Con WiFi desconectada: crear historial funciona → aparece en cola offline
- [ ] Al reconectar WiFi: cola se sincroniza automáticamente (toast de confirmación)
- [ ] Biometría: solicita huella / cara en login si está activada
- [ ] Notificación local aparece en bandeja al programar recordatorio
- [ ] Geolocalización: muestra coordenadas en módulo de emergencias
- [ ] Deep link `respicare://` abre la app desde el navegador

### Integración con Backend

- [ ] `POST /api/v1/auth/login` retorna token → se guarda en localStorage + NativeStorage
- [ ] `GET /api/v1/medical-histories` retorna datos del usuario autenticado
- [ ] `POST /ai/predict/symptoms` retorna predicción con confianza
- [ ] Al expirar token: se refresca automáticamente sin que el usuario lo note
- [ ] Al desinstalar y reinstalar: sesión no persiste (NativeStorage limpiado)

---

*Documento generado tras auditoría exhaustiva del módulo mobile. Revisión: 1.0 — Abril 2026*