/**
 * Jest test setup configuration for React frontend
 */

import '@testing-library/jest-dom';
import { configure } from '@testing-library/react';
import 'jest-extended';

// Configure testing library
configure({ testIdAttribute: 'data-testid' });

// Mock environment variables
process.env.REACT_APP_API_URL = 'http://localhost:3001/api';
process.env.REACT_APP_AI_SERVICES_URL = 'http://localhost:8000/api/v1';
process.env.REACT_APP_ENVIRONMENT = 'test';

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(), // deprecated
    removeListener: jest.fn(), // deprecated
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
});

// Mock scrollIntoView used in chat components
if (!window.HTMLElement.prototype.scrollIntoView) {
  window.HTMLElement.prototype.scrollIntoView = jest.fn();
}
if (!window.Element.prototype.scrollIntoView) {
  window.Element.prototype.scrollIntoView = jest.fn();
}

// Mock IntersectionObserver
global.IntersectionObserver = class IntersectionObserver {
  constructor() {}
  disconnect() {}
  observe() {}
  unobserve() {}
};

// Mock ResizeObserver
global.ResizeObserver = class ResizeObserver {
  constructor() {}
  disconnect() {}
  observe() {}
  unobserve() {}
};

// Mock fetch
global.fetch = jest.fn();

// Mock localStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};
global.localStorage = localStorageMock;

// Mock sessionStorage
const sessionStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};
global.sessionStorage = sessionStorageMock;

// Mock console methods in test environment
const originalConsole = console;
beforeAll(() => {
  global.console = {
    ...originalConsole,
    log: jest.fn(),
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  };
});

afterAll(() => {
  global.console = originalConsole;
});

// Clean up after each test
afterEach(() => {
  jest.clearAllMocks();
  localStorageMock.clear();
  sessionStorageMock.clear();
});

// Custom test utilities
export const testUtils = {
  // Mock API responses
  mockApiResponse: (data: any, status: number = 200) => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: status >= 200 && status < 300,
      status,
      json: async () => data,
      text: async () => JSON.stringify(data),
    });
  },

  // Mock API error
  mockApiError: (message: string, status: number = 500) => {
    (global.fetch as jest.Mock).mockRejectedValueOnce(new Error(message));
  },

  // Generate test user data
  generateTestUser: (overrides: any = {}) => ({
    id: 'test-user-id',
    email: 'test@example.com',
    firstName: 'Test',
    lastName: 'User',
    role: 'doctor',
    isEmailVerified: true,
    ...overrides
  }),

  // Generate test patient data
  generateTestPatient: (overrides: any = {}) => ({
    id: 'test-patient-id',
    name: 'Test Patient',
    age: 45,
    gender: 'M',
    email: 'patient@example.com',
    phone: '+1234567890',
    ...overrides
  }),

  // Generate test medical history data
  generateTestMedicalHistory: (overrides: any = {}) => ({
    id: 'test-history-id',
    patientId: 'test-patient-id',
    doctorId: 'test-doctor-id',
    patientName: 'Test Patient',
    age: 45,
    diagnosis: 'Test Diagnosis',
    symptoms: [
      { symptom: 'tos', severity: 'moderate', duration: '2 weeks' },
      { symptom: 'fiebre', severity: 'mild', duration: '3 days' }
    ],
    description: 'Test medical history description',
    date: new Date().toISOString(),
    ...overrides
  }),

  // Generate test symptom analysis data
  generateTestSymptomAnalysis: (overrides: any = {}) => ({
    id: 'test-analysis-id',
    patientId: 'test-patient-id',
    symptoms: [
      { symptom: 'tos', severity: 'moderate', duration: '2 weeks' }
    ],
    urgencyLevel: 'moderate',
    severityScore: 0.7,
    recommendations: ['Consulta médica', 'Reposo'],
    confidenceScore: 0.85,
    analyzedAt: new Date().toISOString(),
    ...overrides
  }),

  // Mock authentication
  mockAuth: (user: any = null) => {
    if (user) {
      localStorageMock.getItem.mockReturnValue(JSON.stringify(user));
      localStorageMock.setItem.mockImplementation((key, value) => {
        if (key === 'authToken') {
          // Mock token storage
        }
      });
    } else {
      localStorageMock.getItem.mockReturnValue(null);
    }
  },

  // Wait for async operations
  waitFor: (ms: number) => new Promise(resolve => setTimeout(resolve, ms)),

  // Create mock router
  createMockRouter: (initialRoute: string = '/') => ({
    push: jest.fn(),
    replace: jest.fn(),
    back: jest.fn(),
    forward: jest.fn(),
    refresh: jest.fn(),
    pathname: initialRoute,
    query: {},
    asPath: initialRoute,
  }),

  // Create mock store
  createMockStore: (initialState: any = {}) => ({
    getState: jest.fn(() => initialState),
    dispatch: jest.fn(),
    subscribe: jest.fn(),
  }),
};

// Export test utilities globally
global.testUtils = testUtils;
