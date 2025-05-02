var express = require('express');
var router = express.Router();
var { PrismaClient, Prisma } = require('@prisma/client');
var CryptoJS = require("crypto-js");
const { gcpParser } = require('../../functions/gcpParser');
const { pushTask } = require('../../functions/queue/task');
const { api } = require('../../functions/axios/Axioser');
const { GET_SHOPEE_TOKEN, GET_SHOPEE_SHOP_INFO_PATH, SHOPEE_HOST } = require('../../config/shopee_apis');
const { SHOPEE } = require('../../config/utils');
var env = process.env.NODE_ENV || 'development';
const prisma = new PrismaClient();

/* GET home page. */
router.get('/webhook', async function (req, res, next) {
    res.status(200).send({});
});

router.get('/sync', async function(req, res, next) {
    // console.log(JSON.stringify(req.body))
    let taskPayload = {
        channel: SHOPEE,
        process: 'sync',
        shop_id: 138335,
        m_shop_id: 6,
        code: 9999,
        token: '69484741526b704942426c55716d6873',
        refresh_token: '6c4e6277496a61435948445950707255'
    }
    // console.log(taskPayload);
    pushTask(env, taskPayload)
    res.status(200).send({});
})

router.post('/webhook', async function (req, res, next) {
    // let jsonBody = gcpParser(req.body.message.data);
    let jsonBody = req.body;
    
    console.log(JSON.stringify(jsonBody));
    let payloadCode = jsonBody.code;
    let response;
    switch (payloadCode) {
        case 3:
            let newOrder = await prisma.orders.upsert({
                where: {
                    origin_id: jsonBody.data.ordersn
                },
                update: {
                    status: jsonBody.data.status
                },
                create: {
                    origin_id: jsonBody.data.ordersn,
                    status: jsonBody.data.status,
                    store: {
                        connect: {
                            // origin_id: jsonBody.shop_id.toString()
                            origin_id: '138335'
                        }
                    }
                },
                include: {
                    store: true,
                    order_items: true
                }
            });
            response = newOrder;
            let taskPayload = {
                channel: SHOPEE, 
                order_id: jsonBody.data.ordersn,
                id: newOrder.id,
                token: newOrder.store.token,
                code: payloadCode,
                shop_id: jsonBody.shop_id,
                refresh_token: newOrder.store.refresh_token
            }
            pushTask(env, taskPayload);
            break;
        case 10:
            response = {};
            if (jsonBody.data.type == 'message') {
                let newMsg = await prisma.omnichat.upsert({
                    create: {
                        origin_id: jsonBody.data.content.conversation_id,
                        last_message: msgContainer(jsonBody.data.content.message_type, jsonBody.data.content.content),
                        last_messageId: jsonBody.data.content.message_id,
                        store: {
                            connect: {
                                // origin_id: jsonBody.shop_id.toString()
                                origin_id: '138335'
                            }
                        },
                        omnichat_user: {
                            connectOrCreate: {
                                create: {
                                    origin_id: jsonBody.data.content.from_id.toString(),
                                    username: jsonBody.data.content.from_user_name,
                                },
                                where: {
                                    origin_id: jsonBody.data.content.from_id.toString()
                                }
                            }
                        },
                        messages: {
                            create: {
                                line_text: msgContainer(jsonBody.data.content.message_type, jsonBody.data.content.content),
                                chat_type: jsonBody.data.content.message_type,
                                origin_id: jsonBody.data.content.message_id,
                                author: jsonBody.data.content.from_id.toString()
                            }
                        }
                    },
                    update: {
                        last_message: msgContainer(jsonBody.data.content.message_type, jsonBody.data.content.content),
                        last_messageId: jsonBody.data.content.message_id,
                        messages: {
                            create: {
                                line_text: msgContainer(jsonBody.data.content.message_type, jsonBody.data.content.content),
                                chat_type: jsonBody.data.content.message_type,
                                origin_id: jsonBody.data.content.message_id,
                                author: jsonBody.data.content.from_id.toString()
                            }
                        }
                    },
                    where: {
                        origin_id: jsonBody.data.content.conversation_id
                    }
                });
                response = newMsg;
                /* no need to push to worker */
            }
            break;
        default:
            response = jsonBody.data;
            console.log('CODE: %s Not implemented yet!', payloadCode);
            break;
    }    
    res.status(200).send(response);
});

function msgContainer (msgType, content) {
    let msgContent;
    switch (msgType) {
        case 'text':
            msgContent = content.text;
            break;
        case 'image':
            msgContent = content.url;
            break;
        case 'video':
            msgContent = content.video_url;
            break;
        default:
            msgContent = content.text;
    }
    return msgContent;
}

router.post('/order', async function(req, res, next) {
    // let jsonBody = gcpParser(req.body.message.data);
    // let jsonBody = JSON.parse(Buffer.from(req.body.message.data, 'base64').toString('utf8'));
    res.status(200).send({});
    
});

router.put('/order/:id', async function(req, res, next) {
    res.status(200).send({});
});


router.post('/chat', async function(req, res, next) {
    res.status(200).send({});
    
})

