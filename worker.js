let throng = require('throng');
let workers = process.env.WEB_CONCURRENCY || 2;
let maxJobsPerWorker = 20;
let { workQueue } = require('./config/redis.config');
// const { PrismaClient, Prisma } = require('@prisma/client');
const { LAZADA, BLIBLI, TOKOPEDIA, TOKOPEDIA_CHAT, LAZADA_CHAT, lazGetOrderDetail, lazGetOrderItems, sampleLazOMSToken, lazGetSessionDetail, SHOPEE, TIKTOK, TIKTOK_CHAT } = require('./config/utils');
const { lazCall } = require('./functions/lazada/caller');
// const prisma = new PrismaClient();
let env = process.env.NODE_ENV || 'developemnt';
const fs = require('fs');

const SunshineConversationsClient = require('sunshine-conversations-client');
const messageApi = new SunshineConversationsClient.MessagesApi();

// sunco hardcode part
let suncoAppId = process.env.SUNCO_APP_ID
let suncoKeyId = process.env.SUNCO_KEY_ID
let suncoKeySecret = process.env.SUNCO_KEY_SECRET

const express = require('express');
const { GET_SHOPEE_PRODUCTS_LIST, GET_SHOPEE_PRODUCTS_INFO, GET_SHOPEE_ORDER_DETAIL } = require('./config/shopee_apis');
const { api } = require('./functions/axios/interceptor');
const { collectShopeeOrder, generateShopeeToken } = require('./functions/shopee/function');
const { GET_ORDER_API, GET_PRODUCT, UPLOAD_IMAGE } = require('./config/tiktok_apis');
const { collectTiktokOrder, collectTiktokProduct, collectReturnRequest, forwardConversation } = require('./functions/tiktok/function');
const { getPrismaClient } = require('./services/prismaServices');
const { Prisma } = require('./prisma/generated/baseClient');
const { getTenantDB } = require('./middleware/tenantIdentifier');
const app = express();
if (env == 'production') {
    app.use(express.json());
    const PORT = process.env.PORT || 8080;
    // const PORT = 3003;
    app.listen(PORT, () => {
        console.log('db at ', process.env.DATABASE_URL);
        console.log(`Worker running on port ${PORT}`);
    });
    app.post('/doworker', async (req, res) => {
        let job = await processJob({
            data: req.body
        });
        res.status(200).send({
            job: job
        });
    });
} else {
    throng({
        workers,
        start
    });
}

// functions.http('crfWorkers', (req, res) => {
//     console.log('workers start')
//     console.log(req.body);
//     // processJob(req.body);
//     res.status(200).send({});
// });

function start() {
    console.log('frontline start');
    workQueue.process(maxJobsPerWorker, async (job, done) => {
        processJob(job, done);
    });
}

async function processJob(jobData, done) {
    // let body = jobData.data.body;
    // console.log(jobData);
    // console.log(JSON.stringify(body))
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
            processBlibli(jobData.data, done);
            break;
        case TOKOPEDIA:
            processTokopedia(jobData.data, done);
            break;
        case TOKOPEDIA_CHAT:
            processTokopediaChat(jobData.data, done);
            break;
        case SHOPEE:
            processShopee(jobData.data, done);
            break;
        case TIKTOK:
            processTiktok(jobData.data, done);
            break;
        case TIKTOK_CHAT:
            break;
        default:
            console.log(jobData.data);
            const formData = new FormData();
            formData.append('data', fs.createReadStream(jobData.data.files))

            // const data = jobData.data.data.data.path;
            try {
                const uploaded = await api.post(UPLOAD_IMAGE(formData), formData, {
                    headers: {
                        'x-tts-access-token': 'ROW_V381WwAAAABLnq7xXOmscBX-2auOuaCindVaZtRIQ7EWKejWoQytgRvgHUK6PwUNZdE2MkJkyzWGC_oe0oI4AF3HgcWm8AFsTgtyi-SxPGonwyBLlXVpOBCfEXYi65wqB294knTTRfp9rm1B94T8tNCBijaGJf8V',
                        'content-type': 'multipart/form-data'
                    }
                });
                console.log(uploaded.data);
                // res.status(200).send(uploaded.data);
            } catch (err) {
                console.log(err)
                // res.status(500).send({err: err.message})
            }
            console.log('channel not supported: ', jobData.data.channel);
            if (env !== 'production') {
                done(null, {response: 'testing'});
            }
            break;
    }
}

