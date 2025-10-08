// const { PrismaClient, Prisma } = require("@prisma/client");
const { GET_SHOPEE_ORDER_DETAIL, PARTNER_ID, GET_SHOPEE_REFRESH_TOKEN, PARTNER_KEY, SHOPEE_HOST, GET_SHOPEE_PRODUCTS_INFO, GET_SHOPEE_PRODUCTS_MODEL, SPE_GET_TRACKING_NUMBER, SPE_GET_RR_DETAIL } = require("../../config/shopee_apis");
const { api } = require("../axios/interceptor");
// const prisma = new PrismaClient();
var CryptoJS = require("crypto-js");
const { default: axios } = require("axios");
const { storeStatuses } = require("../../config/utils");
const { getPrismaClientForTenant } = require("../../services/prismaServices");
const { encryptData, decryptData } = require("../encryption");
const { PrismaClient } = require("../../prisma/generated/client");
const { doCreateZdTicket } = require("../zendesk/function");
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

async function collectShopeeRR (body, done) {
    prisma = getPrismaClientForTenant(body.org_id, body.tenantDB.url);
    const tenantConfig = {
        org_id: body.org_id,
        tenantDB: body.tenantDB
    }
    callShopee('GET', SPE_GET_RR_DETAIL(body.token, body.shop_id, returnId), {}, body.refresh_token, body.shop_id, tenantConfig).then((orderRr) => {
        if (orderRr.data) {
            console.log(orderRr.data);
            const rrData = orderRr.data.response;
            // const rrData = sampleOrderRr.response;
            const buyerReason = `${rrData.reason} - ${rrData.text_reason}`;
            prisma.return_refund.update({
                where: {
                    origin_id: rrData.return_sn
                },
                data: {
                    total_amount: rrData.refund_amount,
                    return_reason: `${rrData.reason} - ${rrData.text_reason}`,
                    system_status: rrData.status,
                    return_type: 'RETURN_REFUND',
                    status: rrData.status,
                    line_item: {
                        createMany: {
                            data: rrData.item.map(item => ({
                                refund_total: item.refund_amount,
                                origin_id: `${rrData.return_sn}-${item.model_id}`,
                                order_itemsOriginId: `${rrData.order_sn}-${item.item_id}`
                            })),
                            skipDuplicates: true
                        }
                    }
                }
            }).then((rrItem) => {
                console.log('rrItem updated' + rrItem.id);
            }).catch((rrErr) => {
                console.log(rrErr);
                console.log('Update rrItem failed');
            })
            const findZd = body.integration.find(intg => intg.name == 'ZENDESK');
            if (findZd) {
                const zdToken = findZd.credent.find(cred => cred.key == 'ZD_API_TOKEN').value;
                const buyerEvdImage = (rrData.image && rrData.image.length > 0) ? rrData.image.map(img => img).join('\n') : 'No image provided';
                const buyerEvdVideo = (rrData.buyer_videos && rrData.buyer_videos.length > 0) ? rrData.buyer_videos.map(vid => vid.video_url).join('\n') : 'No video provided';
                doCreateZdTicket(body, findZd.baseUrl, zdToken, buyerReason, buyerEvdImage, buyerEvdVideo).then((zdTicket) => {
                    console.log(`zdTicket created: ` + zdTicket.data.ticket.id);
                }).catch((err) => {
                    console.log(err);
                    console.log('Failed create zd ticket');
                })
            }
        } else {
            console.log(orderRr);
            console.log('Error getting RR record from shopee');
        }
    }).catch((errRr) => {
        console.log(errRr);
    })
}

const sampleOrderRr = {
	"request_id": "d52ca43b277a4f9292fb8be658bfd33d",
	"error": "-",
	"message": "-",
	"response": {
		"image": [
			"https://cf.shopee.sg/file/166f23cbfb31bd882f51cfe7f90d3826"
		],
		"buyer_videos": [
			{
				"thumbnail_url": "https://down-ws-sg.img.susercontent.com/sg-11110158-23040-t1taxpkdkgpvf7",
				"video_url": "https://play-ws.vod.shopee.com/api/v4/11110158/mms/sg-11110158-6jrnk-lf6a3juz7hw96f.ori.mp4"
			}
		],
		"reason": "NOT_RECEIPT",
		"text_reason": "not received",
		"return_sn": "2206140TA5PM808",
		"refund_amount": 13.97,
		"currency": "SGD",
		"create_time": 1655205084,
		"update_time": 1655219544,
		"status": "ACCEPTED",
		"due_date": 1655377883,
		"tracking_number": "RNSHS00177569",
		"dispute_reason": 2,
		"dispute_text_reason": "\"reason\"",
		"needs_logistics": false,
		"amount_before_discount": 13.99,
		"user": {
			"username": "gwlsg01",
			"email": "********oo@shopee.com",
			"portrait": "https://cf.shopee.sg/file/166f23cbfb31bd882f51cfe7f90d3826"
		},
		"item": [
			{
				"model_id": 2001586745,
				"name": "[Self collection point] Orange macaron",
				"images": [
					"https://cf.shopee.sg/file/4ecbb6fa567e42c1b1e02993ad53df12"
				],
				"amount": 1,
				"item_price": 10,
				"is_add_on_deal": false,
				"is_main_item": false,
				"add_on_deal_id": 0,
				"item_id": 2700126223,
				"item_sku": "USB",
				"variation_sku": "RED",
				"refund_amount": 12.34
			}
		],
		"order_sn": "220614T9XV8JTN",
		"return_ship_due_date": 1655438205,
		"return_seller_due_date": 1655438205,
		"activity": [
			{
				"activity_id": 123456789,
				"activity_type": "BUNDLE",
				"original_price": "12.34",
				"discounted_price": "12.34",
				"items": [
					{
						"item_id": 12345678,
						"variation_id": 12345678,
						"quantity_purchased": 2,
						"original_price": "12.34"
					}
				],
				"refund_amount": 12.34
			}
		],
		"seller_proof": {
			"seller_proof_status": "PENDING",
			"seller_evidence_deadline": 1655438336
		},
		"seller_compensation": {
			"seller_compensation_status": "PENDING_REQUEST",
			"seller_compensation_due_date": 1655438336,
			"compensation_amount": 100
		},
		"negotiation": {
			"negotiation_status": "PENDING_RESPOND",
			"latest_solution": "RETURN_REFUND",
			"latest_offer_amount": 12.34,
			"latest_offer_creator": "username",
			"counter_limit": 0,
			"offer_due_date": 1655438336
		},
		"logistics_status": "LOGISTICS_REQUEST_CREATED",
		"return_pickup_address": {
			"address": "BLOCK 106, HENDERSON CRESCENT",
			"name": "name",
			"phone": "6512345678",
			"town": "Batino",
			"district": "Calamba City",
			"city": "Laguna",
			"state": "South Luzon",
			"region": "SG",
			"zipcode": "150106"
		},
		"virtual_contact_number": "0928000886",
		"package_query_number": "66668888",
		"return_address": {
			"whs_id": "SGC"
		},
        "return_refund_request_type": 0,
        "validation_type": "seller_validation"
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
    callShopee,
    collectShopeeRR
}