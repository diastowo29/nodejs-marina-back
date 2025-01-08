let throng = require('throng');
let workers = process.env.WEB_CONCURRENCY || 2;
let maxJobsPerWorker = 20;
let { workQueue, client, anotherWorkQueue, jobOpts } = require('./config/redis.config');
const { PrismaClient, Prisma } = require('@prisma/client');
const { LAZADA, BLIBLI, TOKOPEDIA, TOKOPEDIA_CHAT, LAZADA_CHAT, lazGetOrderDetail, lazGetOrderItems, sampleLazOMSToken, lazGetSessionDetail } = require('./config/utils');
const { lazCall } = require('./functions/lazada/caller');
const prisma = new PrismaClient();

require('dotenv').config()

function start() {
    console.log('frontline start');
    workQueue.process(maxJobsPerWorker, async (job, done) => {
        processJob(job, done);
    });
}

async function processJob (jobData, done) {
    let body = jobData.data.body;
    // console.log(jobData);
    // console.log(body)
    // console.log(jobData.data.channel);
    // console.log(Buffer.from(body.message.data, 'base64').toString('ascii'));
    switch (jobData.data.channel) {
        case LAZADA:
            processLazada(jobData.data, done);
            break;
        case LAZADA_CHAT: 
            processLazadaChat(jobData.data, done);
            break;
        case BLIBLI: 
            processBlibli(body, done);
            break;
        case TOKOPEDIA: 
            processTokopedia(body, done);
            break;
        case TOKOPEDIA_CHAT: 
            processTokopedia(body, done);
            break;
        default:
            console.log('channel not supported', jobData.data.channel);
            break;
    }
}

async function processLazadaChat (body, done) {
    let refresh_token = 'refToken';
    let token = body.token.split('~')[lazGetSessionDetail.pos];
    try {
        let apiParams = `session_id=${body.sessionId}`;
        if (body.new) {
            let session = await lazCall(lazGetSessionDetail, apiParams, refresh_token, token);
            if (session && session.success) {
                console.log(session);
                // console.log('update session');
                await prisma.omnichat_user.update({
                    where: {
                        origin_id: session.data.buyer_id.toString()
                    },
                    data: {
                        username: session.data.title,
                        thumbnailUrl: session.data.head_url
                    }
                });
                // console.log(users);
            } else {
                console.log('session invalid');
            }
            done(null, { response: session });
        }
    } catch (err) {
        // console.log(err);
        if (err instanceof Prisma.PrismaClientUnknownRequestError) {
            console.log(err.code);
            console.log(err.meta);
            console.log('error');
        }
    }
}

