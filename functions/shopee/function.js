// const { PrismaClient, Prisma } = require("@prisma/client");
const { GET_SHOPEE_ORDER_DETAIL, PARTNER_ID, GET_SHOPEE_REFRESH_TOKEN, PARTNER_KEY, SHOPEE_HOST, GET_SHOPEE_PRODUCTS_INFO, GET_SHOPEE_PRODUCTS_MODEL, SPE_GET_TRACKING_NUMBER } = require("../../config/shopee_apis");
const { api } = require("../axios/interceptor");
// const prisma = new PrismaClient();
var CryptoJS = require("crypto-js");
const { default: axios } = require("axios");
const { storeStatuses } = require("../../config/utils");
const { getPrismaClientForTenant } = require("../../services/prismaServices");
const { encryptData, decryptData } = require("../encryption");
const { PrismaClient } = require("../../prisma/generated/client");
let prisma = new PrismaClient();

async function collectShopeeTrackNumber(body, done) {
    prisma = getPrismaClientForTenant(body.org_id, body.tenantDB.url);
    const tenantConfig = {
        org_id: body.org_id,
        tenantDB: body.tenantDB
    }
    try {
        const trackingNumber = await callShopee('GET', SPE_GET_TRACKING_NUMBER(body.token, body.shop_id, body.order_id), {}, body.refresh_token, body.shop_id, tenantConfig);
        if (trackingNumber.data && trackingNumber.data.response) {
            console.log(trackingNumber.data.response);
            prisma.orders.update({
                where: {
                    origin_id: body.order_id
                },
                data: {
                    tracking_number: trackingNumber.data.response.tracking_number
                }
            }).then(() => {
                console.log('Tracking number updated');
            }).catch((err) => {
                console.log(err);
                console.log('Error updating tracking number');
            })
        } else {
            console.log('Tracking number not found for orderId: ' + body.order_id);
        }
    } catch (err) {
        console.log(err);
    }
    
}

