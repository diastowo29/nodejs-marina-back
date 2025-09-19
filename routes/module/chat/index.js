var express = require('express');
var router = express.Router();
const { lazReplyChat, chatContentType, channelSource, TOKOPEDIA, LAZADA } = require('../../../config/utils');
// const { lazPostCall, lazPostGetCall } = require('../../../functions/lazada/caller');
const { getToken } = require('../../../functions/helper');
const { api } = require('../../../functions/axios/interceptor');
const { TOKO_REPLYCHAT, TOKO_INITIATE_CHAT } = require('../../../config/toko_apis');
const sendLazadaChat = require('../../../functions/lazada/function');
const { getPrismaClientForTenant } = require('../../../services/prismaServices');
const { callTiktok } = require('../../../functions/tiktok/function');
const { SEND_MESSAGE } = require('../../../config/tiktok_apis');
const { getTenantDB } = require('../../../middleware/tenantIdentifier');
const { PrismaClient } = require('../../../prisma/generated/client');
let mPrisma = new PrismaClient();
const tokoAppId = process.env.TOKO_APP_ID;

router.get('/', async function(req, res, next) {
    mPrisma = req.prisma;
    let chat = await mPrisma.omnichat.findMany({
        include: {
            omnichat_user: true,
            store: {
                include: {
                    channel: true
                }
            }
        },
        orderBy: {
            updatedAt: 'desc'
        }
    });
    res.status(200).send(chat);
});

router.get('/comments', async function(req, res, next) {
    mPrisma = req.prisma;
    // const mPrisma = getPrismaClient(req.tenantDB);
    let comments = await mPrisma.omnichat_line.findMany({
        select: {
            chat_type: true
        }
    });
    res.status(200).send(comments);
})

router.post('/initiate', async function(req, res, next) {
    const orderId = req.body.order_id;
    const customerId = '';
    const storeId = req.body.store_id;
    const channel = req.body.channel;
    mPrisma = req.prisma;
    // const mPrisma = getPrismaClient(req.tenantDB);

    let store = await mPrisma.store.findUnique({
        where: {
            origin_id: storeId
        }
    });

    if (channel.toLowerCase() === TOKOPEDIA) {
        let chat = await api.get(TOKO_INITIATE_CHAT(tokoAppId, orderId),{
            headers: {
                Accept: 'application/json',
                'Content-Type': 'application/json',
                Authorization: `Bearer ${store.token}`
            }
        });
        let chatDb = await mPrisma.omnichat.upsert({
            where: {
                origin_id: '',
            },
            update: {
                last_message: `order_id:${orderId}`,
                last_messageId: chat.data.data.msg_id
            },
            create: {
                origin_id: '',
                last_message: `order_id:${orderId}`,
                last_messageId: chat.data.data.msg_id,
                storeId: storeId,
                omnichat_user: {
                    connectOrCreate: {
                        where: {
                            origin_id: chat.data.data.contact.id.toString(),
                        },
                        create: {
                            origin_id: chat.data.data.contact.id.toString(),
                            username: chat.data.data.contact.attributes.name,
                            thumbnailUrl: chat.data.data.contact.attributes.thumbnail
                        }
                    }
                },
                messages: {
                    create: {
                        line_text: `order_id:${orderId}`,
                        author: 'agent',
                        origin_id: chat.data.data.msg_id
                    }
                }
            }
        })
        res.status(200).send(chatDb);
    } else if (channel.toLowerCase() === LAZADA) {
        let templateId = '10007';
        let contentType = 'order_id';
        let chat = await sendLazadaChat('chatId', templateId, storeId, contentType, 'chatLine');
        res.status(200).send({chat: chat});
    } else {
        res.status(400).send({error: 'Not implemented'});
    }
})

// sent chat from marina ui
router.post('/', async function(req, res, next) {
    let body = req.body;
    let sendMessage =  await sendMessageToBuyer(body, req.tenantDB)
    if(sendMessage.success){
        res.status(200).send(sendMessage.chat)
    }else{
        res.status(400).send(sendMessage.error)
    }
})

