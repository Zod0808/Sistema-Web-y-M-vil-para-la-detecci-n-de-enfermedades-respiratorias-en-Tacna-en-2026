/**
 * File Upload Service
 * Handles file uploads for medical images and audio notes
 */

import multer, { FileFilterCallback } from 'multer';
import path from 'path';
import sharp from 'sharp';
import { v4 as uuidv4 } from 'uuid';
import { Request } from 'express';
import { logger } from '../utils/logger';
import { AppError } from '../utils/AppError';

// File upload configuration
const storage = multer.memoryStorage();

// File filter for allowed types
const fileFilter = (req: Request, file: Express.Multer.File, cb: FileFilterCallback) => {
  const allowedImageTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
  const allowedAudioTypes = ['audio/mpeg', 'audio/wav', 'audio/mp3', 'audio/ogg'];
  
  if (file.fieldname === 'images') {
    if (allowedImageTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new AppError('Tipo de archivo de imagen no permitido. Solo se permiten: JPEG, PNG, WebP', 400));
    }
  } else if (file.fieldname === 'audioNotes') {
    if (allowedAudioTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new AppError('Tipo de archivo de audio no permitido. Solo se permiten: MP3, WAV, OGG', 400));
    }
  } else {
    cb(new AppError('Campo de archivo no válido', 400));
  }
};

// Multer configuration
export const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
    files: 5 // Maximum 5 files per request
  }
});

// File upload middleware
export const uploadFiles = upload.fields([
  { name: 'images', maxCount: 5 },
  { name: 'audioNotes', maxCount: 1 }
]);

export class FileUploadService {
  private static readonly UPLOAD_DIR = path.join(process.cwd(), 'uploads');
  private static readonly IMAGES_DIR = path.join(this.UPLOAD_DIR, 'images');
  private static readonly AUDIO_DIR = path.join(this.UPLOAD_DIR, 'audio');

  /**
   * Initialize upload directories
   */
  static async initializeDirectories(): Promise<void> {
    const fs = await import('fs/promises');
    
    try {
      await fs.mkdir(this.UPLOAD_DIR, { recursive: true });
      await fs.mkdir(this.IMAGES_DIR, { recursive: true });
      await fs.mkdir(this.AUDIO_DIR, { recursive: true });
      
      logger.info('Upload directories initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize upload directories', error);
      throw new AppError('Error inicializando directorios de carga', 500);
    }
  }

  /**
   * Process and save uploaded images
   */
  static async processImages(files: Express.Multer.File[]): Promise<string[]> {
    if (!files || files.length === 0) {
      return [];
    }

    const processedImages: string[] = [];

    for (const file of files) {
      try {
        const filename = `${uuidv4()}.webp`;
        const filepath = path.join(this.IMAGES_DIR, filename);

        // Process image with Sharp
        await sharp(file.buffer)
          .resize(1200, 1200, { 
            fit: 'inside',
            withoutEnlargement: true 
          })
          .webp({ quality: 85 })
          .toFile(filepath);

        processedImages.push(`/uploads/images/${filename}`);
        
        logger.info('Image processed successfully', { filename });
      } catch (error) {
        logger.error('Failed to process image', { error, originalname: file.originalname });
        throw new AppError('Error procesando imagen', 500);
      }
    }

    return processedImages;
  }

  /**
   * Process and save uploaded audio
   */
  static async processAudio(files: Express.Multer.File[]): Promise<string | null> {
    if (!files || files.length === 0) {
      return null;
    }

    const file = files[0]; // Only one audio file allowed

    try {
      const filename = `${uuidv4()}.${this.getAudioExtension(file.mimetype)}`;
      const filepath = path.join(this.AUDIO_DIR, filename);

      // Save audio file
      const fs = await import('fs/promises');
      await fs.writeFile(filepath, file.buffer);

      logger.info('Audio file saved successfully', { filename });
      return `/uploads/audio/${filename}`;
    } catch (error) {
      logger.error('Failed to process audio', { error, originalname: file.originalname });
      throw new AppError('Error procesando archivo de audio', 500);
    }
  }

  /**
   * Get file extension from MIME type
   */
  private static getAudioExtension(mimetype: string): string {
    const extensions: Record<string, string> = {
      'audio/mpeg': 'mp3',
      'audio/wav': 'wav',
      'audio/ogg': 'ogg'
    };
    return extensions[mimetype] || 'mp3';
  }

  /**
   * Delete file from filesystem
   */
  static async deleteFile(filePath: string): Promise<void> {
    try {
      const fs = await import('fs/promises');
      const fullPath = path.join(process.cwd(), filePath);
      
      await fs.unlink(fullPath);
      logger.info('File deleted successfully', { filePath });
    } catch (error) {
      logger.error('Failed to delete file', { error, filePath });
      // Don't throw error for file deletion failures
    }
  }

  /**
   * Get file size in MB
   */
  static getFileSizeMB(buffer: Buffer): number {
    return Math.round((buffer.length / (1024 * 1024)) * 100) / 100;
  }

  /**
   * Validate file size
   */
  static validateFileSize(buffer: Buffer, maxSizeMB: number = 10): boolean {
    const sizeMB = this.getFileSizeMB(buffer);
    return sizeMB <= maxSizeMB;
  }

  /**
   * Generate thumbnail for image
   */
  static async generateThumbnail(imageBuffer: Buffer): Promise<Buffer> {
    try {
      return await sharp(imageBuffer)
        .resize(300, 300, { 
          fit: 'cover',
          position: 'center'
        })
        .webp({ quality: 70 })
        .toBuffer();
    } catch (error) {
      logger.error('Failed to generate thumbnail', error);
      throw new AppError('Error generando miniatura', 500);
    }
  }

  /**
   * Get file info
   */
  static getFileInfo(file: Express.Multer.File): {
    originalName: string;
    size: number;
    sizeMB: number;
    mimetype: string;
    extension: string;
  } {
    const extension = path.extname(file.originalname).toLowerCase();
    
    return {
      originalName: file.originalname,
      size: file.size,
      sizeMB: this.getFileSizeMB(file.buffer),
      mimetype: file.mimetype,
      extension
    };
  }

  /**
   * Clean up old files (older than specified days)
   */
  static async cleanupOldFiles(daysOld: number = 30): Promise<void> {
    try {
      const fs = await import('fs/promises');
      const now = Date.now();
      const cutoffTime = now - (daysOld * 24 * 60 * 60 * 1000);

      // Clean up images
      const imageFiles = await fs.readdir(this.IMAGES_DIR);
      for (const file of imageFiles) {
        const filePath = path.join(this.IMAGES_DIR, file);
        const stats = await fs.stat(filePath);
        
        if (stats.mtime.getTime() < cutoffTime) {
          await fs.unlink(filePath);
          logger.info('Old image file deleted', { file });
        }
      }

      // Clean up audio files
      const audioFiles = await fs.readdir(this.AUDIO_DIR);
      for (const file of audioFiles) {
        const filePath = path.join(this.AUDIO_DIR, file);
        const stats = await fs.stat(filePath);
        
        if (stats.mtime.getTime() < cutoffTime) {
          await fs.unlink(filePath);
          logger.info('Old audio file deleted', { file });
        }
      }

      logger.info('File cleanup completed', { daysOld });
    } catch (error) {
      logger.error('File cleanup failed', error);
    }
  }
}

// Initialize directories on module load
FileUploadService.initializeDirectories().catch(error => {
  logger.error('Failed to initialize file upload service', error);
});
