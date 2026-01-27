const { tenantIdentifier, getTenantDB } = require('../../../middleware/tenantIdentifier');
const { getPrismaClientForTenant } = require('../../../services/prismaServices');

jest.mock('../../../services/prismaServices', () => ({
  getPrismaClientForTenant: jest.fn()
}), { virtual: true });

jest.mock('../../../config/urls', () => ({
  whitelistUrl: ['/health', '/public']
}), { virtual: true });

describe('Tenant Identifier Middleware', () => {
  let req, res, next;
  const originalEnv = process.env;

  beforeEach(() => {
    jest.clearAllMocks();
    
    process.env = {
      ...originalEnv,
      DB_USER: 'testuser',
      DB_PASSWORD: 'testpass',
      DB_HOST: 'localhost:5432',
      DB_PARAMS: 'schema=public'
    };

    req = {
      headers: {},
      auth: {
        payload: {}
      },
      path: '/api/v1/stores'
    };
    
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };
    
    next = jest.fn();

    getPrismaClientForTenant.mockReturnValue({
      store: { findMany: jest.fn() }
    });
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('getTenantDB', () => {
    it('should construct database URL with tenant ID', () => {
      const result = getTenantDB('test_tenant');
      
      expect(result).toEqual({
        url: 'postgresql://testuser:testpass@localhost:5432/test_tenant?schema=public'
      });
    });

    it('should handle special org_SdVZvtRmlurL47iY tenant', () => {
      const result = getTenantDB('org_SdVZvtRmlurL47iY');
      
      expect(result).toEqual({
        url: 'postgresql://testuser:testpass@localhost:5432/realco_db?schema=public'
      });
    });

    it('should construct URL without params if DB_PARAMS is not set', () => {
      delete process.env.DB_PARAMS;
      
      const result = getTenantDB('test_tenant');
      
      expect(result).toEqual({
        url: 'postgresql://testuser:testpass@localhost:5432/test_tenant'
      });
    });
  });

  describe('tenantIdentifier middleware', () => {
    it('should skip whitelisted URLs', () => {
      req.path = '/health';
      
      tenantIdentifier(req, res, next);
      
      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    it('should extract tenant ID from x-tenant-id header', () => {
      req.headers['x-tenant-id'] = 'tenant_from_header';
      
      tenantIdentifier(req, res, next);
      
      expect(req.tenantId).toBe('tenant_from_header');
      expect(req.prisma).toBeDefined();
      expect(getPrismaClientForTenant).toHaveBeenCalledWith(
        'tenant_from_header',
        expect.stringContaining('tenant_from_header')
      );
      expect(next).toHaveBeenCalled();
    });

    it('should extract tenant ID from auth payload org_id', () => {
      req.auth.payload.org_id = 'org_from_auth';
      req.auth.payload.morg_name = 'Test Org'; // Add morg_name to prevent toString error
      
      tenantIdentifier(req, res, next);
      
      expect(req.tenantId).toBe('org_from_auth');
      expect(next).toHaveBeenCalled();
    });

    it('should transform org name to tenant ID when conditions are met', () => {
      req.auth.payload.org_id = 'org_CustomOrg';
      req.auth.payload.morg_name = 'My Custom Org';
      
      tenantIdentifier(req, res, next);
      
      expect(req.tenantId).toBe('my_custom_org');
      expect(next).toHaveBeenCalled();
    });

    it('should not transform special org IDs', () => {
      req.headers['x-tenant-id'] = 'org_SdVZvtRmlurL47iY';
      
      tenantIdentifier(req, res, next);
      
      expect(req.tenantId).toBe('org_SdVZvtRmlurL47iY');
      expect(next).toHaveBeenCalled();
    });

    it('should return 400 if tenant ID is missing', () => {
      req.auth.payload = {};
      
      tenantIdentifier(req, res, next);
      
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ 
        error: 'Tenant identification missing' 
      });
      expect(next).not.toHaveBeenCalled();
    });

    it('should set tenantDB and prisma on request object', () => {
      req.headers['x-tenant-id'] = 'test_tenant';
      
      tenantIdentifier(req, res, next);
      
      expect(req.tenantDB).toBeDefined();
      expect(req.tenantDB.url).toContain('test_tenant');
      expect(req.prisma).toBeDefined();
      expect(next).toHaveBeenCalled();
    });

    it('should handle org_rfMkRHgxqG9uxYUY without transformation', () => {
      req.headers['x-tenant-id'] = 'org_rfMkRHgxqG9uxYUY';
      
      tenantIdentifier(req, res, next);
      
      expect(req.tenantId).toBe('org_rfMkRHgxqG9uxYUY');
      expect(next).toHaveBeenCalled();
    });
  });
});
