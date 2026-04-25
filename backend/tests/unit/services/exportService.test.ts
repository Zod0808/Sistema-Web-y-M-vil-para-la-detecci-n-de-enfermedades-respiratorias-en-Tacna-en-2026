/**
 * Unit tests for ExportService
 */

import type { Response } from 'express';

import { AppError } from '../../../src/utils/AppError';
import { ExportService } from '../../../src/services/exportService';
import MedicalHistory from '../../../src/models/MedicalHistory';
import User from '../../../src/models/User';
import { createObjectCsvWriter } from 'csv-writer';
import PDFDocument from 'pdfkit';

jest.mock('../../../src/models/MedicalHistory', () => ({
  __esModule: true,
  default: {
    find: jest.fn(),
    getStats: jest.fn(),
    getTopDiagnoses: jest.fn(),
    getAgeStats: jest.fn(),
  },
}));

jest.mock('../../../src/models/User', () => ({
  __esModule: true,
  default: {
    getUserStats: jest.fn(),
  },
}));

const writeRecordsMock = jest.fn();

jest.mock('csv-writer', () => ({
  createObjectCsvWriter: jest.fn(() => ({
    writeRecords: writeRecordsMock,
  })),
}));

const pdfDocMock = {
  pipe: jest.fn(),
  fontSize: jest.fn().mockReturnThis(),
  text: jest.fn().mockReturnThis(),
  addPage: jest.fn(),
  end: jest.fn(),
};

jest.mock('pdfkit', () => jest.fn(() => pdfDocMock));

const fsPromisesMock = {
  readFile: jest.fn(),
  writeFile: jest.fn(),
  unlink: jest.fn(),
  readdir: jest.fn(),
  stat: jest.fn(),
  mkdir: jest.fn(),
};

jest.mock('fs/promises', () => fsPromisesMock);

const medicalHistoryMock = MedicalHistory as unknown as jest.Mocked<{
  find: jest.Mock;
  getStats: jest.Mock;
  getTopDiagnoses: jest.Mock;
  getAgeStats: jest.Mock;
}>;

const userModelMock = User as unknown as jest.Mocked<{
  getUserStats: jest.Mock;
}>;

const csvWriterMock = createObjectCsvWriter as unknown as jest.MockedFunction<typeof createObjectCsvWriter>;
const PDFDocumentMock = PDFDocument as unknown as jest.MockedFunction<typeof PDFDocument>;

const createMockResponse = () => {
  const res: Partial<Response> & { body?: unknown } = {};
  res.setHeader = jest.fn();
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockImplementation(function (this: typeof res, payload: unknown) {
    this.body = payload;
    return this;
  });
  res.send = jest.fn().mockImplementation(function (this: typeof res, payload: unknown) {
    this.body = payload;
    return this;
  });
  return res as Response & { body?: unknown };
};

const setupFindMock = (records: any[]) => {
  const query: any = {};
  query.populate = jest.fn().mockImplementation(() => query);
  query.sort = jest.fn().mockResolvedValue(records);
  medicalHistoryMock.find.mockReturnValue(query);
  return query;
};

