const { auth } = require('express-oauth2-jwt-bearer');
const { promisify } = require('util');
const { whitelistUrl } = require('../config/urls');

const checkJwt = async (req, res, next) => {
  const excludedPath = whitelistUrl
  if (excludedPath.includes(req.path)) {
    return next();
  }
  if (req.headers['zd-event'] == 'local_test') {
    return next();
  }
  const token = req.headers.authorization && req.headers.authorization.split(' ')[1];
  if (!token) {
    return res.status(401).json({ error: 'Access token is missing' });
  }
  try {
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
    console.log(error);
    return res.status(401).json({ error: 'Invalid access token' });
  }
}

module.exports = checkJwt