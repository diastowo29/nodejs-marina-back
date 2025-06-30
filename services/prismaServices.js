// services/prismaService.js
const { PrismaClient } = require('@prisma/client');

const prismaClients = new Map();

const getPrismaClient = (tenantConfig) => {
    console.log(tenantConfig)
    const key = tenantConfig.url;
    
    if (!prismaClients.has(key)) {
        prismaClients.set(key, new PrismaClient({
        datasources: {
            db: tenantConfig
        }
        }));
    }
    
    return prismaClients.get(key);
};

module.exports = { getPrismaClient };