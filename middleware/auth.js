// const jwt = require('jsonwebtoken');
// const fs = require('fs');
// const privateKey = fs.readFileSync('./private.key');
const { auth } = require('express-oauth2-jwt-bearer');
const { promisify } = require('util');

const checkJwt = async (req, res, next) => {
  // console.log(req.headers);
  // exclude webhook route
  if (req.path.startsWith('/api/v1/webhook')) {
    return next();
  }
  const token = req.headers.authorization && req.headers.authorization.split(' ')[1];
  if (!token) {
    return res.status(401).json({ error: 'Access token is missing' });
  }
  try {
    // const decoded = jwt.verify(token, privateKey, {algorithms: ['RS256']});
    const tokenValidator = promisify(
      auth({
        audience: 'marina-be-id',
        issuerBaseURL: 'https://dev-krdctdtgreltnipy.us.auth0.com/'
      })
    );
    await tokenValidator(req, res);
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid access token' });
  }
}

module.exports = checkJwt