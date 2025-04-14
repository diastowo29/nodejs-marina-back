var express = require('express');
const SunshineConversationsClient = require('sunshine-conversations-client');
var router = express.Router();
var { PrismaClient, Prisma } = require('@prisma/client');
// const {workQueue, jobOpts} = require('../../config/redis.config');
const { TOKOPEDIA_CHAT, CHAT_TEXT, CHAT_PRODUCT } = require('../../config/utils');
const { gcpParser } = require('../../functions/gcpParser');
const { pushTask } = require('../../functions/queue/task');
const { api } = require('../../functions/axios/axioser');
const { TOKO_ACCEPT_ORDER, TOKO_REJECT_CANCEL_REQUEST, TOKO_REJECT_ORDER, TOKO_PRODUCTLIST } = require('../../config/toko_apis');
var env = process.env.NODE_ENV || 'development';
const tokoAppId = process.env.TOKO_APP_ID;

const prisma = new PrismaClient();
/* GET home page. */
router.get('/webhook', async function (req, res, next) {
    res.status(200).send({});
});

router.post('/webhook', async function (req, res, next) {
    console.log(req.body);
    // workQueue.add({channel:TOKOPEDIA, body: req.body}, jobOpts);
    res.status(200).send({});
});

router.post('/order', async function(req, res, next) {
    // let jsonBody = req.body;
    let jsonBody = gcpParser(req.body.message.data);
    console.log(JSON.stringify(jsonBody));
    try {
        // IF NEW ORDER, THERE IS INVOICE
        if (jsonBody.invoice_ref_num) {
            let logisticName = `toko-${jsonBody.logistics.shipping_agency}`;
            let orderItemList = [];
            jsonBody.products.forEach(item => {
                orderItemList.push({
                    where: {
                        origin_id: `${jsonBody.order_id}-${item.id}`
                    },
                    create: {
                        qty: item.quantity,
                        notes: item.notes,
                        origin_id: `${jsonBody.order_id}-${item.id}`,
                        total_price: item.total_price,
                        products: {
                            connectOrCreate: {
                                where: {
                                    origin_id: item.id.toString()
                                },
                                create: {
                                    currency: item.currency,
                                    name: item.name,
                                    price: item.price,
                                    sku: item.sku,
                                    origin_id: item.id.toString(),
                                    store: {
                                        connect: {
                                            origin_id: jsonBody.shop_id.toString()
                                        }
                                    },
                                }
                            }
                        }
                    }
                })
            });

            let newOrder = await prisma.orders.upsert({
                update: {
                    status: jsonBody.order_status.toString(),
                },
                create: {
                    origin_id: jsonBody.order_id.toString(),
                    invoice: jsonBody.invoice_ref_num,
                    accept_partial: jsonBody.accept_partial,
                    // device: jsonBody.device,
                    payment_id: jsonBody.payment_id.toString(),
                    recp_name: jsonBody.recipient.name,
                    recp_phone: jsonBody.recipient.phone,
                    recp_addr_full: jsonBody.recipient.address.address_full,
                    recp_addr_city: jsonBody.recipient.address.city,
                    recp_addr_district: jsonBody.recipient.address.district,
                    recp_addr_geo: jsonBody.recipient.address.geo,
                    recp_addr_country: jsonBody.recipient.address.country,
                    recp_addr_postal_code: jsonBody.recipient.address.postal_code,
                    shipping_price: jsonBody.amt.shipping_cost,
                    total_product_price: jsonBody.amt.ttl_product_price,
                    total_amount: jsonBody.amt.ttl_amount,
                    logistic: {
                        connectOrCreate: {
                            create: {
                                name: logisticName
                            },
                            where: {
                                name: logisticName
                            }
                        }
                    },
                    store: {
                        connect: {
                            origin_id: jsonBody.shop_id.toString()
                        }
                    },
                    status: jsonBody.order_status.toString(),
                    customers: {
                        connectOrCreate: {
                            create: {
                                email: jsonBody.customer.email,
                                name: jsonBody.customer.name,
                                phone: jsonBody.customer.phone,
                                origin_id: jsonBody.customer.id.toString()
                            },
                            where: {
                                origin_id: jsonBody.customer.id.toString()
                            }
                        }
                    },
                    order_items: { connectOrCreate: orderItemList }
                },
                where: {
                    origin_id: jsonBody.order_id.toString()
                },
                include: {
                    order_items: {
                        include: {
                            products: true
                        }
                    }
                }
            });
            res.status(200).send({created: newOrder});
        } else {
            let newOrder = await prisma.orders.update({
                data: {
                    status: jsonBody.order_status.toString()
                },
                where: {
                    origin_id: jsonBody.order_id.toString()
                }
            })
            res.status(200).send({updated: newOrder});
        }
        res.status(200).send();
    } catch (err) {
        if (!jsonBody.logistics) {
            console.log('ERROR ', jsonBody.order_status);
            return res.status(200).send({})
        }
        if (err instanceof Prisma.PrismaClientKnownRequestError) {
            if (err.code === 'P2025') {
                console.log(err.meta);
                return res.status(200).send();
            }
        }
        console.log(err);
        res.status(400).send({})
    }
})

