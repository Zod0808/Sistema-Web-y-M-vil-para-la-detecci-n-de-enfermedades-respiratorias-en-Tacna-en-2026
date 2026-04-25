/**
 * PDF Generator Utility
 * Usa PDFKit para generar reportes médicos profesionales
 */

import PDFDocument from 'pdfkit';
import fs from 'fs';
import path from 'path';
import { logger } from '../utils/logger';

export type PdfSection = {
  title: string;
  content: string | string[];
};

export type PdfOptions = {
  patient: {
    name: string;
    id: string;
    age?: number;
    gender?: string;
  };
  doctor: {
    name: string;
    id: string;
    specialization?: string;
  };
  report: {
    title: string;
    generatedAt: Date;
    sections: PdfSection[];
    footer?: string;
    signature?: {
      name: string;
      title?: string;
    };
  };
  outputPath?: string;
};

export const generateMedicalPdf = async (options: PdfOptions): Promise<Buffer> => {
  const doc = new PDFDocument({
    size: 'A4',
    margin: 50,
  });

  const chunks: Buffer[] = [];
  doc.on('data', (chunk) => chunks.push(chunk));

  return new Promise((resolve, reject) => {
    doc.on('end', () => {
      resolve(Buffer.concat(chunks));
    });

    doc.on('error', (error) => {
      logger.error('Error generando PDF', { error });
      reject(error);
    });

    doc.font('Times-Bold').fontSize(20).fillColor('#0d47a1').text(options.report.title, { align: 'center' });
    doc.moveDown();

    doc.fontSize(12).fillColor('#111').font('Helvetica');
    doc.text(`Paciente: ${options.patient.name} (${options.patient.id})`);
    if (options.patient.age) {
      doc.text(`Edad: ${options.patient.age} años`);
    }
    if (options.patient.gender) {
      doc.text(`Género: ${options.patient.gender}`);
    }
    doc.moveDown(0.5);

    doc.text(`Doctor: ${options.doctor.name} (${options.doctor.id})`);
    if (options.doctor.specialization) {
      doc.text(`Especialidad: ${options.doctor.specialization}`);
    }
    doc.moveDown(0.5);

    doc.text(`Fecha: ${options.report.generatedAt.toLocaleString()}`);
    doc.moveDown();

    for (const section of options.report.sections) {
      doc.font('Helvetica-Bold').fontSize(14).fillColor('#1565c0').text(section.title);
      doc.moveDown(0.2);
      doc.font('Helvetica').fontSize(12).fillColor('#111');
      if (Array.isArray(section.content)) {
        section.content.forEach((line) => doc.text(`• ${line}`));
      } else {
        doc.text(section.content, {
          align: 'justify',
        });
      }
      doc.moveDown();
    }

    if (options.report.signature) {
      doc.moveDown(2);
      doc.text('________________________', { align: 'left' });
      doc.text(options.report.signature.name, { align: 'left' });
      if (options.report.signature.title) {
        doc.text(options.report.signature.title, { align: 'left' });
      }
    }

    if (options.report.footer) {
      doc.moveDown();
      doc.fontSize(10).fillColor('#555').text(options.report.footer, {
        align: 'center',
      });
    }

    doc.end();

    if (options.outputPath) {
      fs.promises
        .mkdir(path.dirname(options.outputPath), { recursive: true })
        .then(() => fs.promises.writeFile(options.outputPath!, Buffer.concat(chunks)))
        .catch((error) => logger.warn('No se pudo guardar el PDF en disco', { error }));
    }
  });
};