router.post('/authorize', async function(req, res, next) {
    // let appKeyId = (req.body.app == 'chat') ? process.env.LAZ_APP_KEY_ID : process.env.LAZ_OMS_APP_KEY_ID;
    // let addParams = `code=${req.body.code}`;
    // let authResponse = await lazCall(lazGetToken(appKeyId), addParams, '', '', appKeyId);
    // if (authResponse.code != '0') {
    //     return res.status(400).send({process: 'generate_token', response: authResponse});
    // }
    // let token = authResponse.access_token;
    // let refToken = authResponse.refresh_token;
    // let sellerResponse = await lazCall(lazGetSellerInfo(appKeyId), '', refToken, token);
    // if (sellerResponse.code != '0') {
    //     return res.status(400).send({process: 'get_seller_info', response: sellerResponse});
    // }

    // console.log(JSON.stringify(req.body));
  
    const ts = Math.floor(Date.now() / 1000);
    const PARTNER_ID = process.env.SHOPEE_PARTNER_ID;
    const PARTNER_KEY = process.env.SHOPEE_PARTNER_KEY;
    var shopeeSignString = `${PARTNER_ID}${GET_SHOPEE_TOKEN}${ts}`;

    var sign = CryptoJS.HmacSHA256(shopeeSignString, PARTNER_KEY).toString(CryptoJS.enc.Hex);
    let bodyPayload = {
        code: req.body.code,
        partner_id: Number.parseInt(PARTNER_ID),
        shop_id: Number.parseInt(req.body.shop_id),
    }
    let token = await api.post(
        `${SHOPEE_HOST}${GET_SHOPEE_TOKEN}?partner_id=${PARTNER_ID}&timestamp=${ts}&sign=${sign}`,
        JSON.stringify(bodyPayload), 
        {
            headers: {
                Accept: 'application/json',
                'Content-Type': 'application/json'
            }
        }
    ).catch(function (err) {
        console.log(err.response.data);
        return res.status(400).send({error: err.response.data});
    });

    if (token.data) {
        if (token.data.error) {
            console.log(token.data);
            return res.status(400).send(token.data);
        }
        console.log(token.data);
        shopeeSignString = `${PARTNER_ID}${GET_SHOPEE_SHOP_INFO_PATH}${ts}${token.data.access_token}${req.body.shop_id}`;
        sign = CryptoJS.HmacSHA256(shopeeSignString, PARTNER_KEY).toString(CryptoJS.enc.Hex);
        const shopInfoParams = `partner_id=${PARTNER_ID}&timestamp=${ts}&access_token=${token.data.access_token}&shop_id=${req.body.shop_id}&sign=${sign}`;
        let shopInfo = await api.get(
            `${SHOPEE_HOST}${GET_SHOPEE_SHOP_INFO_PATH}?${shopInfoParams}`,
        ).catch(function(err) {
            console.log(err.response.data);
            return res.status(400).send({error: err.response.data});
        });
        if (shopInfo.data) {
            if (shopInfo.data.error) {
                console.log(shopInfo.data);
                return res.status(400).send(shopInfo.data);
            }
            console.log(shopInfo.data);
            let newStore = await prisma.store.upsert({
                where: {
                    origin_id: req.body.shop_id.toString()
                },
                update: {
                    status: 'ACTIVE',
                    token: token.data.access_token,
                    refresh_token: token.data.refresh_token
                },
                create: {
                    origin_id: req.body.shop_id.toString(),
                    name: shopInfo.data.shop_name,
                    token: token.data.access_token,
                    status: 'ACTIVE',
                    refresh_token: token.data.refresh_token,
                    channel: {
                        connectOrCreate: {
                            where: {
                                name: SHOPEE
                            },
                            create: {
                                name: SHOPEE
                            }
                        }
                    }
                }
            }).catch(function (err) {
                console.log(err);
                return res.status(400).send({error: err});
            });
            console.log(newStore);
            if (newStore) {
                let taskPayload = {
                    channel: SHOPEE,
                    process: 'sync',
                    shop_id: req.body.shop_id,
                    token: token.data.access_token,
                    refresh_token: token.data.refresh_token
                }
                // console.log(taskPayload);
                pushTask(env, taskPayload)
                res.status(200).send(newStore);
            } else {
                res.status(400).send(newStore);
            }
        }
    }
})

// function pushTask (env, taskPayload) {
//     if (env == 'development') {
//         workQueue.add(taskPayload, jobOpts);
//     } else {
//         addTask(taskPayload);
//     }
// }

async function collectOrders (orders) {
    // console.log(orders);
    let storeId = orders.shop_id;
    let orderId = orders.data.ordersn;
    let orderStatus = orders.data.status;
    try {
         let newOrder = await prisma.orders.create({
             data: {
                 origin_id: orderId,
                 storeId: storeId,
                 status: orderStatus,
             },
             include: {
                 store: true,
             }
         })
         res.status(200).send(newOrder);
    } catch (err) {
        if (err instanceof Prisma.PrismaClientKnownRequestError) {
            if (err.code === 'P2002') {
                let taskPayload = {
                    channel: SHOPEE, 
                    orderId: orderId, 
                    orderStatus: orderStatus,
                    new: false
                }
                pushTask(env, taskPayload);
                res.status(200).send({});
            } else {
                res.status(400).send({err: err});
            }
        } else {
            console.log(err);
            res.status(400).send({err: err});
        }
    }

    
    let taskPayload = {
        channel: SHOPEE, 
        orderId: orderId, 
        id: newOrder.id,
        token: newOrder.store.token,
        refresh_token: newOrder.store.refresh_token,
        new: true,
    }
   pushTask(env, taskPayload)
//    return newOrder;
}

module.exports = router;