const { PrismaClient } = require('../prisma/generated/client')

const prismaClients = {}

const getPrismaClient = (tenantConfig) => {
    const prisma = new PrismaClient({
        datasources: {
            db: {
                url: (tenantConfig.url) ? tenantConfig.url : tenantConfig
            }
        }
    })
    return prisma;
};

const getPrismaClientForTenant = (tenantId, dbUrl) => {
  if (!prismaClients[tenantId]) {
    prismaClients[tenantId] = new PrismaClient({
      log: ['info'],
      datasources: { db: { url: dbUrl } }
    });
  }
  return prismaClients[tenantId];
}


module.exports = { getPrismaClient, getPrismaClientForTenant };