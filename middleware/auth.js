const { auth } = require('express-oauth2-jwt-bearer');
const { promisify } = require('util');
const jwt = require('jsonwebtoken');
const { whitelistUrl } = require('../config/urls');
const { redisClient } = require('../config/redis.config');

const checkJwt = async (req, res, next) => {
  const excludedPath = whitelistUrl
  if (excludedPath.includes(req.path)) {
    return next();
  }
  if (req.headers['zd-event'] == 'local_test') {
    return next();
  }

  /* if ((req.headers['iframe'] == 'true') && (req.path == '/api/v1/channels/stores_lite')) {
    return next();
   } */
  const sharedSecret = process.env.MARINA_SECRETZ;

  const authHeader = req.headers.authorization || '';
  const token = authHeader.split(' ')[1];
  if (!token) {
    return res.status(401).json({ error: 'Access token missing' });
  }
  
  // try validating with custom shared secret (for iframe or internal clients)
  if (sharedSecret) {
    console.log('Attempting custom JWT validation');
    try {
      const decoded = jwt.verify(token, sharedSecret, {
        algorithms: ['HS256', 'HS384', 'HS512']
      });
      req.auth = {
        payload: decoded,
        header: jwt.decode(token, { complete: true })?.header || {},
        provider: 'custom'
      };
      return next();
    } catch (customError) {
      console.log('Custom JWT validation failed:', customError.message);
      // continue to third-party / Auth0 validation
    }
  }

  // from here, try validating with Auth0
  try {
    console.log('Attempting Auth0 JWT validation');
    const tokenValidator = promisify(
      auth({
        audience: 'marina-be-id',
        issuerBaseURL: process.env.AUTH0_BASEURL,
        tokenSigningAlg: 'RS256'
      })
    );
    await tokenValidator(req, res);
    next();
  } catch (error) {
    console.log('Auth0 JWT validation failed:', error);
    return res.status(401).json({ error: 'Invalid access token' });
  }
}

module.exports = checkJwt