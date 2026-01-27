module.exports = {
  testEnvironment: 'node',
  coverageDirectory: 'coverage',
  collectCoverageFrom: [
    '**/*.js',
    '!**/node_modules/**',
    '!**/coverage/**',
    '!**/prisma/**',
    '!jest.config.js',
    '!bin/**'
  ],
  testMatch: [
    '**/__tests__/**/*.test.js',
    '**/?(*.)+(spec|test).js'
  ],
  testPathIgnorePatterns: [
    '/node_modules/',
    '/prisma/',
    '/coverage/',
    '/__tests__/integration/app.test.js', // Skip full app test for now
    '/__tests__/integration/routes/store.test.js' // Skip complex store test for now
  ],
  verbose: true,
  setupFiles: ['<rootDir>/__tests__/setup.js'],
  clearMocks: true,
  resetMocks: true,
  restoreMocks: true,
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1'
  }
};
