var express = require('express');
var router = express.Router();
const { PrismaClient: prismaBaseClient } = require('../../prisma/generated/baseClient');
const { GET_TOKEN_API, GET_AUTHORIZED_SHOP, APPROVE_CANCELLATION, GET_PRODUCT, CANCEL_ORDER, REJECT_CANCELLATION, GET_ORDER_API, GET_RETURN_RECORDS, SEARCH_RETURN, SEARCH_PRODUCTS, SEARCH_CANCELLATION } = require('../../config/tiktok_apis');
const { api } = require('../../functions/axios/interceptor');
const { TIKTOK, PATH_WEBHOOK, PATH_AUTH, PATH_ORDER, PATH_CANCELLATION, convertOrgName, RRTiktokStatus } = require('../../config/utils');
const { pushTask } = require('../../functions/queue/task');
const { gcpParser } = require('../../functions/gcpParser');
const { getPrismaClientForTenant } = require('../../services/prismaServices');
const { getTenantDB } = require('../../middleware/tenantIdentifier');
const { encryptData } = require('../../functions/encryption');
const { PrismaClient } = require('../../prisma/generated/client');
const { dmmfToRuntimeDataModel } = require('../../prisma/generated/client/runtime/library');
const { callTiktok } = require('../../functions/tiktok/function');
const basePrisma = new prismaBaseClient();
var env = process.env.NODE_ENV || 'development';
let mPrisma = new PrismaClient();


router.get(PATH_WEBHOOK, function (req, res, next) {
    res.status(200).send({})
})

