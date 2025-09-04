var express = require('express');
var router = express.Router();
const { getPrismaClient } = require('../../../services/prismaServices');
const { PrismaClient } = require('../../../prisma/generated/client');
let prisma = new PrismaClient()

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
        })
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