/**
 * Tests de integración - Flujo completo de autenticación (medical-app)
 * Cubre: login exitoso/fallido, persistencia de sesión, logout, setUser, online status
 */

import { authService } from '../../medical-app/lib/api/services/authService';
import { useAppStore } from '../../medical-app/store/useAppStore';

// ── Mocks ──────────────────────────────────────────────────────────────────
jest.mock('../../medical-app/lib/api/services/authService');
jest.mock('../../medical-app/lib/api/config', () => ({
  API_CONFIG: {
    baseURL: 'http://localhost:3001',
    aiServiceURL: 'http://localhost:8000',
    timeout: 30000,
    retries: 3,
    chatBaseURL: 'http://localhost:3001',
  },
  API_ENDPOINTS: {
    auth: {
      login: '/api/v1/auth/login',
      register: '/api/v1/auth/register',
      refreshToken: '/api/v1/auth/refresh-token',
      logout: '/api/v1/auth/logout',
      profile: '/api/v1/auth/profile',
      changePassword: '/api/v1/auth/change-password',
    },
  },
  getUser: jest.fn().mockReturnValue(null),
  setUser: jest.fn(),
  clearAuthTokens: jest.fn(),
  getAuthToken: jest.fn().mockReturnValue(null),
  getRefreshToken: jest.fn().mockReturnValue(null),
  setAuthTokens: jest.fn(),
}));

