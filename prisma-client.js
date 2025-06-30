var { PrismaClient } = require('@prisma/client');
let marinaPrisma;
function prismaDb(url) {
    marinaPrisma = new PrismaClient({
        datasourceUrl: url
    });
    return marinaPrisma;
}

module.exports = {prismaDb, marinaPrisma};