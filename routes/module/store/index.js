var express = require('express');
var router = express.Router();
var {
    PrismaClient
} = require('@prisma/client');

const prisma = new PrismaClient();
router.get('/', async function(req, res, next) {
    let store = await prisma.store.findMany({
        include: {
            channel: true
        }
    })
    res.status(200).send(store);
})

router.get('/products', async function(req, res, next) {
    let channels = await prisma.store.findMany({
        include : {
            products: true
        }
    })
    res.status(200).send(channels);
})

module.exports = router;