const { SHOPEE, RRShopeeStatus, storeStatuses } = require("../../config/utils");
const { getTenantDB } = require("../../middleware/tenantIdentifier");
const { PrismaClient } = require('../../prisma/generated/client');
let prisma = new PrismaClient();

async function routeShopee (jsonBody, mPrisma, org) {
    prisma = mPrisma
    let taskPayload = {};
    let payloadCode = jsonBody.code;
    const tenantDbUrl = getTenantDB(org[1]);
    switch (payloadCode) {
        case 3:
            if (!jsonBody.data.status.includes('cancel')) {
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
                if (newOrder.order_items.length == 0 || jsonBody.data.status == 'SHIPPED') {
                    if (newOrder.store.status != storeStatuses.EXPIRED) {
                        taskPayload = {
                            channel: SHOPEE, 
                            order_id: jsonBody.data.ordersn,
                            id: newOrder.id,
                            token: newOrder.store.token,
                            code: payloadCode,
                            m_shop_id: newOrder.store.id,
                            shop_id: jsonBody.shop_id,
                            refresh_token: newOrder.store.refresh_token,
                            status: jsonBody.data.status,
                            tenantDB: tenantDbUrl,
                            org_id: org[1]
                        }
                    } else {
                        console.log('Shopee store: %s Expired', newOrder.store.id);
                    }
                }
            } else {
                await prisma.return_refund.upsert({
                    where: {
                        origin_id: jsonBody.data.ordersn 
                    },
                    create: {
                        total_amount: 0,
                        origin_id: jsonBody.data.ordersn,
                        return_type: 'CANCELLATION',
                        status: 'Cancellation - Pending',
                        system_status: 'CANCELLATION_PENDING',
                        order: {
                            connect: {
                                origin_id: jsonBody.data.ordersn
                            }
                        }
                    },
                    update: {}
                })
            }
            break;
        case 10:
            if (jsonBody.data.type == 'message') {
                try {
                    const userExternalId = `shopee-${jsonBody.data.content.from_id}-${jsonBody.shop_id}`
                    let upsertMessage = await prisma.omnichat.upsert({
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
                                        name: jsonBody.data.content.from_user_name,
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
                        if (jsonBody.data.content.business_type == 0) {
                            taskPayload = {
                                channel: SHOPEE,
                                code: jsonBody.code,
                                chat_type: jsonBody.data.content.message_type,
                                message: upsertMessage,
                                userExternalId: userExternalId,
                                message_content: jsonBody.data.content,
                                tenantDB: getTenantDB(org[1]),
                                org_id: org[1],
                                syncCustomer: false //shopee dont need to sync customer
                            }
                            // pushTask(env, taskPayload);
                        }
                    }
                    // res.status(200).send({message: {id: upsertMessage.id}});
                } catch (err) {
                    console.log(err);
                    console.log('Error upserting message for conversation %s', jsonBody.data.content.conversation_id);
                    // res.status(500).send({error: 'Internal Server Error'});
                }
                /* no need to push to worker */
            } else {
                // res.status(200).send({message: 'Event type not message'});
            }
            break;
        case 29: 
            const updatedReturn = jsonBody.data.updated_values.find(item => item.update_field == 'return_status');
            if (updatedReturn) {
                const updatedStatus = (updatedReturn.new_value) ? updatedReturn.new_value : updatedReturn.old_value;
                try {
                    let returnRefund = await prisma.return_refund.upsert({
                        where: {
                            origin_id: jsonBody.data.return_sn
                        },
                        update: {
                            system_status: updatedStatus,
                            status: RRShopeeStatus(updatedStatus),
                        },
                        create: {
                            origin_id: jsonBody.data.return_sn,
                            system_status: updatedStatus,
                            total_amount: 0,
                            status: RRShopeeStatus(updatedStatus),
                            order: {
                                connect: {
                                    origin_id: jsonBody.data.order_sn
                                }
                            }
                        },
                        include: {
                            line_item: true,
                            order: {
                                select: {
                                    id: true,
                                    origin_id: true,
                                    customers: true,
                                    store: {
                                        include: {
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
                    });
                    if (returnRefund.line_item.length == 0) {
                        taskPayload = {
                            tenantDB: tenantDbUrl,
                            channel: SHOPEE,
                            token: returnRefund.order.store.token,
                            refresh_token: returnRefund.order.store.refresh_token,
                            order_id: returnRefund.order.origin_id,
                            cipher: returnRefund.order.store.secondary_token,
                            m_shop_id: returnRefund.order.store.id,
                            m_order_id: returnRefund.order.id,
                            returnId: returnRefund.origin_id,
                            status: 'RETURN_AND_REFUND',
                            code: jsonBody.code,
                            customer_id: returnRefund.order.customers.origin_id,
                            shop_id: jsonBody.shop_id,
                            integration: returnRefund.order.store.channel.client.integration,
                            org_id: org[1]
                        }
                        console.log(taskPayload);
                        // pushTask(env, taskPayload);
                    }
                    // res.status(200).send({message: {id: returnRefund.id}});
                } catch (err) {
                    console.log(err);
                    console.log('Error updating return/refund %s', jsonBody.data.return_sn);
                    // res.status(500).send({error: 'Internal Server Error'});
                }
            }
            break;
        default:
            response = jsonBody.data;
            console.log('CODE: %s Not implemented yet!', payloadCode);
            // res.status(200).send({message: 'Code not implemented'});
            break;
    }
    return taskPayload;
}

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

module.exports = {
    routeShopee
}