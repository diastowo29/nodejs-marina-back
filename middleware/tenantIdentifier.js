const getTenantDB = (tenantId) => {
  console.log('tenantID: ',tenantId);
  return {
    url: `postgresql://user:password@localhost:5432/${tenantId}?schema=public`
  };
};

const tenantIdentifier = (req, res, next) => {
  // Get tenant ID from:
  // - Subdomain (client1.yourdomain.com)
  // - Header (X-Tenant-ID)
  // - JWT token
  // - Path parameter (/api/:tenantId/...)
  const tenantId = req.headers['x-tenant-id'] || req.subdomains[0];
  
  if (!tenantId) {
    return res.status(400).json({ error: 'Tenant identification missing' });
  }
  
  req.tenantDB = getTenantDB(tenantId);
  next();
};

module.exports = tenantIdentifier;