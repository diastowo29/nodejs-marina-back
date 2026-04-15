var express = require('express');
var router = express.Router();
const { PrismaClient } = require('../../../prisma/generated/client');
const { PrismaClient: prismaBaseClient } = require('../../../prisma/generated/baseClient');
const { getTenantDB } = require('../../../middleware/tenantIdentifier');
const { getPrismaClientForTenant } = require('../../../services/prismaServices');

let prisma = new PrismaClient()
const baseClient = new prismaBaseClient();

class MarinaApiResponseStd {
    constructor(status, message, data) {
        this.status = status;
        this.message = message;
        this.data = data;
    }
}

router.get('/', async function(req, res, next) {
    prisma = req.prisma;
    try {
        let channels = await prisma.channel.findMany({});
        res.status(200).send(channels);
    } catch (err) {
        await prisma.$disconnect();

        res.status(500).send({
            status: 500,
            message: 'Error fetching channels',
            error: err.message
        })
    }
})

router.get('/stores_lite', async function(req, res, next) {
    const mResponse = new MarinaApiResponseStd();
    mResponse.status = 400;
    mResponse.data = [];
    try {
        if (req.headers['iframe'] == 'true') {
            const clientId = req.query.client_id || req.headers['client_id'];
            const client = await baseClient.clients.findUnique({
                where: {
                    org_id: Buffer.from(`iframe:${clientId}`, 'ascii').toString('base64')
                }
            });
            if (!client) {
                mResponse.message = 'Client not found';
                return res.status(400).send(mResponse);
            }
            const org = Buffer.from(client.org_id, 'base64').toString('ascii').split(':');
            const tenantOrgId = org[1];
            const tenantDbUrl = getTenantDB(tenantOrgId).url;
            prisma = getPrismaClientForTenant(tenantOrgId, tenantDbUrl);
            let channels = await prisma.channel.findMany({
                include: {
                    store: true
                }
            });
            mResponse.status = 200;
            mResponse.message = 'success';
            mResponse.data = channels;
            res.status(200).send(mResponse);
        } else {
            mResponse.message = 'Invalid request';
            return res.status(400).send(mResponse);
        }
    } catch (err) {
        console.log(err);
        res.status(500).send({
            status: 500,
            message: 'Error fetching channels',
            error: err.message
        });
    }
});

router.get('/stores', async function(req, res, next) {
    prisma = req.prisma;
    try {
        let channels = await prisma.channel.findMany({
            include: {
                store: true
            }
        })
        res.status(200).send(channels);
    } catch (err) {
        await prisma.$disconnect();
        console.log(err);
        res.status(500).send({
            status: 500,
            message: 'Error fetching stores by channel',
            error: err.message
        });
    }
})

router.get('/products', async function(req, res, next) {
    prisma = req.prisma;
    try {
        let channels = await prisma.channel.findMany({
            include : {
                store : {
                    include: {
                        products: true
                    }
                }
            }
        })
        res.status(200).send(channels);
    } catch (err) {
        await prisma.$disconnect();
        res.status(500).send({
            status: 500,
            message: 'Error fetching channels',
            error: err.message
        })
    }
})

module.exports = router;