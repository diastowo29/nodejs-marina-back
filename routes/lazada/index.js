var express = require('express');
var router = express.Router();
var {
    PrismaClient,
    Prisma
} = require('@prisma/client');
const { workQueue, jobOpts } = require('../../config/redis.config');
const { LAZADA, LAZADA_CHAT, lazGetOrderItems, lazGenToken, lazadaAuthHost, lazGetSellerInfo, lazadaHost, sampleLazOMSToken, lazPackOrder } = require('../../config/utils');
const { lazParamz, lazCall, lazPostCall } = require('../../functions/lazada/caller');
const { gcpParser } = require('../../functions/gcpParser');

let test = require('dotenv').config()
const prisma = new PrismaClient();
/* GET home page. */
router.get('/webhook', async function (req, res, next) {
    res.status(200).send({});
});

router.post('/webhook', async function (req, res, next) {
    console.log(req.body);
    workQueue.add({channel:LAZADA, body: req.body}, jobOpts);
    res.status(200).send({});
});

router.post('/order', async function(req, res, next) {
    let jsonBody = gcpParser(req.body.message.data);
    // let jsonBody = JSON.parse(Buffer.from(req.body.message.data, 'base64').toString('utf8'));
    if (jsonBody.seller_id == '9999') {
        res.status(200).send({});
        return;
    }
    if (jsonBody.message_type == 0) {
        console.log(`inbound order ${jsonBody.data.trade_order_id} from ${jsonBody.seller_id}`);
        // console.log(req.body);
        try {
            let newOrder = await prisma.orders.create({
                data: {
                    origin_id: jsonBody.data.trade_order_id.toString(),
                    status: jsonBody.data.order_status,
                    updatedAt: new Date(),
                    store: {
                        connect: {
                            origin_id: jsonBody.seller_id.toString()
                        }
                    }
                },
                include: {
                    store: true
                }
            });
             workQueue.add({
                channel: LAZADA, 
                orderId: jsonBody.data.trade_order_id, 
                customerId: jsonBody.data.buyer_id,
                id: newOrder.id,
                token: newOrder.store.token,
                refresh_token: newOrder.store.refresh_token,
                new: true,
                // ...((newOrder.order_items.length > 0) ? {new: false} : {new:true})
            }, jobOpts);
            res.status(200).send(newOrder);
        } catch (err) {
            console.log(req.body.message.data);
            if (err instanceof Prisma.PrismaClientKnownRequestError) {
                if (err.code === 'P2002') {
                    workQueue.add({
                        channel: LAZADA,
                        status: jsonBody.data.order_status,
                        updatedAt: new Date(),
                        orderId: jsonBody.data.trade_order_id,
                        new: false,
                    }, jobOpts);
                    res.status(200).send({});
                } else {
                    res.status(400).send({err: err});
                }
            } else {
                console.log(err);
                res.status(400).send({err: err});
            }
        }
    } else if(jsonBody.message_type == 21) {
        /* product review
        eyJzZWxsZXJfaWQiOiI0MDA2NTY1NzYxMDciLCJtZXNzYWdlX3R5cGUiOjIxLCJkYXRhIjp7Iml0ZW1faWQiOjgyOTg3ODgzNTksImlkIjoxNTMwMDEzMTE5Njg4MzU5LCJvcmRlcl9pZCI6MTU3MTg2MDg3NjE2OTAwN30sInRpbWVzdGFtcCI6MTczNjQ3Njc5Nywic2l0ZSI6ImxhemFkYV9pZCJ9
         */

        /* cancel success
        eyJzZWxsZXJfaWQiOiI0MDA2NTY1NzYxMDciLCJtZXNzYWdlX3R5cGUiOjEwLCJkYXRhIjp7ImJ1eWVyX2lkIjo0MDA2NTk2NjkwMDcsImV4dHJhUGFyYW1zIjp7fSwicmV2ZXJzZV9vcmRlcl9pZCI6ODU2MjI5ODA1MTY5MDA3LCJyZXZlcnNlX29yZGVyX2xpbmVfaWQiOjg1NjIyOTgwNTI2OTAwNywicmV2ZXJzZV9zdGF0dXMiOiJDQU5DRUxfU1VDQ0VTUyIsInNlbGxlcl9pZCI6NDAwNjU2NTc2MTA3LCJzdGF0dXNfdXBkYXRlX3RpbWUiOjE3MzY0NzM1ODIsInRyYWRlX29yZGVyX2lkIjoxNTk2MDk1NDk5OTY5MDA3LCJ0cmFkZV9vcmRlcl9saW5lX2lkIjoxNjExNTk4MTAwMzY5MDA3fSwidGltZXN0YW1wIjoxNzM2NDczNTg3LCJzaXRlIjoibGF6YWRhX2lkIn0=
         */
        
        console.log('inbound another message type');
        console.log(req.body.message.data);
        res.status(200).send({});
    } else {
        console.log('inbound another message type');
        console.log(req.body.message.data);
        res.status(200).send({});
    }
});

