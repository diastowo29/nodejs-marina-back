var express = require('express');
var router = express.Router();
const { getPrismaClient } = require('../../../services/prismaServices');

router.get('/', async function(req, res, next) {
    const mPrisma = getPrismaClient(req.tenantDB);
    try {
        let channels = await mPrisma.channel.findMany({});
        res.status(200).send(channels);
    } catch (err) {
        console.log(err);
        res.status(500).send({
            status: 500,
            message: 'Error fetching channels',
            error: err.message
        })
    }
})

router.get('/stores', async function(req, res, next) {
    const mPrisma = getPrismaClient(req.tenantDB);
    let channels = await mPrisma.channel.findMany({
        include: {
            store: true
        }
    })
    res.status(200).send(channels);
})

router.get('/products', async function(req, res, next) {
    const mPrisma = getPrismaClient(req.tenantDB);
    let channels = await mPrisma.channel.findMany({
        include : {
            store : {
                include: {
                    products: true
                }
            }
        }
    })
    res.status(200).send(channels);
})

module.exports = router;