const { PrismaClient } = require('../prisma/generated/client')

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

module.exports = { getPrismaClient };