router.put('/order/:id', async function(req, res, next) {
    let order = await prisma.orders.findUnique({
        where: {
            id: Number.parseInt(req.params.id)
        },
        include: {
            order_items: true
        }
    });
    let orderItemIds = [];
    order.order_items.forEach(item => {
        orderItemIds.push(Number.parseInt(item.origin_id))
    });
    // let updateOrderParams = lazParamz(appKeyId, '', Date.now(), 'refToken', '50000700338bKKractvEylKDuyOxZc4fXgjpZwuC9iBy3pW0D6144cc65eaSsSJu', lazPackOrder, addParams);
    // let updateOrder = await lazPostCall(`${lazadaHost}${lazPackOrder}?${updateOrderParams.params}&sign=${updateOrderParams.signed}`, '');

    let packReq = {
        pack_order_list: [
            {
                order_item_list: orderItemIds,
                order_id: order.origin_id
            }
        ],
        delivery_type: 'dropship',
        shipping_allocate_type: 'TFS',
    }
    let apiParams = `packReq=${JSON.stringify(packReq)}`;
    // let packOrder = await lazPostCall(lazPackOrder, apiParams, 'refToken', sampleLazOMSToken);
    res.status(200).send(packOrder);
})

router.post('/chat', async function(req, res, next) {
    console.log(req.body.message.data);
    let jsonBody = gcpParser(req.body.message.data);
    if (jsonBody.message_type != 2) {
        res.status(200).send({});
        return;
    };
    // console.log(jsonBody);
    let bodyData = jsonBody.data;
    let sessionId = bodyData.session_id;
    let userId = bodyData.from_user_id;
    let messageId = bodyData.message_id;
    try {
        let conversation = await prisma.omnichat.upsert({
            include: {
                omnichat_user: true,
                store: true
            },
            where: {
                origin_id: `${jsonBody.seller_id}-${userId}`
            },
            update: {
                last_message: bodyData.content
            },
            create: {
                origin_id: `${jsonBody.seller_id}-${userId}`,
                last_message: bodyData.content,
                last_messageId: messageId,
                store: {
                    connect: {
                        origin_id: jsonBody.seller_id
                    }
                },
                messages: {
                    create: {
                        line_text: bodyData.content,
                        author: userId
                    }
                },
                omnichat_user: {
                    connectOrCreate: {
                        where: {
                            origin_id: userId.toString(),
                        },
                        create: {
                            origin_id: userId.toString()
                        }
                    }
                }
            }
        });
        workQueue.add({
            channel: LAZADA_CHAT, 
            sessionId: sessionId, 
            id: conversation.id,
            token: conversation.store.token,
            refresh_token: conversation.store.refresh_token,
            ...((conversation.omnichat_user.username == null) ? {new: true} : {new:false})
        }, jobOpts);
        res.status(200).send(conversation);
    } catch (err) {
        if (err instanceof Prisma.PrismaClientUnknownRequestError) {
            res.status(400).send({code: err.code});
        } else {
            if (err.code == 'P2025') {
                console.log(`error on chat ${err.meta.cause}`);
                res.status(200).send({error: err});
            } else {
                res.status(400).send({error: err});
            }
        }
    }
})

router.post('/authorize', async function(req, res, next) {
    let code = req.body.code;
    let app = req.body.app;
    console.log(req.body);

    let appKeyId = (app == 1) ? test.parsed.LAZ_APP_KEY_ID : test.parsed.LAZ_APP_KEY_ID_2;
    let endpoint = lazGenToken;
    let authParams = lazParamz(appKeyId, code, Date.now(), '', '', endpoint, '');
    let authResponse = await lazCall(`${lazadaAuthHost}${endpoint}?${authParams.params}&sign=${authParams.signed}`, '');

    if (authResponse.code != '0') {
        console.log(authResponse)
        return res.status(400).send(authResponse);
    }
    let token = authResponse.access_token;
    let refToken = authResponse.refresh_token;

    endpoint = lazGetSellerInfo;
    authParams = lazParamz(appKeyId, '', Date.now(), refToken, token, endpoint, '');
    let sellerResponse = await lazCall(`${lazadaHost}${endpoint}?${authParams.params}&sign=${authParams.signed}`, '');
    if (sellerResponse != '0') {
        console.log(sellerResponse);
        res.status(200).send(sellerResponse);
    }

})


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
