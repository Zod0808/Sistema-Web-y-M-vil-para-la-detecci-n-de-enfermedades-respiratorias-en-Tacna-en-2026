import crypto from 'crypto';
import { Schema } from 'mongoose';

const ALGO = 'aes-256-gcm';
const IV_LENGTH = 12; // GCM recommended
const AUTH_TAG_LENGTH = 16;

export function getEncryptionKey(): Buffer {
  const keyBase64 = process.env.FIELD_ENCRYPTION_KEY || '';
  if (!keyBase64) {
    throw new Error('FIELD_ENCRYPTION_KEY no está configurada');
  }
  const key = Buffer.from(keyBase64, 'base64');
  if (key.length !== 32) {
    throw new Error('FIELD_ENCRYPTION_KEY debe ser 32 bytes en base64 (AES-256)');
  }
  return key;
}

export function encryptString(plaintext: string, key: Buffer): string {
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGO, key, iv, { authTagLength: AUTH_TAG_LENGTH });
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return Buffer.concat([iv, authTag, encrypted]).toString('base64');
}

export function decryptString(ciphertextB64: string, key: Buffer): string {
  const raw = Buffer.from(ciphertextB64, 'base64');
  const iv = raw.subarray(0, IV_LENGTH);
  const authTag = raw.subarray(IV_LENGTH, IV_LENGTH + AUTH_TAG_LENGTH);
  const data = raw.subarray(IV_LENGTH + AUTH_TAG_LENGTH);
  const decipher = crypto.createDecipheriv(ALGO, key, iv, { authTagLength: AUTH_TAG_LENGTH });
  decipher.setAuthTag(authTag);
  const decrypted = Buffer.concat([decipher.update(data), decipher.final()]);
  return decrypted.toString('utf8');
}

export function applyFieldEncryption(schema: Schema, fields: string[]) {
  const keyGetter = () => getEncryptionKey();

  function encryptDoc(this: any) {
    const key = keyGetter();
    for (const field of fields) {
      const value = this.get(field);
      if (value && typeof value === 'string' && !value.startsWith('enc:')) {
        const enc = encryptString(value, key);
        this.set(field, `enc:${enc}`);
      }
    }
  }

  function decryptDoc(doc: any) {
    if (!doc) return;
    const key = keyGetter();
    for (const field of fields) {
      const value = doc.get ? doc.get(field) : doc[field];
      if (value && typeof value === 'string' && value.startsWith('enc:')) {
        const raw = value.slice(4);
        const dec = decryptString(raw, key);
        if (doc.set) doc.set(field, dec);
        else doc[field] = dec;
      }
    }
  }

  schema.pre('save', function (next) {
    encryptDoc.call(this);
    next();
  });

  schema.pre('findOneAndUpdate', function (next) {
    const update: any = this.getUpdate() || {};
    const $set = update.$set || update;
    if ($set) {
      const key = keyGetter();
      for (const field of fields) {
        const value = $set[field];
        if (value && typeof value === 'string' && !String(value).startsWith('enc:')) {
          $set[field] = `enc:${encryptString(value, key)}`;
        }
      }
      if (update.$set) update.$set = $set;
    }
    next();
  });

  schema.post('find', function (docs: any[]) {
    for (const doc of docs) decryptDoc(doc);
  });
  schema.post('findOne', function (doc: any) {
    decryptDoc(doc);
  });
  schema.post('save', function (doc: any) {
    decryptDoc(doc);
  });
}


