/**
 * Configuración de la API del backend RespiCare
 */

// Obtener la URL base original
const getOriginalBaseURL = (): string => {
  return process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'
}

// Helper para normalizar la baseURL - remover /api/v1 si está presente
const normalizeBaseURL = (url: string): string => {
  // Si la URL termina con /api/v1, removerlo
  if (url.endsWith('/api/v1')) {
    return url.replace('/api/v1', '')
  }
  // Si termina con /api, removerlo también
  if (url.endsWith('/api')) {
    return url.replace('/api', '')
  }
  return url
}

// Helper para obtener la baseURL sin /api/v1 (para rutas de chat que están en /api, no /api/v1)
const getChatBaseURL = (): string => {
  return normalizeBaseURL(getOriginalBaseURL())
}

// Helper para construir endpoints - siempre incluir /api/v1 porque normalizamos la baseURL
const buildEndpoint = (path: string): string => {
  // Siempre incluir /api/v1 porque la baseURL ya está normalizada (sin /api/v1)
  return `/api/v1${path}`
}

export const API_CONFIG = {
  baseURL: normalizeBaseURL(getOriginalBaseURL()),
  aiServiceURL: process.env.NEXT_PUBLIC_AI_SERVICE_URL || 'http://localhost:8000',
  timeout: 30000, // 30 segundos
  retries: 3,
  // BaseURL específica para chat (sin /api/v1)
  chatBaseURL: getChatBaseURL(),
}

export const API_ENDPOINTS = {
  // Autenticación
  auth: {
    login: buildEndpoint('/auth/login'),
    register: buildEndpoint('/auth/register'),
    refreshToken: buildEndpoint('/auth/refresh-token'),
    logout: buildEndpoint('/auth/logout'),
    profile: buildEndpoint('/auth/profile'),
    changePassword: buildEndpoint('/auth/change-password'),
  },
  
  // Historias Médicas
  medicalHistories: {
    list: buildEndpoint('/medical-histories'),
    get: (id: string) => buildEndpoint(`/medical-histories/${id}`),
    create: buildEndpoint('/medical-histories'),
    update: (id: string) => buildEndpoint(`/medical-histories/${id}`),
    delete: (id: string) => buildEndpoint(`/medical-histories/${id}`),
    sync: buildEndpoint('/medical-histories/sync'),
    stats: buildEndpoint('/medical-histories/stats'),
  },
  
  // Análisis de Síntomas
  symptomAnalyzer: {
    analyze: buildEndpoint('/symptom-analyzer/analyze'),
    trends: (patientId: string) => buildEndpoint(`/symptom-analyzer/trends/${patientId}`),
    recommendations: buildEndpoint('/symptom-analyzer/recommendations'),
    history: (patientId: string) => buildEndpoint(`/symptom-analyzer/history/${patientId}`),
    statistics: (patientId: string) => buildEndpoint(`/symptom-analyzer/statistics/${patientId}`),
  },
  
  // Dashboard
  dashboard: {
    admin: buildEndpoint('/dashboard/admin'),
    doctor: buildEndpoint('/dashboard/doctor'),
    patient: buildEndpoint('/dashboard/patient'),
  },
  
  // Citas Médicas
  appointments: {
    list: buildEndpoint('/appointments'),
    get: (id: string) => buildEndpoint(`/appointments/${id}`),
    create: buildEndpoint('/appointments'),
    update: (id: string) => buildEndpoint(`/appointments/${id}`),
    cancel: (id: string) => buildEndpoint(`/appointments/${id}/cancel`),
    reschedule: (id: string) => buildEndpoint(`/appointments/${id}/reschedule`),
    upcoming: buildEndpoint('/appointments/me/upcoming'),
    availability: (doctorId: string) => buildEndpoint(`/appointments/doctor/${doctorId}/availability`),
  },

  // Alertas
  alerts: {
    list: buildEndpoint('/alerts'),
    acknowledge: (id: string) => buildEndpoint(`/alerts/${id}/acknowledge`),
    dashboard: buildEndpoint('/alerts/dashboard/summary'),
  },

  // Analytics
  analytics: {
    executiveDashboard: buildEndpoint('/analytics/executive-dashboard'),
    temporalTrends: buildEndpoint('/analytics/temporal-trends'),
    diseaseReports: buildEndpoint('/analytics/disease-reports'),
    geographicData: buildEndpoint('/analytics/geographic-data'),
    symptomSummary: buildEndpoint('/analytics/symptom-summary'),
    districtTrends: buildEndpoint('/analytics/district-trends'),
    outbreakPredictions: buildEndpoint('/analytics/outbreak-predictions'),
  },
  
  // Wearables
  wearables: {
    metrics: buildEndpoint('/wearables/metrics'),
    sync: buildEndpoint('/wearables/sync'),
    data: buildEndpoint('/wearables/data'),
  },
  
  // Prescripciones
  prescriptions: {
    list: buildEndpoint('/prescriptions'),
    get: (id: string) => buildEndpoint('/prescriptions/' + id),
    create: buildEndpoint('/prescriptions'),
    update: (id: string) => buildEndpoint('/prescriptions/' + id),
    cancel: (id: string) => buildEndpoint('/prescriptions/' + id + '/cancel'),
    myPrescriptions: buildEndpoint('/prescriptions'),
  },

  // Referidos
  referrals: {
    list: buildEndpoint('/referrals'),
    get: (id: string) => buildEndpoint('/referrals/' + id),
    create: buildEndpoint('/referrals'),
    accept: (id: string) => buildEndpoint('/referrals/' + id + '/accept'),
    reject: (id: string) => buildEndpoint('/referrals/' + id + '/reject'),
    complete: (id: string) => buildEndpoint('/referrals/' + id + '/complete'),
    myReferrals: buildEndpoint('/referrals/my-referrals'),
  },

  // Emergencias
  emergencies: {
    list: buildEndpoint('/emergencies'),
    get: (id: string) => buildEndpoint('/emergencies/' + id),
    create: buildEndpoint('/emergencies'),
    resolve: (id: string) => buildEndpoint('/emergencies/' + id + '/resolve'),
    active: buildEndpoint('/emergencies/active'),
  },

  // Laboratorio
  lab: {
    results: buildEndpoint('/lab/results'),
    result: (id: string) => buildEndpoint('/lab/results/' + id),
    patientResults: (patientId: string) => buildEndpoint('/lab/results/patient/' + patientId),
    pendingOrders: buildEndpoint('/lab/orders/pending'),
    createOrder: buildEndpoint('/lab/orders'),
  },

    // Chat - usando rutas del backend (sin /v1, directamente en /api)
  // Nota: Estas rutas están en /api/chat-conversations (no en /api/v1)
  chat: {
    conversations: '/api/chat-conversations',
    messages: (sessionId: string) => `/api/chat-conversations/${sessionId}/messages`,
    getConversation: (sessionId: string) => `/api/chat-conversations/${sessionId}`,
    completeConversation: (sessionId: string) => `/api/chat-conversations/${sessionId}/complete`,
  },
}

