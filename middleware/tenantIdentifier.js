const getTenantDB = (tenantId) => {
  const dbUser = process.env.DB_USER;
  const dbPassword = process.env.DB_PASSWORD;
  const dbHost = process.env.DB_HOST;
  const dbParams = process.env.DB_PARAMS;
  if (tenantId == 'org_SdVZvtRmlurL47iY') {
    tenantId = 'realco_db';
  }
  return {
    url: `postgresql://${dbUser}:${dbPassword}@${dbHost}/${tenantId}?${dbParams}`
  };
};

const tenantIdentifier = (req, res, next) => {
  const excludedPath = [
    '/api/v1/blibli/webhook', 
    '/api/v1/lazada/webhook', 
    '/api/v1/shopee/webhook', 
    '/api/v1/tiktok/webhook'
  ];
  if (excludedPath.includes(req.path)) {
    return next();
  }
  // console.log(req.auth)
  const tenantId = req.headers['x-tenant-id'] || req.auth.payload.org_id;  
  if (!tenantId) {
    return res.status(400).json({ error: 'Tenant identification missing' });
  }
  
  req.tenantDB = getTenantDB(tenantId);
  next();
};

module.exports = {tenantIdentifier, getTenantDB};