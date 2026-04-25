/**
 * Unit tests for FileUploadService
 */

import { AppError } from '../../../src/utils/AppError';
import { Request } from 'express';
import multer, { FileFilterCallback } from 'multer';

type FsPromisesMock = {
  mkdir: jest.Mock;
  writeFile: jest.Mock;
  readFile: jest.Mock;
  unlink: jest.Mock;
  readdir: jest.Mock;
  stat: jest.Mock;
};

const createFsMock = (): FsPromisesMock => ({
  mkdir: jest.fn().mockResolvedValue(undefined),
  writeFile: jest.fn().mockResolvedValue(undefined),
  readFile: jest.fn(),
  unlink: jest.fn().mockResolvedValue(undefined),
  readdir: jest.fn(),
  stat: jest.fn(),
});

describe('FileUploadService', () => {
  const loadModule = (
    overrides: Partial<FsPromisesMock> = {},
    options: { failSharp?: boolean } = {}
  ) => {
    jest.resetModules();

    const fsMock = createFsMock();
    Object.assign(fsMock, overrides);

    const sharpInstances: any[] = [];

    jest.doMock('fs/promises', () => fsMock);

    jest.doMock('uuid', () => ({
      v4: () => 'mock-uuid',
    }));

    jest.doMock('sharp', () => {
      const sharpMock = (buffer: Buffer) => {
        const transform = {
          resize: jest.fn().mockReturnThis(),
          webp: jest.fn().mockReturnThis(),
          toFile: options.failSharp
            ? jest.fn().mockRejectedValue(new Error('sharp failure'))
            : jest.fn().mockResolvedValue(undefined),
          toBuffer: jest.fn().mockResolvedValue(Buffer.from('thumbnail')),
        };
        transform.resize.mock.calls.length; // satisfy lint
        sharpInstances.push({ buffer, transform });
        return transform;
      };
      return sharpMock;
    });

    let capturedFileFilter: ((req: Request, file: Express.Multer.File, cb: FileFilterCallback) => void) | undefined;

    const multerMock = jest.fn((config: multer.Options) => {
      capturedFileFilter = config.fileFilter as typeof capturedFileFilter;
      return {
        fields: jest.fn().mockReturnValue(jest.fn()),
        single: jest.fn().mockReturnValue(jest.fn()),
        any: jest.fn().mockReturnValue(jest.fn())
      };
    }) as unknown as typeof multer;

    (multerMock as any).memoryStorage = jest.fn().mockReturnValue({});

    jest.doMock('multer', () => multerMock);

    const loggerMock = {
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
    };

    jest.doMock('../../../src/utils/logger', () => ({
      logger: loggerMock,
    }));

    let module: typeof import('../../../src/services/fileUploadService');
    jest.isolateModules(() => {
      module = require('../../../src/services/fileUploadService');
    });

    return {
      FileUploadService: module!.FileUploadService,
      fsMock,
      sharpInstances,
      loggerMock,
      fileFilter: capturedFileFilter!,
    };
  };

  it('inicializa directorios correctamente', async () => {
    const { FileUploadService, fsMock } = loadModule();

    await FileUploadService.initializeDirectories();

    expect(fsMock.mkdir).toHaveBeenCalled();
  });

  it('lanza AppError si falla initializeDirectories', async () => {
    const failingFs: Partial<FsPromisesMock> = {
      mkdir: jest.fn().mockRejectedValue(new Error('fail mkdir')),
    };

    const { FileUploadService, loggerMock } = loadModule(failingFs);

    await expect(FileUploadService.initializeDirectories()).rejects.toEqual(
      expect.objectContaining({
        message: 'Error inicializando directorios de carga',
        statusCode: 500,
      })
    );
    expect(loggerMock.error).toHaveBeenCalledWith(
      'Failed to initialize upload directories',
      expect.any(Error)
    );
  });

  it('procesa imágenes exitosamente', async () => {
    const { FileUploadService, sharpInstances } = loadModule();

    const files = [
      {
        originalname: 'image.png',
        mimetype: 'image/png',
        buffer: Buffer.alloc(1024),
      },
    ] as unknown as Express.Multer.File[];

    const result = await FileUploadService.processImages(files);

    expect(result).toEqual(['/uploads/images/mock-uuid.webp']);
    expect(sharpInstances).toHaveLength(1);
    expect(sharpInstances[0].buffer).toBe(files[0].buffer);
    expect(sharpInstances[0].transform.toFile).toHaveBeenCalled();
  });

  it('lanza AppError cuando falla procesamiento de imágenes', async () => {
    const { FileUploadService, loggerMock } = loadModule({}, { failSharp: true });

    const files = [
      {
        originalname: 'image.png',
        mimetype: 'image/png',
        buffer: Buffer.alloc(1024),
      },
    ] as unknown as Express.Multer.File[];

    await expect(FileUploadService.processImages(files)).rejects.toEqual(
      expect.objectContaining({
        message: 'Error procesando imagen',
        statusCode: 500,
      })
    );
    expect(loggerMock.error).toHaveBeenCalledWith(
      'Failed to process image',
      expect.objectContaining({ originalname: 'image.png' })
    );
  });

  it('procesa audio exitosamente', async () => {
    const { FileUploadService, fsMock } = loadModule();

    const files = [
      {
        originalname: 'audio.mp3',
        mimetype: 'audio/mpeg',
        buffer: Buffer.alloc(2048),
      },
    ] as unknown as Express.Multer.File[];

    const result = await FileUploadService.processAudio(files);

    expect(result).toBe('/uploads/audio/mock-uuid.mp3');
    expect(fsMock.writeFile).toHaveBeenCalled();
  });

  it('lanza AppError cuando falla procesamiento de audio', async () => {
    const writeFailure: Partial<FsPromisesMock> = {
      writeFile: jest.fn().mockRejectedValue(new Error('write failure')),
    };
    const { FileUploadService, loggerMock } = loadModule(writeFailure);

    const files = [
      {
        originalname: 'audio.mp3',
        mimetype: 'audio/mpeg',
        buffer: Buffer.alloc(2048),
      },
    ] as unknown as Express.Multer.File[];

    await expect(FileUploadService.processAudio(files)).rejects.toEqual(
      expect.objectContaining({
        message: 'Error procesando archivo de audio',
        statusCode: 500,
      })
    );
    expect(loggerMock.error).toHaveBeenCalledWith(
      'Failed to process audio',
      expect.objectContaining({ originalname: 'audio.mp3' })
    );
  });

  it('elimina archivos sin lanzar excepciones', async () => {
    const { FileUploadService, fsMock } = loadModule();

    await FileUploadService.deleteFile('/uploads/images/mock.webp');

    expect(fsMock.unlink).toHaveBeenCalledWith(
      expect.stringMatching(/uploads[\\/]+images[\\/]+mock\.webp$/)
    );
  });

  it('limpia archivos antiguos según cutoff', async () => {
    const { FileUploadService, fsMock } = loadModule();

    const now = Date.now();

    fsMock.readdir
      .mockResolvedValueOnce(['old.webp', 'new.webp'])
      .mockResolvedValueOnce(['old.mp3']);

    fsMock.stat.mockImplementation((filePath: string) => {
      const oldTime = new Date(now - 10 * 24 * 60 * 60 * 1000);
      const recentTime = new Date(now);
      return {
        mtime: filePath.includes('old') ? oldTime : recentTime,
      };
    });

    await FileUploadService.cleanupOldFiles(7);

    expect(fsMock.unlink).toHaveBeenCalledWith(expect.stringContaining('old.webp'));
    expect(fsMock.unlink).toHaveBeenCalledWith(expect.stringContaining('old.mp3'));
  });

  it('maneja errores en cleanupOldFiles sin lanzar', async () => {
    const { FileUploadService, fsMock, loggerMock } = loadModule();

    fsMock.readdir.mockRejectedValueOnce(new Error('fs failure'));

    await expect(FileUploadService.cleanupOldFiles(7)).resolves.toBeUndefined();
    expect(loggerMock.error).toHaveBeenCalledWith('File cleanup failed', expect.any(Error));
  });

  it('continúa la limpieza cuando stat falla y registra el error', async () => {
    const { FileUploadService, fsMock, loggerMock } = loadModule();

    fsMock.readdir
      .mockResolvedValueOnce(['problem.webp'])
      .mockResolvedValueOnce([]);
    fsMock.stat.mockRejectedValue(new Error('stat failure'));

    await expect(FileUploadService.cleanupOldFiles(7)).resolves.toBeUndefined();
    expect(loggerMock.error).toHaveBeenCalledWith('File cleanup failed', expect.any(Error));
  });

  describe('fileFilter behavior', () => {
    it('acepta imágenes con tipo permitido', () => {
      const { fileFilter } = loadModule();
      const cb = jest.fn();

      fileFilter({} as Request, { fieldname: 'images', mimetype: 'image/png' } as Express.Multer.File, cb);

      expect(cb).toHaveBeenCalledWith(null, true);
    });

    it('rechaza audio con tipo no permitido', () => {
      const { fileFilter } = loadModule();
      const cb = jest.fn();

      fileFilter(
        {} as Request,
        { fieldname: 'audioNotes', mimetype: 'audio/flac' } as Express.Multer.File,
        cb
      );

      const errorArg = cb.mock.calls[0][0] as AppError;
      expect(errorArg).toMatchObject({ statusCode: 400 });
      expect(errorArg.message).toContain('Tipo de archivo de audio no permitido');
      expect(cb.mock.calls[0][1]).toBeUndefined();
    });

    it('rechaza campos de archivo no válidos', () => {
      const { fileFilter } = loadModule();
      const cb = jest.fn();

      fileFilter({} as Request, { fieldname: 'documents', mimetype: 'application/pdf' } as Express.Multer.File, cb);

      const errorArg = cb.mock.calls[0][0] as AppError;
      expect(errorArg).toMatchObject({ statusCode: 400 });
      expect(errorArg.message).toBe('Campo de archivo no válido');
    });
  });
});

