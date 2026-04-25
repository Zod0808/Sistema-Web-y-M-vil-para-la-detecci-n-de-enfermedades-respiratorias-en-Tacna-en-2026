import { parseStringPromise } from 'xml2js';

export interface Hl7Segment {
  name: string;
  fields: string[];
}

export interface Hl7Message {
  header: Hl7Segment | null;
  segments: Hl7Segment[];
}

/**
 * Convierte un mensaje HL7 v2 en una representación estructurada.
 * El mensaje se divide por segmentos (líneas) y por campos utilizando el delimitador '|'.
 */
export function parseHl7Message(message: string): Hl7Message {
  const segments: Hl7Segment[] = message
    .split(/\r\n|\n|\r/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .map((line) => {
      const [name, ...fields] = line.split('|');
      return { name, fields };
    });

  const header = segments.find((segment) => segment.name === 'MSH') ?? null;

  return {
    header,
    segments,
  };
}

export interface FhirCompatibleObservation {
  resourceType: 'Observation';
  status: string;
  code: {
    text: string;
  };
  subject?: {
    reference: string;
  };
  effectiveDateTime?: string;
  valueString?: string;
  [key: string]: unknown;
}

/**
 * Intenta extraer información clínica mínima de un mensaje HL7 ORU^R01
 * para producir un recurso Observation compatible con FHIR.
 */
export function mapHl7ToFhirObservation(message: string): FhirCompatibleObservation | null {
  const { segments } = parseHl7Message(message);

  const obr = segments.find((segment) => segment.name === 'OBR');
  const obx = segments.find((segment) => segment.name === 'OBX');
  const pid = segments.find((segment) => segment.name === 'PID');

  if (!obr || !obx) {
    return null;
  }

  const observationDateTime =
    obr.fields[6] || obr.fields[5] || obr.fields[4];

  const observation: FhirCompatibleObservation = {
    resourceType: 'Observation',
    status: 'final',
    code: {
      text: obx.fields[2] ?? 'Observación clínica',
    },
    valueString: obx.fields[4] ?? undefined,
    effectiveDateTime: observationDateTime ? formatHl7DateTime(observationDateTime) : undefined,
  };

  if (pid?.fields[2]) {
    observation.subject = { reference: `Patient/${pid.fields[2]}` };
  }

  return observation;
}

/**
 * Convierte mensajes HL7 en formato XML (v3) a objetos JavaScript.
 */
export async function parseHl7Xml<T = Record<string, unknown>>(xmlMessage: string): Promise<T> {
  const parsed = await parseStringPromise(xmlMessage, { explicitArray: false });
  return parsed as T;
}

export function formatHl7DateTime(value: string): string {
  if (!value) {
    return value;
  }

  const normalized = value.replace(/[^0-9]/g, '');

  if (normalized.length < 8) {
    return value;
  }

  const year = normalized.substring(0, 4);
  const month = normalized.substring(4, 6) || '01';
  const day = normalized.substring(6, 8) || '01';
  const hour = normalized.substring(8, 10) || '00';
  const minute = normalized.substring(10, 12) || '00';

  return `${year}-${month}-${day}T${hour}:${minute}:00Z`;
}

