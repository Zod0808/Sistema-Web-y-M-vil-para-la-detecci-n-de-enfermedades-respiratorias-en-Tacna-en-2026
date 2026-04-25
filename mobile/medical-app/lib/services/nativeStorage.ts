/**
 * nativeStorage
 * ═══════════════════════════════════════════════════════════════════
 * Abstracción sobre almacenamiento persistente que usa:
 *  - @capacitor/Preferences (SharedPreferences nativo) cuando corre en APK
 *  - localStorage como fallback en web/SSR
 *
 * Por qué:
 *  localStorage dentro de un WebView Android puede ser limpiado por el
 *  sistema operativo cuando hay poca memoria. @capacitor/Preferences usa
 *  SharedPreferences de Android, que persiste hasta la desinstalación.
 *
 * API idéntica a localStorage para facilitar la migración:
 *   await NativeStorage.setItem('key', 'value')
 *   await NativeStorage.getItem('key')          → string | null
 *   await NativeStorage.removeItem('key')
 *   await NativeStorage.clear()
 */

const isNative = () =>
  typeof window !== 'undefined' && !!(window as any).Capacitor?.isNativePlatform?.()

// ── Implementación nativa (Capacitor Preferences) ──────────────────────────

async function nativeSet(key: string, value: string): Promise<void> {
  const { Preferences } = await import('@capacitor/preferences')
  await Preferences.set({ key, value })
}

async function nativeGet(key: string): Promise<string | null> {
  const { Preferences } = await import('@capacitor/preferences')
  const { value } = await Preferences.get({ key })
  return value
}

async function nativeRemove(key: string): Promise<void> {
  const { Preferences } = await import('@capacitor/preferences')
  await Preferences.remove({ key })
}

async function nativeClear(): Promise<void> {
  const { Preferences } = await import('@capacitor/preferences')
  await Preferences.clear()
}

async function nativeKeys(): Promise<string[]> {
  const { Preferences } = await import('@capacitor/preferences')
  const { keys } = await Preferences.keys()
  return keys
}

// ── Implementación web (localStorage con catch para Safari Private) ─────────

function webSet(key: string, value: string): void {
  try {
    localStorage.setItem(key, value)
  } catch {
    // Safari Private Mode lanza QuotaExceededError
    // Silenciar — el valor no persiste pero la app no crashea
  }
}

function webGet(key: string): string | null {
  try {
    return localStorage.getItem(key)
  } catch {
    return null
  }
}

function webRemove(key: string): void {
  try {
    localStorage.removeItem(key)
  } catch {
    // ignorar
  }
}

function webClear(): void {
  try {
    localStorage.clear()
  } catch {
    // ignorar
  }
}

// ── API pública ────────────────────────────────────────────────────────────

export const NativeStorage = {
  /**
   * Guarda un valor. El valor debe ser string; serializa objetos con JSON.stringify.
   */
  setItem: async (key: string, value: string): Promise<void> => {
    if (isNative()) {
      await nativeSet(key, value)
    } else {
      webSet(key, value)
    }
  },

  /**
   * Lee un valor. Retorna null si no existe.
   */
  getItem: async (key: string): Promise<string | null> => {
    if (isNative()) {
      return nativeGet(key)
    }
    return webGet(key)
  },

  /**
   * Elimina una clave.
   */
  removeItem: async (key: string): Promise<void> => {
    if (isNative()) {
      await nativeRemove(key)
    } else {
      webRemove(key)
    }
  },

  /**
   * Limpia todo el almacenamiento de la app.
   * CUIDADO: en Preferences nativo elimina TODAS las claves del app.
   */
  clear: async (): Promise<void> => {
    if (isNative()) {
      await nativeClear()
    } else {
      webClear()
    }
  },

  /**
   * Lista todas las claves almacenadas.
   */
  keys: async (): Promise<string[]> => {
    if (isNative()) {
      return nativeKeys()
    }
    try {
      return Object.keys(localStorage)
    } catch {
      return []
    }
  },

  // ── Helpers tipados para valores comunes ────────────────────────────────

  /** Guarda un objeto como JSON */
  setJSON: async <T>(key: string, value: T): Promise<void> => {
    await NativeStorage.setItem(key, JSON.stringify(value))
  },

  /** Lee y parsea un objeto JSON. Retorna null si no existe o si falla el parse. */
  getJSON: async <T>(key: string): Promise<T | null> => {
    const raw = await NativeStorage.getItem(key)
    if (!raw) return null
    try {
      return JSON.parse(raw) as T
    } catch {
      return null
    }
  },

  /** Guarda un booleano */
  setBool: async (key: string, value: boolean): Promise<void> => {
    await NativeStorage.setItem(key, value ? '1' : '0')
  },

  /** Lee un booleano. Retorna el defaultValue si la clave no existe. */
  getBool: async (key: string, defaultValue = false): Promise<boolean> => {
    const raw = await NativeStorage.getItem(key)
    if (raw === null) return defaultValue
    return raw === '1' || raw === 'true'
  },
}

// ── Claves tipadas para toda la app ────────────────────────────────────────
// Centralizar aquí evita errores por typos en las claves.

export const StorageKeys = {
  AUTH_TOKEN:        'respicare:auth_token',
  REFRESH_TOKEN:     'respicare:refresh_token',
  USER_PROFILE:      'respicare:user_profile',
  USER_ROLE:         'respicare:user_role',
  THEME_PREFERENCE:  'respicare:theme',
  LANGUAGE:          'respicare:language',
  BIOMETRIC_ENABLED: 'respicare:biometric_enabled',
  LAST_SYNC:         'respicare:last_sync',
  OFFLINE_QUEUE:     'respicare:offline_queue',
  NOTIFICATIONS_ENABLED: 'respicare:notifications_enabled',
  EMERGENCY_CONTACTS: 'respicare:emergency_contacts',
  ONBOARDING_DONE:   'respicare:onboarding_done',
} as const

export type StorageKey = typeof StorageKeys[keyof typeof StorageKeys]