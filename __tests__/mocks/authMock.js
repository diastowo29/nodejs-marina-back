// Mock Auth0 JWT verification for testing
const mockCheckJwt = (req, res, next) => {
  // Mock successful authentication
  req.auth = {
    payload: {
      sub: 'test-user-id',
      aud: 'marina-be-id',
      iss: 'https://test.auth0.com/'
    }
  };
  next();
};

const mockCheckJwtFailure = (req, res, next) => {
  res.status(401).json({ error: 'Invalid access token' });
};

module.exports = {
  mockCheckJwt,
  mockCheckJwtFailure
};