router.get('/:id/comments', async function(req, res, next) {
    mPrisma = req.prisma;
    // const mPrisma = getPrismaClient(req.tenantDB);
    let chat = await mPrisma.omnichat.findUnique({
        where: {
            id: Number.parseInt(req.params.id)
        },
        include: {
            messages: true,
            store: {
                select: {
                    id: true,
                    channel: true,
                    name:true,
                    origin_id: true,
                    status: true
                }
            }
        }
    });
    res.status(200).send(chat);
});

router.post('/sunco/event', async function(req, res, next){
    let payload = req.body.events[0].payload;
    let sourceType = payload.message.source.type;
    let messageAuthor = payload.message.author.type;
    try {
        if (messageAuthor == 'business' && sourceType == 'zd:agentWorkspace') {
            console.log('message author is bussines')
          if (payload.conversation?.metadata?.origin_source_integration) {
            console.log('origin_source_integration is missing')
            console.log(JSON.stringify(req.body));
            return res.status(200).send({});
          }

          if (payload.conversation.metadata.marina_org_id) {
            const org_id = payload.conversation.metadata.marina_org_id;
            let body = await suncoAgentMessage(payload, org_id);
            // console.log(JSON.stringify(body));
            let sendMessage =  await sendMessageToBuyer(body, org_id);
            return res.status((sendMessage.success) ? 200 : 400).send((sendMessage.success) ? sendMessage.chat : sendMessage.error);
          } else {
            console.log('metadata is missing')
            console.log(JSON.stringify(req.body));
            return res.status(200).send({});
          }
        }
        res.status(200).send({});
    } catch (err) {
        console.log(err);
        console.log(JSON.stringify(req.body));
        res.status(500).send({error: err});
    }
  
})

