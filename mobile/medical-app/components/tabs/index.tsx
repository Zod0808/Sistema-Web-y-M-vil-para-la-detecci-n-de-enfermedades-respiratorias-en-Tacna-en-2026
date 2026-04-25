"use client"

import { useEffect, useState } from "react"
import { Wifi, AlertTriangle, Bot, Activity, Calendar, Watch, WifiOff, Pill, Share2, FlaskConical, Siren } from "lucide-react"
import { ModernButton } from "@/components/ui/ModernButton"
import { ModernCard } from "@/components/ui/ModernCard"
import type { Translation, ViewState } from "@/lib/translations"
import type { DashboardStats } from "@/lib/types"
import { useAppStore } from "@/store/useAppStore"
import { dashboardService, appointmentService, alertService } from "@/lib/api/services"
import { useNetworkStatus } from "@/hooks/useNetworkStatus"
import { SyncIndicator } from "@/components/ui/sync-indicator"
import { toast } from "sonner"

interface DashboardViewProps {
  t: Translation
  setCurrentView: (view: ViewState) => void
}

export function DashboardView({ t, setCurrentView }: DashboardViewProps) {
  const user = useAppStore((state) => state.user)
  const dashboardStats = useAppStore((state) => state.dashboardStats)
  const setDashboardStats = useAppStore((state) => state.setDashboardStats)
  const setAppointments = useAppStore((state) => state.setAppointments)
  const setAlerts = useAppStore((state) => state.setAlerts)
  const appointments = useAppStore((state) => state.appointments)
  const alerts = useAppStore((state) => state.alerts)
  
  const [isLoading, setIsLoading] = useState(true)
  const { isOnline } = useNetworkStatus()

  useEffect(() => {
    loadDashboardData()
  }, [user])

  const loadDashboardData = async () => {
    if (!user) return

    setIsLoading(true)
    try {
      // Cargar dashboard según el rol del usuario
      let stats
      try {
        if (user.role === 'admin') {
          stats = await dashboardService.getAdminDashboard()
        } else if (user.role === 'doctor') {
          stats = await dashboardService.getDoctorDashboard()
        } else {
          stats = await dashboardService.getPatientDashboard()
        }
        
        // El backend devuelve { success: true, data: {...} }, extraer data
        if (stats && typeof stats === 'object' && 'data' in stats) {
          setDashboardStats((stats as { data: DashboardStats }).data)
        } else {
          setDashboardStats(stats as DashboardStats)
        }
      } catch (dashboardError: any) {
        console.error('Error al cargar dashboard:', dashboardError)
        // Continuar aunque falle el dashboard
      }

      // Cargar próximas citas
      try {
        const upcomingAppointments = await appointmentService.getUpcoming()
        setAppointments(Array.isArray(upcomingAppointments) ? upcomingAppointments : [])
      } catch (appointmentsError: any) {
        console.error('Error al cargar citas:', appointmentsError)
        // Continuar aunque falle las citas
      }

      // Cargar alertas no reconocidas
      try {
        const alertsData = await alertService.list({ status: 'pending', limit: 10 })
        const alertsList = Array.isArray(alertsData.data) ? alertsData.data : (Array.isArray(alertsData) ? alertsData : [])
        setAlerts(alertsList)
      } catch (alertsError: any) {
        console.error('Error al cargar alertas:', alertsError)
        // Continuar aunque falle las alertas
      }

    } catch (error: any) {
      console.error('Error general al cargar datos del dashboard:', error)
      console.error('Error details:', {
        message: error?.message,
        status: error?.status,
        stack: error?.stack
      })
      if (isOnline) {
        toast.error(error?.message || 'Error al cargar datos del dashboard')
      }
    } finally {
      setIsLoading(false)
    }
  }

  const unreadAlerts = alerts.filter((a) => a.status !== 'acknowledged').length
  const upcomingAppointments = appointments.filter(
    (a) => a.status === 'scheduled' && new Date(a.scheduledAt as string) >= new Date()
  ).slice(0, 3)

  return (
    <div className="p-6 space-y-8 pb-24 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex items-center justify-between pt-4">
        <div className="flex items-center gap-4">
          <div className="relative">
            <div className="w-14 h-14 rounded-full bg-secondary flex items-center justify-center text-primary text-xl font-bold border-2 border-background shadow-lg">
              CR
            </div>
            <div className="absolute bottom-0 right-0 w-4 h-4 bg-green-500 border-2 border-white rounded-full" />
          </div>
          <div>
            <h2 className="text-2xl font-bold leading-tight">
              {user ? `Hola, ${user.name.split(' ')[0]}` : t.dashboard.welcome}
            </h2>
            <div className="flex items-center gap-2 mt-1">
              <div className={`flex items-center gap-1.5 text-xs font-medium px-2 py-0.5 rounded-full ${
                isOnline 
                  ? 'text-emerald-600 dark:text-emerald-400 bg-emerald-100/50 dark:bg-emerald-900/30' 
                  : 'text-orange-600 dark:text-orange-400 bg-orange-100/50 dark:bg-orange-900/30'
              }`}>
                {isOnline ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
                {isOnline ? t.dashboard.sync_on : 'Sin conexión'}
              </div>
              <SyncIndicator />
            </div>
          </div>
        </div>
        {unreadAlerts > 0 && (
          <ModernButton
            variant="ghost"
            size="icon"
            className="bg-white/50 dark:bg-slate-800/50 backdrop-blur-md border border-white/20 rounded-full shadow-sm relative"
            onClick={() => setCurrentView("alerts")}
          >
            <AlertTriangle className="w-5 h-5 text-orange-500" />
            {unreadAlerts > 0 && (
              <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-bold">
                {unreadAlerts}
              </span>
            )}
          </ModernButton>
        )}
      </div>

      {/* Quick Actions Grid */}
      <div className="space-y-4">
        <div className="flex items-center justify-between px-1">
          <h3 className="text-lg font-bold tracking-tight">{t.dashboard.quick_actions}</h3>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <ModernCard
            variant="glass"
            className="p-5 flex flex-col gap-4 hover:bg-blue-50/50 dark:hover:bg-blue-900/20 group border-l-4 border-l-blue-500"
            onPress={() => setCurrentView("chat")}
          >
            <div className="w-12 h-12 rounded-2xl bg-blue-100 dark:bg-blue-900/50 text-blue-600 flex items-center justify-center group-hover:scale-110 transition-transform">
              <Bot className="w-6 h-6" />
            </div>
            <div>
              <span className="font-bold text-lg block">{t.dashboard.qa_chat}</span>
              <span className="text-xs text-slate-500 dark:text-slate-300 font-medium">Asistente IA</span>
            </div>
          </ModernCard>

          <ModernCard
            variant="glass"
            className="p-5 flex flex-col gap-4 hover:bg-purple-50/50 dark:hover:bg-purple-900/20 group border-l-4 border-l-purple-500"
            onPress={() => setCurrentView("symptom-analyzer")}
          >
            <div className="w-12 h-12 rounded-2xl bg-purple-100 dark:bg-purple-900/50 text-purple-600 flex items-center justify-center group-hover:scale-110 transition-transform">
              <Activity className="w-6 h-6" />
            </div>
            <div>
              <span className="font-bold text-lg block">{t.dashboard.qa_symptoms}</span>
              <span className="text-xs text-slate-500 dark:text-slate-300 font-medium">Analizar con IA</span>
            </div>
          </ModernCard>

          <ModernCard
            variant="glass"
            className="p-5 flex flex-col gap-4 hover:bg-orange-50/50 dark:hover:bg-orange-900/20 group border-l-4 border-l-orange-500"
            onPress={() => setCurrentView("appointments")}
          >
            <div className="w-12 h-12 rounded-2xl bg-orange-100 dark:bg-orange-900/50 text-orange-600 flex items-center justify-center group-hover:scale-110 transition-transform">
              <Calendar className="w-6 h-6" />
            </div>
            <div>
              <span className="font-bold text-lg block">{t.dashboard.qa_calendar}</span>
              <span className="text-xs text-slate-500 dark:text-slate-300 font-medium">Agenda</span>
            </div>
          </ModernCard>
          <ModernCard
            variant="glass"
            className="p-5 flex flex-col gap-4 hover:bg-emerald-50/50 dark:hover:bg-emerald-900/20 group border-l-4 border-l-emerald-500"
            onPress={() => setCurrentView("wearables")}
          >
            <div className="w-12 h-12 rounded-2xl bg-emerald-100 dark:bg-emerald-900/50 text-emerald-600 flex items-center justify-center group-hover:scale-110 transition-transform">
              <Watch className="w-6 h-6" />
            </div>
            <div>
              <span className="font-bold text-lg block">Salud</span>
              <span className="text-xs text-slate-500 dark:text-slate-300 font-medium">Wearables</span>
            </div>
          </ModernCard>
        </div>
      </div>

      {/* Servicios Médicos */}
      <div className="space-y-3">
        <h3 className="text-lg font-bold tracking-tight px-1">Servicios Médicos</h3>
        <div className="grid grid-cols-3 gap-3">
          <ModernCard
            variant="glass"
            className="p-4 flex flex-col items-center gap-2 hover:bg-sky-50/50 dark:hover:bg-sky-900/20 group cursor-pointer"
            onPress={() => setCurrentView("prescriptions")}
          >
            <div className="w-10 h-10 rounded-xl bg-sky-100 dark:bg-sky-900/50 text-sky-600 flex items-center justify-center group-hover:scale-110 transition-transform">
              <Pill className="w-5 h-5" />
            </div>
            <span className="text-xs font-semibold text-center leading-tight">Recetas</span>
          </ModernCard>

          <ModernCard
            variant="glass"
            className="p-4 flex flex-col items-center gap-2 hover:bg-teal-50/50 dark:hover:bg-teal-900/20 group cursor-pointer"
            onPress={() => setCurrentView("lab-results")}
          >
            <div className="w-10 h-10 rounded-xl bg-teal-100 dark:bg-teal-900/50 text-teal-600 flex items-center justify-center group-hover:scale-110 transition-transform">
              <FlaskConical className="w-5 h-5" />
            </div>
            <span className="text-xs font-semibold text-center leading-tight">Laboratorio</span>
          </ModernCard>

          <ModernCard
            variant="glass"
            className="p-4 flex flex-col items-center gap-2 hover:bg-indigo-50/50 dark:hover:bg-indigo-900/20 group cursor-pointer"
            onPress={() => setCurrentView("referrals")}
          >
            <div className="w-10 h-10 rounded-xl bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 flex items-center justify-center group-hover:scale-110 transition-transform">
              <Share2 className="w-5 h-5" />
            </div>
            <span className="text-xs font-semibold text-center leading-tight">Referidos</span>
          </ModernCard>
        </div>

        {/* SOS Emergency */}
        <button
          onClick={() => setCurrentView("emergency")}
          className="w-full flex items-center justify-center gap-3 p-4 rounded-2xl bg-red-600 hover:bg-red-700 active:scale-[0.98] text-white font-bold shadow-lg shadow-red-500/30 transition-all"
        >
          <Siren className="w-5 h-5" />
          Emergencia / SOS
        </button>
      </div>

      {/* Banner de Alertas Pendientes */}
      {unreadAlerts > 0 && (
        <div className="bg-gradient-to-r from-orange-50 to-red-50 dark:from-orange-900/20 dark:to-red-900/20 rounded-xl p-4 border border-orange-200 dark:border-orange-800">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-orange-600 dark:text-orange-400" />
              </div>
              <div>
                <h3 className="font-bold text-base dark:text-white">
                  {unreadAlerts} {unreadAlerts === 1 ? 'Alerta Pendiente' : 'Alertas Pendientes'}
                </h3>
                <p className="text-xs text-muted-foreground">
                  Requieren tu atención inmediata
                </p>
              </div>
            </div>
            <ModernButton
              size="sm"
              onClick={() => setCurrentView("alerts")}
              className="rounded-full"
            >
              Ver Alertas
            </ModernButton>
          </div>
        </div>
      )}

      {/* Próximas Citas */}
      {upcomingAppointments.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-lg font-bold tracking-tight px-1">Próximas Citas</h3>
          {upcomingAppointments.map((appointment) => (
            <ModernCard key={appointment._id} variant="glass" className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <p className="font-semibold text-sm">{appointment.reason}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {new Date(appointment.scheduledAt as string).toLocaleDateString('es-ES', {
                      weekday: 'short',
                      day: 'numeric',
                      month: 'short',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </p>
                </div>
                <Calendar className="w-5 h-5 text-primary" />
              </div>
            </ModernCard>
          ))}
        </div>
      )}

      {/* Estadísticas Rápidas - Resumen */}
      <ModernCard variant="gradient" className="p-6 relative overflow-hidden">
        <div className="absolute right-[-20px] top-[-20px] w-32 h-32 bg-primary/20 rounded-full blur-2xl" />
        <div className="relative z-10">
          <h4 className="font-bold text-lg mb-4">Resumen</h4>
          {isLoading ? (
            <div className="grid grid-cols-2 gap-4">
              {[1, 2, 3, 4].map((i) => (
                <div key={i}>
                  <div className="h-8 bg-secondary/50 rounded animate-pulse mb-2" />
                  <div className="h-4 bg-secondary/30 rounded animate-pulse w-16" />
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-2xl font-bold">
                  {dashboardStats?.totalAlerts ?? alerts.filter(a => a.status !== 'acknowledged').length ?? 0}
                </p>
                <p className="text-xs text-muted-foreground">Alertas</p>
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {dashboardStats?.totalAppointments ?? appointments.length ?? 0}
                </p>
                <p className="text-xs text-muted-foreground">Citas</p>
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {dashboardStats?.upcomingAppointments ?? upcomingAppointments.length ?? 0}
                </p>
                <p className="text-xs text-muted-foreground">Próximas</p>
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {dashboardStats?.totalMedicalHistories ?? 0}
                </p>
                <p className="text-xs text-muted-foreground">Historias</p>
              </div>
            </div>
          )}
        </div>
      </ModernCard>
    </div>
  )
}
