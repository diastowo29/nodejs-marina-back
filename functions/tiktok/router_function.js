const { SEARCH_CANCELLATION, SEARCH_RETURN } = require('../../config/tiktok_apis');
const { TIKTOK, RRTiktokStatus } = require('../../config/utils');
const { getTenantDB } = require('../../middleware/tenantIdentifier');
const { PrismaClient } = require('../../prisma/generated/client');
const { callTiktok } = require('./function');
let mPrisma = new PrismaClient();

async function routeTiktok (jsonBody, prisma, org) {
    mPrisma = prisma;
    let taskPayload = {};
    switch (jsonBody.type) {
        case 1:
            let newOrder = await mPrisma.orders.upsert({
                where: {
                    origin_id: jsonBody.data.order_id
                },
                update: {
                    status: jsonBody.data.order_status
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
            const syncItems = (newOrder.order_items.length == 0) ? true : false;
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
                syncItems: syncItems,
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
            break;
        case 2:
            console.log('type 2')
            break;
        case 6:
            mPrisma.store.update({
                where: {
                    origin_id: jsonBody.shop_id.toString()
                },
                data: {
                    status: 'INACTIVE'
                }
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
                            } else {
                                throw new Error("rrData not found");
                            }
                        } else {
                            throw new Error("rrData not found");
                        }
                    }).catch((err) => {
                        console.log(err);
                        throw new Error(err);
                    })
                }
            })
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
                            } else {
                                throw new Error("rrData not found");
                            }
                        } else {
                            throw new Error("rrData not found");
                        }
                    })
                }
            })
            break;
        case 14:
                // console.log(JSON.stringify(jsonBody));
            if (jsonBody.data.sender.role == 'SYSTEM') {
                console.log('system message, ignoring');
                // return res.status(200).send({message: 'system message, ignoring'});
            }
            try {
                const userExternalId = `tiktok-${jsonBody.data.sender.im_user_id}-${jsonBody.shop_id}`
                console.log(`tts_notification_id: ${jsonBody.tts_notification_id} message_id: ${jsonBody.data.message_id} from ${jsonBody.data.sender.role}`);
                // console.log(`message ${jsonBody.data.content}`)
                let upsertMessage = await mPrisma.omnichat.upsert({
                    where: {
                        origin_id: jsonBody.data.conversation_id
                    },
                    update: {
                        last_message: jsonBody.data.content,
                        last_messageId: jsonBody.data.message_id,
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
                        }
                    },
                    select: {
                        id: true,
                        origin_id: true,
                        externalId: true,
                        customer: true,
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
                        taskPayload = {
                            channel: TIKTOK,
                            code: jsonBody.type,
                            chat_type: jsonBody.data.type,
                            message: upsertMessage,
                            userExternalId: userExternalId,
                            imUserId: jsonBody.data.sender.im_user_id,
                            message_content: jsonBody.data.content,
                            tenantDB: getTenantDB(org[1]),
                            shopId: jsonBody.shop_id,
                            org_id: org[1],
                            syncCustomer: (upsertMessage.customer) ? false : true
                        }
                    }
                }
            } catch (err) {
                console.log(err);
                throw new Error(err);                
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
            // pushTask(env, taskPayload);
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
            // pushTask(env, taskPayload);
            break;
        default:
            break;
    }
    return taskPayload;
}

module.exports = {
    routeTiktok
}