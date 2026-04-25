/**
 * Servicio de Realidad Aumentada para ejercicios respiratorios
 * 
 * Soporta:
 * - Ejercicios de respiración guiados
 * - Entrenamiento con inhalador
 * - Visualización AR de técnicas respiratorias
 */

export type ARMode = 'breathing' | 'inhaler' | 'guided'

export interface ARExercise {
  id: string
  name: string
  description: string
  mode: ARMode
  duration: number // en segundos
  instructions: string[]
}

export interface ARSession {
  exerciseId: string
  startTime: Date
  endTime?: Date
  completed: boolean
  metrics?: {
    breaths: number
    accuracy: number
    duration: number
  }
}

export interface ARCapabilities {
  webXRSupported: boolean
  cameraAvailable: boolean
  motionSensorsAvailable: boolean
}

class ARService {
  private session: ARSession | null = null
  private capabilities: ARCapabilities | null = null
  private animationFrame: number | null = null
  private isActive: boolean = false

  /**
   * Verifica las capacidades AR del dispositivo
   */
  async checkCapabilities(): Promise<ARCapabilities> {
    if (this.capabilities) {
      return this.capabilities
    }

    const capabilities: ARCapabilities = {
      webXRSupported: false,
      cameraAvailable: false,
      motionSensorsAvailable: false
    }

    // Verificar WebXR
    if (typeof navigator !== 'undefined' && 'xr' in navigator) {
      try {
        const xr = (navigator as any).xr
        if (xr && xr.isSessionSupported) {
          capabilities.webXRSupported = await xr.isSessionSupported('immersive-ar')
        }
      } catch (error) {
        console.warn('WebXR no disponible:', error)
      }
    }

    // Verificar cámara
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true })
        capabilities.cameraAvailable = true
        stream.getTracks().forEach(track => track.stop())
      } catch (error) {
        console.warn('Cámara no disponible:', error)
      }
    }

    // Verificar sensores de movimiento (DeviceMotionEvent)
    if (typeof window !== 'undefined') {
      capabilities.motionSensorsAvailable = 
        'DeviceMotionEvent' in window || 
        'DeviceOrientationEvent' in window
    }

    this.capabilities = capabilities
    return capabilities
  }

  /**
   * Inicia una sesión AR
   */
  async startSession(exercise: ARExercise): Promise<ARSession> {
    if (this.isActive) {
      throw new Error('Ya hay una sesión AR activa')
    }

    const capabilities = await this.checkCapabilities()
    
    if (!capabilities.cameraAvailable && !capabilities.webXRSupported) {
      throw new Error('AR no disponible en este dispositivo')
    }

    this.session = {
      exerciseId: exercise.id,
      startTime: new Date(),
      completed: false
    }

    this.isActive = true
    return this.session
  }

  /**
   * Detiene la sesión AR actual
   */
  stopSession(): void {
    if (this.session && !this.session.endTime) {
      this.session.endTime = new Date()
      this.session.completed = true
    }

    if (this.animationFrame) {
      cancelAnimationFrame(this.animationFrame)
      this.animationFrame = null
    }

    this.isActive = false
  }

  /**
   * Obtiene la sesión actual
   */
  getCurrentSession(): ARSession | null {
    return this.session
  }

  /**
   * Actualiza métricas de la sesión
   */
  updateMetrics(metrics: Partial<ARSession['metrics']>): void {
    if (this.session) {
      this.session.metrics = {
        ...this.session.metrics,
        ...metrics
      } as ARSession['metrics']
    }
  }

  /**
   * Ejercicios predefinidos
   */
  getExercises(): ARExercise[] {
    return [
      {
        id: 'breathing-4-7-8',
        name: 'Respiración 4-7-8',
        description: 'Técnica de respiración relajante con guía visual AR',
        mode: 'breathing',
        duration: 300, // 5 minutos
        instructions: [
          'Inhala por la nariz contando hasta 4',
          'Mantén la respiración contando hasta 7',
          'Exhala por la boca contando hasta 8',
          'Repite el ciclo'
        ]
      },
      {
        id: 'diaphragmatic-breathing',
        name: 'Respiración Diafragmática',
        description: 'Ejercicio de respiración profunda con feedback visual',
        mode: 'breathing',
        duration: 600, // 10 minutos
        instructions: [
          'Coloca una mano en el pecho y otra en el abdomen',
          'Inhala profundamente por la nariz',
          'Siente cómo se expande el abdomen',
          'Exhala lentamente por la boca',
          'Repite el proceso'
        ]
      },
      {
        id: 'inhaler-training',
        name: 'Entrenamiento con Inhalador',
        description: 'Guía AR para uso correcto de inhalador',
        mode: 'inhaler',
        duration: 180, // 3 minutos
        instructions: [
          'Agita el inhalador',
          'Exhala completamente',
          'Coloca el inhalador en la boca',
          'Inhala profundamente mientras presionas',
          'Mantén la respiración por 10 segundos',
          'Exhala lentamente'
        ]
      },
      {
        id: 'pursed-lip-breathing',
        name: 'Respiración con Labios Fruncidos',
        description: 'Técnica para mejorar el intercambio de aire',
        mode: 'breathing',
        duration: 240, // 4 minutos
        instructions: [
          'Inhala por la nariz durante 2 segundos',
          'Frunci los labios como si fueras a silbar',
          'Exhala lentamente por los labios fruncidos durante 4 segundos',
          'Repite el ciclo'
        ]
      },
      {
        id: 'guided-meditation',
        name: 'Meditación Guiada Respiratoria',
        description: 'Sesión de meditación con guía AR',
        mode: 'guided',
        duration: 900, // 15 minutos
        instructions: [
          'Encuentra una posición cómoda',
          'Cierra los ojos o mantén una mirada suave',
          'Sigue las indicaciones visuales AR',
          'Concéntrate en tu respiración',
          'Déjate guiar por la experiencia'
        ]
      }
    ]
  }

  /**
   * Obtiene un ejercicio por ID
   */
  getExerciseById(id: string): ARExercise | undefined {
    return this.getExercises().find(ex => ex.id === id)
  }

  /**
   * Renderiza overlay AR (para uso en componentes)
   */
  renderAROverlay(
    canvas: HTMLCanvasElement,
    mode: ARMode,
    onUpdate?: (data: any) => void
  ): void {
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const animate = () => {
      if (!this.isActive) return

      // Limpiar canvas
      ctx.clearRect(0, 0, canvas.width, canvas.height)

      // Renderizar según el modo
      switch (mode) {
        case 'breathing':
          this.renderBreathingGuide(ctx, canvas)
          break
        case 'inhaler':
          this.renderInhalerGuide(ctx, canvas)
          break
        case 'guided':
          this.renderGuidedVisualization(ctx, canvas)
          break
      }

      if (onUpdate) {
        onUpdate({
          timestamp: Date.now(),
          mode
        })
      }

      this.animationFrame = requestAnimationFrame(animate)
    }

    animate()
  }

  /**
   * Renderiza guía de respiración
   */
  private renderBreathingGuide(ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement): void {
    const centerX = canvas.width / 2
    const centerY = canvas.height / 2
    const time = Date.now() / 1000
    const cycle = 8 // 8 segundos por ciclo (4-7-8)
    const phase = (time % cycle) / cycle

    let radius: number
    let color: string

    if (phase < 0.5) {
      // Inhala (4 segundos)
      const progress = phase * 2
      radius = 50 + progress * 100
      color = `rgba(34, 197, 94, ${0.5 + progress * 0.5})` // Verde
    } else if (phase < 0.875) {
      // Mantén (3.5 segundos de 7)
      radius = 150
      color = 'rgba(59, 130, 246, 0.8)' // Azul
    } else {
      // Exhala (1 segundo de 8)
      const progress = (phase - 0.875) * 8
      radius = 150 - progress * 100
      color = `rgba(239, 68, 68, ${1 - progress})` // Rojo
    }

    // Dibujar círculo de respiración
    ctx.beginPath()
    ctx.arc(centerX, centerY, radius, 0, Math.PI * 2)
    ctx.fillStyle = color
    ctx.fill()
    ctx.strokeStyle = 'white'
    ctx.lineWidth = 3
    ctx.stroke()

    // Texto de instrucción
    ctx.fillStyle = 'white'
    ctx.font = 'bold 24px Arial'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    
    let instruction = ''
    if (phase < 0.5) {
      instruction = 'INHALA'
    } else if (phase < 0.875) {
      instruction = 'MANTÉN'
    } else {
      instruction = 'EXHALA'
    }

    ctx.fillText(instruction, centerX, centerY - 100)
  }

  /**
   * Renderiza guía de inhalador
   */
  private renderInhalerGuide(ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement): void {
    const centerX = canvas.width / 2
    const centerY = canvas.height / 2

    // Dibujar representación del inhalador
    ctx.fillStyle = 'rgba(59, 130, 246, 0.8)'
    ctx.fillRect(centerX - 30, centerY - 100, 60, 150)

    // Indicador de posición
    ctx.strokeStyle = 'white'
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.moveTo(centerX - 50, centerY - 50)
    ctx.lineTo(centerX + 50, centerY - 50)
    ctx.stroke()

    // Texto de instrucción
    ctx.fillStyle = 'white'
    ctx.font = 'bold 20px Arial'
    ctx.textAlign = 'center'
    ctx.fillText('Coloca el inhalador aquí', centerX, centerY + 80)
  }

  /**
   * Renderiza visualización guiada
   */
  private renderGuidedVisualization(ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement): void {
    const time = Date.now() / 1000
    const centerX = canvas.width / 2
    const centerY = canvas.height / 2

    // Efecto de ondas concéntricas
    for (let i = 0; i < 5; i++) {
      const radius = 50 + (time * 20 + i * 30) % 200
      const alpha = 1 - (radius / 200)
      
      ctx.beginPath()
      ctx.arc(centerX, centerY, radius, 0, Math.PI * 2)
      ctx.strokeStyle = `rgba(139, 92, 246, ${alpha * 0.5})`
      ctx.lineWidth = 2
      ctx.stroke()
    }

    // Texto de meditación
    ctx.fillStyle = 'white'
    ctx.font = '20px Arial'
    ctx.textAlign = 'center'
    ctx.fillText('Sigue tu respiración', centerX, centerY)
  }

  /**
   * Limpia recursos
   */
  cleanup(): void {
    this.stopSession()
    this.session = null
    this.capabilities = null
  }
}

export const arService = new ARService()

