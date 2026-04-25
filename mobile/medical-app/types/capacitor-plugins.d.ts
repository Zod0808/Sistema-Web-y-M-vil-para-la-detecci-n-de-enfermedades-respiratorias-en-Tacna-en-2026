/**
 * Declaraciones de tipos para plugins de Capacitor pendientes de instalar.
 *
 * Estos módulos están declarados en package.json. Las declaraciones aquí
 * satisfacen a TypeScript hasta que se ejecute `npm install`.
 *
 * Ejecutar antes de compilar:
 *   cd mobile/medical-app && npm install
 */

// ── @capacitor/network ────────────────────────────────────────────────────

declare module '@capacitor/network' {
  export type ConnectionType = 'wifi' | '4g' | '3g' | '2g' | 'none' | 'unknown'

  export interface NetworkStatus {
    connected: boolean
    connectionType: ConnectionType
  }

  export interface NetworkPlugin {
    getStatus(): Promise<NetworkStatus>
    addListener(
      eventName: 'networkStatusChange',
      listenerFunc: (status: NetworkStatus) => void,
    ): Promise<{ remove: () => Promise<void> }>
    removeAllListeners(): Promise<void>
  }

  export const Network: NetworkPlugin
}

// ── @capacitor/preferences ────────────────────────────────────────────────

declare module '@capacitor/preferences' {
  export interface PreferencesPlugin {
    set(options: { key: string; value: string }): Promise<void>
    get(options: { key: string }): Promise<{ value: string | null }>
    remove(options: { key: string }): Promise<void>
    clear(): Promise<void>
    keys(): Promise<{ keys: string[] }>
    migrate(): Promise<{ migrated: string[]; existing: string[] }>
  }

  export const Preferences: PreferencesPlugin
}

// ── @capacitor/geolocation ────────────────────────────────────────────────

declare module '@capacitor/geolocation' {
  export interface Position {
    timestamp: number
    coords: {
      latitude: number
      longitude: number
      accuracy: number
      altitudeAccuracy: number | null
      altitude: number | null
      speed: number | null
      heading: number | null
    }
  }

  export interface PositionOptions {
    enableHighAccuracy?: boolean
    timeout?: number
    maximumAge?: number
  }

  export interface GeolocationPlugin {
    getCurrentPosition(options?: PositionOptions): Promise<Position>
    watchPosition(
      options: PositionOptions,
      callback: (position: Position | null, err?: any) => void,
    ): Promise<string>
    clearWatch(options: { id: string }): Promise<void>
    checkPermissions(): Promise<{ location: PermissionState; coarseLocation: PermissionState }>
    requestPermissions(permissions?: { permissions: ('location' | 'coarseLocation')[] }): Promise<{
      location: PermissionState
      coarseLocation: PermissionState
    }>
  }

  export const Geolocation: GeolocationPlugin
}

// ── @capacitor/local-notifications ───────────────────────────────────────

declare module '@capacitor/local-notifications' {
  export interface LocalNotificationSchema {
    id: number
    title: string
    body: string
    schedule?: {
      at?: Date
      repeats?: boolean
      every?: 'year' | 'month' | 'two-weeks' | 'week' | 'day' | 'hour' | 'minute' | 'second'
      count?: number
      on?: {
        year?: number
        month?: number
        day?: number
        hour?: number
        minute?: number
        second?: number
      }
    }
    sound?: string
    smallIcon?: string
    iconColor?: string
    actionTypeId?: string
    extra?: Record<string, unknown>
    channelId?: string
    ongoing?: boolean
    autoCancel?: boolean
  }

  export interface LocalNotificationsPlugin {
    schedule(options: { notifications: LocalNotificationSchema[] }): Promise<{ notifications: { id: number }[] }>
    cancel(options: { notifications: { id: number }[] }): Promise<void>
    getPending(): Promise<{ notifications: LocalNotificationSchema[] }>
    checkPermissions(): Promise<{ display: PermissionState }>
    requestPermissions(): Promise<{ display: PermissionState }>
    addListener(
      eventName: 'localNotificationReceived' | 'localNotificationActionPerformed',
      listenerFunc: (notification: any) => void,
    ): Promise<{ remove: () => Promise<void> }>
    createChannel(channel: {
      id: string
      name: string
      description?: string
      importance?: 1 | 2 | 3 | 4 | 5
      visibility?: -1 | 0 | 1
      sound?: string
      vibration?: boolean
      lights?: boolean
      lightColor?: string
    }): Promise<void>
    deleteChannel(options: { id: string }): Promise<void>
    listChannels(): Promise<{ channels: any[] }>
    removeAllListeners(): Promise<void>
  }

  export const LocalNotifications: LocalNotificationsPlugin
}

// ── @capacitor/splash-screen ──────────────────────────────────────────────

declare module '@capacitor/splash-screen' {
  export interface SplashScreenPlugin {
    show(options?: { autoHide?: boolean; fadeInDuration?: number; showDuration?: number }): Promise<void>
    hide(options?: { fadeOutDuration?: number }): Promise<void>
  }

  export const SplashScreen: SplashScreenPlugin
}

// ── capacitor-native-biometric ───────────────────────────────────────────
// Reemplaza @capacitor-community/biometric-auth (no publicado en npm).
// Paquete real: https://www.npmjs.com/package/capacitor-native-biometric

declare module 'capacitor-native-biometric' {
  export interface AvailableResult {
    isAvailable: boolean
    /** 0=none, 1=touchId, 2=faceId, 3=fingerprint, 4=face, 5=iris */
    biometryType: number
    errorCode?: number
  }

  export interface VerifyOptions {
    reason: string
    title?: string
    subtitle?: string
    description?: string
    negativeButtonText?: string
    /** Permite PIN/contraseña como respaldo (Android) */
    useFallback?: boolean
    fallbackTitle?: string
    /** Intentos máximos antes de bloquear (Android) */
    maxAttempts?: number
  }

  export interface NativeBiometricPlugin {
    isAvailable(): Promise<AvailableResult>
    verifyIdentity(options: VerifyOptions): Promise<void>
  }

  export const NativeBiometric: NativeBiometricPlugin
}