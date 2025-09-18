const { GET_ORDER_API, GET_PRODUCT, GET_REFRESH_TOKEN_API, SEARCH_RETURN, GET_RETURN_RECORDS, SEARCH_CANCELLATION, SEND_MESSAGE, GET_MESSAGE } = require("../../config/tiktok_apis");
const { getPrismaClientForTenant } = require("../../services/prismaServices");
const { api } = require("../axios/interceptor");
const { decryptData, encryptData } = require("../encryption");
const SunshineConversationsClient = require('sunshine-conversations-client');
const { createSuncoUser, createSuncoConversation, postMessage } = require("../sunco/function");
const { createTicket } = require("../zendesk/function");
const { PrismaClient } = require("../../prisma/generated/client");
const { TIKTOK } = require("../../config/utils");
let prisma = new PrismaClient();
// const { PrismaClient } = require("@prisma/client");
// const prisma = new PrismaClient();

async function collectTiktokOrder (body, done) {
    let tiktokOrder = await callTiktok('get', GET_ORDER_API(body.order_id, body.cipher), {}, body.token, body.refresh_token, body.m_shop_id, body.tenantDB, body.org_id);
    if (tiktokOrder) {
        prisma = getPrismaClientForTenant(body.org_id, body.tenantDB.url);
        // const prisma = getPrismaClient(body.tenantDB);
        const tiktokOrderIdx = tiktokOrder.data.data.orders[0];
        console.log(`Worker order origin_id: ${tiktokOrderIdx.id}`);
        if (body.status == 'IN_TRANSIT') {
            console.log('updating tracking number only');
            prisma.orders.update({
                where: {
                    origin_id: tiktokOrderIdx.id
                },
                data: {
                    tracking_number: tiktokOrderIdx.tracking_number
                }
            }).catch((err) => {
                console.error(`Error updating order ${tiktokOrderIdx.id}:`, err);
            });
        } else {
            prisma.orders.update({
                where: {
                    origin_id: tiktokOrderIdx.id
                },
                data: {
                    logistic: {  
                        connectOrCreate: {
                            create: {
                                name: tiktokOrderIdx.shipping_provider || tiktokOrderIdx.shipping_type,
                                type: tiktokOrderIdx.delivery_option_name || tiktokOrderIdx.delivery_type
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
                    seller_discount: Number.parseInt(tiktokOrderIdx.payment.seller_discount),
                    platform_discount: Number.parseInt(tiktokOrderIdx.payment.platform_discount),
                    shipping_seller_discount: Number.parseInt(tiktokOrderIdx.payment.shipping_fee_seller_discount),
                    shipping_platform_discount: Number.parseInt(tiktokOrderIdx.payment.shipping_fee_platform_discount),
                    buyer_service_fee: Number.parseInt(tiktokOrderIdx.payment.buyer_service_fee),
                    handling_fee: Number.parseInt(tiktokOrderIdx.payment.handling_fee),
                    shipping_insurance_fee: Number.parseInt(tiktokOrderIdx.payment.shipping_insurance_fee),
                    item_insurance_fee: Number.parseInt(tiktokOrderIdx.payment.item_insurance_fee),
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
                                            url: `https://www.tiktok.com/view/product/$${item.product_id}?utm_campaign=client_share&utm_medium=android&utm_source=whatsapp`,
                                            storeId: body.m_shop_id
                                        }
                                    }
                                }
                            }
                        })
                    },
                    customers: {
                        connectOrCreate: {
                            where: {
                                origin_id: tiktokOrderIdx.user_id.toString()
                            },
                            create: {
                                origin_id: tiktokOrderIdx.user_id.toString(),
    
                            }
                        }
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
            }).then((order) => {
                console.log(`Worker order done: ${order.id}`);
                if (body.syncProduct.length > 0) {
                    console.log('Sync products')
                    let productPromises = [];
                    body.syncProduct.forEach(item => {
                        productPromises.push(callTiktok('GET', GET_PRODUCT(item.split('-')[0], body.cipher), {}, body.token, body.refresh_token, body.m_shop_id, body.tenantDB, body.org_id))
                    });
                    Promise.all(productPromises).then((products) => {
                        let productImgs = [];
                        products.forEach(product => {
                            const productData = product.data.data;                            
                            productImgs.push({
                                originalUrl: productData.main_images[0].urls[0],
                                thumbnailUrl: productData.main_images[0].thumb_urls[0],
                                origin_id: `IMG-${productData.id}`,
                                productsId: order.order_items.find(item => item.products.origin_id.startsWith(productData.id)).products.id,
                                height: productData.main_images[0].height,
                                width: productData.main_images[0].width
                            })
                        });
                        prisma.products_img.createMany({
                            data: productImgs,
                            skipDuplicates: true,
                        }).then(() => {
                            console.log('all product img updated');
                        }, (err) => {
                            console.log(err)
                        });
                    })
                }
            }).catch(function(err) {
                console.log(err);
                console.log(JSON.stringify(tiktokOrderIdx));
                // done(new Error(err));
            });
        }
    } else {
        console.log('no order found');
    }
}

