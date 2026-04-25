import { parseStringPromise } from 'xml2js';
import {
  parseHl7Message,
  mapHl7ToFhirObservation,
  parseHl7Xml,
  formatHl7DateTime,
} from '../../../src/utils/hl7Parser';

jest.mock('xml2js', () => ({
  parseStringPromise: jest.fn(),
}));

const mockedParseStringPromise = parseStringPromise as jest.MockedFunction<typeof parseStringPromise>;

describe('HL7 Parser utilities', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('mantiene el valor original cuando no hay fecha disponible', () => {
    expect(formatHl7DateTime('')).toBe('');
    expect(formatHl7DateTime(null as unknown as string)).toBeNull();
  });

  it('analiza un mensaje HL7 v2 en segmentos estructurados', () => {
    const hl7Message = [
      'MSH|^~\\&|HIS|RIH|EKG|EKG|202501011230||ADT^A01|MSG00001|P|2.5',
      'PID|1||PATIENT-99||DOE^JOHN',
      'OBR|1|12345|67890|LIPID^Lipid Panel',
    ].join('\r');

    const result = parseHl7Message(hl7Message);

    expect(result.header?.name).toBe('MSH');
    expect(result.segments).toHaveLength(3);
    expect(result.segments[1]).toEqual({
      name: 'PID',
      fields: ['1', '', 'PATIENT-99', '', 'DOE^JOHN'],
    });
  });

  it('convierte un mensaje ORU^R01 a un recurso Observation compatible con FHIR', () => {
    const hl7Message = [
      'MSH|^~\\&|LAB|TACNA||HOSPITAL|202511101400||ORU^R01|MSG123|P|2.5.1',
      'PID|1||PATIENT-123||DOE^JANE',
      'OBR|1|ORD-1|PLASMA|GLU^Glucosa|test|20251110135500',
      'OBX|1|ST|GLU||95|mg/dL',
    ].join('\n');

    const observation = mapHl7ToFhirObservation(hl7Message);

    expect(observation).not.toBeNull();
    expect(observation).toEqual(
      expect.objectContaining({
        resourceType: 'Observation',
        status: 'final',
        code: { text: 'GLU' },
        valueString: '95',
        effectiveDateTime: '2025-11-10T13:55:00Z',
        subject: { reference: 'Patient/PATIENT-123' },
      }),
    );
  });

  it('interpreta fechas ubicadas en el campo OBR-7 cuando OBR-6 está vacío', () => {
    const hl7Message = [
      'MSH|^~\\&|LAB|TACNA||HOSPITAL|202511101400||ORU^R01|MSG456|P|2.5.1',
      'PID|1||PATIENT-456||DOE^JOHN',
      'OBR|1|ORD-77|PLASMA|GLU^Glucosa||202402151045',
      'OBX|1|ST|GLU||102|mg/dL',
    ].join('\n');

    const observation = mapHl7ToFhirObservation(hl7Message);

    expect(observation?.effectiveDateTime).toBe('2024-02-15T10:45:00Z');
  });

  it('omite el sujeto cuando falta el segmento PID y conserva fechas no normalizables', () => {
    const hl7Message = [
      'MSH|^~\\&|LAB|TACNA||HOSPITAL|202511101400||ORU^R01|MSG123|P|2.5.1',
      'OBR|1|ORD-1|PLASMA|GLU^Glucosa|2025',
      'OBX|1|ST|GLU||98|mg/dL',
    ].join('\n');

    const observation = mapHl7ToFhirObservation(hl7Message);

    expect(observation).not.toBeNull();
    expect(observation?.subject).toBeUndefined();
    expect(observation).toEqual(
      expect.objectContaining({
        effectiveDateTime: '2025',
      }),
    );
  });

  it('retorna null cuando faltan segmentos esenciales', () => {
    const incompleteMessage = [
      'MSH|^~\\&|LAB|TACNA||HOSPITAL|202511101400||ORU^R01|MSG123|P|2.5.1',
      'PID|1||PATIENT-123||DOE^JANE',
    ].join('\n');

    const observation = mapHl7ToFhirObservation(incompleteMessage);

    expect(observation).toBeNull();
  });

  it('parsea mensajes HL7 v3 en XML utilizando xml2js', async () => {
    const xmlMessage = '<ClinicalDocument><id root="123"/></ClinicalDocument>';
    const parsedObject = { ClinicalDocument: { id: { $: { root: '123' } } } };
    mockedParseStringPromise.mockResolvedValue(parsedObject);

    const result = await parseHl7Xml(xmlMessage);

    expect(mockedParseStringPromise).toHaveBeenCalledWith(xmlMessage, { explicitArray: false });
    expect(result).toEqual(parsedObject);
  });
});

