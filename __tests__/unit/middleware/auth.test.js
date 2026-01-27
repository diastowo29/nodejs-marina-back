const checkJwt = require('../../../middleware/auth');

jest.mock('express-oauth2-jwt-bearer', () => ({
  auth: jest.fn(() => {
    return (req, res, next) => {
      // Mock successful auth
      req.auth = {
        payload: {
          sub: 'test-user-id',
          aud: 'marina-be-id',
          iss: process.env.AUTH0_BASEURL
        }
      };
      next();
    };
  })
}), { virtual: true });

jest.mock('../../../config/urls', () => ({
  whitelistUrl: ['/health', '/public', '/api/v1/auth0/callback']
}), { virtual: true });

describe('Auth Middleware', () => {
  let req, res, next;
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = {
      ...originalEnv,
      AUTH0_BASEURL: 'https://test.auth0.com'
    };

    req = {
      headers: {},
      path: '/api/v1/stores'
    };
    
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };
    
    next = jest.fn();
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('checkJwt middleware', () => {
    it('should skip authentication for whitelisted URLs', async () => {
      req.path = '/health';
      
      await checkJwt(req, res, next);
      
      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    it('should skip authentication for local test events', async () => {
      req.headers['zd-event'] = 'local_test';
      req.path = '/api/v1/stores';
      
      await checkJwt(req, res, next);
      
      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    it('should return 401 if access token is missing', async () => {
      await checkJwt(req, res, next);
      
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ 
        error: 'Access token is missing' 
      });
      expect(next).not.toHaveBeenCalled();
    });

    it('should validate token and call next on success', async () => {
      req.headers.authorization = 'Bearer valid-token-xyz';
      
      await checkJwt(req, res, next);
      
      expect(req.auth).toBeDefined();
      expect(next).toHaveBeenCalled();
    });

    it('should handle Bearer token format', async () => {
      req.headers.authorization = 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9';
      
      await checkJwt(req, res, next);
      
      expect(next).toHaveBeenCalled();
    });

    it('should return 401 for invalid authorization header format', async () => {
      req.headers.authorization = 'InvalidFormat token';
      
      await checkJwt(req, res, next);
      
      // The split will fail to extract token, should return 401
      expect(res.status).toHaveBeenCalledWith(401);
    });
  });
});
