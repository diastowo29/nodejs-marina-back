const { GET_ORDER_API, GET_PRODUCT, GET_REFRESH_TOKEN_API, SEARCH_RETURN, GET_RETURN_RECORDS, SEARCH_CANCELLATION, SEND_MESSAGE, GET_MESSAGE, GET_CONVERSATION } = require("../../config/tiktok_apis");
const { getPrismaClientForTenant } = require("../../services/prismaServices");
const { api } = require("../axios/interceptor");
const { decryptData, encryptData } = require("../encryption");
const SunshineConversationsClient = require('sunshine-conversations-client');
const { createSuncoUser, createSuncoConversation, postMessage } = require("../sunco/function");
const { createTicket } = require("../zendesk/function");
const { PrismaClient } = require("../../prisma/generated/client");
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
        const ccData = returnData.cancellations.find(cc => cc.cancel_id == body.returnId)
        await prisma.return_refund.update({
            where: {
                origin_id: body.returnId
            },
            data: {
                return_reason: ccData.cancel_reason_text,
                total_amount: (ccData.refund_amount) ? Number.parseInt(ccData.refund_amount.refund_total) : 0,
                line_item: {
                    create: ccData.cancel_line_items.map(item => ({
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
            }
        }).then(() => {
            console.log('cancellation created')
        }).catch((err) => {
            console.log(err);
        });
    }

    if (body.integration.length > 0) {
        let subject = '';
        let comment = '';
        let tags = [`m_${body.channel}`];
        switch (body.status) {
            case 'CANCELLATION':
                subject = `[${body.channel.toString().toUpperCase()}] Cancellation Request: ${body.order_id}`;
                comment = `User request a cancellation to order: ${body.order_id} with Reason: ${returnData.cancellations[0].cancel_reason_text}`;
                tags.push('marina_cancellation');
                break;
            case 'REFUND':
                subject = `[${body.channel.toString().toUpperCase()}] Refund Request: ${body.order_id}`;
                comment = `User request a refund to order: ${body.order_id}
                Image Evidence: ${(refundEvidence.records[0].images && refundEvidence.records[0].images.length > 0) ? refundEvidence.records[0].images.map(img => img.url).join('\n') : 'No image provided'}
                Video Evidence: ` + (refundEvidence.records[0].videos && refundEvidence.records[0].videos.length > 0 ? refundEvidence.records[0].videos.map(vid => vid.url).join('\n') : 'No video provided');
                tags.push('marina_refund');
                break;
            case 'RETURN_AND_REFUND':
                subject = `[${body.channel.toString().toUpperCase()}] Return Request: ${body.order_id}`;
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
                    tags: tags,
                    requester: { 
                        name: `Customer ${body.customer_id}`,
                        external_id: `${body.channel}-${body.customer_id}-${body.shop_id}`
                    },
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
                            value: body.channel
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
                if (err.response && err.response.data) {
                    console.log(JSON.stringify(err.response.data));
                }
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
    // console.log(tiktokStore);
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
    // console.log(productData.data);
    const tiktokProduct = productData.data.data;
    // console.log(tiktokProduct)
    if (tiktokProduct) {
        if (body.code == 15) {
            let findQuery = [];
            let updatedPromises = [];
            tiktokProduct.skus.forEach(sku => {
                findQuery.push({
                    origin_id: `${tiktokProduct.id}-${sku.id}`
                })
                updatedPromises.push(
                    prisma.products.update({
                        data: {
                            name: tiktokProduct.title,
                            condition: tiktokProduct.is_pre_owned ? 2 : 1,
                            desc: tiktokProduct.description,
                            price: Number(sku.price.sale_price),
                            sku: sku.seller_sku,
                            stock: sku.inventory[0].quantity,
                        },
                        where: {
                            origin_id: `${tiktokProduct.id}-${sku.id}`
                        },
                        select: {
                            id: true,
                            product_img: true,
                            origin_id: true
                        }
                    })
                )
            });
            Promise.all(updatedPromises).then((updatedProduts) => {
                let needImgList = [];
                updatedProduts.forEach(product => {
                    if (product.product_img.length == 0) {
                        tiktokProduct.skus.forEach(sku => {
                            needImgList.push({
                                originalUrl: tiktokProduct.main_images[0].urls[0],
                                thumbnailUrl: tiktokProduct.main_images[0].thumb_urls[0],
                                origin_id: `IMG-${tiktokProduct.id}`,
                                productsId: products.find(item => item.origin_id.endsWith(sku.id)).id,
                                height: tiktokProduct.main_images[0].height,
                                width: tiktokProduct.main_images[0].width
                            })
                        });
                    }
                });
                if (needImgList.length > 0) {
                    prisma.products_img.createMany({
                        data: needImgList
                    }).then(() => {
                        console.log('img synced');
                    })
                }
            }).catch((err) => {
                console.log(err);
            });
            /* prisma.products.findMany({
                where: {
                    OR: findQuery
                },
                select: {
                    id: true,
                    origin_id: true,
                    product_img: true
                }
            }).then((products) => {
                let needImgList = [];
                products.forEach(product => {
                    if (product.product_img.length == 0) {
                        tiktokProduct.skus.forEach(sku => {
                            needImgList.push({
                                originalUrl: tiktokProduct.main_images[0].urls[0],
                                thumbnailUrl: tiktokProduct.main_images[0].thumb_urls[0],
                                origin_id: `IMG-${tiktokProduct.id}`,
                                productsId: products.find(item => item.origin_id.endsWith(sku.id)).id,
                                height: tiktokProduct.main_images[0].height,
                                width: tiktokProduct.main_images[0].width
                            })
                        });
                    }
                });
                if (needImgList.length > 0) {
                    prisma.products_img.createMany({
                        data: needImgList
                    }).then(() => {
                        console.log('img synced');
                    })
                }
            }) */
        }
        prisma.products.createManyAndReturn({
            skipDuplicates: true,
            data: tiktokProduct.skus.map(item => ({
                origin_id: `${tiktokProduct.id}-${item.id}`,
                name: tiktokProduct.title,
                url: `https://www.tiktok.com/view/product/${tiktokProduct.id}?utm_campaign=client_share&utm_medium=android&utm_source=whatsapp`,
                status: tiktokProduct.status,
                condition: tiktokProduct.is_pre_owned ? 2 : 1,
                desc: tiktokProduct.description,
                price: Number(item.price.sale_price),
                currency: item.price.currency,
                sku: item.seller_sku,
                stock: item.inventory[0].quantity,
                storeId: tiktokStore.id,
                weight: tiktokProduct.package_weight.value ? Number(tiktokProduct.package_weight.value): 0,
            })),
            select: {
                id: true,
                origin_id: true
            }
        }).then(function(newProduct) {
            let productImgs = [];
            if (newProduct.length > 0) {
                tiktokProduct.skus.forEach(sku => {
                    productImgs.push({
                        originalUrl: tiktokProduct.main_images[0].urls[0],
                        thumbnailUrl: tiktokProduct.main_images[0].thumb_urls[0],
                        origin_id: `IMG-${tiktokProduct.id}`,
                        productsId: newProduct.find(item => item.origin_id.endsWith(sku.id)).id,
                        height: tiktokProduct.main_images[0].height,
                        width: tiktokProduct.main_images[0].width
                    })
                });
                prisma.products_img.createMany({
                    skipDuplicates: true,
                    data: productImgs
                }).then((imgCreated) => {
                    console.log(imgCreated);
                }).catch((imgFail) => {
                    console.log(imgFail);
                })
            } else {
                console.log('no product created')
            }
            // done(null, {response: 'testing'});
        }).catch(function(err) {
            console.log(err);
            // done(new Error(err));
        })
    } else {
        console.log('product not found %s', body.product_id);
    }
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
        let userExternalId = (body.syncCustomer) ? `tiktok-${body.imUserId}-${body.shopId}` : `tiktok-${body.message.customer.origin_id}-${body.shopId}`
        prisma = getPrismaClientForTenant(body.org_id, body.tenantDB.url);
        const suncoAppId = findZd.credent.find(cred => cred.key == 'SUNCO_APP_ID').value;
        const suncoAppKey = findZd.credent.find(cred => cred.key == 'SUNCO_APP_KEY').value;
        const suncoAppSecret = findZd.credent.find(cred => cred.key == 'SUNCO_APP_SECRET').value;
        let defaultClient = SunshineConversationsClient.ApiClient.instance
        let basicAuth = defaultClient.authentications['basicAuth']
        basicAuth.username = decryptData(suncoAppKey);
        basicAuth.password = decryptData(suncoAppSecret);
        let buyerId = (body.syncCustomer) ?  body.imUserId : body.message.customer.origin_id;
        let imUserId = '';
        let buyerName = (body.syncCustomer) ? `Customer ${body.imUserId}` : body.message.customer.name;
        let suncoConvId;
        if (body.syncCustomer) {
            try {
                prisma.customers.findUnique({
                    where: {
                        im_origin_id: body.imUserId
                    }
                }).then(async (customers) => {
                    if (customers) {
                        buyerId = customers.origin_id;
                        buyerName = customers.name || `Customer ${buyerId}`
                        prisma.omnichat.update({
                            where: {
                                origin_id: body.message.origin_id
                            },
                            data: {
                                customer: {
                                    connect: {
                                        id: customers.id
                                    }
                                }
                            }
                        }).then(() => {
                            console.log("omnichat updated");
                        })
                    } else {
                        console.log('Sync Customers');
                        // const tiktokMessages = await callTiktok('GET', GET_MESSAGE(body.message.origin_id, body.message.store.secondary_token), {}, body.message.store.token, body.message.store.refresh_token, body.message.store.id, body.tenantDB, body.org_id)
                        const tiktokConvList = await callTiktok('GET', GET_CONVERSATION(body.message.store.secondary_token), {}, body.message.store.token, body.message.store.refresh_token, body.message.store.id, body.tenantDB, body.org_id)
                        // console.log(JSON.stringify(tiktokConvList.data.data));
                        let buyerFound = false;
                        tiktokConvList.data.data.conversations.forEach(conversation => {
                            if (conversation.id == body.message.origin_id) {
                                conversation.participants.forEach(participant => {
                                    if (participant.im_user_id == body.imUserId) {
                                        buyerFound = true;
                                        imUserId = participant.im_user_id
                                        buyerName = participant.nickname;
                                        buyerId = participant.user_id;
                                        userExternalId = `tiktok-${buyerId}-${body.shopId}`
                                    }
                                });
                            }
                        })
                        if (buyerFound) {
                            prisma.customers.upsert({
                                where: {
                                    origin_id: buyerId
                                },
                                create: {
                                    origin_id: buyerId,
                                    im_origin_id: imUserId,
                                    name: buyerName || `Customer ${buyerId}`
                                },
                                update: {
                                    name: buyerName,
                                    im_origin_id: imUserId
                                }
                            }).then(() => {
                                prisma.omnichat.update({
                                    where: {
                                        origin_id: body.message.origin_id
                                    },
                                    data: {
                                        customer: {
                                            connect: {
                                                origin_id: buyerId
                                            }
                                        }
                                    }
                                }).then(() => {
                                    console.log("omnichat updated");
                                })
                            })
                        } else {
                            console.log('=== Buyer not found, replace using default im_user_id ===')
                            prisma.omnichat.update({
                                where: {
                                    origin_id: body.message.origin_id
                                },
                                data: {
                                    customer: {
                                        connectOrCreate: {
                                            create: {
                                                name: buyerName,
                                                origin_id: buyerId
                                            },
                                            where: {
                                                origin_id: buyerId
                                            }
                                        }
                                    }
                                }
                            }).then(() => {
                                console.log("omnichat updated");
                            })
                        }
                    }
                })
            } catch (error) {
                console.log(error);
            }
        }
        if (!body.message.externalId) {
            const customerOriginId = (body.message.customer) ? body.message.customer.origin_id : buyerId
            const suncoMetadata = {
                [`dataCapture.ticketField.${findZd.notes.split('-')[0]}`]: customerOriginId,
                [`dataCapture.ticketField.${findZd.notes.split('-')[1]}`]: body.message.origin_id,
                [`dataCapture.ticketField.${findZd.notes.split('-')[2]}`]: body.message.store.origin_id,
                [`dataCapture.ticketField.${findZd.notes.split('-')[3]}`]: body.channel,
                [`dataCapture.ticketField.${findZd.notes.split('-')[4]}`]: body.message.store.origin_id,
                marina_org_id: body.org_id
            }
            let suncoUser = await createSuncoUser(userExternalId, buyerName, suncoAppId);
            let conversationBody = suncoUser;
            conversationBody.metadata = suncoMetadata;
            let suncoConversation = await createSuncoConversation(suncoAppId, conversationBody);
            suncoConvId = suncoConversation.conversation.id;
            await prisma.omnichat.update({
                where:{ id: body.message.id },
                data:{ externalId: suncoConversation.conversation.id }
            })
        } else {
            suncoConvId = body.message.externalId;
        }
        console.log('Sunco Conv ID: ' + suncoConvId);
        console.log('Sunco User External ID: ' + userExternalId);
        let messageContent = JSON.parse(body.message_content);
        let suncoMessagePayload = {
            author: {
                type: 'user',
                userExternalId: userExternalId
            }
        }
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
                var content = (messageContent.hasOwnProperty('product_id')) ? `PBuyer send a Product\n\nroduct: ${messageContent.product_id}` : '-- product sample -- ';
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
                        content = `Buyer send a Product\n\nProduct: ${messageContent.product_id}\nProduct name: ${product.name}\nProduct URL: ${product.url}\nProduct Image: ${(product.product_img.length > 0) ? product.product_img[0].originalUrl : '-no image-'}`;
                    }
                } catch (error) {
                    console.log(error);
                }
                suncoMessagePayload.content = {
                    type: "text",
                    text: content
                }
                break;
            case "ORDER_CARD": 
                var content = (messageContent.hasOwnProperty('order_id')) ? `Buyer send an Order\n\nOrder: ${messageContent.order_id}` : '-- order sample -- ';
                try {
                    if (messageContent.hasOwnProperty('order_id')) {
                        prisma.orders.findUnique({
                            where: {
                                origin_id: messageContent.order_id
                            }
                        }).then((order) => {
                            if (order) {
                                content = `Buyer send an Order\n\nOrder: ${order.origin_id}\nTotal order value: ${order.total_amount}` 
                            }
                        }).catch((err) => {
                            console.log(err)
                        })
                    }
                } catch (err) {
                    console.log(err);
                }
                suncoMessagePayload.content = {
                    type: "text",
                    text: content
                }
                break;
            default:
                suncoMessagePayload.content = {
                    type: "text",
                    text: '-- default sample -- '
                }
                break;
        }
        /* Promise.all([
            prisma.customers.update({
                where: { origin_id: body.message.customer.origin_id },
                data: { name: buyerName }
            }),
            postMessage(suncoAppId, suncoConvId, suncoMessagePayload)
        ]).then(() => {}, (error) => {
            console.log(error);
        }) */

        postMessage(suncoAppId, suncoConvId, suncoMessagePayload).then(() => {}, async (error) => {
            console.log('error here')
            console.log(JSON.parse(error.message))
            const errorMessage = JSON.parse(error.message);
            if (errorMessage.errors && errorMessage.errors.length > 0) {
                if (errorMessage.errors[0].code == 'conversation_not_found') {
                    console.log('recreate conversation');
                    let suncoUser = await createSuncoUser(userExternalId, buyerName, suncoAppId)
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