"use client"

import { X, Loader2, ImageIcon, Camera, Scan, Activity, Heart, Droplet, AlertCircle, Thermometer, FileImage } from "lucide-react"
import { ModernButton } from "@/components/ui/ModernButton"
import { ModernCard } from "@/components/ui/ModernCard"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { toast } from "sonner"

interface ChatImageModalProps {
  open: boolean
  imageType: string | null
  selectedImage: File | null
  imagePreview: string | null
  isAnalyzingImage: boolean
  imageInputRef: React.RefObject<HTMLInputElement | null>
  cameraInputRef: React.RefObject<HTMLInputElement | null>
  getImageTypeLabel: (type: string | null) => string
  onClose: () => void
  onTypeSelect: (type: string) => void
  onImageSelect: (e: React.ChangeEvent<HTMLInputElement>) => void
  onOpenSource: (source: 'gallery' | 'camera') => void
  onAnalyze: () => void
  onClearImage: () => void
  onBackToTypes: () => void
}

const IMAGE_TYPES = [
  { key: 'chest_xray', label: 'Radiografía de Tórax', desc: 'Analiza radiografías para detectar neumonía, neumotórax y otras condiciones', Icon: Scan, color: 'blue' },
  { key: 'chest_ct', label: 'Tomografía Computarizada', desc: 'Analiza tomografías del tórax para diagnóstico avanzado', Icon: Scan, color: 'purple' },
  { key: 'spirometry', label: 'Espirometría', desc: 'Analiza gráficos de pruebas de función pulmonar', Icon: Activity, color: 'green' },
  { key: 'oximetry', label: 'Oximetría', desc: 'Analiza lecturas de saturación de oxígeno', Icon: Heart, color: 'red' },
  { key: 'sputum', label: 'Expectoración', desc: 'Analiza muestras de flema o esputo', Icon: Droplet, color: 'orange' },
  { key: 'skin_rash', label: 'Erupción Cutánea', desc: 'Analiza erupciones o lesiones en la piel', Icon: AlertCircle, color: 'yellow' },
  { key: 'cyanosis', label: 'Cianosis', desc: 'Analiza signos de cianosis (coloración azulada)', Icon: Thermometer, color: 'cyan' },
  { key: 'other', label: 'Otra Imagen Médica', desc: 'Analiza otras imágenes médicas relevantes', Icon: FileImage, color: 'gray' },
] as const

const COLOR_MAP: Record<string, string> = {
  blue: 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400',
  purple: 'bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400',
  green: 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400',
  red: 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400',
  orange: 'bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400',
  yellow: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-600 dark:text-yellow-400',
  cyan: 'bg-cyan-100 dark:bg-cyan-900/30 text-cyan-600 dark:text-cyan-400',
  gray: 'bg-gray-100 dark:bg-gray-900/30 text-gray-600 dark:text-gray-400',
}

export function ChatImageModal({
  open, imageType, selectedImage, imagePreview, isAnalyzingImage,
  imageInputRef, cameraInputRef, getImageTypeLabel,
  onClose, onTypeSelect, onImageSelect, onOpenSource, onAnalyze, onClearImage, onBackToTypes,
}: ChatImageModalProps) {
  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o && !isAnalyzingImage) onClose() }}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Análisis de Imagen Médica</DialogTitle>
          <DialogDescription>
            {!imageType ? 'Selecciona el tipo de imagen que deseas analizar' : 'Selecciona la imagen desde tu galería o cámara'}
          </DialogDescription>
        </DialogHeader>

        {!imageType ? (
          <div className="space-y-3 mt-4">
            {IMAGE_TYPES.map(({ key, label, desc, Icon, color }) => (
              <ModernCard
                key={key}
                className="p-4 cursor-pointer hover:bg-primary/5 transition-colors border-2 border-transparent hover:border-primary/20"
                onClick={() => onTypeSelect(key)}
              >
                <div className="flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center ${COLOR_MAP[color]}`}>
                    <Icon className="w-6 h-6" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-bold text-base">{label}</h3>
                    <p className="text-sm text-muted-foreground">{desc}</p>
                  </div>
                </div>
              </ModernCard>
            ))}
          </div>
        ) : (
          <div className="space-y-4 mt-4">
            <input ref={imageInputRef} type="file" accept="image/*" onChange={onImageSelect} className="hidden" />
            <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" onChange={onImageSelect} className="hidden" />

            <div className="bg-primary/10 rounded-lg p-3">
              <p className="text-sm text-muted-foreground mb-1">Tipo seleccionado:</p>
              <p className="font-semibold">{getImageTypeLabel(imageType)}</p>
            </div>

            {imagePreview ? (
              <div className="space-y-3">
                <div className="relative rounded-lg overflow-hidden border-2 border-primary/20">
                  <img src={imagePreview} alt="Preview" className="w-full h-48 object-contain bg-secondary" />
                  <button
                    onClick={onClearImage}
                    className="absolute top-2 right-2 p-2 bg-red-500 hover:bg-red-600 rounded-full text-white transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <div className="flex gap-2">
                  <ModernButton
                    variant="outline"
                    onClick={() => { onClose(); toast.info('Análisis cancelado') }}
                    className="flex-1"
                  >
                    Cancelar
                  </ModernButton>
                  <ModernButton onClick={onAnalyze} disabled={isAnalyzingImage} className="flex-1">
                    {isAnalyzingImage ? (
                      <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Analizando...</>
                    ) : 'Analizar Imagen'}
                  </ModernButton>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground text-center">Selecciona la imagen desde:</p>
                <div className="grid grid-cols-2 gap-3">
                  <ModernButton variant="outline" onClick={() => onOpenSource('gallery')} className="flex flex-col items-center gap-2 py-4">
                    <ImageIcon className="w-6 h-6" />
                    <span>Galería</span>
                  </ModernButton>
                  <ModernButton variant="outline" onClick={() => onOpenSource('camera')} className="flex flex-col items-center gap-2 py-4">
                    <Camera className="w-6 h-6" />
                    <span>Cámara</span>
                  </ModernButton>
                </div>
                <ModernButton variant="ghost" onClick={onBackToTypes} className="w-full">
                  Volver a tipos de imagen
                </ModernButton>
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
