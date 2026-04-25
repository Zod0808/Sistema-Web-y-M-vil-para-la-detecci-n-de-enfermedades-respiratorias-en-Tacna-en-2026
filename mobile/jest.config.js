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
    'medical-app/store/useAppStore.ts',
    'medical-app/components/tabs/chatbot.tsx',
    'medical-app/components/tabs/symptom-analyzer.tsx',
    'medical-app/lib/**/*.ts',
    'medical-app/hooks/**/*.ts',
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html', 'json', 'cobertura'],
  coverageThreshold: {
    global: {
      statements: 70,
      branches: 70,
      functions: 70,
      lines: 70,
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