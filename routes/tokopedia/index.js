var express = require('express');
var router = express.Router();
var { PrismaClient, Prisma } = require('@prisma/client');
// const {workQueue, jobOpts} = require('../../config/redis.config');
const { TOKOPEDIA, TOKOPEDIA_CHAT } = require('../../config/utils');
const { gcpParser } = require('../../functions/gcpParser');

const prisma = new PrismaClient();
/* GET home page. */
router.get('/webhook', async function (req, res, next) {
    res.status(200).send({});
});

router.post('/webhook', async function (req, res, next) {
    console.log(req.body);
    // workQueue.add({channel:TOKOPEDIA, body: req.body}, jobOpts);
    res.status(200).send({});
});

router.post('/order', async function(req, res, next) {
    let jsonBody = gcpParser(req.body.message.data);
    try {
        let logisticName = `toko-${jsonBody.logistics.shipping_agency}`;
        let orderItemList = [];
        jsonBody.products.forEach(item => {
            orderItemList.push({
                where: {
                    origin_id: `${jsonBody.order_id}-${item.id}`
                },
                create: {
                    qty: item.quantity,
                    notes: item.notes,
                    origin_id: `${jsonBody.order_id}-${item.id}`,
                    total_price: item.total_price,
                    products: {
                        connectOrCreate: {
                            where: {
                                origin_id: item.id.toString()
                            },
                            create: {
                                currency: item.currency,
                                name: item.Name,
                                price: item.price,
                                sku: item.sku,
                                origin_id: item.id.toString()
                            }
                        }
                    }
                }
            })
        });
        let newOrder = await prisma.orders.upsert({
            update: {
                status: jsonBody.order_status.toString(),
            },
            create: {
                origin_id: jsonBody.order_id.toString(),
                invoice: jsonBody.invoice_num,
                accept_partial: jsonBody.accept_partial,
                device: jsonBody.device,
                payment_id: jsonBody.payment_id.toString(),
                recp_name: jsonBody.recipient.Name,
                recp_phone: jsonBody.recipient.phone,
                recp_addr_full: jsonBody.recipient.address.address_full,
                recp_addr_city: jsonBody.recipient.address.city,
                recp_addr_district: jsonBody.recipient.address.district,
                recp_addr_geo: jsonBody.recipient.address.geo,
                recp_addr_country: jsonBody.recipient.address.country,
                recp_addr_postal_code: jsonBody.recipient.address.postal_code,
                shipping_price: jsonBody.amt.shipping_cost,
                total_product_price: jsonBody.amt.ttl_product_price,
                total_amount: jsonBody.amt.ttl_amount,
                logistic: {
                    connectOrCreate: {
                        create: {
                            name: logisticName
                        },
                        where: {
                            name: logisticName
                        }
                    }
                },
                /* store: {
                    connect: {
                        origin_id: jsonBody.shop_id
                    }
                }, */
                status: jsonBody.order_status.toString(),
                customers: {
                    connectOrCreate: {
                        create: {
                            email: jsonBody.customer.email,
                            name: jsonBody.customer.Name,
                            phone: jsonBody.customer.phone,
                            origin_id: jsonBody.customer.id.toString()
                        },
                        where: {
                            origin_id: jsonBody.customer.id.toString()
                        }
                    }
                },
                order_items: { connectOrCreate: orderItemList }
            },
            where: {
                origin_id: jsonBody.order_id.toString()
            },
            include: {
                order_items: {
                    include: {
                        products: true
                    }
                }
            }
        })
        // workQueue.add({
        //     channel: TOKOPEDIA,
        //     body: req.body
        // }, jobOpts);
        res.status(200).send(newOrder);
    } catch (err) {
        console.log(err);
        res.status(400).send({})
    }

})

router.put('/order/:id', async function(req, res, next) {
    let order = await prisma.orders.findUnique({
        where: {
            id: Number.parseInt(req.params.id)
        },
        include: {
            order_items: true
        }
    });
    res.status(200).send(order);
})


router.post('/chat',async function(req, res, next) {
    let jsonBody = gcpParser(req.body.message.data);
    let tokoChatId = `${jsonBody.shop_id}-${jsonBody.buyer_id}`;
    try {
        let message = await prisma.omnichat.upsert({
            where: {
                origin_id: tokoChatId
            },
            update: {
                last_message: jsonBody.message,
                last_messageId: jsonBody.msg_id.toString(),
                messages: {
                    create: {
                        line_text: jsonBody.message,
                        author: jsonBody.buyer_id.toString(),
                        origin_id: jsonBody.msg_id.toString()
                    }
                }
            },
            create: {
                origin_id: tokoChatId,
                last_message: jsonBody.message,
                last_messageId: jsonBody.msg_id.toString(),
                store: {
                    connect: {
                        origin_id: jsonBody.shop_id.toString()
                    }
                },
                omnichat_user: {
                    connectOrCreate: {
                        where: {
                            origin_id: jsonBody.buyer_id.toString()
                        },
                        create: {
                            origin_id: jsonBody.buyer_id.toString(),
                            username: jsonBody.full_name
                        }
                    }
                },
                messages: {
                    create: {
                        line_text: jsonBody.message,
                        author: jsonBody.buyer_id.toString(),
                        origin_id: jsonBody.msg_id.toString()
                    }
                }
            }
        })
        // workQueue.add({
        //     channel: TOKOPEDIA_CHAT,
        //     body: jsonBody
        // }, jobOpts);
        res.status(200).send(message);
    } catch (err) {
        console.log(err);
        if (err instanceof Prisma.PrismaClientUnknownRequestError) {
            res.status(400).send(err.code);
        } else {
            res.status(400).send(err);
        }
    }
})


module.exports = router;