async function sendMessageToBuyer(body, org_id) {
    // console.log('sendMessageToBuyer', JSON.stringify(body))
    let templateId;
    if (body.channel_name.toString().toLowerCase() === channelSource.LAZADA.toLowerCase()) {
        let contentType;
        let bodyChat = body.line_text;
        switch (body.chat_type) {
            case chatContentType.IMAGE:
                templateId = '3';
                contentType = 'img_url';
                bodyChat = body.file_path;
                break;
            case chatContentType.TEXT:
                templateId = '1';
                contentType = 'txt';
                break;
            case chatContentType.PRODUCT:
                templateId = '10006';
                contentType = 'item_id';
                bodyChat = body.product_id;
                break;
            case chatContentType.INVOICE:
                templateId = '10007';
                contentType = 'order_id';
                bodyChat = body.order_id;
                break;
            default:
                break;
        }
        // let apiParams = `session_id=${body.omnichat_origin_id}&template_id=${templateId}&${contentType}=${body.line_text}`;
        // let token = await getToken(body.store_origin_id);
        // let chatReply = await lazPostCall(lazReplyChat, apiParams, token.secondary_refresh_token, token.secondary_token);
        let chatReply = await sendLazadaChat(body.omnichat_origin_id, templateId, body.store_origin_id, contentType, bodyChat);
        if (!chatReply.success) {
            // return res.status(400).send({chat: chatReply});
            return {success: false, error: chatReply}
        }
        let chat = await updateOmnichat(body, chatReply.data.message_id); // <--- check
        // res.status(200).send(chat);
        return {success: true, chat: chat}
    } else if (body.channel_name.toString().toLowerCase() === channelSource.TOKOPEDIA.toLowerCase()) {
        let token = await getToken(body.store_origin_id); // <<==== NEED TO CHECK!!! ASAP!!!
        // console.log(token);
        // console.log(TOKO_REPLYCHAT(process.env.TOKO_APP_ID, body.last_messageId));
        switch (body.chat_type) {
            case chatContentType.IMAGE:
                templateId = '2';
                break;
            case chatContentType.PRODUCT:
                templateId = '0';
                break;
            case chatContentType.INVOICE:
                templateId = '19';
                break;
            default:
                templateId = '1';
                break;
        }

        let replyPayload = {
            shop_id: Number.parseInt(body.store_origin_id),
            ...(templateId === '1') ? { message: body.line_text } : {},
            ...(templateId === '2') ? {
                attachment_type: templateId,
                file_path: body.file_path
            } : {},
            ...(templateId === '19') ? {
                attachment_type: templateId,
                payload: {
                    thumbnail: '',
                    identifier: '',
                    title: '',
                    price: '',
                    url: ''
                }
            } : {},
        };

        // console.log('replyPayload', JSON.stringify(replyPayload))
        // console.log('msg_id', body.last_messageId.split('-')[0])
        try {
            let chatReply = await api.post(
                TOKO_REPLYCHAT(tokoAppId, body.last_messageId.split('-')[0]), 
                JSON.stringify(replyPayload), 
                {
                    headers: {
                        Accept: 'application/json',
                        'Content-Type': 'application/json',
                        Authorization: `Bearer ${token.token}`
                    }
                }
            );
            console.log('chatReply', chatReply.data)
            if(!chatReply.data){
                return {success: false, error: chatReply.header.reason}
            }
            let chat = await updateOmnichat(body, chatReply.data.msg_id, org_id);
            // res.status(200).send(chat);
            return {success: true, chat: chat}
        } catch (err) {
            console.log(err);
            // res.status(400).send({error: err});
            return {success: false, error: err}
        }
    } else if (body.channel_name.toString().toLowerCase() === channelSource.TIKTOK.toLowerCase()) {
        let mStore = {};
        if (!body.omnichat) {
            console.log('== get omnichat ==')
            // const mPrisma = getPrismaClient(getTenantDB(org_id));
            mPrisma = getPrismaClientForTenant(org_id, getTenantDB(org_id).url)
            mStore = await mPrisma.store.findUnique({
                where: {
                    origin_id: body.store_origin_id.toString()
                }
            });
        }
        mStore = body.omnichat.store;
        let contentChat = {
            ...(body.chat_type === chatContentType.TEXT ? {content: body.line_text} : {}),
            ...(body.chat_type === chatContentType.IMAGE ? {url: body.file_path, width: 1280, height: 720} : {}),
            ...(body.chat_type === chatContentType.PRODUCT ? {product_id: body.product_id} : {}),
            ...(body.chat_type === chatContentType.INVOICE ? {order_id: body.order_id} : {}),
        }
        let contentType = (body.chat_type === chatContentType.PRODUCT) ? 'PRODUCT_CARD' : (body.chat_type === chatContentType.INVOICE) ? 'ORDER_CARD' : body.chat_type.toString().toUpperCase();
        let chatBody = {
            type: contentType,
            content: JSON.stringify(contentChat)
        }
        let sendChat = await callTiktok('POST', SEND_MESSAGE(body.omnichat_origin_id, chatBody, mStore.secondary_token), chatBody, mStore.token, mStore.refresh_token, mStore.id, getTenantDB(org_id), org_id);
        if (sendChat.data.code != 0) {
            return {success: false, error: sendChat.data.message}
        }
        return {success: true, chat: sendChat.data};
    } else {
        return {success: false, error: 'Not implemented'}
    }
}
async function suncoAgentMessage(payload, org_id){
    let prisma = getPrismaClientForTenant(org_id, getTenantDB(org_id).url);
    const message = await prisma.omnichat.findFirst({
        where: { externalId: payload.conversation.id },
        select: {
            origin_id: true,
            last_messageId: true,
            store: {
                select: {
                    id: true,
                    token: true,
                    secondary_token: true,
                    refresh_token: true,
                    origin_id: true,
                    channel: {
                        select: {
                            name: true
                        }
                    }
                }
            }
        }
    })

    // let channelName = payload.conversation.metadata["dataCapture.ticketField.44413794291993"].toString()
    const channelName = message.store.channel.name;
    let lineText = payload.message.content?.text ? payload.message.content.text:''
    let chatType = payload.message.content.type;
    let param = {
        id: "",
        line_text: lineText,
        author: "agent",
        createdAt: (new Date()).toISOString(),
        // store_origin_id: payload.conversation.metadata["dataCapture.ticketField.44414210097049"].toString(),
        store_origin_id: message.store.origin_id,
        channel_name: channelName,
        chat_type: chatType,
        omnichat: message,
        omnichat_origin_id: message.origin_id
    }

    if (lineText.includes('SEND_PRODUCT') || lineText.includes('SEND_INVOICE')) {
        const linesId = lineText.split('\n')[0].split(': ')[1]; // <=== get line from comments
        if (lineText.includes('SEND_PRODUCT')) {
            param.product_id = linesId.split('-')[0] // <=== get product id
            param.chat_type = chatContentType.PRODUCT
        }
        if (lineText.includes('SEND_INVOICE')) {
            param.invoice_id = linesId
            param.chat_type = chatContentType.INVOICE
        }
    }

    if (chatType == 'image') {
        if (lineText) {
            if (!lineText.includes('SEND_PRODUCT')) {
                param.file_path = payload.message.content.mediaUrl   
            }
        }
    }
    if (channelName == 'lazada') {
        // const mPrisma = getPrismaClient(org_id);
        let originId = payload.conversation.metadata['lazada_origin_id']
       /*  let message = await mPrisma.omnichat.findUnique({
            where:{
                origin_id: originId
            }
        }) */

        // console.log('lazadaMessage', message)
        param.omnichat_origin_id = originId
        param.last_messageId = message.last_messageId
    }

    if (channelName == 'tokopedia') {
        param.omnichat_origin_id = `${payload.conversation.metadata["dataCapture.ticketField.44414210097049"]}-${payload.conversation.metadata["dataCapture.ticketField.44421785876377"]}`
        param.last_messageId = `${payload.conversation.metadata["dataCapture.ticketField.44415748503577"]}-${Date.now()}`
    }
  // console.log(JSON.stringify(payload))
    // let isValidSourceType = false
    // let errorMessage = 'Cannot sent document to the marketplace, due to API restriction'

//   if(payload.message.content.type == 'text'){
//     console.log('text message receive')
//     isValidSourceType = true

//     if(payload.message.content.text.includes('type: product')){
//       let messageText = payload.message.content.text.trim()
//       let productId = (messageText.split('\n')[1]).split(' ')[1]

//       if(payload.conversation.metadata["dataCapture.ticketField.42645330627097"] !== 'tokopedia'){
//         param.content.message = messageText
//         param.content.content.mp_product_id = Number(productId)
//         param.content.type = 'product'
//       }else{
//         param.content.message = productId
//         param.content.type = 'text'
//       }
//     }else{
//       param.content.message = payload.message.content.text
//       param.content.type = 'text'
//     }
//   }

//   if(payload.message.content.type == 'image'){
//     if(payload.conversation.metadata["dataCapture.ticketField.42645330627097"] == 'lazada'){
//       isValidSourceType = true
//       param.content.image_url = payload.message.content.mediaUrl
//       param.content.type = 'image'
//     }else if(payload.conversation.metadata["dataCapture.ticketField.42645330627097"] == 'shopee'){
//       // upload image to shopee
//       let imageName = payload.message.content.altText
//       let imageType = payload.message.content.mediaType
//       let formData = await downloadImageToBuffer(payload.message.content.mediaUrl, imageName, imageType)
//       let uploadImage = await uploadImageToBantudagang(formData, payload.conversation.metadata["dataCapture.ticketField.42645403169049"])

//       if(uploadImage.message == 'SUCCESS'){
//         isValidSourceType = true
//         param.content.image_url = uploadImage.data
//         param.content.type = 'image'
//       }
//     }else{
//       errorMessage = "Cannot sent image to the Tokopedia channel, due to API restriction"
//     }
//   }

    return param
}

async function updateOmnichat (body, msgId, org_id) {
    const mPrisma = getPrismaClientForTenant(org_id, getTenantDB(org_id).url);
    let chat = await mPrisma.omnichat.update({
        where: {
            origin_id: body.omnichat_origin_id
        },
        data: {
            last_message: body.line_text,
            updatedAt: new Date(),
            last_messageId: msgId,
            messages: {
                create: {
                    omnichat_user_id: body.omnichat_user_id,
                    line_text: body.line_text,
                    chat_type: body.chat_type,
                    origin_id: msgId,
                    author: 'agent'
                }
            }
        }
    })
    return chat;
}

module.exports = router;