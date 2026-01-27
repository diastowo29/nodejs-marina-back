const { whitelistUrl } = require("../config/urls");
const { decryptData } = require("../functions/encryption");
const { getPrismaClientForTenant } = require("../services/prismaServices");

const getTenantDB = (tenantId) => {
  const dbConfig = JSON.parse(decryptData(process.env.DB_CONFIG));
  const dbUser = dbConfig.DB_USER;
  const dbPassword = dbConfig.DB_PASSWORD;
  const dbHost = (process.env.NODE_ENV === 'production') ? dbConfig.DB_HOST : dbConfig.DB_HOST_IP;
  const dbParams = (process.env.NODE_ENV === 'production') ? dbConfig.DB_PARAMS : '';
  if (tenantId == 'org_SdVZvtRmlurL47iY') {
    tenantId = 'realco_db';
  }
  return {
    url: `postgresql://${dbUser}:${dbPassword}@${dbHost}/${tenantId}${(dbParams) ? `?${dbParams}` : ''}`
  };
};

const tenantIdentifier = (req, res, next) => {
  const excludedPath = whitelistUrl;
  if (excludedPath.includes(req.path)) {
    return next();
  }
  let tenantId = req.headers['x-tenant-id'] || req.auth.payload.org_id;
  if (!tenantId) {
    return res.status(400).json({ error: 'Tenant identification missing' });
  }

  /* if (tenantId == 'org_SdVZvtRmlurL47iY') {
    tenantId = 'org_SdVZvtRmlurL47iY';
  } else if (tenantId == 'org_rfMkRHgxqG9uxYUY') {
    tenantId = 'org_rfMkRHgxqG9uxYUY';
  } else {
    if (!req.headers['x-tenant-id']) {
      tenantId = req.auth.payload.morg_name.toString().toLowerCase().split(' ').join('_');
    }
  } */

  if (tenantId != 'org_SdVZvtRmlurL47iY' && tenantId != 'org_rfMkRHgxqG9uxYUY') {
    if (!req.headers['x-tenant-id']) {
      tenantId = req.auth.payload.morg_name.toString().toLowerCase().split(' ').join('_');
    }
  }

  const dbUrl = getTenantDB(tenantId);
  req.tenantDB = dbUrl;
  req.tenantId = tenantId;
  req.prisma = getPrismaClientForTenant(tenantId, dbUrl.url);
  next();
};

module.exports = {tenantIdentifier, getTenantDB};