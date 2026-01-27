// Test setup file - runs before all tests
process.env.NODE_ENV = 'test';
process.env.AUTH0_BASEURL = 'https://test.auth0.com';
process.env.MARINA_SECRETZ = 'test-secret-key';
process.env.M_SECRET_KEY = 'test-secret-key-for-encryption';
process.env.M_SECRET_IV = 'test-secret-iv-for-encryption';
process.env.ENCRYPTION_METHOD = 'aes-256-cbc';
process.env.DB_USER = 'testuser';
process.env.DB_PASSWORD = 'testpass';
process.env.DB_HOST = 'localhost:5432';
process.env.DB_PARAMS = 'schema=public';

// Mock console methods to reduce noise during testing (optional)
global.console = {
  ...console,
  // Uncomment to suppress logs during tests:
  // log: jest.fn(),
  // debug: jest.fn(),
  // info: jest.fn(),
  // warn: jest.fn(),
  error: console.error, // Keep error logs visible
};
