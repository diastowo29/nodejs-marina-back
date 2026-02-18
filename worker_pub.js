let throng = require('throng');
let workers = process.env.WEB_CONCURRENCY || 1;
const { lazGetOrderDetail, lazGetOrderItems, lazGetSessionDetail, lazGetProducts, appKeyOMS } = require('./config/utils');
const { lazCall } = require('./functions/lazada/caller');
let env = /* process.env.NODE_ENV || */ 'production';
const { GET_SHOPEE_PRODUCTS_LIST, GET_SHOPEE_PRODUCTS_INFO, GET_SHOPEE_PRODUCTS_MODEL } = require('./config/shopee_apis');
const { api } = require('./functions/axios/interceptor');
const { collectShopeeOrder, generateShopeeToken, collectShopeeTrackNumber, collectShopeeRR } = require('./functions/shopee/function');
const { collectTiktokOrder, collectTiktokProduct, collectReturnRequest, forwardConversation, getValue } = require('./functions/tiktok/function');
const { getPrismaClientForTenant } = require('./services/prismaServices');
const { PrismaClient: prismaBaseClient } = require('./prisma/generated/baseClient');
const { getTenantDB } = require('./middleware/tenantIdentifier');
const { PrismaClient } = require('./prisma/generated/client');
const { encryptData } = require('./functions/encryption');
const { PubSub } = require('@google-cloud/pubsub');
const { gcpParser } = require('./functions/gcpParser');
const { routeTiktok } = require('./functions/tiktok/router_function');
const { routeLazada } = require('./functions/lazada/router_function');
const { routeShopee } = require('./functions/shopee/router_function');
const { io } = require('socket.io-client');
let prisma = new PrismaClient();
const basePrisma = new prismaBaseClient();
const pubSubTopic = process.env.PUBSUB_TOPIC || 'marina-main-topic-dev';
const pubSubTopicSubs = process.env.PUBSUB_TOPIC_SUBS || 'marina-main-topic-dev-sub';

const projectId = process.env.GCP_PROJECT_ID;
const topicName = pubSubTopic;
const subsName = pubSubTopicSubs;

throng({
    workers,
    start
});

function messageHandler (pubMessage) {
    const socket = io('https://marina-apps.et.r.appspot.com');
    const pubPayload = gcpParser(pubMessage.data);
    if (pubPayload.ping ) {
        return pubMessage.ack();
    }
    const storeId = getValue(pubPayload, ['seller_id', 'shop_id', 'store_id', 'store_code']);
    if (!storeId || storeId == 'null') {
        return pubMessage.ack();
    }
    console.log("inbound: " + pubMessage.id);
    basePrisma.stores.findUnique({
        where: {
            origin_id: storeId.toString()
        },
        include: {
            clients: true
        }
    }).then(async(baseStore) => {
        if (!baseStore) {
            console.log(JSON.stringify(pubPayload))
            console.log('cannot find the client');
            pubMessage.ack();
            return;
        }
        const org = Buffer.from(baseStore.clients.org_id, 'base64').toString('ascii').split(':');
        prisma = getPrismaClientForTenant(org[1], getTenantDB(org[1]).url);
        // console.log(getTenantDB(org[1]).url);
        const mStore = await prisma.store.findFirst({
            where: {
                origin_id: baseStore.origin_id
            },
            include: {
                channel: {
                    select: {
                        name: true
                    }
                }
            }
        });
        if (!mStore) {
            console.log('store not found in tenant db');
            pubMessage.ack();
            return;
        }
        switch (mStore.channel.name) {
            case 'tiktok':
                routeTiktok(pubPayload, prisma, org).then(async (taskPayload) => {
                    if (taskPayload) {
                        if (taskPayload.code == 1) {
                            /* ==== ORDERS UPDATE==== */
                            if (taskPayload.status != 'UNPAID') {
                                collectTiktokOrder(taskPayload, pubMessage);
                            }
                        } else if (taskPayload.code == 16 || taskPayload.code == 15) {
                            /* PRODUCT STATUS UPDATE */
                            collectTiktokProduct(taskPayload, pubMessage);
                        } else if (taskPayload.code == 12 || taskPayload.code == 11) {
                            collectReturnRequest(taskPayload, pubMessage);
                        } else if (taskPayload.code == 14) {
                            socket.emit('server-hear', {tenant: org[1], message: taskPayload.message.origin_id});
                            forwardConversation(taskPayload, pubMessage);
                        } else {
                            console.log('code %s not implemented yet', taskPayload.code);
                            pubMessage.ack();
                        }
                        // processTiktok(taskPayload, pubMessage);
                    } else {
                        pubMessage.ack();
                    }
                }).catch((error) => {
                    console.log(error);
                    pubMessage.nack();
                });
                break;
            case 'lazada':
                routeLazada(pubPayload, prisma, org).then(async (taskPayload) => {
                    if (taskPayload.code) {
                        processLazada(taskPayload, pubMessage);
                    } else {
                        pubMessage.ack();
                    }
                });
                break;
            case 'shopee':
                routeShopee(pubPayload, prisma, org).then(async (taskPayload) => {
                    // console.log(taskPayload);
                    if (taskPayload.code) {
                        processShopee(taskPayload, pubMessage);
                    } else {
                        pubMessage.ack();
                    }
                });
                break;
            case 'blibli':
                console.log('blibli message received');
                console.log(JSON.stringify(pubPayload));
                pubMessage.ack();
                break;
            default:
                console.log('default channel');
                pubMessage.nack();
                break;
        }
    }).catch((err) => {
        console.log(err);
        console.log("inbound error: " + pubMessage.id);
        pubMessage.nack();
    })
    // pubMessage.nack()
    // throw new Error("error marina");
}

