var express = require('express');
const SunshineConversationsClient = require('sunshine-conversations-client');
var router = express.Router();
const { PrismaClient: prismaBaseClient, Prisma } = require('../../prisma/generated/baseClient');
const { LAZADA, LAZADA_CHAT, lazGetOrderItems, lazadaAuthHost, lazGetSellerInfo, lazadaHost, sampleLazOMSToken, lazPackOrder, lazGetToken, lazReplyChat, CHAT_TEXT } = require('../../config/utils');
const { lazParamz, lazCall, lazPostCall } = require('../../functions/lazada/caller');
const { gcpParser } = require('../../functions/gcpParser');
const { pushTask } = require('../../functions/queue/task');
const { getPrismaClient, getPrismaClientForTenant } = require('../../services/prismaServices');
const { getTenantDB } = require('../../middleware/tenantIdentifier');
const basePrisma = new prismaBaseClient();
const { PrismaClient } = require('../../prisma/generated/client');
let mPrisma = new PrismaClient();

var env = process.env.NODE_ENV || 'development';

router.post('/webhook', async function (req, res, next) {
    console.log(req.body);
    // workQueue.add({channel:LAZADA, body: req.body}, jobOpts);
    res.status(200).send({});
});

router.post('/order', async function(req, res, next) {
    let jsonBody = gcpParser(req.body.message.data);
    // let jsonBody = JSON.parse(Buffer.from(req.body.message.data, 'base64').toString('utf8'));
    if (jsonBody.seller_id == '9999') {
        res.status(200).send({});
        return;
    }
    basePrisma.stores.findUnique({
        where: {
            origin_id: jsonBody.seller_id.toString()
        },
        include: {
            clients: true
        }
    }).then(async (mBase) => {
        const org = Buffer.from(mBase.clients.org_id, 'base64').toString('ascii').split(':');
        // mPrisma = getPrismaClientForTenant(getTenantDB(mBase.clients.org_id));
        mPrisma = getPrismaClientForTenant(org[1], getTenantDB(org[1]).url);
        
        if (jsonBody.message_type == 0) {
            console.log(`inbound order ${jsonBody.data.trade_order_id} from ${jsonBody.seller_id}`);
            // console.log(req.body);
            try {
                // const mPrisma = getPrismaClient(req.tenantDB);
    
                let newOrder = await mPrisma.orders.create({
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
                let taskPayload = {
                    channel: LAZADA, 
                    orderId: jsonBody.data.trade_order_id, 
                    customerId: jsonBody.data.buyer_id,
                    id: newOrder.id,
                    token: newOrder.store.token,
                    refresh_token: newOrder.store.refresh_token,
                    new: true,
                    // ...((newOrder.order_items.length > 0) ? {new: false} : {new:true})
                }
                pushTask(env, taskPayload);
                //  workQueue.add(taskPayload, jobOpts);
                res.status(200).send(newOrder);
            } catch (err) {
                console.log(req.body.message.data);
                if (err instanceof Prisma.PrismaClientKnownRequestError) {
                    if (err.code === 'P2002') {
                        let taskPayload = {
                            channel: LAZADA,
                            status: jsonBody.data.order_status,
                            updatedAt: new Date(),
                            orderId: jsonBody.data.trade_order_id,
                            new: false,
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
    }).catch((err) => {
        console.log(err);
        res.status(400).send({ err: err });
    });
});

router.put('/order/:id', async function(req, res, next) {
    const mPrisma = getPrismaClient(req.tenantDB);
    let order = await mPrisma.orders.findUnique({
        where: {
            id: Number.parseInt(req.params.id)
        },
        include: {
            order_items: true,
        }
    });
    let orderItemIds = [];
    order.order_items.forEach(item => {
        orderItemIds.push(Number.parseInt(item.origin_id))
    });

    /* PACKED */
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
    /* REPACKED */
    // /order/package/repack
    /* let rePackReq = {
        packages: [
            {
                package_id: 'packageId'
            }
        ]
    } */

    /* READY TO SHIP */
    // /order/package/rts
    /* let readyToShipReq = {
        packages: [
            {
                package_id: 'packageId'
            }
        ]
    } */
   
    /* SHIPPED */

    /* CANCELLED */
    // /order/cancel
    // https://open.lazada.com/apps/doc/api?path=%2Forder%2Fcancel
    
    let apiParams = `packReq=${JSON.stringify(packReq)}`;
    let packOrder = await lazPostCall(lazPackOrder, apiParams, 'refToken', sampleLazOMSToken);
    res.status(200).send(packOrder);
})

let clients = [];
let chats = [];

router.get('/chat/events', async function(req, res, next) {
    /* SSE */
    // const headers = {
    //     'Content-Type': 'text/event-stream',
    //     'Connection': 'keep-alive',
    //     'Cache-Control': 'no-cache'
    // };
    // res.writeHead(200, headers);
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Connection', 'keep-alive');

    const data = `data: ${JSON.stringify(chats)}\n\n`;
    res.write(data);
    const clientId = Date.now();
    const newClient = {
        id: clientId,
        res
    };

    clients.push(newClient);
    req.on('close', () => {
        console.log(`${clientId} Connection closed`);
        clients = clients.filter(client => client.id !== clientId);
    });
});

router.get('/event/test', async function(req, res, next) {
    clients.forEach(client => {
        let jsonTest = {test:true};
        client.res.write(`data: ${JSON.stringify(jsonTest)}\n\n`);
    });
    res.status(200).send({});
})

// message dari user
router.post('/chat', async function(req, res, next) {
    console.log('chat lazada',req.body.message.data);
    let jsonBody = gcpParser(req.body.message.data);
    console.log('chat request body', jsonBody);

    if (jsonBody.message_type != 2) {
        res.status(200).send({});
        return;
    };

    if (jsonBody.data.from_account_type == 2 && !jsonBody.data.process_msg) {
        res.status(200).send({});
        return;
    };

    basePrisma.stores.findUnique({
        where: {
            origin_id: jsonBody.seller_id.toString()
        },
        include: {
            clients: true
        }
    }).then(async(mBase) => {
        const org = Buffer.from(mBase.clients.org_id, 'base64').toString('ascii').split(':');
        mPrisma = getPrismaClientForTenant(org[1], getTenantDB(org[1]).url);
        // const mPrisma = getPrismaClient(getTenantDB(mBase.clients.org_id));
        
        let bodyData = jsonBody.data;
        let sessionId = bodyData.session_id;
        let userId = bodyData.from_user_id;
        let messageId = bodyData.message_id;
        let userExternalId = `${userId}-${messageId}-${jsonBody.seller_id}`
        console.log('sessionId', sessionId)
        console.log('userExternalId', userExternalId)
    
        // sunco hardcode part
        let suncoAppId = process.env.SUNCO_APP_ID
        let suncoKeyId = process.env.SUNCO_KEY_ID
        let suncoKeySecret = process.env.SUNCO_KEY_SECRET
        
        try {
            let conversation = await mPrisma.omnichat.upsert({
                include: {
                    omnichat_user: true,
                    store: true
                },
                where: {
                    origin_id: sessionId
                    // origin_id: `${sessionId}-${userId}`
                },
                update: {
                    last_message: bodyData.content,
                    last_messageId: messageId,
                    updatedAt: new Date(),
                    messages: {
                        connectOrCreate: {
                            where: { origin_id: messageId },
                            create: {
                                origin_id: messageId,
                                line_text: bodyData.content,
                                author: userId,
                                chat_type: CHAT_TEXT
                            }
                        }
                    },
                },
                create: {
                    origin_id: sessionId,
                    // origin_id: `${sessionId}-${userId}`,
                    last_message: bodyData.content,
                    last_messageId: messageId,
                    store: {
                        connect: { origin_id: jsonBody.seller_id }
                    },
                    messages: {
                        create: {
                            origin_id: messageId,
                            line_text: bodyData.content,
                            author: userId,
                            chat_type: CHAT_TEXT
                        }
                    },
                    omnichat_user: {
                        connectOrCreate: {
                            where: { origin_id: userId.toString() },
                            create: { origin_id: userId.toString() }
                        }
                    }
                }
            });
    
            console.log('lazada conversation', JSON.stringify(conversation))
    
            let sseEventPayload = {
                user_id: userId,
                message: JSON.parse(bodyData.content),
                message_id: messageId
            }
            clients.forEach(client => {
                client.res.write(`data: ${JSON.stringify(sseEventPayload)}\n\n`);
            });
    
            if(!conversation.externalId){
                let defaultClient = SunshineConversationsClient.ApiClient.instance
                let basicAuth = defaultClient.authentications['basicAuth']
                basicAuth.username = suncoKeyId
                basicAuth.password = suncoKeySecret
                
                // create sunco user
                let suncoUser = await createSuncoUser(userExternalId, `LazUser-${jsonBody.data.from_user_id}`, suncoAppId)
                let conversationBody = suncoUser
                conversationBody.metadata = {
                    'dataCapture.ticketField.44421785876377': userId,
                    'dataCapture.ticketField.44415748503577': messageId,
                    'dataCapture.ticketField.44414210097049': jsonBody.seller_id,
                    'dataCapture.ticketField.44413794291993': 'lazada',
                    'lazada_origin_id': conversation.origin_id
                }
                // create sunco conversation
                let suncoConversation = await createSuncoConversation(suncoAppId, conversationBody)
                
                // update omnichat set externalId
                conversation =  await mPrisma.omnichat.update({
                    where:{
                        id: conversation.id
                    },
                    data:{
                        externalId: suncoConversation.conversation.id
                    }
                })
                
                // update omnichatUser set external id
                await mPrisma.omnichat_user.update({
                    where:{
                        id: conversation.omnichat_userId
                    },
                    data:{
                        externalId: userExternalId
                    }
                })
            }else{
                userExternalId = conversation?.omnichat_user?.externalId
            }
    
            let taskPayload = {
                channel: LAZADA_CHAT, 
                sessionId: sessionId, 
                id: conversation.id,
                token: conversation.store.token,
                refresh_token: conversation.store.refresh_token,
                ...((conversation.omnichat_user?.username == null) ? {new: true} : {new:false}),
                user_external_id: userExternalId,
                message_external_id: conversation.externalId,
                body: jsonBody
            }
    
            pushTask(env, taskPayload);
            res.status(200).send(conversation);
        } catch (err) {
            if (err instanceof Prisma.PrismaClientUnknownRequestError) {
                console.log(err);
                res.status(400).send({code: err.code});
            } else {
                if (err.code == 'P2025') {
                    console.log(`error on chat ${err.meta.cause}`);
                    res.status(200).send({error: err});
                } else {
                    console.log(err);
                    res.status(400).send({error: err});
                }
            }
        }
    }).catch((err) => {
        console.log(err);
        res.status(400).send({ err: err });
    })

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
    const mPrisma = getPrismaClient(req.tenantDB);
    let newStore = await mPrisma.store.upsert({
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
