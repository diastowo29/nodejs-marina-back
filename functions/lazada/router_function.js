const { LAZADA, CHAT_TEXT } = require('../../config/utils');
const { getTenantDB } = require('../../middleware/tenantIdentifier');
const { PrismaClient } = require('../../prisma/generated/client');
let mPrisma = new PrismaClient();

async function routeLazada (jsonBody, prisma, org) {
    mPrisma = prisma;
    const taskPayload = {
        channel: LAZADA,
        orgId: org[1],
        tenantDB: getTenantDB(org[1])
    }
    if (jsonBody.message_type == 0) {
        const orderId = jsonBody.data.trade_order_id; 
        console.log(`inbound order ${orderId} from ${jsonBody.seller_id}`);
        let newOrder = await mPrisma.orders.upsert({
            where: {
                origin_id: orderId.toString(),
            },
            create: {
                origin_id: orderId.toString(),
                status: jsonBody.data.order_status,
                updatedAt: new Date(),
                store: {
                    connect: {
                        origin_id: jsonBody.seller_id.toString()
                    }
                }
            },
            update: {
                status: jsonBody.data.order_status
            },
            include: {
                store: true,
                order_items: true
            }
        });
        if (newOrder.order_items.length == 0) {
            taskPayload['token'] = newOrder.store.token;
            taskPayload['refresh_token'] = newOrder.store.refresh_token;
            taskPayload['orderId'] = orderId; 
            taskPayload['customerId'] = jsonBody.data.buyer_id;
            taskPayload['id'] = newOrder.id;
            taskPayload['storeId'] = newOrder.storeId;
            taskPayload['code'] = jsonBody.message_type;
            taskPayload['jobId'] = orderId.toString();
        }
    } else if (jsonBody.message_type == 2) {
        const bodyData = jsonBody.data;
        const sessionId = bodyData.session_id;
        const userId = bodyData.from_user_id;
        const messageId = bodyData.message_id;
        const userExternalId = `lazada-${userId}-${jsonBody.seller_id}`
        const conversation = await mPrisma.omnichat.upsert({
            where: {
                origin_id: sessionId
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
                customer: {
                    connectOrCreate: {
                        where: { origin_id: userId.toString() },
                        create: { origin_id: userId.toString() }
                    }
                }
            },
            select: {
                id: true,
                origin_id: true,
                externalId: true,
                customer: true,
                storeId: true,
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
        let chatType = '';
        if (bodyData.template_id == 1) {
            chatType = 'TEXT';
        } else if (bodyData.template_id == 3 || bodyData.template_id == 4) {
            chatType = 'IMAGE';
        } else if (bodyData.template_id == 10006){
            chatType = "PRODUCT_CARD";
        } else {
            chatType = 'UNKNOWN';
        }
        /* SOON */
        /* const taskMessage = {
            integration: conversation.store.channel.client.integration,
            customer: conversation.customer,
            conversationExternalId: conversation.externalId,
            messageId: conversation.id
        } */
        /* SOON */
        taskPayload['sessionId']= sessionId;
        taskPayload['id']= conversation.id;
        taskPayload['token']= conversation.store.token;
        taskPayload['storeId']= conversation.storeId;
        taskPayload['refresh_token']= conversation.store.refresh_token;
        taskPayload['userExternalId']= userExternalId;
        taskPayload['msgExternalId']= conversation.externalId;
        taskPayload['message'] = conversation;
        taskPayload['message_content'] = bodyData.content;
        taskPayload['code'] = jsonBody.message_type;
        taskPayload['from_account_type'] = bodyData.from_account_type
        taskPayload['chat_type'] = chatType;
        taskPayload['new'] = (conversation.customer?.name == null) ? true : false;
    } else if (jsonBody.message_type == 14) {
        await mPrisma.orders.update({
            where: {
                origin_id: jsonBody.data.trade_order_id
            },
            data: {
                status: jsonBody.data.status
            }
        });
    } else if(jsonBody.message_type == 21) {
        // product review
        // eyJzZWxsZXJfaWQiOiI0MDA2NTY1NzYxMDciLCJtZXNzYWdlX3R5cGUiOjIxLCJkYXRhIjp7Iml0ZW1faWQiOjgyOTg3ODgzNTksImlkIjoxNTMwMDEzMTE5Njg4MzU5LCJvcmRlcl9pZCI6MTU3MTg2MDg3NjE2OTAwN30sInRpbWVzdGFtcCI6MTczNjQ3Njc5Nywic2l0ZSI6ImxhemFkYV9pZCJ9
        // cancel success
        // eyJzZWxsZXJfaWQiOiI0MDA2NTY1NzYxMDciLCJtZXNzYWdlX3R5cGUiOjEwLCJkYXRhIjp7ImJ1eWVyX2lkIjo0MDA2NTk2NjkwMDcsImV4dHJhUGFyYW1zIjp7fSwicmV2ZXJzZV9vcmRlcl9pZCI6ODU2MjI5ODA1MTY5MDA3LCJyZXZlcnNlX29yZGVyX2xpbmVfaWQiOjg1NjIyOTgwNTI2OTAwNywicmV2ZXJzZV9zdGF0dXMiOiJDQU5DRUxfU1VDQ0VTUyIsInNlbGxlcl9pZCI6NDAwNjU2NTc2MTA3LCJzdGF0dXNfdXBkYXRlX3RpbWUiOjE3MzY0NzM1ODIsInRyYWRlX29yZGVyX2lkIjoxNTk2MDk1NDk5OTY5MDA3LCJ0cmFkZV9vcmRlcl9saW5lX2lkIjoxNjExNTk4MTAwMzY5MDA3fSwidGltZXN0YW1wIjoxNzM2NDczNTg3LCJzaXRlIjoibGF6YWRhX2lkIn0=
        
        console.log('inbound another message type');
        // res.status(200).send({});
    } else if (jsonBody.message_type == 3) {
        /* NEW PRODUCT */
        const newProduct = await mPrisma.products.upsert({
            where: {
                origin_id: jsonBody.data.item_id.toString()
            },
            create: {
                origin_id: jsonBody.data.item_id.toString(),
                store: {
                    connect: {
                        origin_id: jsonBody.seller_id
                    }
                }
            },
            update: {},
            include: {
                store: {
                    select: {
                        origin_id: true,
                        token: true,
                        refresh_token: true
                    }
                }
            }
        });
        taskPayload['productId'] = jsonBody.data.item_id;
        taskPayload['mStoreId'] = newProduct.storeId;
        taskPayload['token'] = newProduct.store.token;
        taskPayload['refreshToken'] = newProduct.store.refresh_token;
        taskPayload['mProductId'] = newProduct.id;
        taskPayload['jobId'] = jsonBody.data.item_id;
        taskPayload['code'] = jsonBody.message_type;
    } else {
        console.log('inbound another message type');
        console.log(JSON.stringify(jsonBody));
    }
    return taskPayload;
}

module.exports = {
    routeLazada
}