async function collectReturnRequest (body, done) {
    prisma = getPrismaClientForTenant(body.org_id, body.tenantDB.url);
    var data = {}
    var returnCancel = [];
    let isRR = false;
    if (body.status == 'RETURN_AND_REFUND' || body.status == 'REFUND') {
        isRR = true;
    }
    if (isRR) {
        data = { order_ids: [body.order_id] };
        returnCancel = await Promise.all([
            callTiktok('post', SEARCH_RETURN(body.cipher, data), data, body.token, body.refresh_token, body.m_shop_id, body.tenantDB, body.org_id),
            callTiktok('get', GET_RETURN_RECORDS(body.returnId, body.cipher), {}, body.token, body.refresh_token, body.m_shop_id, body.tenantDB, body.org_id)
        ]);
    } else if (body.status == 'CANCELLATION') {
        data = { cancel_ids: [body.returnId] }
        returnCancel = await callTiktok('post', SEARCH_CANCELLATION(body.cipher, data), data,body.token, body.refresh_token, body.m_shop_id, body.tenantDB, body.org_id);
    }
    let returnData = (isRR) ? returnCancel[0].data.data : returnCancel.data.data;
    const refundEvidence = (isRR) ? returnCancel[1].data.data : null;
    // console.log(JSON.stringify(returnData));
    if (isRR) {
        let returnOrder = null;
        if (returnData.return_orders && returnData.return_orders.length > 0) {
            returnOrder = returnData.return_orders.find(rr => rr.return_id == body.returnId);
        } else {
            await new Promise(resolve => setTimeout(resolve, 2000));
            returnData = await callTiktok('post', SEARCH_RETURN(body.cipher, data), data, body.token, body.refresh_token, body.m_shop_id, body.tenantDB, body.org_id);
            if (returnData.return_orders && returnData.return_orders.length > 0) {
                returnOrder = returnData.return_orders.find(rr => rr.return_id == body.returnId);
            }
        }
        if (returnOrder) {
            // let rrRow = [];
            // let rrItemRow = [];
            // returnOrder.forEach(async (rrData) => {
            prisma.return_refund.update({
                where: {
                    origin_id: returnOrder.return_id
                },
                data: {
                    total_amount: (returnOrder.refund_amount) ? Number.parseInt(returnOrder.refund_amount.refund_total) : 0,
                    return_reason: returnOrder.return_reason_text,
                    line_item: {
                        create: returnOrder.return_line_items.map(item => ({
                            origin_id: item.return_line_item_id,
                            currency: (item.refund_amount) ? item.refund_amount.currency : 'IDR',
                            refund_service_fee:(item.refund_amount) ? Number.parseInt(item.refund_amount.buyer_service_fee) : 0,
                            refund_subtotal:(item.refund_amount) ? Number.parseInt(item.refund_amount.refund_subtotal) : 0,
                            refund_total:(item.refund_amount) ? Number.parseInt(item.refund_amount.refund_total) : 0,
                            item: {
                                connect: {
                                    origin_id: item.order_line_item_id
                                }
                            }
                        }))
                    }
                },
                select: {
                    id: true
                }
            }).then((rr) => {
                console.log(rr);
            }).catch((err) => {
                console.log(err);
            });
                // await prisma.return_refund.create({
                //     data: {
                //         total_amount: (rrData.refund_amount) ? Number.parseInt(rrData.refund_amount.refund_total) : 0,
                //         ordersId: body.m_order_id,
                //         origin_id: rrData.return_id,
                //         status: rrData.return_status,
                //         return_type: rrData.return_type,
                //         return_reason: rrData.return_reason_text,
                //         line_item: {
                //             create: rrData.return_line_items.map(item => ({
                //                 origin_id: item.return_line_item_id,
                //                 currency: (item.refund_amount) ? item.refund_amount.currency : 'IDR',
                //                 refund_service_fee:(item.refund_amount) ? Number.parseInt(item.refund_amount.buyer_service_fee) : 0,
                //                 refund_subtotal:(item.refund_amount) ? Number.parseInt(item.refund_amount.refund_subtotal) : 0,
                //                 refund_total:(item.refund_amount) ? Number.parseInt(item.refund_amount.refund_total) : 0,
                //                 item: {
                //                     connect: {
                //                         origin_id: item.order_line_item_id
                //                     }
                //                 }
                //             }))
                //         }
                //     },
                //     select: {
                //         id: true
                //     }
                // });
               /*  rrRow.push({
                    total_amount: (rrData.refund_amount) ? Number.parseInt(rrData.refund_amount.refund_total) : 0,
                    ordersId: body.m_order_id,
                    origin_id: rrData.return_id,
                    status: rrData.return_status,
                    return_type: rrData.return_type,
                    return_reason: rrData.return_reason_text,
                })
                rrData.return_line_item.forEach(rrLineItem => {
                    rrItemRow.push({
                        origin_id: rrLineItem.return_line_item_id,
                        currency: (rrLineItem.refund_amount) ? rrLineItem.refund_amount.currency : 'IDR',
                        refund_service_fee:(rrLineItem.refund_amount) ? Number.parseInt(rrLineItem.refund_amount.buyer_service_fee) : 0,
                        refund_subtotal:(rrLineItem.refund_amount) ? Number.parseInt(rrLineItem.refund_amount.refund_subtotal) : 0,
                        refund_total:(rrLineItem.refund_amount) ? Number.parseInt(rrLineItem.refund_amount.refund_total) : 0,
                    })
                }); */
            // });
            

           /*  let createRR = await prisma.return_refund.createManyAndReturn({
                data: [rrRow]
            })
            let createRRLine = await prisma.return_line_item.createMany({
                data: [rrItemRow]
            }) */

        } else {
            console.log('still no return found -- ignoring for now');
        }
    } else {
        await prisma.return_refund.update({
            where: {
                origin_id: body.returnId
            },
            data: {
                return_reason: returnData.cancellations[0].cancel_reason_text,
                total_amount: (returnData.cancellations[0].refund_amount) ? Number.parseInt(returnData.cancellations[0].refund_amount.refund_total) : 0,
                line_item: {
                    create: returnData.cancellations[0].cancel_line_items.map(item => ({
                            origin_id: item.cancel_line_item_id,
                            currency: (item.refund_amount) ? item.refund_amount.currency : 'IDR',
                            refund_service_fee: (item.refund_amount) ? Number.parseInt(item.refund_amount.buyer_service_fee) : 0,
                            refund_subtotal: (item.refund_amount) ? Number.parseInt(item.refund_amount.refund_subtotal) : 0,
                            refund_total: (item.refund_amount) ? Number.parseInt(item.refund_amount.refund_total) : 0,
                            item: {
                                connect: {
                                    origin_id: item.order_line_item_id
                                }
                            }
                        }
                    ))
                }
            },
            /* update: {
                status: returnData.cancellations[0].cancel_status
            } */
        }).then(() => {
            console.log('cancellation created')
        }).catch((err) => {
            console.log(err);
        });
    }

    if (body.integration.length > 0) {
        let subject = '';
        let comment = '';
        let tags = [];
        switch (body.status) {
            case 'CANCELLATION':
                subject = 'Cancellation Request: ' + body.order_id;
                comment = `User request a cancellation to order: ${body.order_id} with Reason: ${returnData.cancellations[0].cancel_reason_text}`;
                tags.push('marina_cancellation');
                break;
            case 'REFUND':
                subject = 'Refund Request: ' + body.order_id;
                comment = `User request a refund to order: ${body.order_id}
                Image Evidence: ${(refundEvidence.records[0].images && refundEvidence.records[0].images.length > 0) ? refundEvidence.records[0].images.map(img => img.url).join('\n') : 'No image provided'}
                Video Evidence: ` + (refundEvidence.records[0].videos && refundEvidence.records[0].videos.length > 0 ? refundEvidence.records[0].videos.map(vid => vid.url).join('\n') : 'No video provided');
                tags.push('marina_return_refund');
                break;
            case 'RETURN_AND_REFUND':
                subject = 'Return Request: ' + body.order_id;
                comment = `User request a return to order: ${body.order_id}
                Image Evidence: ${(refundEvidence.records[0].images && refundEvidence.records[0].images.length > 0) ? refundEvidence.records[0].images.map(img => img.url).join('\n') : 'No image provided'}
                Video Evidence: ` + (refundEvidence.records[0].videos && refundEvidence.records[0].videos.length > 0 ? refundEvidence.records[0].videos.map(vid => vid.url).join('\n') : 'No video provided');
                tags.push('marina_return_refund');
                break;
            default:
                break;
        }
        const findZd = body.integration.find(intg => intg.name == 'ZENDESK');
        if (findZd) {
            let ticketData = {
                ticket: {
                    subject: subject,
                    comment: { body: comment },
                    // requester: { external_id: `6972710759960723714-7530485791072960776-7495813365286538189` },
                    tags: tags,
                    requester: { external_id: `tiktok-${body.customer_id}-${body.shop_id}` },
                    custom_fields: [
                        {
                            id: findZd.notes.split('-')[0],
                            value: body.customer_id
                        },{
                            id: findZd.notes.split('-')[1],
                            value: body.order_id
                        },{
                            id: findZd.notes.split('-')[2],
                            value: body.shop_id
                        },{
                            id: findZd.notes.split('-')[3],
                            value: 'tiktok'
                        },{
                            id: findZd.notes.split('-')[4],
                            value: body.shop_id
                        }
                    ]
                }
            }
            // console.log(ticketData)
            createTicket(findZd.baseUrl, findZd.credent.find(cred => cred.key == 'ZD_API_TOKEN').value, ticketData).then((ticket) => {
                console.log('ticket created: ' + ticket.data.ticket.id);
            }).catch((err) => {
                console.log(err.response.data);
            })
        }
    }

    // done(null, {response: 'testing'});
}