router.post(PATH_WEBHOOK, async function (req, res, next) {
    let jsonBody = {};
    if (process.env.NODE_ENV == 'production') {
        jsonBody = gcpParser(req.body.message.data);
    } else {
        jsonBody = req.body;
    }
    /* if (jsonBody.type == 2) {
        if (jsonBody.data.reverse_event_type) {
            if (jsonBody.data.reverse_event_type == 'UNSUPPORTED') {
                return res.status(200).send({message: 'Unsupported reverse event type, ignoring'});
            }
        }
    } */
    if (jsonBody.type == 1) {
        if (jsonBody.data.order_status) {
            if (jsonBody.data.order_status == 'UNPAID') {
                return res.status(200).send({message: 'Order is unpaid, ignoring'});
            }
        }
    }
    basePrisma.stores.findUnique({
        where: {
            origin_id: jsonBody.shop_id
        },
        include: {
            clients: true
        }
    }).then(async (mBase) => {
        console.log(JSON.stringify(jsonBody.data))
        const org = Buffer.from(mBase.clients.org_id, 'base64').toString('ascii').split(':');
        // console.log(org)
        mPrisma = getPrismaClientForTenant(org[1], getTenantDB(org[1]).url);
        let taskPayload = {};
        switch (jsonBody.type) {
            case 1:
                // const orderStatus = (jsonBody.data.order_status) ? jsonBody.data.order_status : jsonBody.data.reverse_event_type;
                let newOrder = await mPrisma.orders.upsert({
                    where: {
                        origin_id: jsonBody.data.order_id
                    },
                    update: {
                        status: jsonBody.data.order_status
                        // temp_id: (jsonBody.data.order_status) ? '' : jsonBody.data.reverse_order_id,
                        // ...(jsonBody.data.order_status) && {status: jsonBody.data.order_status},
                        /* ...(jsonBody.data.reverse_event_type) && {
                            return_refund: {
                                upsert: {
                                    create: {
                                        origin_id: jsonBody.data.reverse_order_id,
                                        total_amount: 0,
                                        status: orderStatus
                                    },
                                    update: {
                                        status: orderStatus
                                    },
                                    where: {
                                        origin_id: jsonBody.data.reverse_order_id
                                    }
                                }
                            }
                        }, */
                    },
                    create: {
                        origin_id: jsonBody.data.order_id,
                        status: jsonBody.data.order_status,
                        store: {
                            connect: {
                                origin_id: jsonBody.shop_id
                            }
                        }
                    },
                    include: {
                        order_items: {
                            select: {
                                id: true,
                                products: {
                                    select: {
                                        origin_id: true,
                                        product_img: true
                                    }
                                }
                            }
                        },
                        store: {
                            select: {
                                token: true,
                                secondary_token: true,
                                refresh_token: true,
                                id: true,
                                origin_id: true
                            }
                        }
                    }
                });
                let syncProduct = [];
                newOrder.order_items.forEach(item => {
                    if (item.products.product_img.length == 0) {
                        syncProduct.push(item.products.origin_id);
                    }
                });
                taskPayload = {
                    channel: TIKTOK, 
                    order_id: jsonBody.data.order_id,
                    id: newOrder.id,
                    token: newOrder.store.token,
                    code: jsonBody.type,
                    m_shop_id: newOrder.store.id,
                    shop_id: jsonBody.shop_id,
                    status: newOrder.status,
                    cipher: newOrder.store.secondary_token,
                    refresh_token: newOrder.store.refresh_token,
                    returnId: newOrder.temp_id,
                    tenantDB: getTenantDB(org[1]),
                    status: jsonBody.data.status,
                    org_id: org[0],
                    syncProduct: syncProduct
                }
                /* if (jsonBody.type == 2) {
                    taskPayload = {
                        tenantDB: getTenantDB(org[1]),
                        channel: TIKTOK,
                        token: newOrder.store.token,
                        refresh_token: newOrder.store.refresh_token,
                        order_id: jsonBody.data.order_id,
                        cipher: newOrder.store.secondary_token,
                        m_shop_id: newOrder.store.id,
                        m_order_id: newOrder.id,
                        returnId: newOrder.temp_id,
                        status: jsonBody.data.status,
                        code: jsonBody.type,
                        customer_id: newOrder.customers.origin_id,
                        shop_id: jsonBody.shop_id,
                        integration: newOrder.store.channel.client.integration,
                        org_id: org[0]
                    }
                } */
                if (newOrder.order_items.length == 0) {
                    pushTask(env, taskPayload);
                }
                res.status(200).send({order: newOrder.id, origin_id: newOrder.origin_id, status: newOrder.status});
                break;
            case 2:
                console.log('type 2')
                res.status(200).send({});
                break;
            case 6:
                mPrisma.store.update({
                    where: {
                        origin_id: jsonBody.shop_id.toString()
                    },
                    data: {
                        status: 'INACTIVE'
                    }
                }).then(() => {
                    res.status(200).send({});
                })
                break;
            case 11:
                mPrisma.return_refund.upsert({
                    where: {
                        origin_id: jsonBody.data.cancel_id
                    },
                    create: {
                        origin_id: jsonBody.data.cancel_id,
                        return_type: 'CANCELLATION',
                        system_status: jsonBody.data.cancel_status,
                        status: RRTiktokStatus(jsonBody.data.cancel_status),
                        total_amount: 0,
                        order: {
                            connect: {
                                origin_id: jsonBody.data.order_id
                            }
                        }

                    },
                    update: {
                        system_status: jsonBody.data.cancel_status,
                        status: RRTiktokStatus(jsonBody.data.cancel_status),
                    },
                    include: {
                        line_item: true,
                        order: {
                            select: {
                                customers: {
                                    select: {
                                        origin_id: true
                                    }
                                },
                                id: true,
                                store: {
                                    select: {
                                        token: true,
                                        secondary_token: true,
                                        refresh_token: true,
                                        id: true,
                                        origin_id: true,
                                        channel: {
                                            select: {
                                                client: {
                                                    select: {
                                                        integration: {
                                                            select: {
                                                                baseUrl: true,
                                                                credent: true,
                                                                name: true,
                                                                notes: true
                                                            }
                                                        }
                                                    }
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }).then((rr) => {
                    if (rr.line_item.length == 0) {
                        const data = { cancel_ids: [jsonBody.data.cancel_id] }
                        callTiktok('post', SEARCH_CANCELLATION(rr.order.store.secondary_token, data), data, rr.order.store.token, rr.order.store.refresh_token, rr.order.store.id, getTenantDB(org[1]), org[1]).then((tiktokCancel) => {
                            const ccData = tiktokCancel.data.data;
                            if (ccData) {
                                if (ccData.cancellations && ccData.cancellations.length > 0) {
                                    taskPayload = {
                                        tenantDB: getTenantDB(org[1]),
                                        channel: TIKTOK,
                                        token: rr.order.store.token,
                                        refresh_token: rr.order.store.refresh_token,
                                        order_id: jsonBody.data.order_id,
                                        cipher: rr.order.store.secondary_token,
                                        m_shop_id: rr.order.store.id,
                                        m_order_id: rr.order.id,
                                        returnId: jsonBody.data.cancel_id,
                                        status: 'CANCELLATION',
                                        code: jsonBody.type,
                                        customer_id: rr.order.customers.origin_id,
                                        shop_id: jsonBody.shop_id,
                                        integration: rr.order.store.channel.client.integration,
                                        org_id: org[0]
                                    }
                                    pushTask(env, taskPayload);
                                } else {
                                    res.status(400).send({error: 'No return/refund data found'});
                                }
                            } else {
                                res.status(400).send({error: 'No return/refund data found'});
                            }
                        }).catch((err) => {
                            console.log(err);
                            res.status(400).send({error: err});
                        })
                    } else {
                        res.status(200).send({})
                    }
                }).catch ((err) => {
                    console.log(err);
                    res.status(400).send({error: err});
                });
                break;
            case 12:
                mPrisma.return_refund.upsert({
                    where: {
                        origin_id: jsonBody.data.return_id
                    },
                    create: {
                        origin_id: jsonBody.data.return_id,
                        return_type: jsonBody.data.return_type,
                        system_status: jsonBody.data.return_status,
                        status: RRTiktokStatus(jsonBody.data.return_status),
                        total_amount: 0,
                        order: {
                            connect: {
                                origin_id: jsonBody.data.order_id
                            }
                        }

                    },
                    update: {
                        system_status: jsonBody.data.return_status,
                        status: RRTiktokStatus(jsonBody.data.return_status),
                    },
                    include: {
                        order: {
                            select: {
                                customers: {
                                    select: {
                                        origin_id: true
                                    }
                                },
                                id: true,
                                store: {
                                    select: {
                                        token: true,
                                        secondary_token: true,
                                        refresh_token: true,
                                        id: true,
                                        origin_id: true,
                                        channel: {
                                            select: {
                                                client: {
                                                    select: {
                                                        integration: {
                                                            select: {
                                                                baseUrl: true,
                                                                credent: true,
                                                                name: true,
                                                                notes: true
                                                            }
                                                        }
                                                    }
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }).then((rr) => {
                    if (jsonBody.data.return_status == 'RETURN_OR_REFUND_REQUEST_PENDING') {
                        const body = {order_ids: [jsonBody.data.order_id]}
                        callTiktok('POST', SEARCH_RETURN(rr.order.store.secondary_token, body), body, rr.order.store.token, rr.order.store.refresh_token, rr.order.store.id, getTenantDB(org[1]), org[1]).then((tiktokRr) => {
                            const rrData = tiktokRr.data.data;
                            if (rrData) {
                                if (rrData.return_orders && rrData.return_orders.length > 0) {
                                    taskPayload = {
                                        tenantDB: getTenantDB(org[1]),
                                        channel: TIKTOK,
                                        token: rr.order.store.token,
                                        refresh_token: rr.order.store.refresh_token,
                                        order_id: jsonBody.data.order_id,
                                        cipher: rr.order.store.secondary_token,
                                        m_shop_id: rr.order.store.id,
                                        m_order_id: rr.order.id,
                                        returnId: jsonBody.data.return_id,
                                        status: jsonBody.data.return_type,
                                        code: jsonBody.type,
                                        customer_id: rr.order.customers.origin_id,
                                        shop_id: jsonBody.shop_id,
                                        integration: rr.order.store.channel.client.integration,
                                        org_id: org[1]
                                    }
                                    // console.log('goto worker')
                                    pushTask(env, taskPayload);
                                    res.status(200).send({return_refund: rr.id, origin_id: rr.origin_id, status: rr.status});
                                } else {
                                    res.status(400).send({error: 'No return/refund data found'});
                                }
                            } else {
                                res.status(400).send({error: 'No return/refund data found'});
                            }
                        }).catch((err) => {
                            console.log(err);
                            res.status(400).send({error: err});
                        })
                    } else {
                        res.status(200).send({})
                    }
                }).catch ((err) => {
                    console.log(err);
                    res.status(400).send({error: err});
                });
                break;
            case 14:
                 // console.log(JSON.stringify(jsonBody));
                if (jsonBody.data.sender.role == 'SYSTEM') {
                    console.log('system message, ignoring');
                    return res.status(200).send({message: 'system message, ignoring'});
                }
                try {
                    const userExternalId = `tiktok-${jsonBody.data.sender.im_user_id}-${jsonBody.shop_id}`
                    const userName = `Customer ${jsonBody.data.sender.im_user_id}`;
                    console.log(`message ${jsonBody.data.content} id: ${jsonBody.data.message_id}`)
                    let upsertMessage = await mPrisma.omnichat.upsert({
                        where: {
                            origin_id: jsonBody.data.conversation_id
                        },
                        update: {
                            last_message: jsonBody.data.content,
                            last_messageId: jsonBody.data.message_id,
                            customer: {
                                connectOrCreate: {
                                    create: {
                                        name: userName,
                                        origin_id: jsonBody.data.sender.im_user_id
                                    },
                                    where: {
                                        origin_id: jsonBody.data.sender.im_user_id
                                    }
                                }
                            },
                            messages: {
                                connectOrCreate: {
                                    where: {
                                        origin_id: jsonBody.data.message_id
                                    },
                                    create: {
                                        line_text: jsonBody.data.content,
                                        origin_id: jsonBody.data.message_id,
                                        author: (jsonBody.data.sender.role == 'BUYER') ? jsonBody.data.sender.im_user_id : 'agent',
                                        chat_type: jsonBody.data.type
                                    }
                                }
                            },
                        },
                        create: {
                            last_message: jsonBody.data.content,
                            last_messageId: jsonBody.data.message_id,
                            origin_id: jsonBody.data.conversation_id,
                            store: {
                                connect: {
                                    origin_id: jsonBody.shop_id
                                }
                            },
                            messages: {
                                create: {
                                    line_text: jsonBody.data.content,
                                    origin_id: jsonBody.data.message_id,
                                    author: (jsonBody.data.sender.role == 'BUYER') ? jsonBody.data.sender.im_user_id : 'agent',
                                    chat_type: jsonBody.data.type
                                }
                            },
                            customer: {
                                connectOrCreate: {
                                    create: {
                                        name: userName,
                                        origin_id: jsonBody.data.sender.im_user_id
                                    },
                                    where: {
                                        origin_id: jsonBody.data.sender.im_user_id
                                    }
                                }
                            }
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
                    if (upsertMessage.store.channel.client.integration.length > 0) {
                        if (jsonBody.data.sender.role == 'BUYER') {
                            let taskPayload = {
                                channel: TIKTOK,
                                code: jsonBody.type,
                                chat_type: jsonBody.data.type,
                                message: upsertMessage,
                                userExternalId: userExternalId,
                                userName: upsertMessage.customer.name,
                                message_content: jsonBody.data.content,
                                tenantDB: getTenantDB(org[1]),
                                org_id: org[1],
                                syncCustomer: (upsertMessage.customer.name == userName) ? true : false
                            }
                            pushTask(env, taskPayload);
                        }
                    }
                    res.status(200).send({message: {id: upsertMessage.id}});
                } catch (err) {
                    console.log(err);
                    res.status(400).send({error: err});
                }
                break;
            case 15:
                console.log('get product id: ' + jsonBody.data.product_id);
                const productUpdtId = (BigInt(jsonBody.data.product_id) + 44n).toString();
                console.log('updated product id: ' + productUpdtId);
                taskPayload = {
                    tenantDB: getTenantDB(org[1]),
                    channel: TIKTOK,
                    code: jsonBody.type,
                    product_id: productUpdtId,
                    shop_id: jsonBody.shop_id,
                    org_id: org[1]
                }
                pushTask(env, taskPayload);
                res.status(200).send({bigint: productUpdtId, id:jsonBody.data.product_id })
                break;
            case 16: 
                console.log('get product id: ' + jsonBody.data.product_id);
                const productId = (BigInt(jsonBody.data.product_id) + 44n).toString();
                console.log('updated product id: ' + productUpdtId);
                taskPayload = {
                    tenantDB: getTenantDB(org[1]),
                    channel: TIKTOK,
                    code: jsonBody.type,
                    product_id: productId,
                    shop_id: jsonBody.shop_id,
                    org_id: org[1]
                }
                pushTask(env, taskPayload);
                res.status(200).send({bigint: productId, id:jsonBody.data.product_id })
                break;
            default:
                res.status(200).send({message: 'event type not handled: ' + jsonBody.type});
                break;
        }
        // const mPrisma = getPrismaClient(getTenantDB(org[1]));
        /* if ((jsonBody.type == 1) || (jsonBody.type == 2)) {
        } else if (jsonBody.type == 12) {

        } else if (jsonBody.type == 16) {
            
        } else if (jsonBody.type == 14) {
           
        } else if (jsonBody.type == 6) {
            
        } else {
            console.log('code type not supported: %s', jsonBody.type)
            res.status(200).send({error: 'code type not supported'});
        } */
    }).catch((err) => {
        console.log(err);
        res.status(400).send({error: err});
    })
});

/* router.post('/bigint', async function(req, res, next) {
    res.status(200).send({
        body: req.body,
        product_id: (BigInt(req.body.data.product_id) - 76n).toString(),
    });  
}); */

/* router.get('/order_detail', async function (req, res, next) {
    try {
        let order = await api.get(GET_ORDER_API(req.query.order_id, req.query.cipher), {
            headers: {
                'content-type': 'application/json',
                'x-tts-access-token': req.query.token
            }
        });
        res.status(200).send(order.data);
    } catch (err) {
        res.status(400).send(err.response.data);
    }
}) */

router.get('/return_refund', async function (req, res, next) {
    const data = {
        order_ids: [req.query.order_id]
    };
    let refund = await api.post(SEARCH_RETURN(req.query.cipher, data), data, {
        headers: {
            'content-type': 'application/json',
            'x-tts-access-token': req.query.token
        }
    });
    res.status(200).send(refund.data);
})

/* router.get('/cipher', async function(req, res, next) {
     api.get(GET_AUTHORIZED_SHOP(), {
        headers: {
            'content-type': 'application/json',
            'x-tts-access-token': req.query.token
        }
    }).then(function(response) {
        res.status(200).send(response.data);
    }).catch(function(err) {
        console.log(err);
        res.status(400).send(err.response.data);
    })
}); */

router.post(PATH_ORDER, async function(req, res, next) {
    mPrisma = req.prisma;
    // const mPrisma = getPrismaClient(req.tenantDB);
    let orderId = req.body.order.id;
    let order = await mPrisma.orders.findUnique({
        where: {
            id: orderId
        },
        include: {
            order_items: {
                include: {
                    products: true
                }
            },
            store: {
                select: {
                    token: true,
                    refresh_token: true,
                    secondary_token: true,
                    id: true,
                    origin_id: true
                }
            }
        }
    });

    if (req.body.action == 'cancel') {
        let data = {
            order_id: order.origin_id,
            cancel_reason: '',
            skus: order.order_items.map((item) => {
                return {
                    sku_id: item.products.origin_id,
                    quantity: item.qty
                }
            })
        }
        console.log(data);
        /* api.post(CANCEL_ORDER(), {}, {
            headers: {
                'content-type': 'application/json',
                'x-tts-access-token': order.store.token
            }
        }) */
    }
    res.status(200).send({order: order});
})

router.get(PATH_CANCELLATION, async function (req, res, next) {
    mPrisma = req.prisma;
    // const mPrisma = getPrismaClient(req.tenantDB);
    mPrisma.orders.findUnique({
        where: {
            id: req.body.order.id
        },
        include: {
            store: {
                select: {
                    token: true,
                    refresh_token: true,
                    secondary_token: true
                }
            }
        }
    }).then(function (order) {
        const cancelId = '';
        const apiPath = (req.body.approved) ? APPROVE_CANCELLATION(cancelId, order.store.secondary_token) : REJECT_CANCELLATION(cancelId, order.store.secondary_token);
        let data = {};
        if (!req.body.approved) {
            data = {
                reject_reason: '',
                images: [{
                    image_id: ''
                }]
            }
        }
        api.post(apiPath, data, {
            headers: {
                'content-type': 'application/json',
                'x-tts-access-token': order.store.token
            }
        }).then(function(response) {
            res.status(200).send(response.data);
        }).catch(function(err) {
            console.log(err);   
            res.status(400).send(err.response.data);
        })
    }).catch(function (err) {
        console.log(err);
        res.status(400).send({error: err});
    })
})

/* router.post(PATH_CHAT, async function (req, res, next) {
    res.status(200).send();
}) */

router.post(PATH_AUTH, async function(req, res, next) {
    mPrisma = req.prisma;
    let token = await api.get(GET_TOKEN_API(req.body.auth_code)).catch(function (err) {
        res.status(400).send({error: err.response.data});
    });
    if (token.data.code == 0) {
        let accessToken = token.data.data.access_token;
        try {
            let shops = await api.get(GET_AUTHORIZED_SHOP(), {
                headers: {
                    'content-type': 'application/json',
                    'x-tts-access-token': accessToken
                }
            });
            if (shops.data.data.shops.length == 0) {
                return res.status(400).send({error: 'No shop found'});
            }
            let storeFound = shops.data.data.shops.find((shop) => shop.name == token.data.data.seller_name);
            if ((!storeFound)) {
                return res.status(400).send({error: 'No shop found'});
            }

            const orgBase64 = Buffer.from(`${req.auth.payload.org_id}:${convertOrgName(req.auth.payload.morg_name)}`).toString('base64');
            let clientStored = await Promise.all([
                basePrisma.stores.upsert({
                    where: {
                        origin_id: storeFound.id
                    },
                    create: {
                        origin_id: storeFound.id,
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
                }),
                mPrisma.store.upsert({
                    where: {
                        origin_id: storeFound.id
                    },
                    create: {
                        origin_id: storeFound.id,
                        name: token.data.data.seller_name,
                        token: encryptData(token.data.data.access_token),
                        refresh_token: encryptData(token.data.data.refresh_token),
                        secondary_token: encryptData(shops.data.data.shops[0].cipher),
                        status: 'ACTIVE',
                        channel: {
                            connectOrCreate: {
                                where: {
                                    name: 'tiktok'
                                },
                                create: {
                                    name: 'tiktok',
                                    client: {
                                        connectOrCreate: {
                                            where: {
                                                 origin_id: req.auth.payload.org_id
                                            },
                                            create: {
                                                name: req.auth.payload.org_id,
                                                origin_id: req.auth.payload.org_id
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    },
                    update: {
                        token: encryptData(token.data.data.access_token),
                        refresh_token: encryptData(token.data.data.refresh_token),
                        status: 'ACTIVE',
                        channel: {
                            upsert: {
                                where: {
                                    name: 'tiktok'
                                },
                                create: {
                                    name: 'tiktok'
                                },
                                update: {
                                    client: {
                                        connectOrCreate: {
                                            where: {
                                                 origin_id: req.auth.payload.org_id
                                            },
                                            create: {
                                                name: req.auth.payload.org_id,
                                                origin_id: req.auth.payload.org_id
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                })
            ]);
            res.status(200).send(clientStored);
        } catch (err) {
            console.log(err);
            res.status(400).send({error: err})
        }
    } else {
        res.status(422).send({error: token.data})
    }
});

module.exports = router;