describe('ExportService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    fsPromisesMock.readFile.mockReset();
    fsPromisesMock.unlink.mockReset();
    writeRecordsMock.mockReset();

    medicalHistoryMock.find.mockReset();
    medicalHistoryMock.getStats.mockReset();
    medicalHistoryMock.getTopDiagnoses.mockReset();
    medicalHistoryMock.getAgeStats.mockReset();
    userModelMock.getUserStats.mockReset();
  });

  describe('exportMedicalHistories', () => {
    const sampleHistories = [
      {
        _id: 'history-1',
        patientName: 'Paciente Uno',
        doctorId: { name: 'Doctor Uno' },
        patientId: { _id: 'patient-1', name: 'Paciente Uno', email: 'p1@test.com' },
        age: 45,
        diagnosis: 'Bronquitis',
        symptoms: [{ name: 'tos', severity: 'moderate', duration: '2 semanas' }],
        description: 'Descripción',
        location: { address: 'Tacna' },
        date: new Date('2024-01-10T00:00:00Z'),
        syncStatus: 'synced',
        createdAt: new Date('2024-01-05T00:00:00Z'),
        updatedAt: new Date('2024-01-08T00:00:00Z'),
      },
    ];

    it('exporta historias médicas en formato JSON', async () => {
      setupFindMock(sampleHistories);
      const res = createMockResponse();

      await ExportService.exportMedicalHistories(res, { format: 'json' });

      expect(medicalHistoryMock.find).toHaveBeenCalled();
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          exportInfo: expect.objectContaining({
            format: 'JSON',
            totalRecords: sampleHistories.length,
          }),
          medicalHistories: expect.any(Array),
        }),
      );
    });

    it('lanza AppError cuando no se encuentran historias', async () => {
      setupFindMock([]);
      const res = createMockResponse();

      await expect(ExportService.exportMedicalHistories(res, { format: 'json' })).rejects.toBeInstanceOf(AppError);
    });

    it('lanza AppError cuando el formato es inválido', async () => {
      setupFindMock(sampleHistories);
      const res = createMockResponse();

      await expect(
        ExportService.exportMedicalHistories(res, { format: 'xml' as any }),
      ).rejects.toEqual(expect.objectContaining({ statusCode: 400 }));
    });

    it('exporta en formato CSV', async () => {
      setupFindMock(sampleHistories);
      fsPromisesMock.readFile.mockResolvedValue('csv-content');
      fsPromisesMock.unlink.mockResolvedValue(undefined);
      writeRecordsMock.mockResolvedValue(undefined);

      const res = createMockResponse();

      await ExportService.exportMedicalHistories(res, { format: 'csv' });

      expect(csvWriterMock).toHaveBeenCalled();
      expect(writeRecordsMock).toHaveBeenCalledWith(expect.any(Array));
      expect(fsPromisesMock.readFile).toHaveBeenCalledWith('temp-export.csv', 'utf-8');
      expect(res.setHeader).toHaveBeenCalledWith('Content-Type', 'text/csv');
      expect(res.send).toHaveBeenCalledWith('csv-content');
    });

    it('exporta en formato PDF', async () => {
      setupFindMock(sampleHistories);
      const res = createMockResponse();

      await ExportService.exportMedicalHistories(res, { format: 'pdf' });

      expect(PDFDocumentMock).toHaveBeenCalledTimes(1);
      expect(pdfDocMock.pipe).toHaveBeenCalledWith(res);
      expect(pdfDocMock.end).toHaveBeenCalled();
      expect(res.setHeader).toHaveBeenCalledWith('Content-Type', 'application/pdf');
    });
  });

  describe('exportUserStats', () => {
    it('exporta estadísticas en JSON', async () => {
      medicalHistoryMock.getStats.mockResolvedValue({ total: 1 });
      medicalHistoryMock.getTopDiagnoses.mockResolvedValue([]);
      medicalHistoryMock.getAgeStats.mockResolvedValue([]);
      userModelMock.getUserStats.mockResolvedValue({ admin: { total: 1, active: 1 } });

      const res = createMockResponse();

      await ExportService.exportUserStats(res);

      expect(userModelMock.getUserStats).toHaveBeenCalled();
      expect(medicalHistoryMock.getStats).toHaveBeenCalled();
      expect(res.setHeader).toHaveBeenCalledWith('Content-Type', 'application/json');
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          statistics: expect.objectContaining({
            users: expect.any(Object),
            medicalHistories: expect.any(Object),
          }),
        }),
      );
    });
  });

  describe('validateExportOptions', () => {
    it('acepta opciones válidas', () => {
      expect(() =>
        ExportService.validateExportOptions({
          format: 'json',
          dateFrom: new Date('2024-01-01'),
          dateTo: new Date('2024-02-01'),
        }),
      ).not.toThrow();
    });

    it('rechaza formato inválido', () => {
      expect(() =>
        ExportService.validateExportOptions({ format: 'xls' as any }),
      ).toThrowError(new AppError('Formato de exportación no válido', 400));
    });

    it('rechaza rango de fechas inválido', () => {
      const future = new Date(Date.now() + 24 * 60 * 60 * 1000);

      expect(() =>
        ExportService.validateExportOptions({
          format: 'json',
          dateFrom: new Date('2024-05-01'),
          dateTo: new Date('2024-04-01'),
        }),
      ).toThrow();

      expect(() =>
        ExportService.validateExportOptions({
          format: 'json',
          dateFrom: future,
        }),
      ).toThrow();

      expect(() =>
        ExportService.validateExportOptions({
          format: 'json',
          dateTo: future,
        }),
      ).toThrow();
    });
  });
});

