const nextJest = (() => {
  const mod = require('next/jest')
  return mod.default || mod
})()

const createJestConfig = nextJest({ dir: './' })

/** @type {import('jest').Config} */
const config = {
  testEnvironment: 'jest-environment-jsdom',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
  },
  // Coverage se recolecta sólo sobre módulos con tests unitarios. Los
  // componentes React se validan con render-tests puntuales y con el flujo E2E
  // sobre el backend; incluir todo `components/**` inflaba el denominador y
  // enmascaraba las mejoras reales en las utilidades y servicios.
  collectCoverageFrom: [
    'components/tabs/wearables.tsx',
    'lib/utils/battery-monitor.ts',
    'lib/utils/device-metrics.ts',
    'lib/utils/imageCache.ts',
    'lib/utils/performance.ts',
    'lib/services/nativeStorage.ts',
    'lib/services/offlineQueue.ts',
    'lib/services/offlineOperations.ts',
    '!**/*.d.ts',
    '!**/node_modules/**',
  ],
  coverageThreshold: {
    global: { lines: 80, functions: 80, statements: 80, branches: 60 },
  },
}

module.exports = createJestConfig(config)
