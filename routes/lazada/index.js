var express = require('express');
var router = express.Router();
var {
    PrismaClient
} = require('@prisma/client');
const { workQueue, jobOpts } = require('../../config/redis.config');

const prisma = new PrismaClient();
/* GET home page. */
router.get('/webhook', async function (req, res, next) {
    res.status(200).send({});
});

router.post('/webhook', async function (req, res, next) {
    console.log(req.body);
    workQueue.add({channel:'lazada', body: req.body}, jobOpts);
    res.status(200).send({});
});

const sample = {
    seller_id: '9999',
    message_type: 0,
    data: {
        order_status: 'This is a test message',
        trade_order_id: '123456',
        trade_order_line_id: '12345',
        status_update_time: 1733388276
    },
    timestamp: 1733388276,
    site: 'lazada_sg'
}

module.exports = router;
