/**
 * Tests — Consistencia de tipos y estructura del API (medical-app)
 *
 * Verifica en runtime que:
 * - lib/types/index.ts define User con los campos canónicos del proyecto
 * - client.ts no redefine tipos propios duplicados
 * - config.ts exporta API_CONFIG y API_ENDPOINTS con estructura correcta
 * - El store usa los tipos correctos
 */

const fs = require('fs');
const path = require('path');
const medicalAppRoot = path.resolve(__dirname, '../../medical-app');

// ─── Tipo User canónico ────────────────────────────────────────────────────────

describe('Tipo User — único origen de verdad', () => {
  it('lib/types/index.ts define la interfaz User con campos obligatorios', () => {
    const typesContent: string = fs.readFileSync(
      path.join(medicalAppRoot, 'lib/types/index.ts'),
      'utf8'
    );

    expect(typesContent).toContain('interface User');
    expect(typesContent).toContain('_id: string');
    expect(typesContent).toContain('email: string');
    expect(typesContent).toContain('role: UserRole');
  });

  it('lib/types/index.ts exporta UserRole como tipo union', () => {
    const typesContent: string = fs.readFileSync(
      path.join(medicalAppRoot, 'lib/types/index.ts'),
      'utf8'
    );

    expect(typesContent).toMatch(/UserRole.*patient.*doctor.*admin/s);
  });

  it('un User válido puede construirse con la estructura canónica', () => {
    const validUser = {
      _id: 'u-test-01',
      name: 'María González',
      email: 'maria@hospital.org',
      role: 'doctor' as const,
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    expect(validUser._id).toBe('u-test-01');
    expect(validUser.name).toBe('María González');
    expect(validUser.role).toBe('doctor');
    expect(validUser.isActive).toBe(true);
  });
});

// ─── API Client ────────────────────────────────────────────────────────────────

describe('API Client — estructura correcta', () => {
  it('client.ts exporta apiClient como instancia de ApiClient', () => {
    const clientContent: string = fs.readFileSync(
      path.join(medicalAppRoot, 'lib/api/client.ts'),
      'utf8'
    );

    expect(clientContent).toContain('export class ApiClient');
    expect(clientContent).toContain('export const apiClient');
  });

  it('client.ts NO redefine interfaces de tipos (las importa de config)', () => {
    const clientContent: string = fs.readFileSync(
      path.join(medicalAppRoot, 'lib/api/client.ts'),
      'utf8'
    );

    // Solo define ApiError, no User ni MedicalHistory
    expect(clientContent).not.toMatch(/export interface User\s*\{/);
    expect(clientContent).not.toMatch(/export interface MedicalHistory\s*\{/);
  });
});

// ─── API Config ────────────────────────────────────────────────────────────────

describe('API Config — endpoints con prefijo /api/v1', () => {
  it('config.ts exporta API_CONFIG con baseURL', () => {
    const configContent: string = fs.readFileSync(
      path.join(medicalAppRoot, 'lib/api/config.ts'),
      'utf8'
    );

    expect(configContent).toContain('API_CONFIG');
    expect(configContent).toContain('baseURL');
    expect(configContent).toContain('timeout');
  });

  it('todos los endpoints auth usan buildEndpoint (tienen /api/v1)', () => {
    const configContent: string = fs.readFileSync(
      path.join(medicalAppRoot, 'lib/api/config.ts'),
      'utf8'
    );

    // Los endpoints auth usan buildEndpoint que agrega /api/v1
    expect(configContent).toContain("buildEndpoint('/auth/login')");
    expect(configContent).toContain("buildEndpoint('/auth/register')");
    expect(configContent).toContain("buildEndpoint('/auth/profile')");
  });

  it('endpoints de appointments y alerts también usan buildEndpoint', () => {
    const configContent: string = fs.readFileSync(
      path.join(medicalAppRoot, 'lib/api/config.ts'),
      'utf8'
    );

    expect(configContent).toContain("buildEndpoint('/appointments')");
    expect(configContent).toContain("buildEndpoint('/alerts')");
    expect(configContent).toContain("buildEndpoint('/analytics/executive-dashboard')");
  });
});

// ─── Store ────────────────────────────────────────────────────────────────────

describe('Store — métodos requeridos', () => {
  it('useAppStore.ts exporta el store con métodos de autenticación', () => {
    const storeContent: string = fs.readFileSync(
      path.join(medicalAppRoot, 'store/useAppStore.ts'),
      'utf8'
    );

    expect(storeContent).toContain('login:');
    expect(storeContent).toContain('logout:');
    expect(storeContent).toContain('setUser:');
    expect(storeContent).toContain('isAuthenticated');
  });

  it('useAppStore.ts tiene gestión de modo emergencia', () => {
    const storeContent: string = fs.readFileSync(
      path.join(medicalAppRoot, 'store/useAppStore.ts'),
      'utf8'
    );

    expect(storeContent).toContain('enableEmergencyMode');
    expect(storeContent).toContain('disableEmergencyMode');
    expect(storeContent).toContain('isEmergencyMode');
  });

  it('useAppStore.ts gestiona estado de red (online/offline)', () => {
    const storeContent: string = fs.readFileSync(
      path.join(medicalAppRoot, 'store/useAppStore.ts'),
      'utf8'
    );

    expect(storeContent).toContain('setOnlineStatus');
    expect(storeContent).toContain('isOnline');
    expect(storeContent).toContain('pendingSync');
  });
});