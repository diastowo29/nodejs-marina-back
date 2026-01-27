# Testing Guide for Marina Backend

## Overview

This project uses **Jest** as the testing framework along with **Supertest** for API integration testing. The test suite covers unit tests, integration tests, and mocks for various components of the application.

## Test Structure

```
__tests__/
├── setup.js                          # Global test setup and configuration
├── mocks/                            # Reusable mocks
│   ├── prismaMock.js                # Prisma client mocks
│   └── authMock.js                  # Auth0 authentication mocks
├── unit/                            # Unit tests
│   ├── services/
│   │   └── prismaServices.test.js  # Tests for Prisma service layer
│   ├── functions/
│   │   ├── helper.test.js          # Tests for helper functions
│   │   └── encryption.test.js      # Tests for encryption utilities
│   └── middleware/
│       ├── auth.test.js            # Tests for authentication middleware
│       └── tenantIdentifier.test.js # Tests for tenant identification
└── integration/                     # Integration tests
    ├── app.test.js                 # Full app integration tests
    └── routes/
        └── store.test.js           # Store route tests
```

## Running Tests

### Install Dependencies

First, install the testing dependencies:

```bash
npm install
```

### Run All Tests

```bash
npm test
```

### Run Tests in Watch Mode

```bash
npm run test:watch
```

### Run Unit Tests Only

```bash
npm run test:unit
```

### Run Integration Tests Only

```bash
npm run test:integration
```

### Run Tests with Coverage

```bash
npm test -- --coverage
```

## Writing Tests

### Unit Tests

Unit tests focus on testing individual functions or modules in isolation. Example:

```javascript
describe('MyFunction', () => {
  it('should do something specific', () => {
    const result = myFunction(input);
    expect(result).toBe(expected);
  });
});
```

### Integration Tests

Integration tests verify that different parts of the application work together correctly:

```javascript
const request = require('supertest');
const app = require('../app');

describe('API Endpoints', () => {
  it('should return data from endpoint', async () => {
    const response = await request(app)
      .get('/api/v1/endpoint')
      .expect(200);
    
    expect(response.body).toBeDefined();
  });
});
```

### Using Mocks

#### Prisma Mock

```javascript
const { mockPrismaClient } = require('../mocks/prismaMock');

const mockPrisma = mockPrismaClient();
mockPrisma.store.findMany.mockResolvedValue([{ id: 1, name: 'Test' }]);
```

#### Auth Mock

```javascript
const { mockCheckJwt } = require('../mocks/authMock');
app.use(mockCheckJwt); // Use in test setup
```

## Environment Variables

Tests use environment variables defined in `__tests__/setup.js`:

- `NODE_ENV=test`
- `AUTH0_BASEURL=https://test.auth0.com`
- `MARINA_SECRETZ=test-secret-key`

You can override these in individual test files if needed.

## Coverage

The test coverage report is generated in the `coverage/` directory. Open `coverage/lcov-report/index.html` in a browser to view detailed coverage information.

Target coverage goals:
- **Statements**: > 80%
- **Branches**: > 75%
- **Functions**: > 80%
- **Lines**: > 80%

## Best Practices

1. **Isolate Tests**: Each test should be independent and not rely on the state from other tests.

2. **Use Descriptive Names**: Test descriptions should clearly explain what is being tested.

3. **Mock External Dependencies**: Always mock database calls, external APIs, and third-party services.

4. **Test Edge Cases**: Include tests for error conditions, empty inputs, and boundary values.

5. **Keep Tests Fast**: Unit tests should run quickly. Use integration tests for slower operations.

6. **Clean Up**: Use `beforeEach` and `afterEach` to reset mocks and state between tests.

## Common Issues

### Prisma Mock Issues

If you encounter issues with Prisma mocks:

```javascript
jest.mock('../prisma/generated/client', () => ({
  PrismaClient: jest.fn().mockImplementation(() => ({
    // your mock implementation
  }))
}));
```

### Async/Await Issues

Always use `async/await` or return promises in async tests:

```javascript
it('should handle async operation', async () => {
  const result = await asyncFunction();
  expect(result).toBeDefined();
});
```

### Module Import Issues

If module imports fail, check the `moduleNameMapper` in `jest.config.js`.

## Continuous Integration

Tests are designed to run in CI/CD pipelines. Ensure:

1. All environment variables are set
2. Database connections are mocked
3. No external API calls are made
4. Tests are deterministic and repeatable

## Adding New Tests

When adding new features:

1. Write unit tests for new functions/modules
2. Add integration tests for new API endpoints
3. Update mocks if new dependencies are introduced
4. Maintain or improve code coverage

## Resources

- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [Supertest Documentation](https://github.com/visionmedia/supertest)
- [Testing Best Practices](https://testingjavascript.com/)
