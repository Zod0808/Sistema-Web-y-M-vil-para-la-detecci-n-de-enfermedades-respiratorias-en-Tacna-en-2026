/**
 * Store global de Zustand para RespiCare Mobile
 */

import { create } from 'zustand'
// Zustand persist se puede implementar manualmente o usar localStorage directamente
import type { User, MedicalHistory, Appointment, Alert, DashboardStats } from '@/lib/types'
import { getUser, setUser as saveUser } from '@/lib/api/config'
import { authService } from '@/lib/api/services/authService'

interface AppState {
  // Usuario
  user: User | null
  isAuthenticated: boolean
  isEmergencyMode: boolean // Modo de emergencia sin registro
  isLoading: boolean
  
  // Datos
  medicalHistories: MedicalHistory[]
  appointments: Appointment[]
  alerts: Alert[]
  dashboardStats: DashboardStats | null
  
  // Estado de red
  isOnline: boolean
  pendingSync: boolean
  
  // Acciones de autenticación
  setUser: (user: User | null) => void
  login: (email: string, password: string) => Promise<void>
  logout: () => Promise<void>
  updateUser: (user: Partial<User>) => Promise<void>
  
  // Acciones de datos
  setMedicalHistories: (histories: MedicalHistory[]) => void
  addMedicalHistory: (history: MedicalHistory) => void
  updateMedicalHistory: (id: string, history: Partial<MedicalHistory>) => void
  
  setAppointments: (appointments: Appointment[]) => void
  addAppointment: (appointment: Appointment) => void
  updateAppointment: (id: string, appointment: Partial<Appointment>) => void
  
  setAlerts: (alerts: Alert[]) => void
  acknowledgeAlert: (alertId: string) => void
  
  setDashboardStats: (stats: DashboardStats) => void
  
  // Estado de red
  setOnlineStatus: (isOnline: boolean) => void
  setPendingSync: (pending: boolean) => void
  
  // Modo de emergencia
  enableEmergencyMode: () => void
  disableEmergencyMode: () => void
  
  // Utilidades
  clearStore: () => void
}

const initialState = {
  user: null,
  isAuthenticated: false,
  isEmergencyMode: false,
  isLoading: false,
  medicalHistories: [],
  appointments: [],
  alerts: [],
  dashboardStats: null,
  isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
  pendingSync: false,
}

export const useAppStore = create<AppState>()(
  (set, get) => ({
      ...initialState,
      
      // Inicializar usuario desde localStorage si existe
      user: getUser(),
      isAuthenticated: !!getUser(),
      
      // Autenticación
      setUser: (user: User | null) => {
        if (user) {
          saveUser(user)
        }
        set({ user, isAuthenticated: !!user })
      },
      
      login: async (email: string, password: string) => {
        set({ isLoading: true })
        try {
          const response = await authService.login({ email, password })
          saveUser(response.user)
          set({ 
            user: response.user, 
            isAuthenticated: true, 
            isLoading: false 
          })
        } catch (error) {
          set({ isLoading: false })
          throw error
        }
      },
      
      logout: async () => {
        set({ isLoading: true })
        try {
          await authService.logout()
        } catch (error) {
          console.error('Error al cerrar sesión:', error)
        } finally {
          set({ 
            ...initialState,
            user: null,
            isAuthenticated: false,
            isEmergencyMode: false,
            isLoading: false 
          })
        }
      },
      
      updateUser: async (user: Partial<User>) => {
        const currentUser = get().user
        if (!currentUser) return
        
        try {
          const updatedUser = await authService.updateProfile(user)
          saveUser(updatedUser)
          set({ user: updatedUser })
        } catch (error) {
          throw error
        }
      },
      
      // Historias médicas
      setMedicalHistories: (histories: MedicalHistory[]) => {
        set({ medicalHistories: histories })
      },
      
      addMedicalHistory: (history: MedicalHistory) => {
        set((state) => ({
          medicalHistories: [history, ...state.medicalHistories]
        }))
      },
      
      updateMedicalHistory: (id: string, history: Partial<MedicalHistory>) => {
        set((state) => ({
          medicalHistories: state.medicalHistories.map((h) =>
            h._id === id ? { ...h, ...history } : h
          )
        }))
      },
      
      // Citas
      setAppointments: (appointments: Appointment[]) => {
        set({ appointments })
      },
      
      addAppointment: (appointment: Appointment) => {
        set((state) => ({
          appointments: [appointment, ...state.appointments]
        }))
      },
      
      updateAppointment: (id: string, appointment: Partial<Appointment>) => {
        set((state) => ({
          appointments: state.appointments.map((a) =>
            a._id === id ? { ...a, ...appointment } : a
          )
        }))
      },
      
      // Alertas
      setAlerts: (alerts: Alert[]) => {
        set({ alerts })
      },
      
      acknowledgeAlert: (alertId: string) => {
        set((state) => ({
          alerts: state.alerts.map((alert) =>
            alert._id === alertId
              ? { ...alert, status: 'acknowledged' as const, acknowledgedAt: new Date().toISOString() }
              : alert
          )
        }))
      },
      
      // Dashboard
      setDashboardStats: (stats: DashboardStats) => {
        set({ dashboardStats: stats })
      },
      
      // Estado de red
      setOnlineStatus: (isOnline: boolean) => {
        set({ isOnline })
      },
      
      setPendingSync: (pending: boolean) => {
        set({ pendingSync: pending })
      },
      
      // Modo de emergencia
      enableEmergencyMode: () => {
        set({ 
          isEmergencyMode: true,
          isAuthenticated: false,
          user: null
        })
      },
      
      disableEmergencyMode: () => {
        set({ isEmergencyMode: false })
      },
      
      // Utilidades
      clearStore: () => {
        set(initialState)
      },
    })
)

