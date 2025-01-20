var express = require('express');
var router = express.Router();
var {
    PrismaClient
} = require('@prisma/client');
// const { workQueue, jobOpts } = require('../../config/redis.config');
// const { LAZADA, LAZADA_CHAT, lazGetOrderItems, lazGenToken, lazadaAuthHost, lazGetSellerInfo, lazadaHost } = require('../../config/utils');
// const { lazParamz, lazCall } = require('../../functions/lazada/caller');

let test = require('dotenv').config()

const prisma = new PrismaClient();
/* GET home page. */

router.get('/', async function(req, res, next) {
    let channels = await prisma.channel.findMany({ })
    res.status(200).send(channels);
})

router.get('/products', async function(req, res, next) {
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
})

module.exports = router;