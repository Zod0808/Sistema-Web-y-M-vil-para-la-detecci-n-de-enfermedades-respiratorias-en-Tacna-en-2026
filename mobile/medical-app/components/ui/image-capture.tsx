"use client"

import { useState, useRef } from "react"
import { Camera, ImageIcon, X, Upload, Loader2, Maximize2 } from "lucide-react"
import { ModernButton } from "@/components/ui/ModernButton"
import { toast } from "sonner"
import { optimizeImage } from "@/lib/utils/performance"

interface ImageCaptureProps {
  images: string[]
  imageFiles: File[]
  onImagesChange: (images: string[], files: File[]) => void
  maxImages?: number
  maxSizeMB?: number
  disabled?: boolean
}

export function ImageCapture({
  images,
  imageFiles,
  onImagesChange,
  maxImages = 5,
  maxSizeMB = 5,
  disabled = false
}: ImageCaptureProps) {
  const [isUploading, setIsUploading] = useState(false)
  const [selectedImageIndex, setSelectedImageIndex] = useState<number | null>(null)
  const [optimizing, setOptimizing] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const cameraInputRef = useRef<HTMLInputElement>(null)

  // Manejar selección de archivos con optimización
  const handleFileSelect = async (files: FileList | null) => {
    if (!files || files.length === 0) return

    setOptimizing(true)
    const newFiles: File[] = []
    const newImages: string[] = []

    try {
      for (const file of Array.from(files)) {
        // Validar cantidad
        if (images.length + newImages.length >= maxImages) {
          toast.error(`Máximo ${maxImages} imágenes permitidas`)
          break
        }

        // Validar tipo
        if (!file.type.startsWith('image/')) {
          toast.error(`${file.name} no es una imagen válida`)
          continue
        }

        // Validar tamaño
        if (file.size > maxSizeMB * 1024 * 1024) {
          toast.error(`${file.name} es muy grande (máximo ${maxSizeMB}MB)`)
          continue
        }

        // Optimizar imagen antes de guardar
        let processedFile = file
        try {
          if (file.size > 1 * 1024 * 1024) { // Optimizar si es mayor a 1MB
            processedFile = await optimizeImage(file, 1200, 1200, 0.85)
          }
        } catch (error) {
          console.warn(`Error al optimizar ${file.name}, usando original:`, error)
          // Continuar con el archivo original si falla la optimización
        }

        // Leer imagen como base64 para preview
        const reader = new FileReader()
        reader.onload = (e) => {
          const result = e.target?.result as string
          newImages.push(result)
          newFiles.push(processedFile)
          
          // Cuando todas las imágenes se hayan leído, actualizar estado
          if (newImages.length === Array.from(files).length || 
              images.length + newImages.length >= maxImages) {
            onImagesChange([...images, ...newImages], [...imageFiles, ...newFiles])
            setOptimizing(false)
          }
        }
        reader.onerror = () => {
          toast.error(`Error al leer ${file.name}`)
          setOptimizing(false)
        }
        reader.readAsDataURL(processedFile)
      }
    } catch (error) {
      console.error('Error procesando archivos:', error)
      toast.error('Error al procesar las imágenes')
      setOptimizing(false)
    }
  }

  // Abrir selector de archivos
  const openFileSelector = (source: 'gallery' | 'camera') => {
    if (disabled) return

    const input = source === 'camera' ? cameraInputRef.current : fileInputRef.current
    if (input) {
      input.click()
    }
  }

  // Eliminar imagen
  const removeImage = (index: number) => {
    const newImages = images.filter((_, i) => i !== index)
    const newFiles = imageFiles.filter((_, i) => i !== index)
    onImagesChange(newImages, newFiles)
    toast.success("Imagen eliminada")
  }

  // Vista previa ampliada
  if (selectedImageIndex !== null) {
    return (
      <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4">
        <div className="relative w-full h-full flex items-center justify-center">
          <button
            onClick={() => setSelectedImageIndex(null)}
            className="absolute top-4 right-4 p-2 bg-white/10 hover:bg-white/20 rounded-full text-white transition-colors z-10"
          >
            <X className="w-6 h-6" />
          </button>
          <img
            src={images[selectedImageIndex]}
            alt={`Síntoma ${selectedImageIndex + 1}`}
            className="max-w-full max-h-full object-contain"
          />
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Inputs ocultos */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        onChange={(e) => handleFileSelect(e.target.files)}
        className="hidden"
        disabled={disabled || images.length >= maxImages}
      />
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={(e) => handleFileSelect(e.target.files)}
        className="hidden"
        disabled={disabled || images.length >= maxImages}
      />

      {/* Botones de captura */}
      {images.length < maxImages && (
        <div className="grid grid-cols-2 gap-2">
          <ModernButton
            type="button"
            variant="outline"
            onClick={() => openFileSelector('gallery')}
            disabled={disabled || images.length >= maxImages}
            className="w-full"
          >
            <ImageIcon className="w-4 h-4 mr-2" />
            Galería
          </ModernButton>
          <ModernButton
            type="button"
            variant="outline"
            onClick={() => openFileSelector('camera')}
            disabled={disabled || images.length >= maxImages}
            className="w-full"
          >
            <Camera className="w-4 h-4 mr-2" />
            Cámara
          </ModernButton>
        </div>
      )}

      {/* Grid de imágenes */}
      {images.length > 0 && (
        <div className="grid grid-cols-3 gap-2">
          {images.map((img, index) => (
            <div
              key={index}
              className="relative group aspect-square rounded-lg overflow-hidden border border-border/50 dark:border-slate-700 bg-secondary"
            >
              <img
                src={img}
                alt={`Síntoma ${index + 1}`}
                className="w-full h-full object-cover cursor-pointer"
                onClick={() => setSelectedImageIndex(index)}
              />
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                <div className="flex gap-2">
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      setSelectedImageIndex(index)
                    }}
                    className="p-2 bg-white/20 hover:bg-white/30 rounded-full text-white transition-colors"
                    title="Ampliar"
                  >
                    <Maximize2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      removeImage(index)
                    }}
                    className="p-2 bg-red-500/80 hover:bg-red-600 rounded-full text-white transition-colors"
                    title="Eliminar"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
              <div className="absolute top-1 left-1 bg-black/50 text-white text-xs px-1.5 py-0.5 rounded">
                {index + 1}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Información */}
      {images.length > 0 && (
        <p className="text-xs text-muted-foreground text-center">
          {images.length}/{maxImages} imágenes • Toca una imagen para ampliar
        </p>
      )}
    </div>
  )
}

