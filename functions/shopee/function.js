const { PrismaClient, Prisma } = require("@prisma/client");
const { GET_SHOPEE_ORDER_DETAIL, PARTNER_ID, GET_SHOPEE_REFRESH_TOKEN, PARTNER_KEY, SHOPEE_HOST } = require("../../config/shopee_apis");
const { api } = require("../axios/interceptor");
const prisma = new PrismaClient();
var CryptoJS = require("crypto-js");
const { default: axios } = require("axios");
const { TOKO_SHOPINFO } = require("../../config/toko_apis");
const { storeStatuses } = require("../../config/utils");

async function collectShopeeOrder (body, done) {
    const order = await api.get(
        GET_SHOPEE_ORDER_DETAIL(body.token, body.order_id, body.shop_id)
    ).catch(async function (err) {
        if ((err.status === 403) && (err.response.data.error === 'invalid_acceess_token')) {
            console.log(`error status ${err.status} response ${err.response.data.error}`);
            let newToken = await generateShopeeToken(body.shop_id, body.refresh_token);
            if (newToken) {
                if (newToken.access_token) {
                    return api.get(
                        GET_SHOPEE_ORDER_DETAIL(newToken.access_token, body.order_id, body.shop_id)
                    );
                }
            }
        } else {
            console.log(err);
        }
    });
    if ((order.data.error) || (order.data.response.order_list.length === 0)) {
        console.log(order.data);
        console.log('order error');
        // done(null, {response: 'order not found'});
        return;
    }
    let orderData = order.data.response.order_list[0];
    console.log('GOT ORDER DETAILS');
    let orderUpdate = await prisma.orders.update({
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
            }
        },
        select: {
            id: true
        }
    });
    console.log(orderUpdate);
    // done(null, {response: 'testing'});
}

async function generateShopeeToken (shop_id, refToken) {
    let ts = Math.floor(Date.now() / 1000);
    const shopeeSignString = `${PARTNER_ID}${GET_SHOPEE_REFRESH_TOKEN}${ts}`;
    const sign = CryptoJS.HmacSHA256(shopeeSignString, PARTNER_KEY).toString(CryptoJS.enc.Hex);
    let token = await axios({
        method: 'POST',
        url: `${SHOPEE_HOST}${GET_SHOPEE_REFRESH_TOKEN}?sign=${sign}&partner_id=${PARTNER_ID}&timestamp=${ts}`,
        data: {
            refresh_token: refToken,
            partner_id: Number.parseInt(PARTNER_ID),
            shop_id: Number.parseInt(shop_id),
        },
    }).catch(async function (err) {
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
    });
    if ((token.data) && (token.data.access_token)) {
        await prisma.store.update({
            where: {
                origin_id: shop_id.toString()
            },
            data: {
                token: token.data.access_token,
                refresh_token: token.data.refresh_token
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

async function callShopee (method, url, body, token, refreshToken, shopId) {
    return api({
        method: method,
        url: url,
        data: (body) ? body : {}
    }).catch(async function (err) {
        console.log(err.response.data)
        if ((err.status === 403) && (err.response.data.error === 'invalid_acceess_token')) {
            let newToken = await generateShopeeToken(shopId, refreshToken);
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
    generateShopeeToken,
    callShopee
}