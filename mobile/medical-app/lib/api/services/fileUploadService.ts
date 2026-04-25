/**
 * Servicio de subida de archivos (imágenes y audio)
 */

import { API_CONFIG } from '../config'
import { getAuthToken } from '../config'

export interface UploadResponse {
  success: boolean
  data: {
    images: string[]
    audioNotes: string | null
  }
  message?: string
}

export class FileUploadService {
  private baseURL: string

  constructor() {
    this.baseURL = API_CONFIG.baseURL
  }

  /**
   * Subir imágenes médicas
   */
  async uploadImages(files: File[]): Promise<string[]> {
    if (files.length === 0) {
      return []
    }

    const formData = new FormData()
    files.forEach((file, index) => {
      formData.append('images', file)
    })

    const token = getAuthToken()
    if (!token) {
      throw new Error('No autenticado')
    }

    try {
      const response = await fetch(`${this.baseURL}/api/v1/upload/medical-files`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      })

      if (!response.ok) {
        const error = await response.json().catch(() => ({ message: 'Error al subir imágenes' }))
        throw new Error(error.message || 'Error al subir imágenes')
      }

      const result: UploadResponse = await response.json()
      
      if (result.success && result.data) {
        return result.data.images || []
      }
      
      throw new Error(result.message || 'Error al subir imágenes')
    } catch (error: any) {
      console.error('Error al subir imágenes:', error)
      throw error
    }
  }

  /**
   * Subir nota de audio
   */
  async uploadAudio(audioFile: File): Promise<string> {
    const formData = new FormData()
    formData.append('audioNotes', audioFile)

    const token = getAuthToken()
    if (!token) {
      throw new Error('No autenticado')
    }

    try {
      const response = await fetch(`${this.baseURL}/api/v1/upload/medical-files`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      })

      if (!response.ok) {
        const error = await response.json().catch(() => ({ message: 'Error al subir audio' }))
        throw new Error(error.message || 'Error al subir audio')
      }

      const result: UploadResponse = await response.json()
      
      if (result.success && result.data && result.data.audioNotes) {
        return result.data.audioNotes
      }
      
      throw new Error(result.message || 'Error al subir audio')
    } catch (error: any) {
      console.error('Error al subir audio:', error)
      throw error
    }
  }

  /**
   * Subir imágenes y audio juntos
   */
  async uploadFiles(images: File[], audio?: File): Promise<{ images: string[]; audioNotes: string | null }> {
    const formData = new FormData()
    
    images.forEach((file) => {
      formData.append('images', file)
    })
    
    if (audio) {
      formData.append('audioNotes', audio)
    }

    const token = getAuthToken()
    if (!token) {
      throw new Error('No autenticado')
    }

    try {
      const response = await fetch(`${this.baseURL}/api/v1/upload/medical-files`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      })

      if (!response.ok) {
        const error = await response.json().catch(() => ({ message: 'Error al subir archivos' }))
        throw new Error(error.message || 'Error al subir archivos')
      }

      const result: UploadResponse = await response.json()
      
      if (result.success && result.data) {
        return {
          images: result.data.images || [],
          audioNotes: result.data.audioNotes || null
        }
      }
      
      throw new Error(result.message || 'Error al subir archivos')
    } catch (error: any) {
      console.error('Error al subir archivos:', error)
      throw error
    }
  }

  /**
   * Obtener URL completa de una imagen
   */
  getImageUrl(imagePath: string): string {
    if (imagePath.startsWith('http://') || imagePath.startsWith('https://')) {
      return imagePath
    }
    if (imagePath.startsWith('/')) {
      return `${this.baseURL}${imagePath}`
    }
    return `${this.baseURL}/uploads/images/${imagePath}`
  }

  /**
   * Obtener URL completa de un audio
   */
  getAudioUrl(audioPath: string): string {
    if (audioPath.startsWith('http://') || audioPath.startsWith('https://')) {
      return audioPath
    }
    if (audioPath.startsWith('/')) {
      return `${this.baseURL}${audioPath}`
    }
    return `${this.baseURL}/uploads/audio/${audioPath}`
  }
}

export const fileUploadService = new FileUploadService()

