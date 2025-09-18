var express = require('express');
var router = express.Router();
const { PrismaClient: prismaBaseClient } = require('../../prisma/generated/baseClient');
const { gcpParser } = require('../../functions/gcpParser');
const { pushTask } = require('../../functions/queue/task');
const { api } = require('../../functions/axios/interceptor');
const { GET_SHOPEE_TOKEN, GET_SHOPEE_SHOP_INFO_PATH, SHOPEE_HOST, GET_SHOPEE_SHIP_PARAMS, SHOPEE_CANCEL_ORDER, SHOPEE_SHIP_ORDER, GET_SHOPEE_ORDER_DETAIL, PARTNER_ID, PARTNER_KEY } = require('../../config/shopee_apis');
const { SHOPEE, PATH_AUTH, PATH_CHAT, PATH_WEBHOOK, storeStatuses } = require('../../config/utils');
const { generateShopeeToken } = require('../../functions/shopee/function');
const { getPrismaClientForTenant } = require('../../services/prismaServices');
const { encryptData, decryptData } = require('../../functions/encryption');
const { getTenantDB } = require('../../middleware/tenantIdentifier');
const { createHmac } = require('crypto');
const { PrismaClient } = require('../../prisma/generated/client');
// const { PrismaClient: prismaMainClient } = require('../../../prisma/generated/client');
var env = process.env.NODE_ENV || 'development';
// const prisma = new PrismaClient();
const basePrisma = new prismaBaseClient();
let prisma = new PrismaClient();

// const prisma = new prismaMainClient({datasources: {db: {url: }}});

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

