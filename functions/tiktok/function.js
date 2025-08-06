const { GET_ORDER_API, GET_PRODUCT, GET_REFRESH_TOKEN_API, SEARCH_RETURN, GET_RETURN_RECORDS } = require("../../config/tiktok_apis");
const { getPrismaClient } = require("../../services/prismaServices");
const { api } = require("../axios/interceptor");
const { decryptData, encryptData } = require("../encryption");
const SunshineConversationsClient = require('sunshine-conversations-client');
const { createSuncoUser, createSuncoConversation, postMessage } = require("../sunco/function");
// const { PrismaClient } = require("@prisma/client");
// const prisma = new PrismaClient();

async function collectTiktokOrder (body, done) {
    let tiktokOrder = await callTiktok('get', GET_ORDER_API(body.order_id, body.cipher), {}, body.token, body.refresh_token, body.m_shop_id, body.tenantDB);
    if (tiktokOrder) {
        const prisma = getPrismaClient(body.tenantDB);
        const tiktokOrderIdx = tiktokOrder.data.data.orders[0];
        prisma.orders.update({
            where: {
                origin_id: tiktokOrderIdx.id
            },
            data: {
                logistic: {  
                    connectOrCreate: {
                        create: {
                            name: tiktokOrderIdx.shipping_provider || tiktokOrderIdx.shipping_type,
                            type: tiktokOrderIdx.shipping_type
                        },
                        where: {
                            name: tiktokOrderIdx.shipping_provider || tiktokOrderIdx.shipping_type
                        }
                    }
                },
                status: tiktokOrderIdx.status,
                payment_id: tiktokOrderIdx.payment_method_name,
                recp_addr_country: tiktokOrderIdx.recipient_address.district_info.find(address => address.address_level == 'L0').address_name,
                recp_addr_province: tiktokOrderIdx.recipient_address.district_info.find(address => address.address_level == 'L1').address_name,
                recp_addr_city: tiktokOrderIdx.recipient_address.district_info.find(address => address.address_level == 'L2').address_name,
                recp_addr_district: tiktokOrderIdx.recipient_address.district_info.find(address => address.address_level == 'L3').address_name,
                recp_addr_full: tiktokOrderIdx.recipient_address.full_address,
                recp_addr_postal_code: tiktokOrderIdx.recipient_address.postal_code,
                recp_phone: tiktokOrderIdx.recipient_address.phone_number,
                recp_name: tiktokOrderIdx.recipient_address.name,
                total_amount: Number.parseInt(tiktokOrderIdx.payment.total_amount),
                total_product_price: Number.parseInt(tiktokOrderIdx.payment.original_total_product_price),
                shipping_price: Number.parseInt(tiktokOrderIdx.payment.shipping_fee),
                order_items: {
                    create: tiktokOrderIdx.line_items.map((item) => {
                        return {
                            qty: 1,
                            total_price: Number.parseInt(item.sale_price),
                            origin_id: item.id,
                            package_id: item.package_id,
                            products: {
                                connectOrCreate: {
                                    where: {
                                        origin_id: `${item.product_id}-${item.sku_id}`
                                    },
                                    create: {
                                        name: (item.sku_name == '') ? item.product_name : `${item.product_name} - ${item.sku_name}`,
                                        origin_id: `${item.product_id}-${item.sku_id}`,
                                        price: Number.parseInt(item.original_price),
                                        sku: (item.seller_sku == '') ? item.sku_name : item.seller_sku,
                                        currency: item.currency,
                                        storeId: body.m_shop_id
                                    }
                                }
                            }
                        }
                    })
                }
            }
        }).catch(function(err) {
            console.log(err);
            console.log(JSON.stringify(tiktokOrderIdx));
            // done(new Error(err));
        });
    } else {
        console.log('no order found');
        // done(new Error('no order found'));
    }
}

