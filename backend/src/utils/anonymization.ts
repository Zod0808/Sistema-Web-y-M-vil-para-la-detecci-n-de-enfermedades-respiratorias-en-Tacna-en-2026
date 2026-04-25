import crypto from 'crypto';

export type AnonymizationOptions = {
  saltEnvVar?: string;
  hashAlgo?: 'sha256' | 'sha512';
};

export function getSalt(saltEnvVar?: string): string {
  const name = saltEnvVar || 'ANONYMIZATION_SALT';
  const value = process.env[name] || '';
  if (!value) {
    throw new Error(`${name} no configurada para anonimización`);
  }
  return value;
}

export function pseudonymize(value: string, opts?: AnonymizationOptions): string {
  const salt = getSalt(opts?.saltEnvVar);
  const algo = opts?.hashAlgo || 'sha256';
  return crypto.createHmac(algo, salt).update(value).digest('hex');
}

export function redactPII<T extends Record<string, unknown>>(obj: T, fields: string[]): T {
  const clone = JSON.parse(JSON.stringify(obj || {}));
  for (const path of fields) {
    const parts = path.split('.');
    let ref: any = clone;
    for (let i = 0; i < parts.length - 1; i++) {
      if (ref[parts[i]] == null) {
        ref = null;
        break;
      }
      ref = ref[parts[i]];
    }
    if (ref && typeof ref === 'object') {
      const leaf = parts[parts.length - 1];
      if (leaf in ref) {
        ref[leaf] = 'REDACTED';
      }
    }
  }
  return clone;
}

export function anonymizeForAnalytics<T extends Record<string, unknown>>(obj: T): T {
  // E.g., hash IDs, redact names/emails
  const out: any = { ...obj };
  if (typeof out.patientId === 'string') out.patientId = pseudonymize(out.patientId);
  if (typeof out.doctorId === 'string') out.doctorId = pseudonymize(out.doctorId);
  if (typeof out.userId === 'string') out.userId = pseudonymize(out.userId);
  return redactPII(out, ['patientName', 'location.address', 'email', 'name']);
}


