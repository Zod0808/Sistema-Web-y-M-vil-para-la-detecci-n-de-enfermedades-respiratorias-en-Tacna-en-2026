/**
 * Stryker Mutation Testing Configuration
 * 
 * Stryker mutates your code and runs your tests to verify that your tests
 * are good enough to catch bugs. A high mutation score means your tests
 * are effective at catching bugs.
 * 
 * Documentation: https://stryker-mutator.io/docs/stryker-js/getting-started
 */

module.exports = {
  // Package manager
  packageManager: 'npm',
  
  // Project root
  projectRoot: '.',
  
  // Test runner
  testRunner: 'jest',
  testRunnerNodeOptions: ['--max-old-space-size=4096'],
  
  // Coverage analysis
  coverageAnalysis: 'perTest',
  
  // Mutator configuration
  mutator: {
    excludedMutations: [
      // Exclude string mutations (often false positives)
      'StringLiteral',
      'TemplateLiteral',
      // Exclude boolean mutations (often false positives)
      'BooleanLiteral',
      // Exclude object literal mutations (often false positives)
      'ObjectLiteral',
      // Exclude array literal mutations (often false positives)
      'ArrayLiteral',
    ],
  },
  
  // Files to mutate
  mutate: [
    'src/**/*.ts',
    '!src/**/*.test.ts',
    '!src/**/*.spec.ts',
    '!src/**/__tests__/**',
    '!src/**/*.d.ts',
    '!src/index.ts',
    '!src/index-dev.js',
    '!src/index-clean.ts',
    '!src/generators/**',
    '!src/scripts/**',
  ],
  
  // Test files
  testMatch: [
    'tests/**/*.test.ts',
    'tests/**/*.spec.ts',
  ],
  
  // Timeout per test
  timeoutMS: 10000,
  
  // Timeout factor (multiplier for slow tests)
  timeoutFactor: 2,
  
  // Maximum concurrent test runners
  maxConcurrentTestRunners: 2,
  
  // Log level
  logLevel: 'info',
  
  // File system
  fileLogLevel: 'trace',
  
  // Reporters
  reporters: ['html', 'clear-text', 'progress', 'dashboard'],
  
  // Dashboard configuration (opcional, requiere API key)
  dashboard: {
    project: 'github.com/respicare/backend',
    version: process.env.GITHUB_REF_NAME || 'main',
    module: 'backend',
  },
  
  // Thresholds
  thresholds: {
    high: 80,
    low: 60,
    break: null, // Don't break build on low mutation score
  },
  
  // Jest configuration
  jest: {
    configFile: 'jest.config.js',
    enableFindRelatedTests: true,
  },
  
  // TypeScript checker
  checkers: ['typescript'],
  tsconfigFile: 'tsconfig.json',
  
  // Ignore patterns
  ignorePatterns: [
    'node_modules',
    'dist',
    'coverage',
    '.git',
    'tests',
    '*.config.js',
    '*.config.ts',
    'package.json',
    'package-lock.json',
  ],
  
  // Concurrency
  concurrency: 2,
  
  // Dry run (for testing configuration)
  // dryRun: true,
  
  // Clean temporary files
  cleanTempDir: true,
  
  // Temp directory
  tempDirName: '.stryker-tmp',
  
  // Plugins
  plugins: [
    '@stryker-mutator/jest-runner',
    '@stryker-mutator/typescript-checker',
  ],
};

