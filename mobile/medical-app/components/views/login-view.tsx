"use client"

import { useState } from "react"
import { Activity, User, Settings, AlertCircle, AlertTriangle } from "lucide-react"
import { ModernButton } from "@/components/ui/ModernButton"
import { ModernInput } from "@/components/ui/ModernInput"
import type { Translation, ViewState } from "@/lib/translations"
import { useAppStore } from "@/store/useAppStore"
import { toast } from "sonner"

interface LoginViewProps {
  t: Translation
  handleLogin: () => void
  isLoading: boolean
  setCurrentView: (view: ViewState) => void
}

export function LoginView({ t, handleLogin, isLoading, setCurrentView }: LoginViewProps) {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [localLoading, setLocalLoading] = useState(false)
  
  const login = useAppStore((state) => state.login)
  const storeIsLoading = useAppStore((state) => state.isLoading)
  const enableEmergencyMode = useAppStore((state) => state.enableEmergencyMode)

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault()
    setError("")
    
    if (!email || !password) {
      setError("Por favor, completa todos los campos")
      return
    }

    setLocalLoading(true)
    try {
      await login(email, password)
      toast.success("Inicio de sesión exitoso")
      handleLogin()
      setCurrentView("dashboard")
    } catch (err: any) {
      const errorMessage = err?.message || "Error al iniciar sesión. Verifica tus credenciales."
      setError(errorMessage)
      toast.error(errorMessage)
    } finally {
      setLocalLoading(false)
    }
  }

  const isFormLoading = isLoading || localLoading || storeIsLoading

  return (
    <div className="flex flex-col justify-between min-h-screen relative overflow-hidden bg-background text-foreground">
      {/* Background Decoration */}
      <div className="absolute top-[-20%] left-[-20%] w-[80%] h-[60%] rounded-full bg-primary/10 blur-[100px]" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[60%] h-[50%] rounded-full bg-secondary/20 blur-[80px]" />

      <div className="relative z-10 p-8 pt-20 flex flex-col items-center flex-1">
        <div className="w-24 h-24 rounded-[2rem] bg-gradient-to-br from-primary to-blue-600 flex items-center justify-center shadow-2xl shadow-primary/30 mb-8 animate-in zoom-in duration-700">
          <Activity className="w-12 h-12 text-white" />
        </div>
        <h1 className="text-4xl font-bold tracking-tight text-center mb-2 bg-gradient-to-r from-primary to-blue-600 bg-clip-text text-transparent">
          RespiCare
        </h1>
        <p className="text-muted-foreground text-center max-w-[200px] leading-relaxed">{t.login.subtitle}</p>
      </div>

      <form onSubmit={handleSubmit} className="relative z-10 p-8 pb-12 w-full space-y-4 bg-white/50 dark:bg-black/20 backdrop-blur-xl rounded-t-[3rem] shadow-[0_-10px_40px_-15px_rgba(0,0,0,0.1)] animate-in slide-in-from-bottom duration-500">
        {error && (
          <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-600 dark:text-red-400 text-sm">
            <AlertCircle className="w-4 h-4" />
            <span>{error}</span>
          </div>
        )}
        
        <div className="space-y-4">
          <ModernInput
            icon={<User className="w-4 h-4" />}
            type="email"
            placeholder={t.login.email}
            value={email}
            onChange={(e) => {
              setEmail(e.target.value)
              setError("")
            }}
            className="bg-white/80 dark:bg-slate-900/80 border-transparent shadow-sm"
            disabled={isFormLoading}
          />
          <ModernInput
            icon={<Settings className="w-4 h-4" />}
            type="password"
            placeholder={t.login.password}
            value={password}
            onChange={(e) => {
              setPassword(e.target.value)
              setError("")
            }}
            className="bg-white/80 dark:bg-slate-900/80 border-transparent shadow-sm"
            disabled={isFormLoading}
          />
        </div>

        <ModernButton
          type="submit"
          className="w-full text-lg h-14 mt-4 font-bold tracking-wide"
          isLoading={isFormLoading}
          disabled={isFormLoading}
        >
          {t.login.btn}
        </ModernButton>

        <div className="mt-4 space-y-3">
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-border/50" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-white/50 dark:bg-black/20 px-2 text-muted-foreground">o</span>
            </div>
          </div>
          
          <ModernButton
            type="button"
            variant="outline"
            className="w-full border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20"
            onClick={() => {
              enableEmergencyMode()
              toast.info("Modo de emergencia activado. Funcionalidades limitadas disponibles.")
              setCurrentView("chat")
            }}
            disabled={isFormLoading}
          >
            <AlertTriangle className="w-4 h-4 mr-2" />
            {t.login.emergency || "Acceso de Emergencia"}
          </ModernButton>
          
          <p className="text-center text-[10px] text-muted-foreground px-4">
            {t.login.emergency_desc || "Para casos urgentes. Acceso rápido sin registro."}
          </p>
        </div>
      </form>
    </div>
  )
}