async function processLazada(body, done) {
    let addParams = `order_id=${body.orderId}`;
    let refresh_token = 'refToken';
    // let refresh_token = body.refresh_token.split('~')[lazGetOrderDetail.pos];
    
    if (body.new) {
        console.log('create order id: ', body.orderId);
        let prod_token = body.token.split('~')[lazGetOrderDetail.pos];
        let orderDetailPromise = await Promise.all([
            lazCall(lazGetOrderDetail, 
                addParams, refresh_token, 
                body.token.split('~')[lazGetOrderDetail.pos]),
            lazCall(lazGetOrderItems, 
                addParams, refresh_token, 
                body.token.split('~')[lazGetOrderItems.pos]),
        ]);

        let orderDetail = orderDetailPromise[0];
        let itemDetail = orderDetailPromise[1];
        let shipping = orderDetail.data.address_shipping;

        let orderItemList = [];
        itemDetail.data.forEach(async (item) => {
            orderItemList.push({
                where: {
                    origin_id: item.order_item_id.toString()
                },
                create: {
                    qty: 1,
                    origin_id: item.order_item_id.toString(),
                    notes: '',
                    total_price: Number.parseInt(orderDetail.data.price),
                    products: {
                        connectOrCreate: {
                            where: {
                                origin_id: item.product_id
                            },
                            create: {
                                origin_id: item.product_id,
                                currency: item.currency,
                                name: item.name,
                                price: item.item_price,
                                sku: item.sku,
                                product_img: {
                                    connectOrCreate: {
                                        create: {
                                            origin_id: item.product_id.toString(),
                                            originalUrl: item.product_main_image
                                        },
                                        where: {
                                            origin_id: item.product_id.toString()
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            })
            // try {
            //     await prisma.order_items.upsert({
            //         where: {
            //             origin_id: item.order_item_id.toString()
            //         },
            //         update: {},
            //         create: {
            //             qty: 1,
            //             origin_id: item.order_item_id.toString(),
            //             notes: '',
            //             orders: {
            //                 connect: {
            //                     id: body.id
            //                 }
            //             },
            //             total_price: Number.parseInt(orderDetail.data.price),
            //             products: {
            //                 connectOrCreate: {
            //                     where: {
            //                         origin_id: item.product_id
            //                     },
            //                     create: {
            //                         origin_id: item.product_id,
            //                         currency: item.currency,
            //                         name: item.name,
            //                         price: item.item_price,
            //                         sku: item.sku,
            //                         product_img: {
            //                             connectOrCreate: {
            //                                 create: {
            //                                     origin_id: item.product_id.toString(),
            //                                     originalUrl: item.product_main_image
            //                                 },
            //                                 where: {
            //                                     origin_id: item.product_id.toString()
            //                                 }
            //                             }
            //                         }
            //                     }
            //                 }
            //             }
            //         }
            //     })
            //     done(null, {response: 'testing'});
            // } catch (err) {
            //     console.log(err);
            //     done(new Error(err));
            // }
        });

        try {
            await prisma.orders.update({
                where: {
                    origin_id: body.orderId.toString()
                },
                data: {
                    customers: {
                        connectOrCreate: {
                            where: {
                                origin_id: body.customerId
                            },
                            create: {
                                name: orderDetail.data.customer_first_name,
                                origin_id: body.customerId
                            }
                        }
                    },
                    recp_addr_city: shipping.city,
                    recp_addr_country: shipping.country,
                    recp_addr_full: `${shipping.address1} ${shipping.address2} ${shipping.address3} ${shipping.address4} ${shipping.address5}`,
                    recp_addr_postal_code: shipping.post_code,
                    recp_name: `${shipping.first_name} ${shipping.last_name}`,
                    recp_phone: `${shipping.phone} / ${shipping.phone2}`,
                    status: orderDetail.data.statuses[0],
                    shipping_price: orderDetail.data.shipping_fee,
                    total_amount: Number.parseInt(orderDetail.data.price),
                    logistic: {
                        connectOrCreate: {
                            where: {
                                name: `laz-${itemDetail.data[0].shipping_provider_type}`
                            },
                            create: {
                                name: `laz-${itemDetail.data[0].shipping_provider_type}`
                            }
                        }
                    },
                    order_items: {
                        connectOrCreate: orderItemList
                    }
                }
            });
        } catch (err) {
            console.log(err);
            done(new Error(err));
        }
    } else {
        console.log('update order id: ', body.orderId);
        try {
            await prisma.orders.update({
                where: { origin_id: body.orderId.toString() },
                data: { status: body.status }
            });
            done(null, {response: 'testing'});
        } catch (err) {
            console.log(err);
            done(new Error(err));
        }
    }
}

async function processTokopedia(body, done) {
    console.log(body);
    done(null, {response: 'testing'});
}

async function processBlibli(body, done) {
    /* let orderItems = [];
    // console.log(body);
    const payload = body;
    if (payload.orderId) {
        console.log('existing');
        let orders = await prisma.orders.update({
            where: { origin_id: payload.orderId.toString() },
            data: { status: payload.orderStatus }
        })
        done(null, {response: orders});
        return;
    }
    // console.log('new');
    payload.orderItems.forEach(item => {
        const productProp = {
            origin_id: item.orderItem.id.toString(),
            name: item.product.name,
            sku: item.product.sellerSku,
            price: item.product.itemPrice
        }
        orderItems.push({
            qty: item.product.quantity,
            total_price: item.amount.itemTotalAmount,
            notes: item.product.notes,
            products: {
                connectOrCreate: {
                    create: productProp,
                    where: {
                        origin_id: item.orderItem.id.toString()
                    }
                }
            }
        })
    });
    const recp = payload.recipient
    const order = payload.order
    try {
        let orders = await prisma.orders.upsert({
            where: {
                origin_id: order.id
            },
            update: {
                status: order.status
            },
            create: {
                store: {
                    connectOrCreate: {
                        create: {
                            name: payload.store.name,
                            origin_id: payload.store.code
                        }, 
                        where: {
                            origin_id: payload.store.code
                        }
                    } 
                },
                origin_id: order.id,
                recp_addr_city: recp.city,
                recp_addr_country: recp.country,
                recp_addr_district: recp.disctrict,
                recp_addr_full: recp.streetAddress,
                recp_addr_postal_code: recp.zipCode.toString(),
                recp_name: recp.name,
                status: order.status,
                order_items: {
                    create: orderItems
                }
            }
        });
        console.log(orders);
        done(null, {response: orders});
    } catch (err) {
        console.log(err);
    } */
   
    console.log(body);
    done(null, {response: 'testing'});
}

throng({ workers, start });