async function collectReturnRequest (body, done) {
    // console.log(body)
    const prisma = getPrismaClient(body.tenantDB);
    const data = { order_ids: [body.order_id] };
    let returnRefund = await Promise.all([
        callTiktok('post', SEARCH_RETURN(body.cipher, data), data, body.token, body.refresh_token, body.m_shop_id, body.tenantDB),
        callTiktok('get', GET_RETURN_RECORDS(body.returnId, body.cipher), {}, body.token, body.refresh_token, body.m_shop_id, body.tenantDB)
    ]);
    const returnData = returnRefund[0].data.data;
    console.log(returnData);
    if (returnData && returnData.return_orders.length > 0) {
        const returnOrder = returnData.return_orders[0];
        let returnRecords = await prisma.return_refund.create({
            data: {
                total_amount: Number.parseInt(returnOrder.refund_amount.refund_total),
                order: {
                    connect: {
                        origin_id: returnOrder.order_id
                    }
                },
                origin_id: returnOrder.return_id,
                status: returnOrder.return_status,
                return_type: returnOrder.return_type,
                return_reason: returnOrder.return_reason,
                line_item: {
                    create: returnOrder.return_line_items.map(item => ({
                        origin_id: item.return_line_item_id,
                        currency: item.refund_amount.currency,
                        refund_service_fee: Number.parseInt(item.refund_amount.buyer_service_fee),
                        refund_subtotal: Number.parseInt(item.refund_amount.refund_subtotal),
                        refund_total: Number.parseInt(item.refund_amount.refund_total),
                        item: {
                            connect: {
                                origin_id: item.order_line_item_id
                            }
                        }
                    }))
                }
            }
        })
        console.log(returnRecords);       
    }
    // done(null, {response: 'testing'});
}

async function collectTiktokProduct (body, done) {

    const prisma = getPrismaClient(body.tenantDB);
    // -- UPDATE USING: callTiktok FUNCTION
    
    let tiktokStore = await prisma.store.findUnique({
        where: { origin_id: body.shop_id }
    });
    const productData = await callTiktok('get', GET_PRODUCT(body.product_id, tiktokStore.secondary_token), {}, tiktokStore.token, tiktokStore.refresh_token, tiktokStore.id, body.tenantDB);
    // const productData = response.data.data;
    /* let data = productData.skus.map(item => ({
            origin_id: `${productData.id}-${item.id}`,
            name: productData.title,
            status: productData.status,
            condition: productData.is_pre_owned ? 2 : 1,
            desc: productData.description,
            price: Number(item.price.sale_price),
            currency: item.price.currency,
            sku: item.seller_sku,
            stock: item.inventory[0].quantity,
            storeId: tiktokStore.id,
            weight: productData.package_weight.value ? Number(productData.package_weight.value): 0,
        }))
    console.log(data); */
    prisma.products.createMany({
        skipDuplicates: true,
        data: productData.skus.map(item => ({
            origin_id: `${productData.id}-${item.id}`,
            name: productData.title,
            status: productData.status,
            condition: productData.is_pre_owned ? 2 : 1,
            desc: productData.description,
            price: Number(item.price.sale_price),
            currency: item.price.currency,
            sku: item.seller_sku,
            stock: item.inventory[0].quantity,
            storeId: tiktokStore.id,
            weight: productData.package_weight.value ? Number(productData.package_weight.value): 0,
        }))
    }).then(function(newProduct) {
        console.log(newProduct.count);
        // done(null, {response: 'testing'});
    }).catch(function(err) {
        console.log(err);
        // done(new Error(err));
    })
    /* api.get(GET_PRODUCT(body.product_id, tiktokStore.secondary_token), {
        headers: {
            'x-tts-access-token' : tiktokStore.token,
            'content-type': 'application/json'
        }
    }).then(function(response) {
        if (response.data.data) {
        }
    }).catch(function(err) {
        console.log(err)
        // done(new Error(err));
    }) */
}