router.get('/product/sync', async function(req, res, next) {
    let store = await prisma.store.findUnique({
        where: {
            id: Number.parseInt(req.query.store_id)
        }
    });
    try {
        let products = await api.get(
            TOKO_PRODUCTLIST(tokoAppId, store.origin_id), 
            {
                headers: {
                    Accept: 'application/json',
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${store.token}`
                }
            }
        );
        let productList = [];
        products.data.data.forEach(product => {
            productList.push({
                name: product.basic.name,
                price: product.price.value,
                status: product.basic.status.toString(),
                sku: product.other.sku,
                origin_id: product.basic.productID.toString(),
                condition: product.basic.condition,
                desc: product.basic.shortDesc,
                stock: product.stock.value,
                weight: product.weight.value,
                storeId: Number.parseInt(req.query.store_id)
            })
        });
        let syncProduct = await prisma.products.createMany({data: productList});
        res.status(200).send(syncProduct);
    } catch (err) {
        console.log(err);
        res.status(400).send({err: err})
    }
});

router.put('/order/cancel', async function(req, res, next) {
    let order = await prisma.orders.findUnique({
        where: {
            id: Number.parseInt(req.body.order_id)
        },
        include: {
            store: true
        }
    });
    let approved = req.body.approved;
    let tokoApi = (approved) ? TOKO_REJECT_ORDER(tokoAppId, order.origin_id) : TOKO_REJECT_CANCEL_REQUEST(tokoAppId, order.origin_id, order.store.origin_id);
    let tokoPayload = (approved) ? {reason_code: 8, reason: ''} : {};
    try {
        let rejectRequest = await api.post(
            tokoApi,
            JSON.stringify(tokoPayload),
            {
                headers: {
                    Accept: 'application/json',
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${order.store.token}`
                }
            }
        )
    
        // console.log(rejectRequest);
        res.status(200).send({rejection: rejectRequest});
    }  catch (err) {
        console.log(err);
        res.status(400).send({err: err});
    }
})

/* router.put('/order/:id/reject', async function(req, res, next) {
    let order = await prisma.orders.findUnique({
        where: {
            id: Number.parseInt(req.params.id)
        },
        include: {
            store: true
        }
    });
    let rejectRequest = await api.post(
        TOKO_REJECT_CANCEL_REQUEST(tokoAppId, order.origin_id, order.store.origin_id),
        JSON.stringify({}),
        {
            headers: {
                Accept: 'application/json',
                'Content-Type': 'application/json',
                Authorization: `Bearer ${order.store.token}`
            }
        }
    )

    console.log(rejectRequest);
    res.status(200).send({rejection: rejectRequest});
}) */

router.put('/order/:id', async function(req, res, next) {
    let order = await prisma.orders.findUnique({
        where: {
            id: Number.parseInt(req.params.id)
        },
        include: {
            store: true
        }
    });

    /* CALL TOKPED API HERE */
    let acceptOrder = await api.post(
        TOKO_ACCEPT_ORDER(tokoAppId, order.origin_id),
        JSON.stringify({}),
        {
            headers: {
                Accept: 'application/json',
                'Content-Type': 'application/json',
                Authorization: `Bearer ${order.store.token}`
            }
        }
    );
    console.log(acceptOrder);
    /* CALL TOKPED API HERE */
    res.status(200).send({accepted: acceptOrder});
})

