const request = require('supertest');
const express = require('express');
const storeRouter = require('../../../routes/module/store');

// Mock dependencies
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

jest.mock('../../../functions/tokopedia/caller', () => ({
  generateTokpedToken: jest.fn()
}), { virtual: true });

const { generateTokpedToken } = require('../../../functions/tokopedia/caller');

describe('Store Routes Integration Tests', () => {
  let app;
  let mockPrisma;

  beforeEach(() => {
    jest.clearAllMocks();

    // Setup mock Prisma client
    mockPrisma = {
      store: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn()
      }
    };

    // Create Express app for testing
    app = express();
    app.use(express.json());
    
    // Mock prisma middleware
    app.use((req, res, next) => {
      req.prisma = mockPrisma;
      next();
    });
    
    app.use('/api/v1/stores', storeRouter);
  });

  describe('GET /api/v1/stores', () => {
    it('should return all stores with channels', async () => {
      const mockStores = [
        {
          id: 1,
          origin_id: 'store-1',
          token: 'token-1',
          channel: { id: 1, name: 'Tokopedia' }
        },
        {
          id: 2,
          origin_id: 'store-2',
          token: 'token-2',
          channel: { id: 2, name: 'Shopee' }
        }
      ];

      mockPrisma.store.findMany.mockResolvedValue(mockStores);

      const response = await request(app)
        .get('/api/v1/stores')
        .expect(200);

      expect(response.body).toEqual(mockStores);
      expect(mockPrisma.store.findMany).toHaveBeenCalledWith({
        include: { channel: true }
      });
    });

    it('should return empty array when no stores exist', async () => {
      mockPrisma.store.findMany.mockResolvedValue([]);

      const response = await request(app)
        .get('/api/v1/stores')
        .expect(200);

      expect(response.body).toEqual([]);
    });

    it('should handle database errors', async () => {
      mockPrisma.store.findMany.mockRejectedValue(new Error('Database error'));

      const response = await request(app)
        .get('/api/v1/stores')
        .expect(500);

      expect(response.error).toBeTruthy();
    });
  });

  describe('GET /api/v1/stores/:id', () => {
    it('should return a single store by ID', async () => {
      const mockStore = {
        id: 1,
        origin_id: 'store-1',
        token: 'token-1',
        channel: { id: 1, name: 'Tokopedia' }
      };

      mockPrisma.store.findUnique.mockResolvedValue(mockStore);

      const response = await request(app)
        .get('/api/v1/stores/1')
        .expect(200);

      expect(response.body).toEqual(mockStore);
      expect(mockPrisma.store.findUnique).toHaveBeenCalledWith({
        where: { id: 1 },
        include: { channel: true }
      });
    });

    it('should handle non-existent store', async () => {
      mockPrisma.store.findUnique.mockResolvedValue(null);

      const response = await request(app)
        .get('/api/v1/stores/999')
        .expect(200);

      expect(response.body).toBeNull();
    });

    it('should parse ID parameter correctly', async () => {
      mockPrisma.store.findUnique.mockResolvedValue({
        id: 42,
        origin_id: 'store-42'
      });

      await request(app)
        .get('/api/v1/stores/42')
        .expect(200);

      expect(mockPrisma.store.findUnique).toHaveBeenCalledWith({
        where: { id: 42 },
        include: { channel: true }
      });
    });
  });

  describe('POST /api/v1/stores/connect/toko', () => {
    it('should connect store to Tokopedia', async () => {
      const mockToken = {
        data: {
          access_token: 'new-access-token',
          expires_in: 3600
        }
      };

      const mockUpdatedStore = {
        id: 1,
        origin_id: 'store-123',
        token: 'new-access-token'
      };

      generateTokpedToken.mockResolvedValue(mockToken);
      mockPrisma.store.update.mockResolvedValue(mockUpdatedStore);

      const response = await request(app)
        .post('/api/v1/stores/connect/toko')
        .send({ store_id: 'store-123' })
        .expect(200);

      expect(response.body).toEqual({ store: mockUpdatedStore });
      expect(generateTokpedToken).toHaveBeenCalled();
      expect(mockPrisma.store.update).toHaveBeenCalledWith({
        where: { origin_id: 'store-123' },
        data: { token: 'new-access-token' }
      });
    });

    it('should return 400 if token generation fails', async () => {
      generateTokpedToken.mockResolvedValue({
        data: {
          error: 'Invalid credentials'
        }
      });

      const response = await request(app)
        .post('/api/v1/stores/connect/toko')
        .send({ store_id: 'store-123' })
        .expect(400);

      expect(response.body.error).toBeDefined();
    });

    it('should handle database update errors', async () => {
      const mockToken = {
        data: {
          access_token: 'new-access-token'
        }
      };

      generateTokpedToken.mockResolvedValue(mockToken);
      mockPrisma.store.update.mockRejectedValue(new Error('Update failed'));

      const response = await request(app)
        .post('/api/v1/stores/connect/toko')
        .send({ store_id: 'store-123' })
        .expect(500);

      expect(response.error).toBeTruthy();
    });
  });

  describe('GET /api/v1/stores/generate_jwt', () => {
    beforeEach(() => {
      process.env.MARINA_SECRETZ = 'test-secret';
    });

    it('should generate a JWT token', async () => {
      const response = await request(app)
        .get('/api/v1/stores/generate_jwt')
        .expect(200);

      expect(response.body.token).toBeDefined();
      expect(typeof response.body.token).toBe('string');
    });
  });
});
