var express = require('express');
var router = express.Router();
var {
    PrismaClient
} = require('@prisma/client');
const { lazReplyChat, chatContentType, channelSource } = require('../../../config/utils');
const { lazPostCall, lazPostGetCall } = require('../../../functions/lazada/caller');
const { getToken } = require('../../../functions/helper');

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
        let chat = await prisma.omnichat.update({
            where: {
                origin_id: body.omnichat_origin_id
            },
            data: {
                last_message: body.line_text,
                updatedAt: new Date(),
                last_messageId: chatReply.data.message_id, // change this
                messages: {
                    create: {
                        omnichat_user_id: body.omnichat_user_id,
                        line_text: body.line_text,
                        origin_id: chatReply.data.message_id,
                        author: 'agent'
                    }
                }
            }
        })
        res.status(200).send(chat);
    } else if (body.channel_name.toString().toLowerCase() === channelSource.TOKOPEDIA.toLowerCase()) {
        res.status(200).send('Not implemented');
    } else {
        res.status(400).send('Not implemented');
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

module.exports = router;