async function processLazadaChat(body, done) {
    let refresh_token = 'refToken';
    let token = body.token.split('~')[lazGetSessionDetail.pos];
    const prisma = getPrismaClient(body.tenantDB);
    try {
        let apiParams = `session_id=${body.sessionId}`;
        if (body.new) {
            let session = await lazCall(lazGetSessionDetail, apiParams, refresh_token, token);
            if (session && session.success) {
                // console.log(session);
                console.log(`get session: ${session.data.session_id} username: ${session.data.title} userId: ${session.data.buyer_id}`);
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
            // done(null, { response: session });
        }
    } catch (err) {
        // console.log(err);
        if (err instanceof Prisma.PrismaClientUnknownRequestError) {
            console.log(err.code);
            console.log(err.meta);
            console.log('error');
        }
    }
    let messageContent = JSON.parse(body.body.data.content)
    let suncoMessagePayload = {
        author: {
            type: 'user',
            userExternalId: body.user_external_id
        }
    }

    if (body.body.data.template_id == 1) { // text
        let contentText
        if(body.body.data.hasOwnProperty('process_msg')){
            contentText = body.body.data.process_msg
        }else{
            contentText = messageContent.txt
        }
        
        suncoMessagePayload.content = {
            type: "text",
            text: contentText
        }
    } else if (body.body.data.template_id == 3 || body.body.data.template_id == 4) { // attachment or sticker
        suncoMessagePayload.content = {
            type: 'image',
            mediaUrl: messageContent.imgUrl
        }
    } else { // product attachment_type = 3
        suncoMessagePayload.content = {
            type: 'image',
            text: `${messageContent.title}\n${messageContent.actionUrl}`,
            mediaUrl: messageContent.pic
        }
    }

    let suncoMessage = await postMessage(body.message_external_id, suncoMessagePayload)
    if (env !== 'production') {
        
        done(null, {
            response: 'testing'
        });
    }

}

async function processLazada(body, done) {
    let addParams = `order_id=${body.orderId}`;
    let refresh_token = 'refToken';
    // let refresh_token = body.refresh_token.split('~')[lazGetOrderDetail.pos];
    const prisma = getPrismaClient(body.tenantDB);

    if (body.new) {
        console.log('create order id: ', body.orderId);
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
                                origin_id: item.product_id.toString()
                            },
                            create: {
                                origin_id: item.product_id.toString(),
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
                                origin_id: body.customerId.toString()
                            },
                            create: {
                                name: orderDetail.data.customer_first_name,
                                origin_id: body.customerId.toString()
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
            if (env !== 'production') {

                done(new Error(err));
            }
        }
    } else {
        console.log('update order id: ', body.orderId);
        try {
            await prisma.orders.update({
                where: {
                    origin_id: body.orderId.toString()
                },
                data: {
                    status: body.status
                }
            });
            if (env !== 'production') {
                done(null, {
                    response: 'testing'
                });

            }
        } catch (err) {
            console.log(err);
            if (env !== 'production') {
                done(new Error(err));
            }
        }
    }
}

async function processTokopedia(body, done) {
    console.log(JSON.stringify(body));
    if (env !== 'production') {
        done(null, {
            response: 'testing'
        });
    }

}

