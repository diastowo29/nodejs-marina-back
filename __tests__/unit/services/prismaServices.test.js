// Mock the PrismaClient BEFORE importing anything
jest.mock('../../../prisma/generated/client', () => {
  return {
    PrismaClient: jest.fn().mockImplementation((config) => {
      return {
        config: config,
        $connect: jest.fn(),
        $disconnect: jest.fn(),
        store: {
          findUnique: jest.fn(),
          findMany: jest.fn()
        }
      };
    })
  };
}, { virtual: true });

const { getPrismaClient, getPrismaClientForTenant } = require('../../../services/prismaServices');
const { PrismaClient } = require('../../prisma/generated/client');

describe('PrismaServices', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getPrismaClient', () => {
    it('should create a new Prisma client with URL from tenantConfig', () => {
      const tenantConfig = { url: 'postgresql://test:test@localhost:5432/testdb' };
      const client = getPrismaClient(tenantConfig);

      expect(PrismaClient).toHaveBeenCalledWith({
        datasources: {
          db: {
            url: 'postgresql://test:test@localhost:5432/testdb'
          }
        }
      });
      expect(client).toBeDefined();
    });

    it('should create a new Prisma client with string tenantConfig', () => {
      const tenantConfig = 'postgresql://test:test@localhost:5432/testdb';
      const client = getPrismaClient(tenantConfig);

      expect(PrismaClient).toHaveBeenCalledWith({
        datasources: {
          db: {
            url: 'postgresql://test:test@localhost:5432/testdb'
          }
        }
      });
      expect(client).toBeDefined();
    });
  });

  describe('getPrismaClientForTenant', () => {
    it('should create a new Prisma client for a tenant', () => {
      const tenantId = 'tenant-1';
      const dbUrl = 'postgresql://test:test@localhost:5432/tenant1';

      const client = getPrismaClientForTenant(tenantId, dbUrl);

      expect(PrismaClient).toHaveBeenCalledWith({
        log: ['info'],
        datasources: { db: { url: dbUrl } }
      });
      expect(client).toBeDefined();
    });

    it('should reuse existing Prisma client for the same tenant', () => {
      const tenantId = 'tenant-2';
      const dbUrl = 'postgresql://test:test@localhost:5432/tenant2';

      const client1 = getPrismaClientForTenant(tenantId, dbUrl);
      const client2 = getPrismaClientForTenant(tenantId, dbUrl);

      expect(client1).toBe(client2);
      // Should only be called once for the same tenant
      expect(PrismaClient).toHaveBeenCalledTimes(1);
    });

    it('should create different clients for different tenants', () => {
      const client1 = getPrismaClientForTenant('tenant-3', 'postgresql://test:test@localhost:5432/tenant3');
      const client2 = getPrismaClientForTenant('tenant-4', 'postgresql://test:test@localhost:5432/tenant4');

      expect(client1).not.toBe(client2);
      expect(PrismaClient).toHaveBeenCalledTimes(2);
    });
  });
});