const mockUser = {
  id: 'user-1',
  _id: 'user-1',
  email: 'test@example.com',
  firstName: 'Test',
  lastName: 'User',
  role: 'patient' as const,
  isEmailVerified: true,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

const resetStore = () => {
  useAppStore.setState({
    user: null,
    isAuthenticated: false,
    isLoading: false,
    medicalHistories: [],
    appointments: [],
    alerts: [],
    dashboardStats: null,
    isOnline: true,
    pendingSync: false,
    isEmergencyMode: false,
  } as any);
};

describe('Auth Flow Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    resetStore();
  });

  // ────────────────────────────────────────────────────────────────────────
  describe('Login Flow', () => {
    it('guarda usuario en store tras login exitoso', async () => {
      (authService.login as jest.Mock).mockResolvedValue({
        token: 'access-token-123',
        refreshToken: 'refresh-token-123',
        user: mockUser,
      });

      await useAppStore.getState().login(mockUser.email, 'Password123!');

      const state = useAppStore.getState();
      expect(state.user).not.toBeNull();
      expect(state.user?.email).toBe(mockUser.email);
      expect(state.isAuthenticated).toBe(true);
      expect(state.isLoading).toBe(false);
    });

    it('lanza error y NO modifica store tras login fallido', async () => {
      (authService.login as jest.Mock).mockRejectedValue(
        new Error('Credenciales inválidas')
      );

      await expect(
        useAppStore.getState().login('wrong@example.com', 'bad-password')
      ).rejects.toThrow('Credenciales inválidas');

      const state = useAppStore.getState();
      expect(state.user).toBeNull();
      expect(state.isAuthenticated).toBe(false);
      expect(state.isLoading).toBe(false);
    });

    it('isLoading vuelve a false aunque el login lance error', async () => {
      (authService.login as jest.Mock).mockRejectedValue(new Error('Network error'));

      await expect(useAppStore.getState().login('a@b.com', 'x')).rejects.toThrow();
      expect(useAppStore.getState().isLoading).toBe(false);
    });

    it('login error con status 401 no autentica al usuario', async () => {
      const err = Object.assign(new Error('Unauthorized'), { status: 401 });
      (authService.login as jest.Mock).mockRejectedValue(err);

      await expect(useAppStore.getState().login('test@example.com', 'wrong')).rejects.toThrow();
      expect(useAppStore.getState().isAuthenticated).toBe(false);
    });
  });

  // ────────────────────────────────────────────────────────────────────────
  describe('setUser directo', () => {
    it('setUser actualiza usuario e isAuthenticated a true', () => {
      useAppStore.getState().setUser(mockUser as any);

      const state = useAppStore.getState();
      expect(state.user?.email).toBe(mockUser.email);
      expect(state.isAuthenticated).toBe(true);
    });

    it('setUser(null) limpia usuario e isAuthenticated', () => {
      useAppStore.getState().setUser(mockUser as any);
      useAppStore.getState().setUser(null);

      const state = useAppStore.getState();
      expect(state.user).toBeNull();
      expect(state.isAuthenticated).toBe(false);
    });
  });

  // ────────────────────────────────────────────────────────────────────────
  describe('Logout Flow', () => {
    it('limpia usuario, historial, alertas y citas tras logout', async () => {
      (authService.logout as jest.Mock).mockResolvedValue(undefined);

      useAppStore.setState({
        user: mockUser as any,
        isAuthenticated: true,
        alerts: [{ _id: 'a1' }] as any,
        appointments: [{ _id: 'ap1' }] as any,
        medicalHistories: [{ _id: 'mh1' }] as any,
      } as any);

      await useAppStore.getState().logout();

      const state = useAppStore.getState();
      expect(state.user).toBeNull();
      expect(state.isAuthenticated).toBe(false);
      expect(state.alerts).toHaveLength(0);
      expect(state.appointments).toHaveLength(0);
      expect(state.medicalHistories).toHaveLength(0);
    });

    it('logout completa aunque authService.logout lance error', async () => {
      (authService.logout as jest.Mock).mockRejectedValue(new Error('Network'));

      useAppStore.setState({ user: mockUser as any, isAuthenticated: true } as any);

      await useAppStore.getState().logout(); // no debe lanzar

      expect(useAppStore.getState().user).toBeNull();
      expect(useAppStore.getState().isAuthenticated).toBe(false);
    });
  });

  // ────────────────────────────────────────────────────────────────────────
  describe('Emergency Mode', () => {
    it('enableEmergencyMode desautentica y borra usuario', () => {
      useAppStore.setState({ user: mockUser as any, isAuthenticated: true } as any);

      useAppStore.getState().enableEmergencyMode();

      const state = useAppStore.getState();
      expect(state.isEmergencyMode).toBe(true);
      expect(state.isAuthenticated).toBe(false);
      expect(state.user).toBeNull();
    });

    it('disableEmergencyMode apaga el modo emergencia', () => {
      useAppStore.getState().enableEmergencyMode();
      useAppStore.getState().disableEmergencyMode();

      expect(useAppStore.getState().isEmergencyMode).toBe(false);
    });
  });

  // ────────────────────────────────────────────────────────────────────────
  describe('Online Status', () => {
    it('setOnlineStatus actualiza isOnline', () => {
      useAppStore.getState().setOnlineStatus(false);
      expect(useAppStore.getState().isOnline).toBe(false);

      useAppStore.getState().setOnlineStatus(true);
      expect(useAppStore.getState().isOnline).toBe(true);
    });

    it('setPendingSync actualiza pendingSync', () => {
      useAppStore.getState().setPendingSync(true);
      expect(useAppStore.getState().pendingSync).toBe(true);

      useAppStore.getState().setPendingSync(false);
      expect(useAppStore.getState().pendingSync).toBe(false);
    });
  });

  // ────────────────────────────────────────────────────────────────────────
  describe('clearStore', () => {
    it('clearStore resetea todo el estado', () => {
      useAppStore.setState({
        user: mockUser as any,
        isAuthenticated: true,
        alerts: [{ _id: 'a1' }] as any,
      } as any);

      useAppStore.getState().clearStore();

      const state = useAppStore.getState();
      expect(state.user).toBeNull();
      expect(state.isAuthenticated).toBe(false);
      expect(state.alerts).toHaveLength(0);
    });
  });
});