// ── Claves en NativeStorage (SharedPreferences en Android) ───────────────────
// Usan prefijo diferente a localStorage para evitar colisiones.
const NS = {
  AUTH_TOKEN:    'respicare:auth_token',
  REFRESH_TOKEN: 'respicare:refresh_token',
  USER_PROFILE:  'respicare:user_profile',
} as const

// ── Lectura síncrona desde localStorage ──────────────────────────────────────
// El cliente HTTP necesita el token de forma síncrona. localStorage es la
// caché rápida; NativeStorage (Preferences) es el almacén persistente.

export const getAuthToken = (): string | null => {
  if (typeof window === 'undefined') return null
  return localStorage.getItem('auth_token')
}

export const getRefreshToken = (): string | null => {
  if (typeof window === 'undefined') return null
  return localStorage.getItem('refresh_token')
}

// ── Escritura dual: localStorage (sync/rápido) + NativeStorage (persistente) ─

export const setAuthTokens = (token: string, refreshToken: string): void => {
  if (typeof window === 'undefined') return
  localStorage.setItem('auth_token', token)
  localStorage.setItem('refresh_token', refreshToken)
  // Escritura async a SharedPreferences — sobrevive a limpiezas del WebView
  import('@/lib/services/nativeStorage').then(({ NativeStorage }) => {
    NativeStorage.setItem(NS.AUTH_TOKEN, token).catch(console.error)
    NativeStorage.setItem(NS.REFRESH_TOKEN, refreshToken).catch(console.error)
  }).catch(console.error)
}

export const clearAuthTokens = (): void => {
  if (typeof window === 'undefined') return
  localStorage.removeItem('auth_token')
  localStorage.removeItem('refresh_token')
  localStorage.removeItem('user')
  import('@/lib/services/nativeStorage').then(({ NativeStorage }) => {
    NativeStorage.removeItem(NS.AUTH_TOKEN).catch(console.error)
    NativeStorage.removeItem(NS.REFRESH_TOKEN).catch(console.error)
    NativeStorage.removeItem(NS.USER_PROFILE).catch(console.error)
  }).catch(console.error)
}

export const getUser = (): any | null => {
  if (typeof window === 'undefined') return null
  const userStr = localStorage.getItem('user')
  return userStr ? JSON.parse(userStr) : null
}

export const setUser = (user: any): void => {
  if (typeof window === 'undefined') return
  localStorage.setItem('user', JSON.stringify(user))
  import('@/lib/services/nativeStorage').then(({ NativeStorage }) => {
    NativeStorage.setItem(NS.USER_PROFILE, JSON.stringify(user)).catch(console.error)
  }).catch(console.error)
}

/**
 * Recupera tokens desde NativeStorage (SharedPreferences) hacia localStorage.
 * Llamar al arrancar la app en plataforma nativa para restaurar sesión
 * cuando Android limpió el localStorage del WebView por presión de memoria.
 */
export const recoverTokensFromNativeStorage = async (): Promise<boolean> => {
  if (typeof window === 'undefined') return false
  // Solo ejecutar en plataforma nativa
  const isNative = !!(window as any).Capacitor?.isNativePlatform?.()
  if (!isNative) return false

  // Si ya hay tokens en localStorage, no hace falta recuperar
  if (localStorage.getItem('auth_token')) return false

  try {
    const { NativeStorage } = await import('@/lib/services/nativeStorage')
    const [token, refresh, userStr] = await Promise.all([
      NativeStorage.getItem(NS.AUTH_TOKEN),
      NativeStorage.getItem(NS.REFRESH_TOKEN),
      NativeStorage.getItem(NS.USER_PROFILE),
    ])

    if (token) localStorage.setItem('auth_token', token)
    if (refresh) localStorage.setItem('refresh_token', refresh)
    if (userStr) localStorage.setItem('user', userStr)

    return !!token
  } catch {
    return false
  }
}