function errorHandler (error) {
    console.log(error)
    throw new Error("Error worker ", {cause: error});
}

function start() {
    console.log('Marina Worker started... ', env);
    // if  (env == 'production') {
        const pubsub = new PubSub({projectId: projectId});
        const topic = pubsub.topic(topicName);
        const subs = topic.subscription(subsName);
        subs.on('message', messageHandler);
        subs.on('error', errorHandler)
    // } else {
        // workQueue.process(maxJobsPerWorker, async (job, done) => {
        //     processJob(job, done);
        // });
    // }
    // subs.on('message', (messageHandler) => {
    //     messageHandler.
    // });
}

async function processLazada(body, pubMessage) {
    let addParams = `order_id=${body.orderId}`;
    const isOms = true;
    // let refresh_token = body.refresh_token.split('~')[lazGetOrderDetail.pos];
    // const prisma = getPrismaClient(body.tenantDB);
    prisma = getPrismaClientForTenant(body.orgId, body.tenantDB.url);
    switch (body.code) {
        case 0:
            console.log('create order id: ', body.orderId);
            try {
                let orderDetailPromise = await Promise.all([
                    lazCall(lazGetOrderDetail,
                        addParams, body.refresh_token,
                        body.token, body.storeId, body.orgId,
                        body.tenantDB, isOms),
                    lazCall(lazGetOrderItems,
                        addParams, body.refresh_token,
                        body.token, body.storeId, body.orgId,
                        body.tenantDB, isOms),
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
                                        storeId: body.storeId,
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
                    });
                });
                prisma.orders.update({
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
                }).then((order) => {
                    console.log('order synced: ' + order.id)
                    pubMessage.ack();
                })
            } catch (err) {
                console.log(err);
                pubMessage.nack();
            }
            break;
        case 2:
            let apiParams = `session_id=${body.sessionId}`;
            if (body.from_account_type == 1) {
                if (body.new) {
                    let session = await lazCall(lazGetSessionDetail, apiParams, 
                        body.refresh_token, body.token, body.storeId, body.orgId,
                                body.tenantDB, false);
                    if (session && session.success) {
                        console.log(`get session: ${session.data.session_id} username: ${session.data.title} userId: ${session.data.buyer_id}`);
                        await prisma.customers.update({
                            where: {
                                origin_id: session.data.buyer_id.toString()
                            },
                            data: {
                                name: session.data.title
                            }
                        });
                        // pubMessage.ack();
                    } else {
                        console.log(session);
                        console.log('session invalid: %s', body.sessionId);
                        // pubMessage.ack();
                    }
                }
                forwardConversation(body, pubMessage);
            } else {
                console.log('lazada chat not from customer');
                pubMessage.ack();
            }
            break;
        case 3: 
            console.log('code 3');
            // console.log(body);
            const getProductParams = `item_id=${body.productId}`
            lazCall(lazGetProducts(appKeyOMS),
                getProductParams, body.refreshToken,
                body.token, body.mStoreId, body.orgId,
                body.tenantDB, isOms).then(async (productDetail) => {
                    // console.log((productDetail))
                    // console.log(JSON.stringify(productDetail))
                    await prisma.products.update({
                        where: {
                            origin_id: body.productId.toString()
                        },
                        data: {
                            desc: productDetail.data.attributes.short_description,
                            name: productDetail.data.attributes.name,
                            pre_order: (productDetail.data.attributes.preorder_days) ? true : false,
                            price: Number.parseInt(productDetail.data.skus[0].price), // make sure this line
                            stock: Number.parseInt(productDetail.data.skus[0].quantity), // make sure this line
                            storeId: body.mStoreId,
                            url: productDetail.data.skus[0].Url,
                            varian: {
                                createMany: {
                                    skipDuplicates: true,
                                    data: productDetail.data.skus.map(variant => ({
                                        name: productDetail.data.attributes.name,
                                        price: variant.price,
                                        origin_id: variant.SkuId.toString(),
                                        sku: variant.SellerSku,
                                        stock: variant.Available,
                                        status: variant.statuses
                                    }))
                                }
                            },
                            product_img: {
                                connectOrCreate: {
                                    create: {
                                        originalUrl: productDetail.data.images[0],
                                        origin_id: body.productId.toString()
                                    },
                                    where: {
                                        origin_id: body.productId.toString()
                                    }
                                }
                            }
                        }
                    })
                    pubMessage.ack();
                }).catch((err) => {
                    console.log('error fetching product detail');
                    console.log(err);
                    pubMessage.nack();
                });
            break;
        default:
            console.log(`code: ${body.code} is not supported yet`)
            pubMessage.ack();
            break;
    }
}