router.post(PATH_WEBHOOK, async function (req, res, next) {
    let jsonBody = {};
    if (process.env.NODE_ENV == 'production') {
        jsonBody = gcpParser(req.body.message.data);
    } else {
        jsonBody = req.body;
    }
    if (req.body.code == 0) {
        return res.status(200).send({message:' ok'});
    }
    basePrisma.stores.findUnique({
        where: {
            origin_id: jsonBody.shop_id.toString()
        },
        include: {
            clients: true
        }
    }).then(async (mBase) => {
        const org = Buffer.from(mBase.clients.org_id, 'base64').toString('ascii').split(':');
        const tenantDbUrl = getTenantDB(org[1]);
        prisma = getPrismaClientForTenant(org[1], tenantDbUrl.url);
        // prisma = getPrismaClientForTenant(mBase.clients.org_id, tenantDbUrl.url)
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
                                origin_id: jsonBody.shop_id.toString()
                                // origin_id: '138335'
                            }
                        }
                    },
                    include: {
                        store: true,
                        order_items: {
                            select: { id: true }
                        }
                    }
                });
                response = newOrder;
                let taskPayload = {
                    channel: SHOPEE, 
                    order_id: jsonBody.data.ordersn,
                    id: newOrder.id,
                    token: decryptData(newOrder.store.token),
                    code: payloadCode,
                    m_shop_id: newOrder.store.id,
                    shop_id: jsonBody.shop_id,
                    refresh_token: decryptData(newOrder.store.refresh_token),
                    tenantDB: tenantDbUrl,
                    org_id: org[1]
                }
                if (newOrder.order_items.length == 0) {
                    if (newOrder.store.status != storeStatuses.EXPIRED) {
                        pushTask(env, taskPayload);
                    } else {
                        console.log('Shopee store: %s Expired', newOrder.store.id);
                    }
                }
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
                                    origin_id: jsonBody.shop_id.toString()
                                }
                            },
                            customer: {
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
                        },
                        select: {
                            id: true,
                            origin_id: true,
                            externalId: true,
                            customer: {
                                select: {
                                    name: true,
                                    id: true, 
                                    origin_id: true,
                                    email: true
                                }
                            },
                            store: {
                                include: {
                                    channel: {
                                        select: {
                                            client: {
                                                select: {
                                                    integration: {
                                                        select: {
                                                            name: true,
                                                            notes: true,
                                                            id: true,
                                                            credent: true
                                                        }
                                                    }
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    });
                    response = newMsg;
                    /* no need to push to worker */
                }
                break;
            case 29: 
                /* let returnRefund = await prisma.return_refund.upsert({
                    where: {
                        origin_id: jsonBody.data.return_sn
                    },
                    update: {
                        
                    }
                }) */
                break;
            default:
                response = jsonBody.data;
                console.log('CODE: %s Not implemented yet!', payloadCode);
                break;
        }
        res.status(200).send(response);
        
    }).catch((err) => {
        console.log('Error fetching store: ', err);
        return res.status(500).send({ error: 'Internal Server Error' });
    })
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

/* router.post('/order', async function(req, res, next) {
    // let jsonBody = gcpParser(req.body.message.data);
    // let jsonBody = JSON.parse(Buffer.from(req.body.message.data, 'base64').toString('utf8'));
    res.status(200).send({});
}); */

/* router.post(PATH_CHAT, async function(req, res, next) {
    res.status(200).send({});
}); */

router.put('/order/:id', async function(req, res, next) {
    prisma = req.prisma;
    // const prisma = getPrismaClient(req.tenantDB);
    const orders = await prisma.orders.findUnique({
        where: {
            id: Number.parseInt(req.params.id)
        },
        include: {
            store: true,
            order_items: {
                select: { products: true }
            }
        }
    });
    if (!orders) {
        return res.status(404).send({error: 'order not found'});
    }
    if (req.body.action == 'cancel') {
        const cancelPayload = {
            order_sn: orders.origin_id,
            cancel_reason: req.body.cancel_reason,
            ...(req.body.cancel_reason == 'OUT_OF_STOCK' && {
                item_list: orders.order_items.map((item) => {
                    return {
                        item_id: Number.parseInt(item.products.origin_id.split('-')[0]),
                        model_id: Number.parseInt(item.products.origin_id.split('-')[1])
                    }
                })
            })
        }
        // console.log(SHOPEE_CANCEL_ORDER(orders.store.token, orders.origin_id, orders.store.origin_id, req.body.cancel_reason));
        // console.log(JSON.stringify(cancelPayload));
        const cancelOrder = await api.post(
            SHOPEE_CANCEL_ORDER(orders.store.token, orders.origin_id, orders.store.origin_id, req.body.cancel_reason),
            JSON.stringify(cancelPayload)).catch(async function (err) {
            if ((err.status === 403) && (err.response.data.error === 'invalid_acceess_token')) {
                console.log(`error status ${err.status} response ${err.response.data.error}`);
                let newToken = await generateShopeeToken(orders.store.origin_id, orders.store.refresh_token);
                if (newToken.access_token) {
                    return api.post(
                        SHOPEE_CANCEL_ORDER(newToken.access_token, orders.origin_id, orders.store.origin_id, req.body.cancel_reason),
                        JSON.stringify(cancelPayload)
                    );
                }
            } else {
                console.log(err);
                return res.status(400).send(err);
            }
        });
        if (cancelOrder.data.error) {
            return res.status(400).send(cancelOrder.data);
        }
        res.status(200).send(cancelPayload);

    } else {
        let accessToken = orders.store.token
        const shipParams = await api.get(
            GET_SHOPEE_SHIP_PARAMS(accessToken, orders.origin_id, orders.store.origin_id)).catch(async function (err) {
            if ((err.status === 403) && (err.response.data.error === 'invalid_acceess_token')) {
                console.log(`error status ${err.status} response ${err.response.data.error}`);
                let newToken = await generateShopeeToken(orders.store.origin_id, orders.store.refresh_token);
                if (newToken.access_token) {
                    accessToken = newToken.access_token;
                    return api.get(
                        GET_SHOPEE_SHIP_PARAMS(newToken.access_token, orders.origin_id, orders.store.origin_id)
                    );
                }
            } else {
                console.log(err);
                return res.status(400).send(err);
            }
        });
        if (shipParams.data.error) {
            return res.status(400).send(shipParams.data);
        }
        // console.log(JSON.stringify(shipParams.data));
        const shipmentPayload = {
            order_sn: orders.origin_id,
            pickup: {
                address_id: 0
            }
        };
        const shipArrangement = await api.post(
            SHOPEE_SHIP_ORDER(accessToken, orders.store.origin_id),
            JSON.stringify(shipmentPayload)).catch(async function(err) {
                if ((err.status === 403) && (err.response.data.error === 'invalid_acceess_token')) {
                    console.log(`error status ${err.status} response ${err.response.data.error}`);
                    let newToken = await generateShopeeToken(orders.store.origin_id, orders.store.refresh_token);
                    if (newToken.access_token) {
                        accessToken = newToken.access_token;
                        return api.get(
                            SHOPEE_SHIP_ORDER(accessToken, orders.store.origin_id)
                        );
                    }
                } else {
                    console.log(err);
                    return res.status(400).send(err);
                }
        });
        if (shipArrangement.data.error) {
            return res.status(400).send({
                parameter: shipParams.data,
                arrangement: shipArrangement.data
            });
        }
        res.status(200).send(shipParams.data);
    }
})

router.post(PATH_AUTH, async function(req, res, next) {
    if (!req.body.code) {
        return res.status(400).send({error: 'Missing authorization code'});
    }
    prisma = req.prisma;
    // const prisma = getPrismaClient(req.tenantDB);
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
    var shopeeSignString = `${PARTNER_ID}${GET_SHOPEE_TOKEN}${ts}`;
    // var sign = CryptoJS.HmacSHA256(shopeeSignString, PARTNER_KEY).toString(CryptoJS.enc.Hex);
    var sign = createHmac('sha256', PARTNER_KEY).update(shopeeSignString).digest('hex');
    const bodyPayload = {
        code: req.body.code,
        partner_id: Number.parseInt(PARTNER_ID),
        shop_id: Number.parseInt(req.body.shop_id),
    }

    /* Generate shopee access token */
    let token = {};
    try {
        token = await api.post(
            `${SHOPEE_HOST}${GET_SHOPEE_TOKEN}?partner_id=${PARTNER_ID}&timestamp=${ts}&sign=${sign}`,
            JSON.stringify(bodyPayload),
            {
                headers: {
                    Accept: 'application/json',
                    'Content-Type': 'application/json'
                }
            }
        )
    } catch (err) {
        if (err.response) {
            console.log(err.response.data);
            return res.status(400).send({error: err.response.data});
        } else {
            console.log(err);
            return res.status(400).send({error: 'Failed to connect to Shopee API'});
        }
    }

    if (token.data) {
        if (token.data.error) {
            console.log(token.data);
            return res.status(400).send(token.data);
        }
        shopeeSignString = `${PARTNER_ID}${GET_SHOPEE_SHOP_INFO_PATH}${ts}${token.data.access_token}${req.body.shop_id}`;
        // sign = CryptoJS.HmacSHA256(shopeeSignString, PARTNER_KEY).toString(CryptoJS.enc.Hex);
        sign = createHmac('sha256', PARTNER_KEY).update(shopeeSignString).digest('hex');
        const shopInfoParams = `partner_id=${PARTNER_ID}&timestamp=${ts}&access_token=${token.data.access_token}&shop_id=${req.body.shop_id}&sign=${sign}`;
        let shopInfo = {};
        try {
            shopInfo = await api.get(`${SHOPEE_HOST}${GET_SHOPEE_SHOP_INFO_PATH}?${shopInfoParams}`)
        } catch (err) {
            console.log(err.response.data);
            return res.status(400).send({error: err.response.data});
        }
        
        if (shopInfo.data) {
            if (shopInfo.data.error) {
                console.log(shopInfo.data);
                return res.status(400).send(shopInfo.data);
            }
            // console.log(shopInfo.data);
             
            const orgBase64 = Buffer.from(`${req.auth.payload.org_id}:${convertOrgName(req.auth.payload.morg_name)}`).toString('base64');
            let clientStored = await Promise.all([
                prisma.store.upsert({
                    where: {
                        origin_id: req.body.shop_id.toString()
                    },
                    update: {
                        status: 'ACTIVE',
                        token: encryptData(token.data.access_token),
                        refresh_token: encryptData(token.data.refresh_token)
                    },
                    create: {
                        origin_id: req.body.shop_id.toString(),
                        name: shopInfo.data.shop_name,
                        token: encryptData(token.data.access_token),
                        status: 'ACTIVE',
                        refresh_token: encryptData(token.data.refresh_token),
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
                }),
                basePrisma.stores.upsert({
                    where: {
                        origin_id: req.body.shop_id.toString()
                    },
                    create: {
                        origin_id: req.body.shop_id.toString(),
                        clients: {
                            connectOrCreate: {
                                where: {
                                    org_id: orgBase64
                                }, 
                                create: {
                                    org_id: orgBase64
                                }
                            }
                        }
                    },
                    update: {
                        clients: {
                            connectOrCreate: {
                                where: {
                                    org_id: orgBase64
                                },
                                create: {
                                    org_id: orgBase64
                                }
                            }
                        }
                    }
                })
            ])
            /* let newStore = await prisma.store.upsert({
                where: {
                    origin_id: req.body.shop_id.toString()
                },
                update: {
                    status: 'ACTIVE',
                    token: encryptData(token.data.access_token),
                    refresh_token: encryptData(token.data.refresh_token)
                },
                create: {
                    origin_id: req.body.shop_id.toString(),
                    name: shopInfo.data.shop_name,
                    token: encryptData(token.data.access_token),
                    status: 'ACTIVE',
                    refresh_token: encryptData(token.data.refresh_token),
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
            }); */
            // console.log(newStore);
            console.log(clientStored[0]);
            if (clientStored[0]) {
                /* DO SYNC PRODUCTS */
                let taskPayload = {
                    channel: SHOPEE,
                    code: 9999,
                    shop_id: req.body.shop_id,
                    token: token.data.access_token,
                    refresh_token: token.data.refresh_token,
                    org_id: req.auth.payload.org_id
                }
                // console.log(taskPayload);
                pushTask(env, taskPayload)
                res.status(200).send(clientStored[0]);
            } else {
                res.status(400).send(clientStored[0]);
            }
        } else {
            return res.status(400).send({error: 'No response from Shopee API'});
        }
    } else {
        return res.status(400).send({error: 'No response from Shopee API'});
    }
})

router.get('/order_detail', async function(req, res, next) {
    let orderId = req.query.order_id;
    let shopId = req.query.shop_id;
    let token = req.query.token;

    if (!orderId || !shopId || !token) {
        return res.status(400).send({ error: 'Missing required parameters' });
    }

    try {
        let order = await api.get(GET_SHOPEE_ORDER_DETAIL(token, orderId, shopId));

        if (order.data) {
            res.status(200).send(order.data);
        } else {
            res.status(404).send({ error: 'Order not found' });
        }
    } catch (error) {
        console.error(error);
        res.status(400).send(err.response.data);
    }
})

module.exports = router;