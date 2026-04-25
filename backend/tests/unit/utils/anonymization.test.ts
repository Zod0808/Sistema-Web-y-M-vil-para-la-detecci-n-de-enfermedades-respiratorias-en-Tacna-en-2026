import { getSalt, pseudonymize, redactPII, anonymizeForAnalytics } from '../../../src/utils/anonymization';

describe('anonymization utils', () => {
  const originalEnv = process.env.ANONYMIZATION_SALT;

  beforeEach(() => {
    process.env.ANONYMIZATION_SALT = 'test-salt-secret-value-123';
  });

  afterEach(() => {
    if (originalEnv !== undefined) {
      process.env.ANONYMIZATION_SALT = originalEnv;
    } else {
      delete process.env.ANONYMIZATION_SALT;
    }
  });

  describe('getSalt', () => {
    it('retorna el valor de la variable de entorno ANONYMIZATION_SALT', () => {
      const salt = getSalt();
      expect(salt).toBe('test-salt-secret-value-123');
    });

    it('usa nombre de variable personalizado', () => {
      process.env.MY_CUSTOM_SALT = 'custom-salt-value';
      const salt = getSalt('MY_CUSTOM_SALT');
      expect(salt).toBe('custom-salt-value');
      delete process.env.MY_CUSTOM_SALT;
    });

    it('lanza error cuando la variable no está configurada', () => {
      delete process.env.ANONYMIZATION_SALT;
      expect(() => getSalt()).toThrow('ANONYMIZATION_SALT no configurada para anonimización');
    });

    it('lanza error con el nombre de variable correcto en el mensaje', () => {
      expect(() => getSalt('MISSING_SALT_VAR')).toThrow('MISSING_SALT_VAR no configurada');
    });
  });

  describe('pseudonymize', () => {
    it('retorna una cadena hex de 64 caracteres (SHA-256)', () => {
      const result = pseudonymize('patient-123');
      expect(result).toMatch(/^[a-f0-9]{64}$/);
    });

    it('es determinista: misma entrada → mismo resultado', () => {
      const r1 = pseudonymize('patient-123');
      const r2 = pseudonymize('patient-123');
      expect(r1).toBe(r2);
    });

    it('produce resultados diferentes para distintas entradas', () => {
      const r1 = pseudonymize('patient-1');
      const r2 = pseudonymize('patient-2');
      expect(r1).not.toBe(r2);
    });

    it('usa SHA-512 cuando se especifica', () => {
      const result = pseudonymize('patient-123', { hashAlgo: 'sha512' });
      expect(result).toMatch(/^[a-f0-9]{128}$/);
    });

    it('el resultado cambia si cambia el salt', () => {
      const r1 = pseudonymize('patient-123');
      process.env.ANONYMIZATION_SALT = 'different-salt-value';
      const r2 = pseudonymize('patient-123');
      expect(r1).not.toBe(r2);
    });
  });

  describe('redactPII', () => {
    it('redacta campos de primer nivel', () => {
      const obj = { name: 'Juan Pérez', age: 35, email: 'juan@test.com' };
      const result = redactPII(obj, ['name', 'email']);
      expect(result.name).toBe('REDACTED');
      expect(result.email).toBe('REDACTED');
      expect(result.age).toBe(35);
    });

    it('redacta campos anidados con notación de punto', () => {
      const obj = {
        patient: { name: 'Ana García', id: 'P-001' },
        diagnosis: 'Neumonía',
      };
      const result = redactPII(obj, ['patient.name']);
      expect(result.patient.name).toBe('REDACTED');
      expect(result.patient.id).toBe('P-001');
      expect(result.diagnosis).toBe('Neumonía');
    });

    it('no modifica el objeto original', () => {
      const obj = { name: 'Original', age: 30 };
      redactPII(obj, ['name']);
      expect(obj.name).toBe('Original');
    });

    it('ignora campos que no existen en el objeto', () => {
      const obj = { name: 'Test' };
      const result = redactPII(obj as any, ['nonexistent.field']);
      expect(result).toEqual({ name: 'Test' });
    });

    it('maneja objetos vacíos', () => {
      const result = redactPII({}, ['name']);
      expect(result).toEqual({});
    });

    it('no falla con rutas profundas cuando el padre es null', () => {
      const obj = { location: null as any };
      expect(() => redactPII(obj, ['location.address'])).not.toThrow();
    });
  });

  describe('anonymizeForAnalytics', () => {
    it('hashea patientId, doctorId y userId', () => {
      const obj = {
        patientId: 'patient-001',
        doctorId: 'doctor-001',
        userId: 'user-001',
        diagnosis: 'Asma',
      };
      const result = anonymizeForAnalytics(obj);
      expect(result.patientId).not.toBe('patient-001');
      expect(result.doctorId).not.toBe('doctor-001');
      expect(result.userId).not.toBe('user-001');
      expect(result.patientId).toMatch(/^[a-f0-9]{64}$/);
    });

    it('redacta patientName', () => {
      const obj = { patientName: 'Juan Pérez', patientId: 'P-1' };
      const result = anonymizeForAnalytics(obj);
      expect(result.patientName).toBe('REDACTED');
    });

    it('redacta email', () => {
      const obj = { email: 'juan@example.com', userId: 'u-1' };
      const result = anonymizeForAnalytics(obj);
      expect(result.email).toBe('REDACTED');
    });

    it('no modifica campos no sensibles', () => {
      const obj = { diagnosis: 'Neumonía', severity: 'high', patientId: 'p-1' };
      const result = anonymizeForAnalytics(obj);
      expect(result.diagnosis).toBe('Neumonía');
      expect(result.severity).toBe('high');
    });

    it('es determinista para los hashes', () => {
      const obj = { patientId: 'patient-xyz' };
      const r1 = anonymizeForAnalytics(obj);
      const r2 = anonymizeForAnalytics(obj);
      expect(r1.patientId).toBe(r2.patientId);
    });
  });
});