async function processShopee(body, pubMessage) {
    // console.log(JSON.stringify(body));
    /* WORKER PART */
    prisma = getPrismaClientForTenant(body.org_id, body.tenantDB.url);
    const tenantConfig = {
        org_id: body.org_id,
        tenantDB: body.tenantDB
    }
    if (body.code == 3) {
        /* ==== ORDERS ==== */
        if (body.status == 'SHIPPED') {
            collectShopeeTrackNumber(body).catch((error) => {
                console.log('error on worker function');
                console.log(JSON.stringify(body));
                console.log(error);
                pubMessage.nack();
            })
        } else {
            collectShopeeOrder(body).catch((error) => {
                console.log('error on worker function');
                console.log(JSON.stringify(body));
                console.log(error);
                pubMessage.nack();
            })
        }
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
                let newToken = await generateShopeeToken(body.shop_id, refToken, tenantConfig);
                accToken = newToken.access_token;
                refToken = newToken.refresh_token;
                if (newToken.access_token) {
                    return api.get(
                        GET_SHOPEE_PRODUCTS_LIST(encryptData(newToken.access_token), body.shop_id)
                    );
                }
            }
        });
        // SOON - PRODUCT SYNC // const products = await callShopee('get', GET_SHOPEE_PRODUCTS_LIST(body.token, body.shop_id), {}, body.refresh_token, body.shop_id, tenantConfig);
        if ((!products) || (!products.data.error)) {
            let productIds = products.data.response.item.map(item => item.item_id);
            // console.log(GET_SHOPEE_PRODUCTS_INFO(accToken, productIds, body.shop_id))
            console.log('getting base info total %s product', productIds.length);
            // SOON - PRODUCT SYNC // const productsInfo = await callShopee('get', GET_SHOPEE_PRODUCTS_INFO(accToken, productIds, body.shop_id), {}, body.refresh_token, body.shop_id, tenantConfig);
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
                        currency: (item.price_info) ? item.price_info[0].currency : "",
                        name: item.item_name,
                        origin_id: item.item_id.toString(),
                        category: item.category_id,
                        desc: item.description || item.description_info.extended_description.field_list[0].text,
                        price: (item.price_info) ? item.price_info[0].original_price : 0,
                        sku: item.item_sku,
                        status: item.item_status,
                        stock: (item.stock_info_v2) ? item.stock_info_v2.summary_info.total_available_stock : 0,
                        weight: Number.parseInt(item.weight),
                        storeId: body.m_shop_id,
                        url: `https://shopee.co.id/product/${body.shop_id}/${item.item_id}`
                    }))
                }).then(async (newProducts) => {
                    /* GET PRODUCT VARIANT */
                    try {
                        const getModelIdsPromises = [];
                        const getModelProductIds = [];
                        productsInfo.data.response.item_list.forEach(item => {
                            if (item.has_model) {
                                getModelProductIds.push(item.item_id);
                                getModelIdsPromises.push(
                                    api.get(GET_SHOPEE_PRODUCTS_MODEL(accToken, item.item_id, body.shop_id))
                                );
                            }
                        });
                        const productsModel = await Promise.all(getModelIdsPromises);
                        // console.log(JSON.stringify(productsModel[0].data.response));
                        const modelToCreate = [];
                        getModelProductIds.forEach((id, i) => {
                            if (productsModel[i].data && productsModel[i].data.response) {
                                const modelData = productsModel[i].data.response;
                                modelData.model.forEach(model => {
                                    modelToCreate.push({
                                        name: model.model_name,
                                        price: model.price_info[0].current_price || model.price_info[0].original_price,
                                        origin_id: model.model_id.toString(),
                                        pre_order: model.pre_order.is_pre_order,
                                        sku: model.model_sku,
                                        status: model.model_status,
                                        productsOriginId: id.toString(),
                                        stock: model.stock_info_v2.summary_info.total_available_stock
                                    });
                                });
                            }
                        });
                        prisma.varian.createMany({
                            skipDuplicates: true,
                            data: modelToCreate
                        }).then((varian) => {
                            console.log(varian);
                        }).catch((err) => {
                            console.log(err);
                        });
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
                    } catch (err) {
                        console.log(err);
                        console.log('Error getting list of model');
                    }
                    if (env !== 'production') {
                        pubMessage.ack();

                    }
                }).catch((err) => {
                    console.log(err);
                    pubMessage.nack();
                });
    
            } else {
                console.log(productsInfo.data);
                pubMessage.nack();
            }
        } else {
            console.log(products.data);
            pubMessage.nack();
        }
    } else if (body.code == 10) {
        // forwardConversation(body, pubMessage);
        console.log('shopee chat not forwararded yet');
        pubMessage.ack();
    } else if (body.code == 29) {
        collectShopeeRR(body, pubMessage).catch((error) => {
            console.log('error on worker function');
            console.log(JSON.stringify(body));
            console.log(error);
            pubMessage.nack();
        })
    } else {
        console.log('shopee code not supported: ', body.code);
        pubMessage.ack();
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