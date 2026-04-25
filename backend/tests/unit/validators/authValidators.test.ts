/**
 * Unit tests for authValidators (Joi schemas)
 */

import {
  registerSchema,
  loginSchema,
  refreshTokenSchema,
  updateProfileSchema,
  changePasswordSchema,
} from '../../../src/validators/authValidators';

// Helper: run Joi validation and return error messages
const validate = (schema: any, data: any) => schema.validate(data, { abortEarly: false });

describe('authValidators', () => {

  // ─── registerSchema ──────────────────────────────────────────────────────

  describe('registerSchema', () => {
    const valid = {
      name: 'María García',
      email: 'maria@example.com',
      password: 'Password1!',
      role: 'patient',
    };

    it('acepta datos válidos completos', () => {
      const { error } = validate(registerSchema, valid);
      expect(error).toBeUndefined();
    });

    it('role por defecto es patient cuando no se proporciona', () => {
      const { value, error } = validate(registerSchema, { name: valid.name, email: valid.email, password: valid.password });
      expect(error).toBeUndefined();
      expect(value.role).toBe('patient');
    });

    it('falla sin name', () => {
      const { error } = validate(registerSchema, { ...valid, name: undefined });
      expect(error).toBeDefined();
      expect(error!.details.some(d => d.message.includes('nombre'))).toBe(true);
    });

    it('falla con name menor a 2 caracteres', () => {
      const { error } = validate(registerSchema, { ...valid, name: 'A' });
      expect(error).toBeDefined();
      expect(error!.details.some(d => d.message.includes('2 caracteres'))).toBe(true);
    });

    it('falla con name mayor a 100 caracteres', () => {
      const { error } = validate(registerSchema, { ...valid, name: 'A'.repeat(101) });
      expect(error).toBeDefined();
      expect(error!.details.some(d => d.message.includes('100 caracteres'))).toBe(true);
    });

    it('falla sin email', () => {
      const { error } = validate(registerSchema, { ...valid, email: undefined });
      expect(error).toBeDefined();
    });

    it('falla con email inválido', () => {
      const { error } = validate(registerSchema, { ...valid, email: 'not-an-email' });
      expect(error).toBeDefined();
      expect(error!.details.some(d => d.message.includes('email válido'))).toBe(true);
    });

    it('falla sin password', () => {
      const { error } = validate(registerSchema, { ...valid, password: undefined });
      expect(error).toBeDefined();
    });

    it('falla con password menor a 8 caracteres', () => {
      const { error } = validate(registerSchema, { ...valid, password: 'Ab1!' });
      expect(error).toBeDefined();
      expect(error!.details.some(d => d.message.includes('8 caracteres'))).toBe(true);
    });

    it('falla con password sin letra mayúscula', () => {
      const { error } = validate(registerSchema, { ...valid, password: 'password1!' });
      expect(error).toBeDefined();
      expect(error!.details.some(d => d.message.includes('minúscula'))).toBe(true);
    });

    it('falla con password sin número', () => {
      const { error } = validate(registerSchema, { ...valid, password: 'Password!' });
      expect(error).toBeDefined();
    });

    it('falla con password sin carácter especial', () => {
      const { error } = validate(registerSchema, { ...valid, password: 'Password1' });
      expect(error).toBeDefined();
    });

    it('acepta password con todos los requisitos', () => {
      const { error } = validate(registerSchema, { ...valid, password: 'MySecure1@' });
      expect(error).toBeUndefined();
    });

    it('acepta role doctor', () => {
      const { error } = validate(registerSchema, { ...valid, role: 'doctor' });
      expect(error).toBeUndefined();
    });

    it('acepta role admin', () => {
      const { error } = validate(registerSchema, { ...valid, role: 'admin' });
      expect(error).toBeUndefined();
    });

    it('falla con role inválido', () => {
      const { error } = validate(registerSchema, { ...valid, role: 'superadmin' });
      expect(error).toBeDefined();
      expect(error!.details.some(d => d.message.includes('patient, doctor o admin'))).toBe(true);
    });
  });

  // ─── loginSchema ─────────────────────────────────────────────────────────

  describe('loginSchema', () => {
    const valid = { email: 'user@test.com', password: 'secret' };

    it('acepta credenciales válidas', () => {
      const { error } = validate(loginSchema, valid);
      expect(error).toBeUndefined();
    });

    it('falla sin email', () => {
      const { error } = validate(loginSchema, { ...valid, email: undefined });
      expect(error).toBeDefined();
    });

    it('falla con email inválido', () => {
      const { error } = validate(loginSchema, { ...valid, email: 'bad-email' });
      expect(error).toBeDefined();
    });

    it('falla sin password', () => {
      const { error } = validate(loginSchema, { ...valid, password: undefined });
      expect(error).toBeDefined();
    });

    it('acepta cualquier string como password (sin restricciones en login)', () => {
      const { error } = validate(loginSchema, { ...valid, password: 'abc' });
      expect(error).toBeUndefined();
    });
  });

  // ─── refreshTokenSchema ──────────────────────────────────────────────────

  describe('refreshTokenSchema', () => {
    it('acepta refreshToken válido', () => {
      const { error } = validate(refreshTokenSchema, { refreshToken: 'valid.jwt.token' });
      expect(error).toBeUndefined();
    });

    it('falla sin refreshToken', () => {
      const { error } = validate(refreshTokenSchema, {});
      expect(error).toBeDefined();
      expect(error!.details.some(d => d.message.includes('refresh token'))).toBe(true);
    });

    it('falla con refreshToken vacío', () => {
      const { error } = validate(refreshTokenSchema, { refreshToken: '' });
      expect(error).toBeDefined();
    });
  });

  // ─── updateProfileSchema ─────────────────────────────────────────────────

  describe('updateProfileSchema', () => {
    it('acepta objeto vacío (todos opcionales)', () => {
      const { error } = validate(updateProfileSchema, {});
      expect(error).toBeUndefined();
    });

    it('acepta name válido', () => {
      const { error } = validate(updateProfileSchema, { name: 'Nuevo Nombre' });
      expect(error).toBeUndefined();
    });

    it('falla con name menor a 2 caracteres', () => {
      const { error } = validate(updateProfileSchema, { name: 'X' });
      expect(error).toBeDefined();
    });

    it('falla con name mayor a 100 caracteres', () => {
      const { error } = validate(updateProfileSchema, { name: 'N'.repeat(101) });
      expect(error).toBeDefined();
    });

    it('acepta avatar como URL válida', () => {
      const { error } = validate(updateProfileSchema, { avatar: 'https://example.com/avatar.png' });
      expect(error).toBeUndefined();
    });

    it('falla con avatar que no es URL', () => {
      const { error } = validate(updateProfileSchema, { avatar: 'not-a-url' });
      expect(error).toBeDefined();
      expect(error!.details.some(d => d.message.includes('URL válida'))).toBe(true);
    });

    it('acepta name y avatar juntos', () => {
      const { error } = validate(updateProfileSchema, {
        name: 'Juan López',
        avatar: 'https://cdn.example.com/photo.jpg',
      });
      expect(error).toBeUndefined();
    });
  });

  // ─── changePasswordSchema ────────────────────────────────────────────────

  describe('changePasswordSchema', () => {
    const valid = {
      currentPassword: 'OldPass1!',
      newPassword: 'NewPass2@',
    };

    it('acepta contraseñas válidas', () => {
      const { error } = validate(changePasswordSchema, valid);
      expect(error).toBeUndefined();
    });

    it('falla sin currentPassword', () => {
      const { error } = validate(changePasswordSchema, { ...valid, currentPassword: undefined });
      expect(error).toBeDefined();
      expect(error!.details.some(d => d.message.includes('actual'))).toBe(true);
    });

    it('falla sin newPassword', () => {
      const { error } = validate(changePasswordSchema, { ...valid, newPassword: undefined });
      expect(error).toBeDefined();
    });

    it('falla con newPassword menor a 8 caracteres', () => {
      const { error } = validate(changePasswordSchema, { ...valid, newPassword: 'Ab1!' });
      expect(error).toBeDefined();
      expect(error!.details.some(d => d.message.includes('8 caracteres'))).toBe(true);
    });

    it('falla con newPassword sin patrón de seguridad', () => {
      const { error } = validate(changePasswordSchema, { ...valid, newPassword: 'alllowercase1!' });
      expect(error).toBeDefined();
    });

    it('falla con newPassword sin carácter especial', () => {
      const { error } = validate(changePasswordSchema, { ...valid, newPassword: 'Password1' });
      expect(error).toBeDefined();
    });
  });
});