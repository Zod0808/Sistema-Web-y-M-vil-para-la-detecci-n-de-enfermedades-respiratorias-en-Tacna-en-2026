// Jest setup for medical-app (Next.js + Capacitor)
// No React Native dependencies

// @testing-library/jest-dom matchers (toBeInTheDocument, etc.)
require('@testing-library/jest-dom');

// Suprimir warnings de consola irrelevantes en tests
global.console = {
  ...console,
  warn: jest.fn(),
  error: jest.fn(),
};