async function forwardConversation (body, done) {
    const findZd = body.message.store.channel.client.integration.find(intg => intg.name == 'ZENDESK');
    const findSf = body.message.store.channel.client.integration.find(intg => intg.name == 'SALESFORCE');
    if (findZd) {
        const suncoAppId = findZd.credent.find(cred => cred.key == 'SUNCO_APP_ID').value;
        const suncoAppKey = findZd.credent.find(cred => cred.key == 'SUNCO_APP_KEY').value;
        const suncoAppSecret = findZd.credent.find(cred => cred.key == 'SUNCO_APP_SECRET').value;
        const suncoMetadata = {
            [`dataCapture.ticketField.${findZd.notes.split('-')[0]}`]: body.message.omnichat_user.origin_id,
            [`dataCapture.ticketField.${findZd.notes.split('-')[1]}`]: body.message.origin_id,
            [`dataCapture.ticketField.${findZd.notes.split('-')[2]}`]: body.message.store.origin_id,
            [`dataCapture.ticketField.${findZd.notes.split('-')[3]}`]: body.channel
        }
        let defaultClient = SunshineConversationsClient.ApiClient.instance
        let basicAuth = defaultClient.authentications['basicAuth']
        basicAuth.username = decryptData(suncoAppKey);
        basicAuth.password = decryptData(suncoAppSecret);
        let suncoConvId;
        if (!body.message.externalId) {
            const prisma = getPrismaClient(body.tenantDB);
            let suncoUser = await createSuncoUser(body.userExternalId, body.userName, suncoAppId)
            let conversationBody = suncoUser;
            conversationBody.metadata = suncoMetadata;
            let suncoConversation = await createSuncoConversation(suncoAppId, conversationBody)
            suncoConvId = suncoConversation.conversation.id;
            let updateChat = await Promise.all([
                prisma.omnichat.update({
                    where:{ id: body.message.id },
                    data:{ externalId: suncoConversation.conversation.id }
                }),
                prisma.omnichat_user.update({
                    where:{ id: body.message.omnichat_user.id },
                    data:{ externalId: body.userExternalId }
                })
            ])
        } else {
            suncoConvId = body.message.externalId;
        }
        let messageContent = JSON.parse(body.message_content)
        let suncoMessagePayload = {
            author: {
                type: 'user',
                userExternalId: body.userExternalId
            }
        }
        suncoMessagePayload.content = {
            type: "text",
            text: (messageContent.hasOwnProperty('content')) ? messageContent.content : '-- sample -- '
        }

        // /* if (body.body.data.template_id == 1) {
        //     suncoMessagePayload.content = {
        //         type: "text",
        //         text: (body.body.data.hasOwnProperty('process_msg')) ? body.body.data.process_msg : messageContent.content
        //     }
        // } else if (body.body.data.template_id == 3 || body.body.data.template_id == 4) { // attachment or sticker
        //     suncoMessagePayload.content = {
        //         type: 'image',
        //         mediaUrl: messageContent.imgUrl
        //     }
        // } else { // product attachment_type = 3
        //     suncoMessagePayload.content = {
        //         type: 'image',
        //         text: `${messageContent.title}\n${messageContent.actionUrl}`,
        //         mediaUrl: messageContent.pic
        //     }
        // } */
        await postMessage(suncoAppId, suncoConvId, suncoMessagePayload)
    }

    if (findSf) {
        console.log('Salesforce integration not implemented yet');
        // done(new Error('Salesforce integration not implemented yet'));
    }
}

async function callTiktok (method, url, body, token, refreshToken, shopId, tenantDB) {
    return api({
        method: method,
        url: url,
        data: (body) ? body : {},
        headers: {
            'x-tts-access-token': decryptData(token),
            'content-type': 'application/json'
        }
    }).catch(async function (err) {
        console.log(err.response.data)
        if (err.response.data.code == 105002) {
            let newToken = await api.get(GET_REFRESH_TOKEN_API(decryptData(refreshToken)));
            // console.log(newToken.data);
            if (!newToken.data.data.access_token) {
                throw new Error('Failed to refresh token');
            }
            const prisma = getPrismaClient(tenantDB);
            const _stored = await prisma.store.update({
                where: {
                    id: shopId
                },
                data: {
                    token: encryptData(newToken.data.data.access_token),
                    refresh_token: encryptData(newToken.data.data.refresh_token)
                }
            });
            return api({
                method: method,
                url: url,
                data: (body) ? body : {},
                headers: {
                    'x-tts-access-token': newToken.data.data.access_token,
                    'content-type': 'application/json'
                }
            })
        } else {
            throw new Error(err.response.data);
        }
    });
}

module.exports = {
    collectTiktokOrder,
    collectTiktokProduct,
    collectReturnRequest,
    forwardConversation,
    callTiktok
}