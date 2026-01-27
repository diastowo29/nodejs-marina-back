const request = require('supertest');
const express = require('express');

// Mock the auth middleware
jest.mock('../../../middleware/auth', () => {
  return (req, res, next) => {
    req.auth = {
      payload: {
        sub: 'test-user-id',
        org_id: 'test-org'
      }
    };
    next();
  };
}, { virtual: true });

describe('User Routes Integration Tests', () => {
  let app;

  beforeEach(() => {
    // Create a fresh Express app for each test
    app = express();
    app.use(express.json());
    
    const usersRouter = require('../../../routes/users');
    app.use('/users', usersRouter);
  });

  describe('GET /users', () => {
    it('should return respond with a resource message', async () => {
      const response = await request(app)
        .get('/users')
        .expect(200);

      expect(response.text).toBe('respond with a resource');
    });

    it('should handle requests without authentication', async () => {
      const response = await request(app)
        .get('/users')
        .expect(200);

      expect(response.text).toBeDefined();
    });
  });
});