async function collectShopeeOrder (body, done) {
    prisma = getPrismaClientForTenant(body.org_id, body.tenantDB.url);
    /* const order = await api.get(
        GET_SHOPEE_ORDER_DETAIL(body.token, body.order_id, body.shop_id)
    ).catch(async function (err) {
        if ((err.status === 403) && (err.response.data.error === 'invalid_acceess_token')) {
            console.log(`error status ${err.status} response ${err.response.data.error}`);
            const tenantConfig = {
                org_id: body.org_id,
                tenantDB: body.tenantDB
            }
            let newToken = await generateShopeeToken(body.shop_id, body.refresh_token, tenantConfig);
            if (newToken) {
                if (newToken.access_token) {
                    return api.get(
                        GET_SHOPEE_ORDER_DETAIL(encryptData(newToken.access_token), body.order_id, body.shop_id)
                    );
                }
            }
        } else {
            console.log(err);
        }
    }); */
    const tenantConfig = {
        org_id: body.org_id,
        tenantDB: body.tenantDB
    }
    const order = await callShopee('GET', GET_SHOPEE_ORDER_DETAIL(body.token, body.order_id, body.shop_id), {}, body.refresh_token, body.shop_id, tenantConfig);
    if ((order.data.error) || (order.data.response.order_list.length === 0)) {
        console.log(order.data);
        console.log('order error');
        // done(null, {response: 'order not found'});
        return;
    }
    let orderData = order.data.response.order_list[0];
    console.log('GOT ORDER DETAILS');

    /* ==== soon need to be optimized ===== */
    /* const orderUpdate = prisma.orders.update({
        where: {
            origin_id: body.order_id.toString()
        },
        data: {
            accept_partial: orderData.split_up,
            customers: {
                connectOrCreate: {
                    where: {
                        origin_id: orderData.buyer_user_id.toString(),
                    },
                    create: {
                        origin_id: orderData.buyer_user_id.toString(),
                        name: orderData.buyer_username
                    }
                }
            },
            logistic: {
                connectOrCreate: {
                    where: {
                        name: orderData.shipping_carrier
                    },
                    create: {
                        name: orderData.shipping_carrier
                    }
                }
            },
            payment_id: orderData.payment_method,
            recp_addr_city: orderData.recipient_address.city,
            recp_addr_country: orderData.recipient_address.region,
            recp_addr_district: orderData.recipient_address.district,
            recp_addr_full: orderData.recipient_address.full_address,
            recp_addr_postal_code: orderData.recipient_address.zipicode,
            recp_name: orderData.recipient_address.name,
            recp_phone: orderData.recipient_address.phone,
            shipping_price: orderData.estimated_shipping_fee,
            total_amount: orderData.total_amount,
            status: orderData.order_status,
        },
        select: {
            id: true
        }
    });

    const trxArray = orderData.item_list.map(async item => {
        return prisma.order_items.create({
            data: {
                qty: item.model_quantity_purchased,
                total_price: item.model_discounted_price,
                origin_id: `${body.order_id}-${item.item_id}`,
                ordersId: body.id,
                products: {
                    connectOrCreate: {
                        where: {
                            origin_id: `${item.item_id}-${item.model_id}`
                        },
                        create: {
                            name: (item.model_name == '') ? item.item_name : `${item.item_name} - ${item.model_name}`,
                            origin_id: `${item.item_id}-${item.model_id}`,
                            price: item.model_original_price,
                            sku: (item.item_sku == '') ? item.model_sku : item.item_sku,
                            weight: Number.parseInt(item.weight),
                            storeId: body.m_shop_id
                        }
                    }
                }
            }
        })
    });
    trxArray.push(orderUpdate);
    const orderTrx = await prisma.$transaction(trxArray);
    console.log(orderTrx); */
    /* ==== soon need to be optimized ===== */

    prisma.orders.update({
        where: {
            origin_id: body.order_id.toString()
        },
        data: {
            accept_partial: orderData.split_up,
            customers: {
                connectOrCreate: {
                    where: {
                        origin_id: orderData.buyer_user_id.toString(),
                    },
                    create: {
                        origin_id: orderData.buyer_user_id.toString(),
                        name: orderData.buyer_username
                    }
                }
            },
            logistic: {
                connectOrCreate: {
                    where: {
                        name: orderData.shipping_carrier
                    },
                    create: {
                        name: orderData.shipping_carrier
                    }
                }
            },
            payment_id: orderData.payment_method,
            recp_addr_city: orderData.recipient_address.city,
            recp_addr_country: orderData.recipient_address.region,
            recp_addr_district: orderData.recipient_address.district,
            recp_addr_full: orderData.recipient_address.full_address,
            recp_addr_postal_code: orderData.recipient_address.zipicode,
            recp_name: orderData.recipient_address.name,
            recp_phone: orderData.recipient_address.phone,
            shipping_price: orderData.estimated_shipping_fee,
            total_amount: orderData.total_amount,
            status: orderData.order_status,
            order_items: {
                create: order.data.response.order_list[0].item_list.map((item) => {
                    return {
                        qty: item.model_quantity_purchased,
                        total_price: item.model_discounted_price,
                        origin_id: `${body.order_id}-${item.item_id}`,
                        products: {
                            connectOrCreate: {
                                where: {
                                    origin_id: item.item_id.toString()
                                },
                                create: {
                                    name: (item.model_name == '') ? item.item_name : `${item.item_name} - ${item.model_name}`,
                                    origin_id: item.item_id.toString(),
                                    price: item.model_original_price,
                                    sku: (item.item_sku == '') ? item.model_sku : item.item_sku,
                                    weight: Number.parseInt(item.weight),
                                    storeId: body.m_shop_id,
                                    url: `https://shopee.co.id/product/${body.shop_id}/${item.item_id}`
                                }
                            }
                        }
                    }
                })
            }
        },
        select: {
            id: true,
            order_items: {
                select: {
                    products: {
                        select: {
                            id: true,
                            origin_id: true,
                            product_img: true
                        }
                    }
                }
            }
        }
    }).then(async (orderUpdate) => {
        const productsToFetch = [];
        // const getModelIdsPromises = [];
        orderUpdate.order_items.forEach(item => {
            if (item.products.product_img.length == 0) {
                console.log('No image for this product, need to fetch');
                productsToFetch.push(item.products.origin_id);
                /* getModelIdsPromises.push(
                    api.get(GET_SHOPEE_PRODUCTS_MODEL(accToken, item.item_id, body.shop_id))
                ); */
            }
        });

        getProductVarian(productsToFetch, body.shop_id);

        api.get(GET_SHOPEE_PRODUCTS_INFO(body.token, productsToFetch, body.shop_id)).then((shopeeProducts) => {
            if ((shopeeProducts.data.error) || (shopeeProducts.data.response.item_list.length === 0)) {
                console.log('products not found');
                return;
            } else {
                let productImgs = [];
                shopeeProducts.data.response.item_list.forEach(item => {
                    productImgs.push({
                        originalUrl: item.image.image_url_list[0],
                        origin_id: `IMG-${item.item_id}`,
                        productsId: orderUpdate.order_items.find((orderItem) => orderItem.products.origin_id.startsWith(item.item_id.toString())).products.id
                    });
                });
                prisma.products_img.createMany({
                    skipDuplicates: true,
                    data: productImgs
                }).then(() => {
                    console.log('all product img updated');
                }, (err) => {
                    console.log(err)
                });
            }
        }, (err) => {
            console.log(err);
        });
    }).catch((err) => {
        console.log(err);
    })
    // done(null, {response: 'testing'});
}

