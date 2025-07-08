const { auth } = require('express-oauth2-jwt-bearer');
const { promisify } = require('util');

const checkJwt = async (req, res, next) => {
  const exludedPath = ['/api/v1/blibli/webhook', '/api/v1/lazada/webhook', '/api/v1/shopee/webhook', '/api/v1/tiktok/webhook'];
  if (exludedPath.includes(req.path)) {
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