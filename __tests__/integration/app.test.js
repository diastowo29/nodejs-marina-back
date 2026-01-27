const request = require('supertest');

// Mock all middleware and dependencies BEFORE requiring app
jest.mock('../../../middleware/auth', () => {
  return (req, res, next) => {
    req.auth = {
      payload: {
        sub: 'test-user-id',
        org_id: 'test-org',
        morg_name: 'Test Org'
      }
    };
    next();
  };
}, { virtual: true });

jest.mock('../../../middleware/tenantIdentifier', () => ({
  tenantIdentifier: (req, res, next) => {
    req.tenantId = 'test-tenant';
    req.tenantDB = { url: 'postgresql://test:test@localhost:5432/testdb' };
    req.prisma = {
      store: {
        findMany: jest.fn().mockResolvedValue([]),
        findUnique: jest.fn().mockResolvedValue(null)
      },
      channel: {
        findMany: jest.fn().mockResolvedValue([])
      },
      order: {
        findMany: jest.fn().mockResolvedValue([])
      },
      product: {
        findMany: jest.fn().mockResolvedValue([])
      }
    };
    next();
  }
}), { virtual: true });

jest.mock('../../../config/urls', () => ({
  whitelistUrl: ['/health', '/']
}), { virtual: true });

// Now require the app after all mocks are set up
const app = require('../../../app');

describe('App Integration Tests', () => {
  describe('Base Routes', () => {
    it('should respond to root path', async () => {
      const response = await request(app)
        .get('/')
        .expect(200);
    });

    it('should return 404 for non-existent routes', async () => {
      const response = await request(app)
        .get('/non-existent-route')
        .expect(404);

      expect(response.body.status).toBe(404);
      expect(response.body.message).toBe('Are you lost? This page does not exist.');
    });
  });

  describe('API Route Structure', () => {
    it('should have /api/v1/stores endpoint', async () => {
      const response = await request(app)
        .get('/api/v1/stores')
        .set('Authorization', 'Bearer test-token');

      // Should not return 404
      expect(response.status).not.toBe(404);
    });

    it('should have /api/v1/orders endpoint', async () => {
      const response = await request(app)
        .get('/api/v1/orders')
        .set('Authorization', 'Bearer test-token');

      expect(response.status).not.toBe(404);
    });

    it('should have /api/v1/products endpoint', async () => {
      const response = await request(app)
        .get('/api/v1/products')
        .set('Authorization', 'Bearer test-token');

      expect(response.status).not.toBe(404);
    });

    it('should have /api/v1/channels endpoint', async () => {
      const response = await request(app)
        .get('/api/v1/channels')
        .set('Authorization', 'Bearer test-token');

      expect(response.status).not.toBe(404);
    });
  });

  describe('Security Headers', () => {
    it('should include helmet security headers', async () => {
      const response = await request(app)
        .get('/')
        .expect(200);

      // Helmet adds various security headers
      expect(response.headers).toHaveProperty('x-dns-prefetch-control');
      expect(response.headers).toHaveProperty('x-frame-options');
      expect(response.headers).toHaveProperty('x-content-type-options');
    });
  });

  describe('Error Handling', () => {
    it('should handle JSON parsing errors gracefully', async () => {
      const response = await request(app)
        .post('/api/v1/stores/connect/toko')
        .set('Content-Type', 'application/json')
        .set('Authorization', 'Bearer test-token')
        .send('invalid json{')
        .expect(400);
    });
  });
});
