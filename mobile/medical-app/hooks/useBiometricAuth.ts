/**
 * useBiometricAuth
 * ═══════════════════════════════════════════════════════════════════
 * Hook de autenticación biométrica usando capacitor-native-biometric.
 *
 * Soporta:
 *  - Android: huella dactilar, reconocimiento facial
 *  - iOS: Touch ID, Face ID
 *  - Fallback: PIN/contraseña del dispositivo (fallbackTitle)
 *
 * Flujo:
 *  1. checkAvailability()  → verifica si el hardware está disponible
 *  2. authenticate()       → lanza el prompt biométrico nativo
 *  3. toggleBiometric()    → activa/desactiva en la app (persiste en NativeStorage)
 *
 * Uso típico:
 *   const { isAvailable, biometryType, authenticate } = useBiometricAuth()
 *   if (isAvailable) await authenticate({ reason: 'Confirmar acceso' })
 */

import { useState, useEffect, useCallback } from 'react'
import { NativeStorage, StorageKeys } from '@/lib/services/nativeStorage'

export type BiometryType =
  | 'none'
  | 'touchId'
  | 'faceId'
  | 'fingerprintAuthentication'
  | 'faceAuthentication'
  | 'irisAuthentication'

// Tipos de biometría según capacitor-native-biometric
const BIOMETRY_TYPE_MAP: Record<number, BiometryType> = {
  0: 'none',
  1: 'touchId',
  2: 'faceId',
  3: 'fingerprintAuthentication',
  4: 'faceAuthentication',
  5: 'irisAuthentication',
}

export interface BiometricState {
  isAvailable: boolean
  biometryType: BiometryType
  isEnabled: boolean
  loading: boolean
  error: string | null
}

export interface AuthenticateOptions {
  reason?: string
  cancelTitle?: string
  fallbackTitle?: string  // Texto del botón "Usar PIN" (iOS)
}

const isNative = () =>
  typeof window !== 'undefined' && !!(window as any).Capacitor?.isNativePlatform?.()

const BIOMETRY_LABELS: Record<BiometryType, string> = {
  none: 'No disponible',
  touchId: 'Touch ID',
  faceId: 'Face ID',
  fingerprintAuthentication: 'Huella dactilar',
  faceAuthentication: 'Reconocimiento facial',
  irisAuthentication: 'Reconocimiento de iris',
}

export function useBiometricAuth() {
  const [state, setState] = useState<BiometricState>({
    isAvailable: false,
    biometryType: 'none',
    isEnabled: false,
    loading: true,
    error: null,
  })

  // ── Verificar disponibilidad al montar ─────────────────────────────────

  useEffect(() => {
    async function check() {
      if (!isNative()) {
        setState((prev) => ({ ...prev, loading: false, isAvailable: false }))
        return
      }

      try {
        const { NativeBiometric } = await import('capacitor-native-biometric')
        const result = await NativeBiometric.isAvailable()
        const isEnabled = await NativeStorage.getBool(StorageKeys.BIOMETRIC_ENABLED, false)
        const biometryType = BIOMETRY_TYPE_MAP[result.biometryType ?? 0] ?? 'none'

        setState({
          isAvailable: result.isAvailable,
          biometryType,
          isEnabled,
          loading: false,
          error: null,
        })
      } catch {
        setState((prev) => ({
          ...prev,
          loading: false,
          isAvailable: false,
          biometryType: 'none',
        }))
      }
    }

    check()
  }, [])

  // ── Autenticar ─────────────────────────────────────────────────────────

  const authenticate = useCallback(
    async (options: AuthenticateOptions = {}): Promise<boolean> => {
      if (!isNative() || !state.isAvailable) return false

      setState((prev) => ({ ...prev, loading: true, error: null }))

      try {
        const { NativeBiometric } = await import('capacitor-native-biometric')

        await NativeBiometric.verifyIdentity({
          reason: options.reason ?? 'Confirma tu identidad para acceder a RespiCare',
          title: 'RespiCare Medical',
          subtitle: BIOMETRY_LABELS[state.biometryType],
          description: options.reason ?? 'Usa tu ' + BIOMETRY_LABELS[state.biometryType],
          negativeButtonText: options.cancelTitle ?? 'Cancelar',
          useFallback: true,          // Permite PIN/contraseña como respaldo
          fallbackTitle: options.fallbackTitle ?? 'Usar PIN',
          maxAttempts: 3,
        })

        setState((prev) => ({ ...prev, loading: false, error: null }))
        return true
      } catch (err: unknown) {
        const message =
          err instanceof Error ? err.message : 'Autenticación biométrica fallida'

        // Cancelación del usuario — no mostrar como error
        const isCancelled =
          message.toLowerCase().includes('cancel') ||
          message.includes('USER_CANCEL') ||
          message.includes('-128')   // código de cancelación en iOS

        setState((prev) => ({
          ...prev,
          loading: false,
          error: isCancelled ? null : message,
        }))
        return false
      }
    },
    [state.isAvailable, state.biometryType],
  )

  // ── Activar/desactivar biometría en la app ────────────────────────────

  const toggleBiometric = useCallback(
    async (enable: boolean): Promise<boolean> => {
      if (enable && state.isAvailable) {
        const success = await authenticate({
          reason: 'Verifica tu identidad para activar el acceso biométrico',
        })
        if (!success) return false
      }

      await NativeStorage.setBool(StorageKeys.BIOMETRIC_ENABLED, enable)
      setState((prev) => ({ ...prev, isEnabled: enable }))
      return true
    },
    [state.isAvailable, authenticate],
  )

  // ── Re-verificar disponibilidad al volver al primer plano ─────────────

  useEffect(() => {
    if (!isNative()) return

    const handleResume = async () => {
      try {
        const { NativeBiometric } = await import('capacitor-native-biometric')
        const result = await NativeBiometric.isAvailable()
        setState((prev) => ({
          ...prev,
          isAvailable: result.isAvailable,
          biometryType: BIOMETRY_TYPE_MAP[result.biometryType ?? 0] ?? 'none',
        }))
      } catch {
        // ignorar
      }
    }

    window.addEventListener('app:resume', handleResume)
    return () => window.removeEventListener('app:resume', handleResume)
  }, [])

  return {
    ...state,
    biometryLabel: BIOMETRY_LABELS[state.biometryType],
    authenticate,
    toggleBiometric,
  }
}