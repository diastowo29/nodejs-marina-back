const { LAZADA } = require('../../config/utils');
const { getTenantDB } = require('../../middleware/tenantIdentifier');
const { Prisma } = require('../../prisma/generated/baseClient');
const { PrismaClient } = require('../../prisma/generated/client');
let mPrisma = new PrismaClient();

async function routeLazada (jsonBody, prisma, org) {
    mPrisma = prisma;
    const taskPayload = {
        channel: LAZADA,
        orgId: org[1],
        tenantDB: getTenantDB(org[1]),
        code: jsonBody.message_type,
    }
    if (jsonBody.message_type == 0) {
        const orderId = jsonBody.data.trade_order_id; 
        console.log(`inbound order ${orderId} from ${jsonBody.seller_id}`);
        try {
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
                    status: jsonBody.data.order_status,
                },
                include: {
                    store: true,
                    order_items: true,
                }
            });
            taskPayload['token'] = newOrder.store.token;
            taskPayload['refresh_token'] = newOrder.store.refresh_token;
            taskPayload['orderId'] = orderId; 
            taskPayload['customerId'] = jsonBody.data.buyer_id;
            taskPayload['id'] = newOrder.id;
            taskPayload['storeId'] = newOrder.storeId;
            taskPayload['jobId'] = orderId.toString();
            if (newOrder.order_items.length == 0) {
                // pushTask(env, taskPayload);
            }
            // res.status(200).send({id: newOrder.id});
        } catch (err) {
            console.log(err);
            if (err instanceof Prisma.PrismaClientKnownRequestError) {
                if (err.code === 'P2002') {
                    let taskPayload = {
                        channel: LAZADA,
                        status: jsonBody.data.order_status,
                        updatedAt: new Date(),
                        orderId: jsonBody.data.trade_order_id,
                        new: false,
                    }
                    // pushTask(env, taskPayload);
                    // res.status(200).send({});
                } else {
                    // res.status(400).send({err: err});
                }
            } else {
                console.log(err);
                // res.status(400).send({err: err});
            }
        }
    } else if (jsonBody.message_type == 14) {
        mPrisma.orders.update({
            where: {
                origin_id: jsonBody.data.trade_order_id
            },
            data: {
                status: jsonBody.data.status
            }
        }).then(() => {
            // res.status(200).send({})
        }).catch((err) => {
            console.log(err);
            // res.status(500).send({})
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
        taskPayload['productId'] = jsonBody.data.item_id
        taskPayload['mStoreId'] = newProduct.storeId
        taskPayload['token'] = newProduct.store.token
        taskPayload['refreshToken'] = newProduct.store.refresh_token
        taskPayload['mProductId'] = newProduct.id
        taskPayload['jobId'] = jsonBody.data.item_id
        // pushTask(env, taskPayload);
        // res.status(200).send({})
    } else {
        console.log('inbound another message type');
        // res.status(200).send({});
    }
    return taskPayload;
}

module.exports = {
    routeLazada
}