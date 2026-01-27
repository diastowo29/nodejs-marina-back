const { getToken } = require('../../../functions/helper');

// Mock the prismaServices module
jest.mock('../../../services/prismaServices', () => ({
  getPrismaClient: jest.fn()
}), { virtual: true });

const { getPrismaClient } = require('../../../services/prismaServices');

describe('Helper Functions', () => {
  let mockPrisma;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup mock Prisma client
    mockPrisma = {
      store: {
        findUnique: jest.fn()
      }
    };
    
    getPrismaClient.mockReturnValue(mockPrisma);
  });

  describe('getToken', () => {
    it('should retrieve store by origin_id', async () => {
      const mockStore = {
        id: 1,
        origin_id: 'store-123',
        token: 'test-token-xyz',
        channel_id: 1
      };

      mockPrisma.store.findUnique.mockResolvedValue(mockStore);

      const tenantDB = 'postgresql://test:test@localhost:5432/testdb';
      const result = await getToken('store-123', tenantDB);

      expect(getPrismaClient).toHaveBeenCalledWith(tenantDB);
      expect(mockPrisma.store.findUnique).toHaveBeenCalledWith({
        where: { origin_id: 'store-123' }
      });
      expect(result).toEqual(mockStore);
    });

    it('should return null when store is not found', async () => {
      mockPrisma.store.findUnique.mockResolvedValue(null);

      const tenantDB = 'postgresql://test:test@localhost:5432/testdb';
      const result = await getToken('non-existent-store', tenantDB);

      expect(result).toBeNull();
    });

    it('should handle database errors', async () => {
      const dbError = new Error('Database connection failed');
      mockPrisma.store.findUnique.mockRejectedValue(dbError);

      const tenantDB = 'postgresql://test:test@localhost:5432/testdb';

      await expect(getToken('store-123', tenantDB)).rejects.toThrow('Database connection failed');
    });
  });
});