async function processTokopediaChat(body, done) {
    console.log('process tokopedia chat', body);
    let suncoMessagePayload = {
        author: {
            type: 'user',
            userExternalId: body.user_external_id
        }
    }

    if (body.body.payload.attachment_type == 0) { // text
        suncoMessagePayload.content = {
            type: "text",
            text: body.body.message
        }
    } else if (body.body.payload.attachment_type == 2) { // attachment
        suncoMessagePayload.content = {
            type: 'image',
            mediaUrl: body.body.payload.image.image_url
        }
    } else if(body.body.payload.attachment_type == 3){ // product attachment_type = 3
        suncoMessagePayload.content = {
            type: 'image',
            text: body.body.payload.product.product_url,
            mediaUrl: body.body.payload.product.image_url
        }
    }else{ //sticker
        suncoMessagePayload.content = {
            type: 'text',
            text: `:${body.body.message}:`
        }
    }

    let suncoMessage = await postMessage(body.message_external_id, suncoMessagePayload)
    // done(null, {
    //     response: 'testing'
    // });
    console.log(JSON.stringify(body));
    if (env !== 'production') {

        done(null, {response: 'testing'});
    }

}

async function processShopee(body, done) {
    console.log(JSON.stringify(body));
    /* WORKER PART */
    const prisma = getPrismaClient(getTenantDB(body.org_id));
    if (body.code == 3) {
        /* ==== ORDERS ==== */
        collectShopeeOrder(body, done);
    } else if (body.code == 9999) {
        let accToken = body.token;
        let refToken = body.refresh_token
        // console.log(accToken);
        // console.log(GET_SHOPEE_PRODUCTS_LIST(accToken, body.shop_id));
        const products = await api.get(
            GET_SHOPEE_PRODUCTS_LIST(accToken, body.shop_id)
        ).catch(async function (err) {
            if ((err.status === 403) && (err.response.data.error === 'invalid_acceess_token')) {
                console.log(`error status ${err.status} response ${err.response.data.error}`);
                let newToken = await generateShopeeToken(body.shop_id, refToken);
                accToken = newToken.access_token;
                refToken = newToken.refresh_token;
                console.log(newToken);
                if (newToken.access_token) {
                    return api.get(
                        GET_SHOPEE_PRODUCTS_LIST(newToken.access_token, body.shop_id)
                    );
                }
            }
        });
        if ((!products) || (!products.data.error)) {
            let productIds = products.data.response.item.map(item => item.item_id);
            // console.log(GET_SHOPEE_PRODUCTS_INFO(accToken, productIds, body.shop_id))
            const productsInfo = await api.get(
                GET_SHOPEE_PRODUCTS_INFO(accToken, productIds, body.shop_id)
            ).catch(function (err) {
                console.log(err.response.data);
            });
            if (productsInfo.data.response) {
                prisma.products.createManyAndReturn({
                    skipDuplicates: true,
                    data: productsInfo.data.response.item_list.map(item => ({
                        condition: (item.condition == 'NEW') ? 1 : 2,
                        currency: item.price_info.currency,
                        name: item.item_name,
                        origin_id: item.item_id.toString(),
                        category: item.category_id,
                        desc: item.description_info.extended_description.field_list[0].text,
                        price: item.price_info[0].original_price,
                        sku: item.item_sku,
                        status: item.item_status,
                        stock: item.stock_info_v2.summary_info.total_available_stock,
                        weight: Number.parseInt(item.weight),
                        storeId: body.m_shop_id
                    }))
                }).then(async (newProducts) => {
                    if (newProducts.length > 0) {
                        await prisma.products_img.createManyAndReturn({
                            skipDuplicates: true,
                            data: productsInfo.data.response.item_list.map(item => ({
                                filename: item.item_name,
                                origin_id: item.image.image_id_list[0],
                                originalUrl: item.image.image_url_list[0],
                                productsId: newProducts.find(product => product.origin_id == item.item_id.toString()).id,
                            }))
                        });
                    }
                    if (env !== 'production') {
                        done(null, {response: 'testing'});

                    }
                }).catch((err) => {
                    console.log(err);
                });
    
            } else {
                console.log(productsInfo.data);
            }
        } else {
            console.log(products.data);
    if (env !== 'production') {
        done(null, {response: 'testing'});

    }
        }
    } else {
        console.log('shopee code not supported: ', body.code);
    if (env !== 'production') {
        done(null, {response: 'testing'});
    }

    }

    /* let orderDetail = await api.get(
        `${SHOPEE_HOST}${GET_ORDER_DETAIL_PATH}?${shopInfoParams}`,
    ).catch(function(err) {
        console.log(err.response.data);
        return res.status(400).send({error: err.response.data});
    });

    console.log(orderDetail); */

    /* if (orderDetail.data) {
        if (orderDetail.data.error) {
            return;
        }
        // if orderlist length > 0
        let orderX = orderDetail.data.response.order_list[0];
        let order = await prisma.orders.update({
            where: {
                origin_id: orderX.order_sn
            },
            data: {
                status: orderX.order_status,
                recp_addr_city: orderX.recipient_address.city,
                recp_addr_district: orderX.recipient_address.district,
                recp_addr_full: orderX.recipient_address.full_address,
                recp_addr_postal_code: orderX.recipient_address.zipcode,
                recp_addr_province: orderX.recipient_address.state,
                recp_addr_country: orderX.recipient_address.country,
                recp_name: orderX.recipient_address.name,
                recp_phone: orderX.recipient_address.phone,
                logistic: {
                    connectOrCreate: {
                        where: {
                            name: orderX.shipping_carrier
                        },
                        create: {
                            name: orderX.shipping_carrier
                        }
                    }
                },
                origin_id: orderX.order_sn,
                shipping_price: orderX.estimated_shipping_fee,
                total_amount: orderX.total_amount,
                order_items: {
                    createMany: {
                        data: orderX.item_list.map(item => ({
                            origin_id: `${orderId}-${item.item_id}`,
                            qty: item.model_quantity_purchased,
                            notes: orderX.note,
                            total_price: item.model_discounted_price,
                            products: {
                                connectOrCreate: {
                                    where: {
                                        origin_id: item.item_id.toString()
                                    },
                                    create: {
                                        name: item.item_name,
                                        price: item.model_original_price,
                                        sku: item.item_sku,
                                        origin_id: item.item_id.toString(),
                                        store: {
                                            connect: {
                                                origin_id: storeId.toString()
                                            }
                                        },
                                    }
                                }
                            }
                        }))
                    }
                }
            }
        })
    } */
    if (env !== 'production') {
        done(null, {response: 'testing'});
    }

}

