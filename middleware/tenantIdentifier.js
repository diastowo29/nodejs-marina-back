const { getPrismaClientForTenant } = require("../services/prismaServices");

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
    '/api/v1/tiktok/webhook',
    '/api/v1/chats/sunco/event',
    '/api/v1/auth0/hook',
    '/api/v1/auth0/schema',
    '/api/v1/auth0/registration',
    '/api/v1/auth0/pre-registration'
  ];
  if (excludedPath.includes(req.path)) {
    return next();
  }
  let tenantId = req.headers['x-tenant-id'] || req.auth.payload.org_id;
  if (!tenantId) {
    return res.status(400).json({ error: 'Tenant identification missing' });
  }
  if (tenantId != 'org_SdVZvtRmlurL47iY' || tenantId != 'org_rfMkRHgxqG9uxYUY') {
    tenantId = req.auth.payload.morg_name.toString().toLowerCase().split(' ').join('_');
  }

  const dbUrl = getTenantDB(tenantId);
  req.tenantDB = dbUrl;
  req.prisma = getPrismaClientForTenant(tenantId, dbUrl.url);
  next();
};

module.exports = {tenantIdentifier, getTenantDB};