
var { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

function getToken (storeOriginId) {
    return prisma.store.findUnique({
        where: { origin_id: storeOriginId }
    });
}

module.exports = { getToken }