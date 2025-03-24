var express = require('express');
var router = express.Router();
var {
    PrismaClient,
    Prisma
} = require('@prisma/client');
const { LAZADA, LAZADA_CHAT, lazGetOrderItems, lazadaAuthHost, lazGetSellerInfo, lazadaHost, sampleLazOMSToken, lazPackOrder, lazGetToken, lazReplyChat, CHAT_TEXT } = require('../../config/utils');
const { lazParamz, lazCall, lazPostCall } = require('../../functions/lazada/caller');
const { gcpParser } = require('../../functions/gcpParser');
const { pushTask } = require('../../functions/queue/task');
var env = process.env.NODE_ENV || 'development';

// let test = require('dotenv').config()
const prisma = new PrismaClient();
/* GET home page. */
router.get('/webhook', async function (req, res, next) {
    res.status(200).send({});
});

router.post('/webhook', async function (req, res, next) {
    console.log(req.body);
    // workQueue.add({channel:LAZADA, body: req.body}, jobOpts);
    res.status(200).send({});
});

router.post('/order', async function(req, res, next) {
    let jsonBody = gcpParser(req.body.message.data);
    // let jsonBody = JSON.parse(Buffer.from(req.body.message.data, 'base64').toString('utf8'));
    
});

router.put('/order/:id', async function(req, res, next) {
    
});


router.post('/chat', async function(req, res, next) {
    
})

router.post('/authorize', async function(req, res, next) {
    let appKeyId = (req.body.app == 'chat') ? process.env.LAZ_APP_KEY_ID : process.env.LAZ_OMS_APP_KEY_ID;
    let addParams = `code=${req.body.code}`;
    let authResponse = await lazCall(lazGetToken(appKeyId), addParams, '', '', appKeyId);
    if (authResponse.code != '0') {
        return res.status(400).send({process: 'generate_token', response: authResponse});
    }
    let token = authResponse.access_token;
    let refToken = authResponse.refresh_token;
    let sellerResponse = await lazCall(lazGetSellerInfo(appKeyId), '', refToken, token);
    if (sellerResponse.code != '0') {
        return res.status(400).send({process: 'get_seller_info', response: sellerResponse});
    }
    let newStore = await prisma.store.upsert({
        where: {
            origin_id: sellerResponse.data.seller_id.toString()
        },
        update: {
            token: token,
            refresh_token: refToken
        },
        create: {
            origin_id: sellerResponse.data.seller_id.toString(),
            name: sellerResponse.data.name,
            token: token,
            refresh_token: refToken,
            channel: {
                connect: {
                    id: 2
                }
            }
        }
    });
    res.status(200).send({
        token: authResponse,
        seller: sellerResponse,
        store: newStore
    });
})

// function pushTask (env, taskPayload) {
//     if (env == 'development') {
//         workQueue.add(taskPayload, jobOpts);
//     } else {
//         addTask(taskPayload);
//     }
// }


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