
// var { PrismaClient } = require('@prisma/client');
const { getPrismaClient } = require('../services/prismaServices');
// const prisma = new PrismaClient();

function getToken (storeOriginId, tenantDB) {
    const prisma = getPrismaClient(tenantDB);
    return prisma.store.findUnique({
        where: { origin_id: storeOriginId }
    });
}

module.exports = { getToken }