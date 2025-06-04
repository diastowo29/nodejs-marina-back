var express = require('express');
var router = express.Router();
var {
    PrismaClient
} = require('@prisma/client');
const { GET_TOKEN_API, GET_AUTHORIZED_SHOP, APPROVE_CANCELLATION, GET_PRODUCT, CANCEL_ORDER, REJECT_CANCELLATION, GET_ORDER_API, GET_RETURN_RECORDS, SEARCH_RETURN } = require('../../config/tiktok_apis');
const { api } = require('../../functions/axios/Axioser');
const { TIKTOK, PATH_WEBHOOK, PATH_CHAT, PATH_AUTH, PATH_ORDER, PATH_CANCELLATION } = require('../../config/utils');
const { pushTask } = require('../../functions/queue/task');
const prisma = new PrismaClient();
var env = process.env.NODE_ENV || 'development';

router.post('/header', function(req, res, next) {
    console.log(req.body);
    console.log(req.headers);
    res.status(200).send(req.body)
});

router.post(PATH_WEBHOOK, async function (req, res, next) {
    // let jsonBody = gcpParser(req.body.message.data);
    let jsonBody = req.body;
    console.log(JSON.stringify(jsonBody))
    if ((jsonBody.type == 1) || (jsonBody.type == 2)) {
        const orderStatus = (jsonBody.data.order_status) ? jsonBody.data.order_status : jsonBody.data.reverse_event_type;
        let newOrder = await prisma.orders.upsert({
            where: {
                origin_id: jsonBody.data.order_id
            },
            update: {
                temp_id: (jsonBody.data.order_status) ? '' : jsonBody.data.reverse_order_id,
                status: orderStatus
            },
            create: {
                origin_id: jsonBody.data.order_id,
                status: orderStatus,
                store: {
                    connect: {
                        origin_id: jsonBody.shop_id
                    }
                }
            },
            include: {
                return_refund: {
                    select: {
                        id: true
                    }
                },
                order_items: {
                    select: {
                        id: true
                    }
                },
                store: {
                    select: {
                        token: true,
                        secondary_token: true,
                        refresh_token: true,
                        id: true,
                        origin_id: true,
                    }
                }
            }
        });
        let taskPayload = {
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
            returnId: newOrder.temp_id
        }
        if (jsonBody.type == 2) {
            taskPayload = {
                channel: TIKTOK,
                token: newOrder.store.token,
                refresh_token: newOrder.store.refresh_token,
                order_id: jsonBody.data.order_id,
                cipher: newOrder.store.secondary_token,
                m_shop_id: newOrder.store.id,
                returnId: newOrder.temp_id
            }
        }
        if ((newOrder.order_items.length == 0) || (orderStatus == 'ORDER_REFUND')) {
            pushTask(env, taskPayload);
        }
        res.status(200).send({order: newOrder.id, origin_id: newOrder.origin_id, status: newOrder.status});
    } else if (jsonBody.type == 16) {
        let taskPayload = {
            channel: TIKTOK,
            code: jsonBody.type,
            product_id: (BigInt(jsonBody.data.product_id) - 76n).toString(),
            shop_id: jsonBody.shop_id
        }
        pushTask(env, taskPayload);
        res.status(200).send({})
        // console.log(Number.parseFloat(jsonBody.data.product_id));
        // let store = await prisma.store.findUnique({
        //     where: {
        //         origin_id: jsonBody.shop_id
        //     }
        // });
        // api.get(GET_PRODUCT(jsonBody.data.product_id, store.secondary_token), {
        //     headers: {
        //         'x-tts-access-token' : store.token,
        //         'content-type': 'application/json'
        //     }
        // }).then(function(response) {
        //     // console.log(JSON.stringify(response.data));
        //     /* if (response.data.data) {
        //         prisma.products.create({
        //             data: {
        //                 origin_id: 
        //             }
        //         })
        //     } */
        //     // done(null, {response: 'testing'});
        //     res.status(200).send({request: req.body, response: response.data, url: GET_PRODUCT(jsonBody.data.product_id, store.secondary_token)});
        // }).catch(function(err) {
        //     console.log(err)
        //     res.status(400).send({error: err});
        // })
    } else if (jsonBody.type == 14) {
        try {
            let newMessage = await prisma.omnichat.upsert({
                where: {
                    origin_id: jsonBody.data.conversation_id
                },
                update: {
                    last_message: jsonBody.data.content,
                    last_messageId: jsonBody.data.message_id,
                    messages: {
                        create: {
                            line_text: jsonBody.data.content,
                            origin_id: jsonBody.data.message_id,
                            author: (jsonBody.data.sender.role == 'BUYER') ? jsonBody.data.sender.im_user_id : 'agent',
                            chat_type: jsonBody.data.type,
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
                            chat_type: jsonBody.data.type,
                        }
                    },
                    omnichat_user: {
                        connectOrCreate: {
                            create: {
                                origin_id: jsonBody.data.sender.im_user_id
                            },
                            where: {
                                origin_id: jsonBody.data.sender.im_user_id
                            }
                        }
                    }

                }
            });
            res.status(200).send({message: newMessage});
        } catch (err) {
            console.log(err);
            res.status(400).send({error: err});
        }
    } else {
        console.log('code type not supported: %s', jsonBody.type)
        res.status(200).send({error: 'code type not supported'});
    }
});

