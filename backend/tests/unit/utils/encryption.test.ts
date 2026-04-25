import { getEncryptionKey, encryptString, decryptString } from '../../../src/utils/encryption';

// Clave AES-256: 32 bytes en base64
const VALID_KEY_BASE64 = Buffer.alloc(32).fill(0x41).toString('base64'); // 32 'A' bytes

describe('encryption utils', () => {
  const originalEnv = process.env.FIELD_ENCRYPTION_KEY;

  afterEach(() => {
    if (originalEnv !== undefined) {
      process.env.FIELD_ENCRYPTION_KEY = originalEnv;
    } else {
      delete process.env.FIELD_ENCRYPTION_KEY;
    }
  });

  describe('getEncryptionKey', () => {
    it('retorna Buffer de 32 bytes con clave válida', () => {
      process.env.FIELD_ENCRYPTION_KEY = VALID_KEY_BASE64;
      const key = getEncryptionKey();
      expect(key).toBeInstanceOf(Buffer);
      expect(key.length).toBe(32);
    });

    it('lanza error cuando FIELD_ENCRYPTION_KEY no está configurada', () => {
      delete process.env.FIELD_ENCRYPTION_KEY;
      expect(() => getEncryptionKey()).toThrow('FIELD_ENCRYPTION_KEY no está configurada');
    });

    it('lanza error cuando la clave no tiene 32 bytes', () => {
      // 16 bytes en base64
      const shortKey = Buffer.alloc(16).fill(0x41).toString('base64');
      process.env.FIELD_ENCRYPTION_KEY = shortKey;
      expect(() => getEncryptionKey()).toThrow('32 bytes');
    });
  });

  describe('encryptString / decryptString', () => {
    let key: Buffer;

    beforeEach(() => {
      process.env.FIELD_ENCRYPTION_KEY = VALID_KEY_BASE64;
      key = getEncryptionKey();
    });

    it('encripta y desencripta correctamente', () => {
      const plaintext = 'Datos médicos confidenciales';
      const ciphertext = encryptString(plaintext, key);
      const decrypted = decryptString(ciphertext, key);
      expect(decrypted).toBe(plaintext);
    });

    it('produce ciphertext diferente para el mismo texto (IV aleatorio)', () => {
      const plaintext = 'mismo texto';
      const enc1 = encryptString(plaintext, key);
      const enc2 = encryptString(plaintext, key);
      expect(enc1).not.toBe(enc2);
    });

    it('el ciphertext es una cadena base64 válida', () => {
      const ciphertext = encryptString('test', key);
      expect(() => Buffer.from(ciphertext, 'base64')).not.toThrow();
    });

    it('encripta cadenas vacías correctamente', () => {
      const ciphertext = encryptString('', key);
      const decrypted = decryptString(ciphertext, key);
      expect(decrypted).toBe('');
    });

    it('encripta cadenas largas correctamente', () => {
      const plaintext = 'A'.repeat(10000);
      const ciphertext = encryptString(plaintext, key);
      const decrypted = decryptString(ciphertext, key);
      expect(decrypted).toBe(plaintext);
    });

    it('encripta caracteres Unicode y acentos', () => {
      const plaintext = 'Diagnóstico: Neumonía bacteriana. Paciente: María García. Dirección: Av. Tacna #123';
      const ciphertext = encryptString(plaintext, key);
      const decrypted = decryptString(ciphertext, key);
      expect(decrypted).toBe(plaintext);
    });

    it('lanza error al desencriptar con clave diferente', () => {
      const ciphertext = encryptString('texto secreto', key);
      const wrongKey = Buffer.alloc(32).fill(0x42); // clave distinta
      expect(() => decryptString(ciphertext, wrongKey)).toThrow();
    });

    it('lanza error al desencriptar datos corruptos', () => {
      expect(() => decryptString('datos_corruptos_no_base64_valido==', key)).toThrow();
    });
  });
});