async function processTiktok(body, done) {
    if (body.code == 1) {
        /* ==== ORDERS UPDATE==== */
        if (body.status != 'UNPAID') {
            collectTiktokOrder(body, done);
        }
    } else if (body.code == 16) {
        /* PRODUCT STATUS UPDATE */
        collectTiktokProduct(body, done);
    } else if (body.code == 2) {
        collectReturnRequest(body, done);
    } else if (body.code == 14) {
        forwardConversation(body, done);
    } else {
        console.log('code %s not implemented yet', body.code);
        if (env !== 'production') {
            done(null, {response: 'testing'});
        }
    }
}

async function processBlibli(body, done) {
    /* let orderItems = [];
    // console.log(JSON.stringify(body));
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

    console.log(JSON.stringify(body));
    if (env !== 'production') {
        done(null, {
            response: 'testing'
        });

    }
}

function postMessage(conversationId, payload) {
    console.log('post message Payload', payload)
    const messageApi = new SunshineConversationsClient.MessagesApi()
    let defaultClient = SunshineConversationsClient.ApiClient.instance
    let basicAuth = defaultClient.authentications['basicAuth']
    basicAuth.username = suncoKeyId
    basicAuth.password = suncoKeySecret

    return messageApi.postMessage(suncoAppId, conversationId, payload).then(function(message) {
        console.log(`message sent to ${conversationId}`)
        return message
    }, function(error) {
        if (error.status == 429) {
            console.log(`post message to ${conversationId} error: ${error.response.text}`)
            return {
                error: {
                    title: error.response.text,
                    data: error.response.req.data
                }
            }
        } else {
            console.log(`post message to ${conversationId} error: ${error.body.errors[0].title}`)
            return {
                error: {
                    title: error.body.errors[0].title,
                    data: error.body.errors[0]
                }
            }
        }
    })
}