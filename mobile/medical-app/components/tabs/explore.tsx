"use client"

import { useState } from "react"
import { Moon, Languages, ChevronRight, LogOut } from "lucide-react"
import { ModernButton } from "@/components/ui/ModernButton"
import { ModernCard } from "@/components/ui/ModernCard"
import type { Translation, Language, ViewState } from "@/lib/translations"
import { useAppStore } from "@/store/useAppStore"
import { toast } from "sonner"

interface ProfileViewProps {
  t: Translation
  isDarkMode: boolean
  setIsDarkMode: (isDark: boolean) => void
  language: Language
  setLanguage: (lang: Language) => void
  isLanguagePickerOpen: boolean
  setIsLanguagePickerOpen: (isOpen: boolean) => void
  setCurrentView: (view: ViewState) => void
  onLogout?: () => void
}

export function ProfileView({
  t,
  isDarkMode,
  setIsDarkMode,
  language,
  setLanguage,
  isLanguagePickerOpen,
  setIsLanguagePickerOpen,
  setCurrentView,
  onLogout,
}: ProfileViewProps) {
  const user = useAppStore((state) => state.user)
  const logout = useAppStore((state) => state.logout)
  const [isLoggingOut, setIsLoggingOut] = useState(false)

  const handleLogout = async () => {
    setIsLoggingOut(true)
    try {
      await logout()
      toast.success("Sesión cerrada exitosamente")
      if (onLogout) {
        onLogout()
      } else {
        setCurrentView("login")
      }
    } catch (error: any) {
      toast.error("Error al cerrar sesión")
      console.error("Error al cerrar sesión:", error)
    } finally {
      setIsLoggingOut(false)
    }
  }

  const getUserInitials = () => {
    if (!user?.name) return "U"
    const names = user.name.split(" ")
    if (names.length >= 2) {
      return `${names[0][0]}${names[1][0]}`.toUpperCase()
    }
    return user.name.substring(0, 2).toUpperCase()
  }

  return (
    <div className="p-4 space-y-6 pb-20 animate-in slide-in-from-right duration-300">
      <h2 className="text-2xl font-bold tracking-tight pt-2">{t.profile.title}</h2>

      {/* User Info */}
      <div className="flex flex-col items-center py-6">
        <div className="w-24 h-24 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-3xl font-bold shadow-xl mb-4">
          {user?.avatar ? (
            <img src={user.avatar} alt={user.name} className="w-full h-full rounded-full object-cover" />
          ) : (
            getUserInitials()
          )}
        </div>
        <h3 className="text-xl font-bold">{user?.name || "Usuario"}</h3>
        <p className="text-muted-foreground">{user?.email || ""}</p>
        {user?.role && (
          <p className="text-xs text-muted-foreground mt-1 px-3 py-1 bg-primary/10 rounded-full">
            {user.role === "patient" && "Paciente"}
            {user.role === "doctor" && "Doctor"}
            {user.role === "admin" && "Administrador"}
          </p>
        )}
      </div>

      {/* Settings Group */}
      <div className="space-y-4">
        <h4 className="text-sm font-semibold text-muted-foreground uppercase ml-1">General</h4>
        <ModernCard className="divide-y divide-border overflow-hidden">
          {/* Dark Mode Toggle */}
          <div
            className="p-4 flex items-center justify-between cursor-pointer"
            onClick={() => setIsDarkMode(!isDarkMode)}
          >
            <div className="flex items-center gap-3">
              <div className="p-2 bg-slate-100 dark:bg-slate-800 rounded-lg transition-colors">
                <Moon className="w-5 h-5" />
              </div>
              <span className="font-medium">{t.profile.dark_mode}</span>
            </div>
            <button
              className={`w-12 h-6 rounded-full transition-colors relative ${isDarkMode ? "bg-blue-600" : "bg-slate-200"}`}
            >
              <div
                className={`w-5 h-5 bg-white rounded-full absolute top-0.5 transition-transform shadow-sm ${isDarkMode ? "left-6.5" : "left-0.5"}`}
              />
            </button>
          </div>

          {/* Language Picker Button */}
          <div
            className="p-4 flex items-center justify-between cursor-pointer hover:bg-accent/5 transition-colors"
            onClick={() => setIsLanguagePickerOpen(true)}
          >
            <div className="flex items-center gap-3">
              <div className="p-2 bg-slate-100 dark:bg-slate-800 rounded-lg transition-colors">
                <Languages className="w-5 h-5" />
              </div>
              <span className="font-medium">{t.profile.language}</span>
            </div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <span className="text-sm font-medium text-primary">
                {language === "es" && "Español"}
                {language === "en" && "English"}
                {language === "pt" && "Português"}
                {language === "fr" && "Français"}
                {language === "qu" && "Quechua"}
              </span>
              <ChevronRight className="w-4 h-4" />
            </div>
          </div>
        </ModernCard>

        <h4 className="text-sm font-semibold text-muted-foreground uppercase ml-1 mt-6">{t.profile.health_profile}</h4>
        <ModernCard className="p-4 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-muted-foreground block mb-1">{t.profile.age}</label>
              <p className="font-medium text-lg">34 años</p>
            </div>
            <div>
              <label className="text-xs text-muted-foreground block mb-1">Tipo de Sangre</label>
              <p className="font-medium text-lg">O+</p>
            </div>
          </div>
          <div className="pt-2 border-t">
            <label className="text-xs text-muted-foreground block mb-1">{t.profile.diagnosis}</label>
            <p className="font-medium">Asma Leve Intermitente</p>
          </div>
        </ModernCard>

        <ModernButton 
          variant="destructive" 
          className="w-full mt-6" 
          onClick={handleLogout}
          disabled={isLoggingOut}
          isLoading={isLoggingOut}
        >
          <LogOut className="w-4 h-4 mr-2" />
          {t.profile.logout}
        </ModernButton>
      </div>

      {/* Language Bottom Sheet/Modal */}
      {isLanguagePickerOpen && (
        <div
          className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
          onClick={() => setIsLanguagePickerOpen(false)}
        >
          <div
            className="w-full max-w-md bg-background dark:bg-slate-900 rounded-t-[2rem] md:rounded-[2rem] p-6 space-y-4 animate-in slide-in-from-bottom duration-300 shadow-2xl border-t border-white/10"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-12 h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full mx-auto mb-2" />
            <h3 className="text-xl font-bold text-center mb-4">{t.profile.select_language}</h3>

            <div className="space-y-2">
              {[
                { code: "es", label: "Español", flag: "🇪🇸" },
                { code: "en", label: "English", flag: "🇺🇸" },
                { code: "pt", label: "Português", flag: "🇧🇷" },
                { code: "fr", label: "Français", flag: "🇫🇷" },
                { code: "qu", label: "Quechua", flag: "🇵🇪" },
              ].map((lang) => (
                <button
                  key={lang.code}
                  onClick={() => {
                    setLanguage(lang.code as any)
                    setIsLanguagePickerOpen(false)
                  }}
                  className={`w-full flex items-center justify-between p-4 rounded-xl transition-all border ${
                    language === lang.code
                      ? "bg-primary/10 border-primary/20 dark:bg-primary/20"
                      : "bg-slate-50 dark:bg-slate-800 border-transparent hover:bg-slate-100 dark:hover:bg-slate-700"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-2xl drop-shadow-sm">{lang.flag}</span>
                    <span
                      className={`font-medium ${language === lang.code ? "text-primary font-bold" : "text-foreground"}`}
                    >
                      {lang.label}
                    </span>
                  </div>
                  {language === lang.code && (
                    <div className="w-4 h-4 rounded-full bg-primary border-[3px] border-background shadow-sm" />
                  )}
                </button>
              ))}
            </div>

            <ModernButton variant="ghost" className="w-full mt-2 h-12" onClick={() => setIsLanguagePickerOpen(false)}>
              Cancelar
            </ModernButton>
          </div>
        </div>
      )}
    </div>
  )
}