async function collectTiktokProduct (body, done) {
    prisma = getPrismaClientForTenant(body.org_id, body.tenantDB.url);
    // const prisma = getPrismaClient(body.tenantDB);
    // -- UPDATE USING: callTiktok FUNCTION
    
    let tiktokStore = await prisma.store.findUnique({
        where: { origin_id: body.shop_id }
    });
    const productData = await callTiktok('get', GET_PRODUCT(body.product_id, tiktokStore.secondary_token), {}, tiktokStore.token, tiktokStore.refresh_token, tiktokStore.id, body.tenantDB, body.org_id);
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
        prisma = getPrismaClientForTenant(body.org_id, body.tenantDB.url);
        const suncoAppId = findZd.credent.find(cred => cred.key == 'SUNCO_APP_ID').value;
        const suncoAppKey = findZd.credent.find(cred => cred.key == 'SUNCO_APP_KEY').value;
        const suncoAppSecret = findZd.credent.find(cred => cred.key == 'SUNCO_APP_SECRET').value;
        let defaultClient = SunshineConversationsClient.ApiClient.instance
        let basicAuth = defaultClient.authentications['basicAuth']
        basicAuth.username = decryptData(suncoAppKey);
        basicAuth.password = decryptData(suncoAppSecret);
        let buyerName = body.userName || body.message.customer.name || 'Marketplace Buyer';
        let suncoConvId;
        if (body.syncCustomer) {
            try {
                console.log('Sync Customers');
                const tiktokMessages = await callTiktok('GET', GET_MESSAGE(body.message.origin_id, body.message.store.secondary_token), {}, body.message.store.token, body.message.store.refresh_token, body.message.store.id, body.tenantDB, body.org_id)
                let buyerFound = false;
                tiktokMessages.data.data.messages.forEach(async message => {
                    if (message.sender.im_user_id == body.message.customer.origin_id) {
                        if (!buyerFound) {
                            buyerName = message.sender.nickname;
                            buyerFound = true;
                        }
                    }
                });
                if (buyerFound) {
                    await prisma.customers.update({
                        where: { origin_id: body.message.customer.origin_id },
                        data: { name: buyerName }
                    })
                }
            } catch (error) {
                console.log(error);
            }
        }
        if (!body.message.externalId) {
            const suncoMetadata = {
                [`dataCapture.ticketField.${findZd.notes.split('-')[0]}`]: body.message.customer.origin_id,
                [`dataCapture.ticketField.${findZd.notes.split('-')[1]}`]: body.message.origin_id,
                [`dataCapture.ticketField.${findZd.notes.split('-')[2]}`]: body.message.store.origin_id,
                [`dataCapture.ticketField.${findZd.notes.split('-')[3]}`]: body.channel,
                [`dataCapture.ticketField.${findZd.notes.split('-')[4]}`]: body.message.store.origin_id,
                marina_org_id: body.org_id
            }
            let suncoUser = await createSuncoUser(body.userExternalId, buyerName, suncoAppId)
            let conversationBody = suncoUser;
            conversationBody.metadata = suncoMetadata;
            let suncoConversation = await createSuncoConversation(suncoAppId, conversationBody)
            suncoConvId = suncoConversation.conversation.id;
            await prisma.omnichat.update({
                where:{ id: body.message.id },
                data:{ externalId: suncoConversation.conversation.id }
            })
        } else {
            suncoConvId = body.message.externalId;
        }
        console.log('Sunco Conv ID: ' + suncoConvId);
        console.log('Sunco User External ID: ' + body.userExternalId);
        let messageContent = body.message_content;
        if (body.channel == TIKTOK) {
            messageContent = JSON.parse(body.message_content);
        }
        let suncoMessagePayload = {
            author: {
                type: 'user',
                userExternalId: body.userExternalId
            }
        }

        /* NEED TO SUPPORT SHOPEE */
        switch (body.chat_type) {
            case "TEXT":
                suncoMessagePayload.content = {
                    type: "text",
                    text: (messageContent.hasOwnProperty('content')) ? messageContent.content : '-- text sample -- '
                }
                break;
            case "IMAGE":
                suncoMessagePayload.content = {
                    type: "image",
                    mediaUrl: (messageContent.hasOwnProperty('url')) ? messageContent.url : '-- image sample -- ',
                    text: 'unsupported media type'
                }
                break;
            case "VIDEO":
                suncoMessagePayload.content = {
                    type: "image",
                    mediaUrl: (messageContent.hasOwnProperty('url')) ? messageContent.url : '-- video sample -- ',
                    text: 'unsupported media type'
                }
                break;
            case "PRODUCT_CARD": 
                try {
                    const product = await prisma.products.findFirst({
                        where: {
                            origin_id: {
                                startsWith: messageContent.product_id
                            }
                        },
                        select: {
                            name: true,
                            url: true,
                            product_img: true
                        }
                    })
                    if (product) {
                        suncoMessagePayload.content = {
                            type: "text",
                            text: (messageContent.hasOwnProperty('product_id')) ? `Buyer send a Product\n\nProduct: ${messageContent.product_id}\nProduct name: ${product.name}\nProduct URL: ${product.url}\nProduct Image: ${(product.product_img.length > 0) ? product.product_img[0].originalUrl : '-no image-'}` : '-- product sample -- '
                        }
                    } else {
                        suncoMessagePayload.content = {
                            type: "text",
                            text: (messageContent.hasOwnProperty('product_id')) ? `Buyer send a Product\n\nProduct: ${messageContent.product_id}` : '-- product sample -- '
                        }
                    }
                } catch (error) {
                    console.log(error);
                    suncoMessagePayload.content = {
                        type: "text",
                        text: (messageContent.hasOwnProperty('product_id')) ? `PBuyer send a Product\n\nroduct: ${messageContent.product_id}` : '-- product sample -- '
                    }
                }
                break;
            case "ORDER_CARD": 
                suncoMessagePayload.content = {
                    type: "text",
                    text: (messageContent.hasOwnProperty('order_id')) ? `Buyer send an Order\n\nOrder: ${messageContent.order_id}` : '-- order sample -- '
                }
                break;
            default:
                suncoMessagePayload.content = {
                    type: "text",
                    text: '-- default sample -- '
                }
                break;
        }

        postMessage(suncoAppId, suncoConvId, suncoMessagePayload).then(() => {}, async (error) => {
            console.log('error here')
            console.log(JSON.parse(error.message))
            const errorMessage = JSON.parse(error.message);
            if (errorMessage.errors && errorMessage.errors.length > 0) {
                if (errorMessage.errors[0].code == 'conversation_not_found') {
                    console.log('recreate conversation');
                    let suncoUser = await createSuncoUser(body.userExternalId, body.userName, suncoAppId)
                    let conversationBody = suncoUser;
                    conversationBody.metadata = suncoMetadata;
                    let suncoConversation = await createSuncoConversation(suncoAppId, conversationBody)
                    if (suncoConversation.conversation) {
                        suncoConvId = suncoConversation.conversation.id;
                        await prisma.omnichat.update({
                            where:{ id: body.message.id },
                            data:{ externalId: suncoConversation.conversation.id }
                        })
                        postMessage(suncoAppId, suncoConvId, suncoMessagePayload)
                    }
                }
            }
        })
    }

    if (findSf) {
        console.log('Salesforce integration not implemented yet');
        // done(new Error('Salesforce integration not implemented yet'));
    }
}

async function callTiktok (method, url, body, token, refreshToken, mShopId, tenantDB, org_id) {
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
            console.log('Refreshing token...');
            let newToken = await api.get(GET_REFRESH_TOKEN_API(decryptData(refreshToken)));
            // console.log(newToken.data);
            if (!newToken.data.data.access_token) {
                throw new Error('Failed to refresh token');
            }
            // const prisma = getPrismaClient(tenantDB);
            prisma = getPrismaClientForTenant(org_id, tenantDB.url);
            const _stored = await prisma.store.update({
                where: {
                    id: mShopId
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