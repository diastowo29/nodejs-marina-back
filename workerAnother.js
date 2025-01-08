let throng = require('throng');
let workers = process.env.WEB_CONCURRENCY || 2;
let maxJobsPerWorker = 20;
let { anotherWorkQueue, client } = require('./config/redis.config');
const { PrismaClient } = require('@prisma/client');
const { LAZADA, BLIBLI, TOKOPEDIA, LAZADA_CHAT, lazGetSessionDetail, lazGetOrderDetail, lazGetOrderItems, sampleLazOMSToken } = require('./config/utils');
const { lazCall } = require('./functions/lazada/caller');
const prisma = new PrismaClient();

function start() {
    console.log('anotherWorker');
    anotherWorkQueue.process(maxJobsPerWorker, async (job, done) => {
        processJob(job, done);
    });
}

async function processJob (jobData, done) {
    // console.log('anotherWorker');
    let body = jobData.data;
    switch (jobData.data.channel) {
        case LAZADA:
            followupLazada(body, done);
            break;
        case LAZADA_CHAT:
            followupLazadaChat(body, done);
            break;
        case BLIBLI: 
            followupOther(body, done);
            break;
        case TOKOPEDIA: 
            followupOther(body, done);
            break;
        default:
            console.log('channel not supported', jobData.data.channel);
            break;
    }
}

async function followupLazada (body, done) {
    let addParams = `order_id=${body.orderId}`;
    // console.log(body)
    if (body.new) {
        // let orderDetailParams = lazParamz(appKeyId, '', Date.now(), 'refToken', sampleToken, lazGetOrderDetail, addParams);
        // let orderItemsParams = lazParamz(appKeyId, '', Date.now(), 'refToken', sampleToken, lazGetOrderItems, addParams);

        let orderDetailPromise = await Promise.all([
            lazCall(lazGetOrderDetail, addParams, 'refToken', sampleLazOMSToken),
            lazCall(lazGetOrderItems, addParams, 'refToken', sampleLazOMSToken),
            // lazCall(`${lazadaHost}${lazGetOrderDetail}?${orderDetailParams.params}&sign=${orderDetailParams.signed}`, ''),
            // lazCall(`${lazadaHost}${lazGetOrderItems}?${orderItemsParams.params}&sign=${orderItemsParams.signed}`, '')
        ]);

        let orderDetail = orderDetailPromise[0];
        let itemDetail = orderDetailPromise[1];
        let shipping = orderDetail.data.address_shipping;

        let orderItems = [];

        itemDetail.data.forEach(item => {
            orderItems.push({
                qty: 1,
                total_price: item.item_price,
                notes: item.personalization,
                origin_id: item.order_item_id.toString(),
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
            })
        });
        let orders = await prisma.orders.update({
            where: {
                id: body.id
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
                order_items: { create: orderItems },
                logistic: {
                    connectOrCreate: {
                        where: {
                            name: `laz-${itemDetail.data[0].shipping_provider_type}`
                        }
                    }
                }
            }
        })
        console.log(orders);
    }

}

async function followupLazadaChat (body, done) {
    let addParams = `session_id=${body.sessionId}`;
    if (body.new) {
        // console.log('getting session detail');
        // let params = lazParamz(appKeyId, '', Date.now(), 'refToken', '50000701427cxqjuelQAzTFaidRBkvzcJhLgviw1b6bf23cSmjXHotFQPMmuySb8', lazGetSessionDetail, addParams);
        // let session = await lazCall(`${lazadaHost}${lazGetSessionDetail}?${params.params}&sign=${params.signed}`, '');
        let session = await lazCall(lazGetSessionDetail, addParams, 'refToken', sampleLazOMSToken);
        if (session.success) {
            let user = await prisma.omnichat_user.update({
                where: {
                    origin_id: session.data.buyer_id.toString()
                },
                data: {
                    username: session.data.title,
                    thumbnailUrl: session.data.head_url
                }
            });
        }
    }
    done(null, {response: 'testing'});
}

function followupOther (body, done) {

}

throng({ workers, start });