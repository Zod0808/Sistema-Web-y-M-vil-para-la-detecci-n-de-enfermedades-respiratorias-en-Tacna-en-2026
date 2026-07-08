module.exports = {
  testEnvironment: 'jsdom',
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'],
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  testMatch: [
    '**/__tests__/**/*.(test|spec).(ts|tsx|js)',
  ],
  transform: {
    '^.+\\.(ts|tsx)$': ['ts-jest', {
      tsconfig: '<rootDir>/tsconfig.test.json',
      diagnostics: false,
    }],
  },
  transformIgnorePatterns: [
    'node_modules/(?!(next)/)',
  ],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/medical-app/$1',
    // Forzar una sola instancia de React para evitar conflicto entre node_modules y medical-app/node_modules
    '^react$': '<rootDir>/medical-app/node_modules/react',
    '^react-dom$': '<rootDir>/medical-app/node_modules/react-dom',
    '^react-dom/client$': '<rootDir>/medical-app/node_modules/react-dom/client',
    '\\.(css|less|scss|sass)$': '<rootDir>/__mocks__/styleMock.js',
    '\\.(jpg|jpeg|png|gif|svg|webp)$': '<rootDir>/__mocks__/fileMock.js',
  },
  moduleDirectories: ['node_modules', 'medical-app/node_modules'],
  modulePathIgnorePatterns: [
    '<rootDir>/medical-app/.next/',
  ],
  collectCoverageFrom: [
    'medical-app/components/**/*.{ts,tsx}',
    'medical-app/store/**/*.{ts,tsx}',
    'medical-app/hooks/**/*.{ts,tsx}',
    'medical-app/app/**/*.{ts,tsx}',
    'medical-app/lib/**/*.{ts,tsx}',
    'medical-app/services/**/*.{ts,tsx}',
    'medical-app/utils/**/*.{ts,tsx}',
    '!medical-app/**/*.d.ts',
    '!medical-app/**/index.{ts,tsx}',
    '!medical-app/**/*.stories.{ts,tsx}',
    '!medical-app/**/*.config.{ts,tsx,js}',
    '!medical-app/.next/**',
    '!medical-app/node_modules/**',
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html', 'json', 'cobertura'],
  coverageThreshold: {
    global: {
      statements: 40,
      branches: 20,
      functions: 30,
      lines: 40,
    },
  },
  reporters: [
    'default',
    [
      'jest-junit',
      {
        outputDirectory: 'coverage',
        outputName: 'junit.xml',
        suiteName: 'Mobile Tests (medical-app)',
        classNameTemplate: '{classname}',
        titleTemplate: '{title}',
        ancestorSeparator: ' › ',
        usePathForSuiteName: 'true',
      },
    ],
  ],
};