/**
 * File Upload Controller
 * Handles file uploads for medical images and audio notes
 */

import { Response } from 'express';
import { ApiResponse, AuthenticatedRequest } from '../types';
import { asyncHandler } from '../utils/asyncHandler';
import { AppError } from '../utils/AppError';
import { logger } from '../utils/logger';
import { FileUploadService } from '../services/fileUploadService';

// Upload medical files (images and audio)
export const uploadMedicalFiles = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const files = req.files as { [fieldname: string]: Express.Multer.File[] } | undefined;

  if (!files) {
    throw new AppError('No se encontraron archivos para subir', 400);
  }

  try {
    const uploadedFiles: {
      images: string[];
      audioNotes: string | null;
    } = {
      images: [],
      audioNotes: null
    };

    // Process images
    if (files.images && files.images.length > 0) {
      // Validate file sizes
      for (const file of files.images) {
        if (!FileUploadService.validateFileSize(file.buffer, 10)) {
          throw new AppError(`La imagen ${file.originalname} excede el tamaño máximo de 10MB`, 400);
        }
      }

      uploadedFiles.images = await FileUploadService.processImages(files.images);
    }

    // Process audio
    if (files.audioNotes && files.audioNotes.length > 0) {
      // Validate file size
      if (!FileUploadService.validateFileSize(files.audioNotes[0].buffer, 10)) {
        throw new AppError(`El archivo de audio ${files.audioNotes[0].originalname} excede el tamaño máximo de 10MB`, 400);
      }

      uploadedFiles.audioNotes = await FileUploadService.processAudio(files.audioNotes);
    }

    logger.info('Files uploaded successfully', {
      userId: req.user?._id,
      imageCount: uploadedFiles.images.length,
      hasAudio: !!uploadedFiles.audioNotes
    });

    const response: ApiResponse = {
      success: true,
      message: 'Archivos subidos exitosamente',
      data: uploadedFiles
    };

    res.status(200).json(response);
  } catch (error: any) {
    logger.error('File upload failed', {
      userId: req.user?._id,
      error: error.message
    });
    throw error;
  }
});

// Get file information
export const getFileInfo = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { filePath } = req.params;

  if (!filePath) {
    throw new AppError('Ruta de archivo requerida', 400);
  }

  try {
    const fs = await import('fs/promises');
    const path = await import('path');
    
    const fullPath = path.join(process.cwd(), filePath);
    const stats = await fs.stat(fullPath);

    const fileInfo = {
      path: filePath,
      size: stats.size,
      sizeMB: FileUploadService.getFileSizeMB(await fs.readFile(fullPath)),
      created: stats.birthtime,
      modified: stats.mtime,
      isFile: stats.isFile(),
      isDirectory: stats.isDirectory()
    };

    const response: ApiResponse = {
      success: true,
      message: 'Información de archivo obtenida exitosamente',
      data: fileInfo
    };

    res.status(200).json(response);
  } catch (error: any) {
    if (error.code === 'ENOENT') {
      throw new AppError('Archivo no encontrado', 404);
    }
    
    logger.error('File info retrieval failed', {
      filePath,
      error: error.message
    });
    throw error;
  }
});

// Delete file
export const deleteFile = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { filePath } = req.params;

  if (!filePath) {
    throw new AppError('Ruta de archivo requerida', 400);
  }

  // Validate file path to prevent directory traversal
  if (filePath.includes('..') || !filePath.startsWith('/uploads/')) {
    throw new AppError('Ruta de archivo inválida', 400);
  }

  try {
    await FileUploadService.deleteFile(filePath);

    logger.info('File deleted successfully', {
      userId: req.user?._id,
      filePath
    });

    const response: ApiResponse = {
      success: true,
      message: 'Archivo eliminado exitosamente'
    };

    res.status(200).json(response);
  } catch (error: any) {
    logger.error('File deletion failed', {
      filePath,
      error: error.message
    });
    throw error;
  }
});

// Get upload statistics
export const getUploadStats = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  // Only admin can access upload statistics
  if (req.user?.role !== 'admin') {
    throw new AppError('Acceso denegado. Se requieren permisos de administrador', 403);
  }

  try {
    const fs = await import('fs/promises');
    const path = await import('path');

    const imagesDir = path.join(process.cwd(), 'uploads', 'images');
    const audioDir = path.join(process.cwd(), 'uploads', 'audio');

    // Get image statistics
    let imageStats = { count: 0, totalSize: 0 };
    try {
      const imageFiles = await fs.readdir(imagesDir);
      let totalImageSize = 0;

      for (const file of imageFiles) {
        const filePath = path.join(imagesDir, file);
        const stats = await fs.stat(filePath);
        totalImageSize += stats.size;
      }

      imageStats = {
        count: imageFiles.length,
        totalSize: totalImageSize
      };
    } catch (error) {
      // Directory doesn't exist or is empty
    }

    // Get audio statistics
    let audioStats = { count: 0, totalSize: 0 };
    try {
      const audioFiles = await fs.readdir(audioDir);
      let totalAudioSize = 0;

      for (const file of audioFiles) {
        const filePath = path.join(audioDir, file);
        const stats = await fs.stat(filePath);
        totalAudioSize += stats.size;
      }

      audioStats = {
        count: audioFiles.length,
        totalSize: totalAudioSize
      };
    } catch (error) {
      // Directory doesn't exist or is empty
    }

    const totalSize = imageStats.totalSize + audioStats.totalSize;
    const totalFiles = imageStats.count + audioStats.count;

    const statistics = {
      totalFiles,
      totalSize,
      totalSizeMB: FileUploadService.getFileSizeMB(Buffer.alloc(totalSize)),
      images: {
        count: imageStats.count,
        size: imageStats.totalSize,
        sizeMB: FileUploadService.getFileSizeMB(Buffer.alloc(imageStats.totalSize))
      },
      audio: {
        count: audioStats.count,
        size: audioStats.totalSize,
        sizeMB: FileUploadService.getFileSizeMB(Buffer.alloc(audioStats.totalSize))
      }
    };

    const response: ApiResponse = {
      success: true,
      message: 'Estadísticas de carga obtenidas exitosamente',
      data: statistics
    };

    res.status(200).json(response);
  } catch (error: any) {
    logger.error('Upload statistics retrieval failed', error);
    throw error;
  }
});

// Clean up old files
export const cleanupOldFiles = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  // Only admin can trigger cleanup
  if (req.user?.role !== 'admin') {
    throw new AppError('Acceso denegado. Se requieren permisos de administrador', 403);
  }

  const { daysOld = 30 } = req.body;

  if (typeof daysOld !== 'number' || daysOld < 1 || daysOld > 365) {
    throw new AppError('El número de días debe estar entre 1 y 365', 400);
  }

  try {
    await FileUploadService.cleanupOldFiles(daysOld);

    logger.info('File cleanup completed', {
      userId: req.user._id,
      daysOld
    });

    const response: ApiResponse = {
      success: true,
      message: `Limpieza de archivos completada. Archivos más antiguos que ${daysOld} días fueron eliminados`
    };

    res.status(200).json(response);
  } catch (error: any) {
    logger.error('File cleanup failed', {
      userId: req.user._id,
      error: error.message
    });
    throw error;
  }
});