async function getProductVarian (productIds, shopId) {
    const getModelIdsPromises = [];
    productIds.forEach(id => {
        getModelIdsPromises.push(
            api.get(GET_SHOPEE_PRODUCTS_MODEL(accToken, id, shopId))
        );
    });
    const varianPromise = await Promise.all(getModelIdsPromises);
    const varianToCreate = [];
    productIds.forEach((id, i) => {
        if (varianPromise[i].data && varianPromise[i].data.response) {
            const modelData = varianPromise[i].data.response;
            modelData.model.forEach(model => {
                varianToCreate.push({
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
        data: varianToCreate
    }).then((varian) => {
        console.log(varian);
    }).catch((err) => {
        console.log(err);
    });
}

async function generateShopeeToken (shop_id, refToken, tenantConfig) {
    prisma = getPrismaClientForTenant(tenantConfig.org_id, tenantConfig.tenantDB.url);
    let ts = Math.floor(Date.now() / 1000);
    const shopeeSignString = `${PARTNER_ID}${GET_SHOPEE_REFRESH_TOKEN}${ts}`;
    const sign = CryptoJS.HmacSHA256(shopeeSignString, PARTNER_KEY).toString(CryptoJS.enc.Hex);
    let token = await axios({
        method: 'POST',
        url: `${SHOPEE_HOST}${GET_SHOPEE_REFRESH_TOKEN}?sign=${sign}&partner_id=${PARTNER_ID}&timestamp=${ts}`,
        data: {
            refresh_token: decryptData(refToken),
            partner_id: Number.parseInt(PARTNER_ID),
            shop_id: Number.parseInt(shop_id),
        },
    }).catch(async function (err) {
        if (err.response) {
            console.log(err.response.data);
            if (err.response.data.error == 'shop_access_expired') {
                await prisma.store.update({
                    where: {
                        origin_id: shop_id.toString()
                    },
                    data: {
                        status: storeStatuses.EXPIRED
                    }
                })
            }
            return err.response.data;
        } else {
            console.log(err);
            return err;
        }
    });
    if ((token.data) && (token.data.access_token)) {
        await prisma.store.update({
            where: {
                origin_id: shop_id.toString()
            },
            data: {
                token: encryptData(token.data.access_token),
                refresh_token: encryptData(token.data.refresh_token)
            }
        }).catch(function (err) {
            console.log(err);
            return err;
        })
        return token.data;
    } else {
        console.log('refresh token invalid');
        console.log(token);
        return;
    }
}

async function callShopee (method, url, body, refreshToken, shopId, tenantConfig) {
    return api({
        method: method,
        url: url,
        data: (body) ? body : {}
    }).catch(async function (err) {
        console.log(err.response.data)
        if ((err.status === 403) && (err.response.data.error === 'invalid_acceess_token')) {
            let newToken = await generateShopeeToken(shopId, refreshToken, tenantConfig);
            if (!newToken.data.data.access_token) {
                throw new Error('Failed to refresh token');
            }
            return api({
                method: method,
                url: url,
                data: (body) ? body : {}
            })
        } else {
            throw new Error(err.response.data);
        }
    });
}

module.exports = {
    collectShopeeOrder,
    collectShopeeTrackNumber,
    generateShopeeToken,
    callShopee
}