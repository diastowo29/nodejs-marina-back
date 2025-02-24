var express = require('express');
var router = express.Router();
var {
    PrismaClient
} = require('@prisma/client');
const { lazReplyChat, chatContentType, channelSource, TOKOPEDIA } = require('../../../config/utils');
const { lazPostCall, lazPostGetCall } = require('../../../functions/lazada/caller');
const { getToken } = require('../../../functions/helper');
const { api } = require('../../../functions/axios/Axioser');
const { TOKO_REPLYCHAT, TOKO_INITIATE_CHAT } = require('../../../config/toko_apis');

const tokoAppId = process.env.TOKO_APP_ID;
const prisma = new PrismaClient();

router.get('/', async function(req, res, next) {
    let chat = await prisma.omnichat.findMany({
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

router.post('/initiate', async function(req, res, next) {
    const orderId = req.body.order_id;
    const customerId = '';
    const storeId = req.body.store_id;
    const channel = req.body.channel;

    let store = await prisma.store.findUnique({
        where: {
            origin_id: storeId
        }
    });

    if (channel === TOKOPEDIA) {
        let chat = await api.get(TOKO_INITIATE_CHAT(tokoAppId, orderId),{
            headers: {
                Accept: 'application/json',
                'Content-Type': 'application/json',
                Authorization: `Bearer ${store.token}`
            }
        });
        let chatDb = await prisma.omnichat.upsert({
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
    } else {
        res.status(400).send({error: 'Not implemented'});
    }
})

router.post('/', async function(req, res, next) {
    console.log(req.body);
    let body = req.body;
    if (body.channel_name.toString().toLowerCase() === channelSource.LAZADA.toLowerCase()) {
        let templateId;
        let contentType;
        switch (body.content_type) {
            case chatContentType.IMAGE:
                templateId = '3';
                contentType = 'img_url';
                break;
            case chatContentType.TEXT:
                templateId = '1';
                contentType = 'txt';
                break;
            case chatContentType.PRODUCT:
                templateId = '10006';
                contentType = 'item_id';
                break;
            case chatContentType.INVOICE:
                templateId = '10007';
                contentType = 'order_id';
                break;
            default:
                break;
        }
        let apiParams = `session_id=${body.omnichat_origin_id}&template_id=${templateId}&${contentType}=${body.line_text}`;
        let token = await getToken(body.store_origin_id);
        let chatReply = await lazPostCall(lazReplyChat, apiParams, token.secondary_refresh_token, token.secondary_token);
        if (!chatReply.success) {
            return res.status(400).send(chatReply);
        }
        let chat = await updateOmnichat(body, chatReply.data.message_id);
        res.status(200).send(chat);
    } else if (body.channel_name.toString().toLowerCase() === channelSource.TOKOPEDIA.toLowerCase()) {
        let token = await getToken(body.store_origin_id);
        // console.log(token);
        // console.log(TOKO_REPLYCHAT(process.env.TOKO_APP_ID, body.last_messageId));
        let templateId;
        switch (body.content_type) {
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
                file_path: ''
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
        try {
            let chatReply = await api.post(
                TOKO_REPLYCHAT(tokoAppId, body.last_messageId), 
                JSON.stringify(replyPayload), 
                {
                    headers: {
                        Accept: 'application/json',
                        'Content-Type': 'application/json',
                        Authorization: `Bearer ${token.token}`
                    }
                }
            );
            let chat = await updateOmnichat(body, chatReply.data.msg_id);
            res.status(200).send(chat);
        } catch (err) {
            console.log(err.response.data);
            res.status(400).send({error: err.response.data});
        }
    } else {
        res.status(400).send({error: 'Not implemented'});
    }
})

router.get('/:id/comments', async function(req, res, next) {
    let chat = await prisma.omnichat.findUnique({
        where: {
            id: Number.parseInt(req.params.id)
        },
        include: {
            messages: true,
            store: {
                include: {
                    channel: true
                }
            }
        }
    });
    res.status(200).send(chat);
});

async function updateOmnichat (body, msgId) {
    let chat = await prisma.omnichat.update({
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
                    origin_id: msgId,
                    author: 'agent'
                }
            }
        }
    })
    return chat;
}

module.exports = router;