router.post('/chat',async function(req, res, next) {
    // let jsonBody = req.body;
    let jsonBody = gcpParser(req.body.message.data);
    console.log('tokopedia/chat', jsonBody);
    let tokoChatId = `${jsonBody.shop_id}-${jsonBody.user_id}`;
    let newMessageId = `${jsonBody.msg_id}-${Date.now()}`
    let atttachmentType = 0;
    let chatType = CHAT_TEXT;
    let userExternalId = `${jsonBody.user_id}-${jsonBody.msg_id}-${jsonBody.shop_id}`

    // sunco hardcode part
    let suncoAppId = process.env.SUNCO_APP_ID
    let suncoKeyId = process.env.SUNCO_KEY_ID
    let suncoKeySecret = process.env.SUNCO_KEY_SECRET

    if (jsonBody.payload) {
        atttachmentType = jsonBody.payload.attachment_type;        
        if (atttachmentType == 3) {
            chatType = CHAT_PRODUCT;
        }
    }
    // console.log(tokoChatId)
    try {
        let message = await prisma.omnichat.upsert({
            where: {
                origin_id: tokoChatId
            },
            update: {
                last_message: (atttachmentType == 0) ? jsonBody.message : JSON.stringify(jsonBody.payload),
                last_messageId: newMessageId,
                messages: {
                    create: {
                        line_text: (atttachmentType == 0) ? jsonBody.message : JSON.stringify(jsonBody.payload),
                        author: jsonBody.user_id.toString(),
                        origin_id: newMessageId,
                        chat_type: chatType
                    }
                }
            },
            create: {
                origin_id: tokoChatId,
                last_message: (atttachmentType == 0) ? jsonBody.message : JSON.stringify(jsonBody.payload),
                last_messageId: newMessageId,
                store: {
                    connect: {
                        origin_id: jsonBody.shop_id.toString()
                    }
                },
                omnichat_user: {
                    connectOrCreate: {
                        where: {
                            origin_id: jsonBody.user_id.toString()
                        },
                        create: {
                            origin_id: jsonBody.user_id.toString(),
                            username: jsonBody.full_name
                        }
                    }
                },
                messages: {
                    create: {
                        line_text: (atttachmentType == 0) ? jsonBody.message : JSON.stringify(jsonBody.payload),
                        author: jsonBody.user_id.toString(),
                        origin_id: newMessageId,
                        chat_type: chatType
                    }
                }
            }
        });

        if(!message.externalId){
            let defaultClient = SunshineConversationsClient.ApiClient.instance
            let basicAuth = defaultClient.authentications['basicAuth']
            basicAuth.username = suncoKeyId
            basicAuth.password = suncoKeySecret

            // create sunco user
            let suncoUser = await createSuncoUser(userExternalId, jsonBody.full_name, suncoAppId)
            let conversationBody = suncoUser
            conversationBody.metadata = {
                'dataCapture.ticketField.44421785876377': jsonBody.user_id,
                'dataCapture.ticketField.44415748503577': jsonBody.msg_id,
                'dataCapture.ticketField.44414210097049': jsonBody.shop_id,
                'dataCapture.ticketField.44413794291993': 'tokopedia',
            }
            // create sunco conversation
            let suncoConversation = await createSuncoConversation(suncoAppId, conversationBody)

            // update omnichat set externalId
            message = await prisma.omnichat.update({
                where:{
                    id: message.id
                },
                data:{
                    externalId: suncoConversation.conversation.id
                }
            })

            // update omnichatUser set external id
            await prisma.omnichat_user.update({
                where:{
                    id: message.omnichat_userId
                },
                data:{
                    externalId: userExternalId
                }
            })
        }

        let taskPayload = {
            channel: TOKOPEDIA_CHAT,
            user_external_id: userExternalId,
            message_external_id: message.externalId,
            body: jsonBody
        }

        pushTask(env, taskPayload);
        res.status(200).send(message);
    } catch (err) {
        console.log(err);
        if (err instanceof Prisma.PrismaClientUnknownRequestError) {
            res.status(422).send(err.code);
        } else {
            res.status(400).send(err);
        }
    }
})

function createSuncoUser(userExternalId, username, appId){
    let baseLog = 'createSuncoUser()'
    let usersApi = new SunshineConversationsClient.UsersApi()
    let userCreateBody = new SunshineConversationsClient.UserCreateBody()
  
    userCreateBody.externalId = userExternalId
    userCreateBody.profile = {
        givenName: username
    }
  
    return usersApi.createUser(appId, userCreateBody).then(function(suncoUser) {
        console.log(`${baseLog} - user #${suncoUser.user.externalId} created as ${username}`)
        return {
            type: 'personal',
            participants: [{
                userExternalId: suncoUser.user.externalId,
                subscribeSDKClient: false
            }]
        }
    }, function(error) {
        if(error.status == 429){
            console.log(`${baseLog} - create user #${userExternalId} error: ${error.response.text}`)
            return {
                status: error.status,
                body:{
                    errors:[
                        {
                            title: error.response.text,
                            data: error.response.req.data
                        }
                    ]
                },
                error:{
                    title: error.response.text,
                    data: error.response.req.data
                }
            }
        }
    
        console.log(`${baseLog} - create user #${userExternalId} error: ${error.body.errors[0].title}`)
        return error
    })
}

function createSuncoConversation(appId, conversationCreateBody){
    let baseLog = 'createSuncoConversation()'
    let conversationsApi = new SunshineConversationsClient.ConversationsApi()
    
    return conversationsApi.createConversation(appId, conversationCreateBody).then(function(conv) {
        console.log(baseLog, `conversation for user #${conversationCreateBody.participants[0].userExternalId} created: #${conv.conversation.id}`)
        return conv
    }, function(error) {
        if(error.status == 429){
            console.log(`${baseLog} - create conversation for user #${conversationCreateBody.participants[0].userExternalId} error: ${error.response.text}`)
            return {
                status: error.status,
                body:{
                errors:[
                    {
                        title: error.response.text,
                        data: error.response.req.data
                    }
                ]
                },
                error:{
                    title: error.response.text,
                    data: error.response.req.data
                }
            }
        }

        console.log(`${baseLog} - create conversation for user #${conversationCreateBody.participants[0].userExternalId} error: ${error.body.errors[0].title}`)
        return error
    })
}

module.exports = router;