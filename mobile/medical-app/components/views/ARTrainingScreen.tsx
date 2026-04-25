"use client"

import { useState, useEffect, useRef } from "react"
import {
  ArrowLeft,
  Play,
  Pause,
  Square,
  Camera,
  Loader2,
  Info,
  X,
  CheckCircle
} from "lucide-react"
import { ModernButton } from "@/components/ui/ModernButton"
import { ModernCard } from "@/components/ui/ModernCard"
import { arService, type ARExercise, type ARCapabilities } from "@/lib/services/arService"
import { toast } from "sonner"
import { format } from "date-fns"

interface ARTrainingScreenProps {
  exerciseId?: string
  onBack?: () => void
}

export function ARTrainingScreen({ exerciseId, onBack }: ARTrainingScreenProps) {
  const [exercises, setExercises] = useState<ARExercise[]>([])
  const [selectedExercise, setSelectedExercise] = useState<ARExercise | null>(null)
  const [capabilities, setCapabilities] = useState<ARCapabilities | null>(null)
  const [isActive, setIsActive] = useState(false)
  const [isPaused, setIsPaused] = useState(false)
  const [timeRemaining, setTimeRemaining] = useState(0)
  const [currentInstruction, setCurrentInstruction] = useState(0)
  const [sessionComplete, setSessionComplete] = useState(false)
  
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const intervalRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    loadExercises()
    checkCapabilities()
    
    return () => {
      cleanup()
    }
  }, [])

  useEffect(() => {
    if (exerciseId) {
      const exercise = exercises.find(ex => ex.id === exerciseId)
      if (exercise) {
        setSelectedExercise(exercise)
      }
    }
  }, [exerciseId, exercises])

  const loadExercises = () => {
    const exs = arService.getExercises()
    setExercises(exs)
    if (exs.length > 0 && !selectedExercise) {
      setSelectedExercise(exs[0])
    }
  }

  const checkCapabilities = async () => {
    try {
      const caps = await arService.checkCapabilities()
      setCapabilities(caps)
      
      if (!caps.cameraAvailable && !caps.webXRSupported) {
        toast.warning("AR no disponible", {
          description: "Tu dispositivo no tiene las capacidades necesarias para AR. Se mostrará una simulación visual."
        })
      }
    } catch (error: any) {
      toast.error("Error al verificar capacidades AR", {
        description: error.message
      })
    }
  }

  const startSession = async () => {
    if (!selectedExercise) return

    try {
      // Iniciar sesión AR
      await arService.startSession(selectedExercise)
      setIsActive(true)
      setIsPaused(false)
      setTimeRemaining(selectedExercise.duration)
      setCurrentInstruction(0)
      setSessionComplete(false)

      // Inicializar cámara si está disponible
      if (capabilities?.cameraAvailable && videoRef.current) {
        try {
          const stream = await navigator.mediaDevices.getUserMedia({ 
            video: { facingMode: 'user' } 
          })
          if (videoRef.current) {
            videoRef.current.srcObject = stream
            videoRef.current.play()
          }
        } catch (error) {
          console.warn('No se pudo acceder a la cámara:', error)
        }
      }

      // Iniciar renderizado AR
      if (canvasRef.current) {
        arService.renderAROverlay(
          canvasRef.current,
          selectedExercise.mode,
          (data) => {
            // Actualizar métricas si es necesario
          }
        )
      }

      // Iniciar temporizador
      startTimer()

      toast.success("Sesión AR iniciada")
    } catch (error: any) {
      toast.error("Error al iniciar sesión AR", {
        description: error.message
      })
    }
  }

  const startTimer = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
    }

    intervalRef.current = setInterval(() => {
      setTimeRemaining(prev => {
        if (prev <= 1) {
          stopSession()
          setSessionComplete(true)
          return 0
        }
        return prev - 1
      })
    }, 1000)
  }

  const pauseSession = () => {
    setIsPaused(true)
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
    }
    toast.info("Sesión pausada")
  }

  const resumeSession = () => {
    setIsPaused(false)
    startTimer()
    toast.info("Sesión reanudada")
  }

  const stopSession = () => {
    arService.stopSession()
    setIsActive(false)
    setIsPaused(false)
    setTimeRemaining(0)
    setCurrentInstruction(0)

    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }

    // Detener cámara
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream
      stream.getTracks().forEach(track => track.stop())
      videoRef.current.srcObject = null
    }

    // Obtener métricas de la sesión
    const session = arService.getCurrentSession()
    if (session?.metrics) {
      toast.success("Sesión completada", {
        description: `Duración: ${Math.round(session.metrics.duration / 60)} minutos`
      })
    }
  }

  const cleanup = () => {
    stopSession()
    arService.cleanup()
  }

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const nextInstruction = () => {
    if (!selectedExercise) return
    setCurrentInstruction(prev => 
      prev < selectedExercise.instructions.length - 1 ? prev + 1 : prev
    )
  }

  const prevInstruction = () => {
    setCurrentInstruction(prev => prev > 0 ? prev - 1 : 0)
  }

  if (!selectedExercise) {
    return (
      <div className="container mx-auto p-4 max-w-4xl">
        {onBack && (
          <ModernButton onClick={onBack} variant="ghost" className="mb-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Volver
          </ModernButton>
        )}
        <h1 className="text-2xl font-bold mb-6">Ejercicios AR</h1>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {exercises.map(exercise => (
            <ModernCard
              key={exercise.id}
              className="cursor-pointer hover:shadow-lg transition-shadow"
              onClick={() => setSelectedExercise(exercise)}
            >
              <div className="p-4">
                <h3 className="font-semibold text-lg mb-2">{exercise.name}</h3>
                <p className="text-sm text-muted-foreground mb-3">
                  {exercise.description}
                </p>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span>{formatTime(exercise.duration)}</span>
                  <span>•</span>
                  <span className="capitalize">{exercise.mode}</span>
                </div>
              </div>
            </ModernCard>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-4 max-w-4xl">
      {/* Header */}
      <div className="mb-6">
        {onBack && !isActive && (
          <ModernButton onClick={onBack} variant="ghost" className="mb-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Volver
          </ModernButton>
        )}
        
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold mb-2">{selectedExercise.name}</h1>
            <p className="text-muted-foreground">{selectedExercise.description}</p>
          </div>
          
          {!isActive && (
            <ModernButton
              onClick={() => setSelectedExercise(null)}
              variant="outline"
            >
              Cambiar Ejercicio
            </ModernButton>
          )}
        </div>
      </div>

      {/* AR View */}
      <div className="relative mb-6">
        <ModernCard className="overflow-hidden p-0">
          <div className="relative w-full aspect-video bg-black">
            {/* Video de cámara (si está disponible) */}
            {capabilities?.cameraAvailable && (
              <video
                ref={videoRef}
                className="absolute inset-0 w-full h-full object-cover"
                playsInline
                muted
              />
            )}
            
            {/* Canvas para overlay AR */}
            <canvas
              ref={canvasRef}
              className="absolute inset-0 w-full h-full"
              width={1280}
              height={720}
            />

            {/* Overlay de información */}
            {isActive && (
              <div className="absolute top-4 left-4 right-4 flex items-center justify-between">
                <div className="bg-black/70 text-white px-4 py-2 rounded-lg">
                  <div className="text-2xl font-bold">{formatTime(timeRemaining)}</div>
                </div>
                
                <div className="flex gap-2">
                  {isPaused ? (
                    <ModernButton
                      onClick={resumeSession}
                      size="sm"
                      variant="secondary"
                    >
                      <Play className="h-4 w-4" />
                    </ModernButton>
                  ) : (
                    <ModernButton
                      onClick={pauseSession}
                      size="sm"
                      variant="secondary"
                    >
                      <Pause className="h-4 w-4" />
                    </ModernButton>
                  )}
                  <ModernButton
                    onClick={stopSession}
                    size="sm"
                    variant="destructive"
                  >
                    <Square className="h-4 w-4" />
                  </ModernButton>
                </div>
              </div>
            )}

            {/* Mensaje cuando no hay cámara */}
            {!capabilities?.cameraAvailable && !isActive && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center text-white">
                  <Camera className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p className="text-sm opacity-75">
                    La simulación visual se mostrará al iniciar
                  </p>
                </div>
              </div>
            )}

            {/* Mensaje de sesión completada */}
            {sessionComplete && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/80">
                <div className="text-center text-white">
                  <CheckCircle className="h-16 w-16 mx-auto mb-4 text-green-500" />
                  <h3 className="text-2xl font-bold mb-2">¡Ejercicio Completado!</h3>
                  <p className="text-muted-foreground mb-4">
                    Has completado el ejercicio exitosamente
                  </p>
                  <ModernButton onClick={stopSession}>
                    Finalizar
                  </ModernButton>
                </div>
              </div>
            )}
          </div>
        </ModernCard>
      </div>

      {/* Instrucciones */}
      {selectedExercise.instructions.length > 0 && (
        <ModernCard className="mb-6">
          <div className="p-4">
            <div className="flex items-center gap-2 mb-4">
              <Info className="h-5 w-5 text-primary" />
              <h3 className="font-semibold">Instrucciones</h3>
            </div>
            
            <div className="space-y-2">
              {selectedExercise.instructions.map((instruction, index) => (
                <div
                  key={index}
                  className={`p-3 rounded-lg ${
                    index === currentInstruction
                      ? 'bg-primary/10 border-2 border-primary'
                      : 'bg-muted'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-sm font-semibold ${
                      index === currentInstruction
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted-foreground/20 text-muted-foreground'
                    }`}>
                      {index + 1}
                    </div>
                    <p className="flex-1">{instruction}</p>
                  </div>
                </div>
              ))}
            </div>

            {selectedExercise.instructions.length > 1 && (
              <div className="flex gap-2 mt-4">
                <ModernButton
                  onClick={prevInstruction}
                  disabled={currentInstruction === 0}
                  variant="outline"
                  size="sm"
                >
                  Anterior
                </ModernButton>
                <ModernButton
                  onClick={nextInstruction}
                  disabled={currentInstruction === selectedExercise.instructions.length - 1}
                  variant="outline"
                  size="sm"
                >
                  Siguiente
                </ModernButton>
              </div>
            )}
          </div>
        </ModernCard>
      )}

      {/* Controles */}
      {!isActive && !sessionComplete && (
        <div className="flex justify-center">
          <ModernButton
            onClick={startSession}
            size="lg"
            disabled={!selectedExercise}
          >
            <Play className="h-5 w-5 mr-2" />
            Iniciar Ejercicio
          </ModernButton>
        </div>
      )}

      {/* Información de capacidades */}
      {capabilities && (
        <div className="mt-6 p-4 bg-muted rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <Info className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-semibold">Capacidades AR</span>
          </div>
          <div className="grid grid-cols-3 gap-2 text-xs">
            <div>
              <span className={capabilities.cameraAvailable ? 'text-green-600' : 'text-red-600'}>
                {capabilities.cameraAvailable ? '✓' : '✗'} Cámara
              </span>
            </div>
            <div>
              <span className={capabilities.webXRSupported ? 'text-green-600' : 'text-yellow-600'}>
                {capabilities.webXRSupported ? '✓' : '~'} WebXR
              </span>
            </div>
            <div>
              <span className={capabilities.motionSensorsAvailable ? 'text-green-600' : 'text-yellow-600'}>
                {capabilities.motionSensorsAvailable ? '✓' : '~'} Sensores
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