router.post('/bigint', async function(req, res, next) {
    res.status(200).send({
        body: req.body,
        product_id: (BigInt(req.body.data.product_id) - 76n).toString(),
    });  
});

router.get('/order_detail', async function (req, res, next) {
    let order = await api.get(GET_ORDER_API('580193227447438117', 'xxx--xxx'), {
        headers: {
            'content-type': 'application/json',
            'x-tts-access-token': 'xxx-xxx'
        }
    });
    res.status(200).send(order.data);
})

router.get('/return_refund', async function (req, res, next) {
    const data = {
        order_ids: ['580193227512843045']
    };
    let refund = await api.post(SEARCH_RETURN('xxx--xxx', data), data, {
        headers: {
            'content-type': 'application/json',
            'x-tts-access-token': 'xxx-xxx'
        }
    });
    res.status(200).send(refund.data);
})

router.get('/cipher', async function(req, res, next) {
     api.get(GET_AUTHORIZED_SHOP(), {
        headers: {
            'content-type': 'application/json',
            'x-tts-access-token': 'xxx-xxx-xxx-d1-xxx-xxx'
        }
    }).then(function(response) {
        res.status(200).send(response.data);
    }).catch(function(err) {
        console.log(err);
        res.status(400).send(err.response.data);
    })
});

router.post(PATH_ORDER, async function(req, res, next) {
    let orderId = req.body.order.id;
    let order = await prisma.orders.findUnique({
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
    prisma.orders.findUnique({
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

router.post(PATH_CHAT, async function (req, res, next) {
    res.status(200).send();
})

router.post(PATH_AUTH, async function(req, res, next) {
    console.log(GET_TOKEN_API(req.body.auth_code));
    let token = await api.get(GET_TOKEN_API(req.body.auth_code)).catch(function (err) {
        res.status(400).send({error: err.response.data});
    });
    if (token.data.code == 0) {
        console.log(token.data);
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
            let store = await prisma.store.upsert({
                where: {
                    origin_id: storeFound.id
                },
                create: {
                    origin_id: storeFound.id,
                    name: token.data.data.seller_name,
                    token: token.data.data.access_token,
                    refresh_token: token.data.data.refresh_token,
                    status: 'ACTIVE',
                    channel: {
                        connectOrCreate: {
                            where: {
                                name: 'tiktok'
                            },
                            create: {
                                name: 'tiktok'
                            }
                        }
                    }
                },
                update: {
                    token: token.data.data.access_token,
                    refresh_token: token.data.data.refresh_token,
                    status: 'ACTIVE'
                }
            });
            res.status(200).send(store);
        } catch (err) {
            console.log(err);
            res.status(400).send({error: err})
        }
    } else {
        res.status(422).send({error: token.data})
    }
});

module.exports = router;
