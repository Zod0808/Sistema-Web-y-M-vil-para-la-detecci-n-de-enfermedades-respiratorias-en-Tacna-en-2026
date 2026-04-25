"use client"

import * as React from "react"
import { Calendar } from "lucide-react"
import { ModernButton } from "@/components/ui/ModernButton"
import { translations, type Language, type ViewState } from "@/lib/translations"
import { useAppStore } from "@/store/useAppStore"
import { getUser } from "@/lib/api/config"

// Views
import { LoginView } from "@/components/views/login-view"
import { DashboardView } from "@/components/tabs/index"
import { ChatView } from "@/components/tabs/chatbot"
import { WearablesView } from "@/components/tabs/wearables"
import { HistoryView } from "@/components/tabs/appointments"
import { AppointmentsView } from "@/components/tabs/appointments-view"
import { AppointmentDetail } from "@/components/views/appointment-detail"
import { AlertsView } from "@/components/tabs/alerts-view"
import { AlertDetail } from "@/components/views/alert-detail"
import { MedicalHistoryDetail } from "@/components/views/medical-history-detail"
import { ProfileView } from "@/components/tabs/explore"
import { SymptomAnalyzer } from "@/components/tabs/symptom-analyzer"
import { PrescriptionsView } from "@/components/tabs/prescriptions-view"
import { ReferralsView } from "@/components/tabs/referrals-view"
import { EmergencyView } from "@/components/tabs/emergency-view"
import { LabResultsView } from "@/components/tabs/lab-results-view"

// Layout
import { BottomNav } from "@/components/layout/bottom-nav"

export function MedicalApp() {
  const user = useAppStore((state) => state.user)
  const isAuthenticated = useAppStore((state) => state.isAuthenticated)
  const isEmergencyMode = useAppStore((state) => state.isEmergencyMode)
  const setUser = useAppStore((state) => state.setUser)
  
  const [currentView, setCurrentView] = React.useState<ViewState>("login")
  const [isDarkMode, setIsDarkMode] = React.useState(false)
  const [language, setLanguage] = React.useState<Language>("es")
  const [isLanguagePickerOpen, setIsLanguagePickerOpen] = React.useState(false)
  const [isLoading, setIsLoading] = React.useState(false)
  const [isInitialized, setIsInitialized] = React.useState(false)
  
  // Inicializar usuario desde localStorage al cargar
  React.useEffect(() => {
    const savedUser = getUser()
    if (savedUser) {
      setUser(savedUser)
      setCurrentView("dashboard")
    }
    setIsInitialized(true)
  }, [setUser])
  
  // Actualizar vista cuando cambia el estado de autenticación o modo emergencia
  React.useEffect(() => {
    if (isInitialized) {
      if (isEmergencyMode) {
        // En modo emergencia, permitir acceso a chat y análisis básico
        if (currentView === "login") {
          setCurrentView("chat")
        }
      } else if (isAuthenticated && user) {
        if (currentView === "login") {
          setCurrentView("dashboard")
        }
      } else {
        if (currentView !== "login" && !isEmergencyMode) {
          setCurrentView("login")
        }
      }
    }
  }, [isAuthenticated, user, isInitialized, isEmergencyMode])

  // Toggle Dark Mode
  React.useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add("dark")
    } else {
      document.documentElement.classList.remove("dark")
    }
  }, [isDarkMode])

  const handleLogin = () => {
    // El login ahora se maneja en LoginView directamente
    // Esta función solo se usa como callback después del login exitoso
    setIsLoading(false)
    setCurrentView("dashboard")
  }
  
  const handleLogout = async () => {
    const logout = useAppStore.getState().logout
    const disableEmergencyMode = useAppStore.getState().disableEmergencyMode
    await logout()
    disableEmergencyMode()
    setCurrentView("login")
  }

  // Simple fallback for other languages
  const t = (language === "es" ? translations.es : translations.en) as typeof translations.es

  return (
    <div
      className={`min-h-screen bg-slate-50 dark:bg-slate-950 font-sans text-foreground transition-colors duration-300 flex items-center justify-center p-0 md:p-4`}
    >
      <div className="w-full max-w-md h-[100dvh] md:h-[90vh] md:max-h-[900px] bg-background relative overflow-hidden shadow-2xl md:rounded-[2.5rem] md:border-[8px] md:border-slate-900/10 dark:md:border-slate-100/5 flex flex-col transition-all duration-300">
        {/* Dynamic Content Area */}
        <div className="flex-1 overflow-y-auto scrollbar-hide relative">
          {currentView === "login" && (
            <LoginView t={t} handleLogin={handleLogin} isLoading={isLoading} setCurrentView={setCurrentView} />
          )}
          {currentView === "dashboard" && <DashboardView t={t} setCurrentView={setCurrentView} />}
          {currentView === "chat" && <ChatView t={t} />}
          {currentView === "symptom-analyzer" && <SymptomAnalyzer t={t} setCurrentView={setCurrentView} />}
          {currentView === "wearables" && <WearablesView t={t} isLoading={isLoading} setIsLoading={setIsLoading} />}
          {currentView === "history" && <HistoryView t={t} setCurrentView={setCurrentView} />}
          {currentView === "profile" && (
            <ProfileView
              t={t}
              isDarkMode={isDarkMode}
              setIsDarkMode={setIsDarkMode}
              language={language}
              setLanguage={setLanguage}
              isLanguagePickerOpen={isLanguagePickerOpen}
              setIsLanguagePickerOpen={setIsLanguagePickerOpen}
              setCurrentView={setCurrentView}
              onLogout={handleLogout}
            />
          )}
          {currentView === "appointments" && <AppointmentsView t={t} setCurrentView={setCurrentView} />}
          {currentView === "alerts" && <AlertsView t={t} setCurrentView={setCurrentView} />}
          {currentView === "prescriptions" && <PrescriptionsView t={t} setCurrentView={setCurrentView} />}
          {currentView === "referrals" && <ReferralsView setCurrentView={setCurrentView} />}
          {currentView === "emergency" && <EmergencyView t={t} />}
          {currentView === "lab-results" && <LabResultsView setCurrentView={setCurrentView} />}
          {currentView === "medical-history-detail" && (() => {
            const historyId = typeof window !== 'undefined' ? sessionStorage.getItem('selectedHistoryId') : null
            return historyId ? (
              <MedicalHistoryDetail
                t={t}
                historyId={historyId}
                onBack={() => {
                  if (typeof window !== 'undefined') {
                    sessionStorage.removeItem('selectedHistoryId')
                  }
                  setCurrentView("history")
                }}
                setCurrentView={setCurrentView}
              />
            ) : null
          })()}
        </div>

        {/* Navigation Bar - Static at bottom, Hidden on Login */}
        {currentView !== "login" && (
          <div className="flex-shrink-0">
            <BottomNav 
              currentView={currentView} 
              setCurrentView={setCurrentView}
              isEmergencyMode={isEmergencyMode}
            />
          </div>
        )}
      </div>
    </div>
  )
}
