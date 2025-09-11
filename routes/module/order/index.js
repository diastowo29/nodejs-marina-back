var express = require('express');
var router = express.Router();
const { TIKTOK, SHOPEE, LAZADA, BLIBLI, TOKOPEDIA } = require('../../../config/utils');
const { api } = require('../../../functions/axios/interceptor');
const { CANCEL_ORDER, APPROVE_CANCELLATION, UPLOAD_IMAGE, REJECT_CANCELLATION, SHIP_PACKAGE, GET_SHIP_DOCUMENT, APPROVE_REFUND, REJECT_REFUND, GET_SHIP_TRACKING } = require('../../../config/tiktok_apis');
const multer = require('multer');
const { SHOPEE_CANCEL_ORDER, GET_SHOPEE_SHIP_PARAMS, SHOPEE_SHIP_ORDER } = require('../../../config/shopee_apis');
const { generateShopeeToken } = require('../../../functions/shopee/function');
const { decryptData } = require('../../../functions/encryption');
var env = process.env.NODE_ENV || 'development';
const { PrismaClient } = require('../../../prisma/generated/client');
const { callTiktok } = require('../../../functions/tiktok/function');
const { getTenantDB } = require('../../../middleware/tenantIdentifier');
let mPrisma = new PrismaClient();
// const upload = multer({ dest: 'uploads/' });
const upload = multer({ storage: multer.memoryStorage() });

router.get('/', async function(req, res, next) {
    const channel = req.query.channel || req.query.c;
    const user = req.query.user || req.query.user_id;
    const store = req.query.store || req.query.store_id;
    if (!channel && !user && !store) {
        return res.status(400).send({
            error: 'Invalid parameters'
        });
    }
    mPrisma = req.prisma;
    try {
        let order = await mPrisma.orders.findMany({
            orderBy: [
                { updatedAt: 'desc' }
            ],
            where: {
                ...(channel) ? {
                    store : {
                        channel: { name : channel }
                    }
                } : {},
                ...(user) ? {
                    customers: {
                        origin_id: user
                    }
                } : {},
                ...(store) ? {
                    store: {
                        origin_id: store
                    }
                } : {},
                order_items: {
                    some: {}
                },
                logistic: {
                    isNot: null
                },
            },
            include: {
                return_refund: true,
                order_items: {
                    include: {
                        products: {
                            include: {
                                product_img: true
                            }
                        }
                    }
                },
                store: {
                    select: {
                        id: true, 
                        origin_id: true,
                        channel: true,
                        name: true
                    }
                },
                logistic: true
            },
           ...(user) ? { take: 10, orderBy: { createdAt:'desc' } } : {orderBy: { createdAt:'desc' }}
        })
        res.status(200).send(order);
    } catch (err) {
        console.log(err);
        if (err.response) {
            return res.status(err.status).send(err.response.data);
        } else {
            console.log(err);
            return res.status(500).send({ error: err.message });
        }
    }
});

router.get('/:id/awb_track', async function(req, res, next) {
    mPrisma = req.prisma;
    if (!req.params.id || !req.query.channel) {
        return res.status(400).send({
            error: 'Some parameters are missing'
        })
    }
    mPrisma.orders.findUnique({
        where: {
            id: Number.parseInt(req.params.id)
        },
        select: {
            origin_id: true,
            store: {
                select: {
                    id: true,
                    token: true,
                    secondary_token: true
                }
            }
        }
    }).then(async (order) => {
        if (req.query.channel == TIKTOK) {
            callTiktok('GET', 
                GET_SHIP_TRACKING(order.origin_id, order.store.secondary_token), {}, 
                order.store.token, 
                order.store.refresh_token, 
                order.store.id, req.tenantDB, req.tenantId).then((tracking) => {
                    if (tracking.data.data.tracking) {
                        return res.status(200).send(tracking.data.data);
                    } else {
                        return res.status(200).send(tracking.data);
                    }
                }).catch((err) => {
                    console.log(err);
                    return res.status(500).send({ error: err.message });
                })
        } else {
            return res.status(200).send({
                message: 'Available soon for this channel: ' + req.query.channel
            })
        }
    }).catch((err) => {
        console.log(err);
        if (err.response) {
            return res.status(err.status).send(err.response.data);
        } else {
            console.log(err);
            return res.status(500).send({ error: err.message });
        }
    })
})

/* router.post('/upload', async function(req, res, next) {
    const data = {
        reject_reason: 'seller_reject_apply_product_has_been_packed'
    }
    try {
        const uploaded = await api.post(REJECT_CANCELLATION('4035633447771802405', 'xxx--xxx', data), data, {
            headers: {
                'x-tts-access-token': 'xxx-xxx-xxx',
                'content-type': 'application/json'
            }
        });
        console.log(uploaded.data);
        res.status(200).send(uploaded.data);
    } catch (err) {
        // console.log(err)
        if (err.response) {
            res.status(400).send({err: err.response.data})
        } else {
            res.status(500).send({err: err.message})
        }
    }
}) */

router.get('/:id', async function(req, res, next) {
    mPrisma = req.prisma;
    if (!req.params.id) {
        return res.status(400).send({
            error: 'id is required'
        })
    }
    try {
         let order = await mPrisma.orders.findUnique({
             where: {
                 id: Number.parseInt(req.params.id)
             },
             include: {
                 order_items: {
                     include: {
                         products: true
                     }
                 },
                 return_refund: true,
                 store: {
                     select: {
                         id: true,
                         name: true,
                         status: true,
                         channel: true
                     }
                 },
                 logistic: true
             }
         });
         if (!order) {
             return res.status(404).send({
                 error: 'order not found'
             });
         }
         res.status(200).send(order);
     } catch (err) {
            console.log(err);
            if (err.response) {
                return res.status(err.status).send(err.response.data);
            } else {
                console.log(err);
                return res.status(500).send({ error: err.message });
            }
     }
});

/* router.get('/ship/test', async function (req, res, next) {
    let packageId = '1162095699976882981';
    let cipher = '';
    let token = '';
    try {
        let shipped = await api.post(SHIP_PACKAGE(cipher), {}, {
            headers: {
                'x-tts-access-token': token,
                'content-type': 'application/json'
            }
        });
        if (shipped.data.code != 0) {
            return res.status(400).send(shipped.data);
        }
        // console.log(shipped.data);
        let shipDocuments = await api.get(GET_SHIP_DOCUMENT(packageId, cipher), {
            headers: {
                'x-tts-access-token': token,
                'content-type': 'application/json'
            }
        })
        if (shipDocuments.data.code != 0) {
            return res.status(400).send(shipped.data);
        }
    
        res.status(200).send({
            shipped: shipped.data,
            documents: shipDocuments.data
        });
    } catch (err) {
        console.log(err.response);
        if (err.response) {
            return res.status(err.status).send(err.response.data);
        } else {
            console.log(err);
            return res.status(500).send({ error: err.message });
        }
    }
}) */

router.put('/:id', async function(req, res, next) {
    // const mPrisma = getPrismaClient(req.tenantDB);
    mPrisma = req.prisma;
    const action = req.body.action;
    if (!action) {
        return res.status(400).send({
            error: 'action is required'
        });
    }
    let order = await mPrisma.orders.findUnique({
        where: {
            id: Number.parseInt(req.params.id)
        },
        include: {
            order_items: {
                select: {
                    origin_id: true,
                    package_id: true,
                    qty: true,
                    products: {
                        select: {
                            origin_id: true,
                            sku: true,
                            id: true
                        }
                    }
                }
            },
            return_refund: true,
            store: {
                select: {
                    token: true,
                    refresh_token: true,
                    secondary_token: true,
                    secondary_refresh_token: true,
                    channel: {
                        select: {
                            id: true,
                            name: true
                        }
                    }
                }

            }
        }
    });
    if (!order) {
        return res.status(404).send({
            error: 'order not found'
        });
    }
    let data = {};
    let responseData;
    let responseCode;
    let statusCode = 400;
    let completeUrl;
    switch (order.store.channel.name) {
        case TIKTOK:
            if (action == 'cancel') {
                data = {
                    order_id: order.origin_id,
                    cancel_reason: req.body.cancel_reason,
                    /* order_line_item_ids: order.order_items.map((item) => {
                        return item.origin_id;
                    }), */
                    skus: order.order_items.map((item) => {
                        return {
                            sku_id: item.products.origin_id.split('-')[1],
                            quantity: item.qty
                        }
                    })
                }
                completeUrl = CANCEL_ORDER(order.store.secondary_token, data);
            } else if (action == 'reject') {
                data = { reject_reason: req.body.cancel_reason }
                completeUrl = REJECT_CANCELLATION(order.temp_id, order.store.secondary_token, data);
            } else if (action == 'process') {
                let packagesArray = [];
                order.order_items.forEach(element => {
                    packagesArray.push({
                        id: element.package_id
                    });
                });
                data = {
                    packages: packagesArray
                }
                completeUrl = SHIP_PACKAGE(order.store.secondary_token, data);
                // goto line 172
            } else if (action == 'approve') {
                completeUrl = APPROVE_CANCELLATION(order.temp_id, order.store.secondary_token, data);
            } else if (action == 'approve_refund') {
                data = { decision: 'APPROVE_REFUND'}; // https://partner.tiktokshop.com/docv2/page/650ab6c2c16ffe02b8f2efcf?external_id=650ab6c2c16ffe02b8f2efcf
                completeUrl = APPROVE_REFUND(order.temp_id, order.store.secondary_token, data);
            } else if (action == 'reject_refund') {
                data = { decision: 'REJECT_REFUND', reject_reason: 'reverse_reject_request_reason_4'};
                completeUrl = REJECT_REFUND(order.temp_id, order.store.secondary_token, data);
            } else {
                console.log(`Unknown action: ${action}`);
            }
            if (!completeUrl) {
                return res.status(400).send({
                    error: 'Invalid action or missing data',
                    order: {
                        id: order.id,
                        origin_id: order.origin_id
                    }
                });
            }
            try {
                const tiktokResponse = await api.post(completeUrl, data, {
                    headers: {
                        'content-type': 'application/json',
                        'x-tts-access-token': decryptData(order.store.token)
                    }
                });
                statusCode = tiktokResponse.status;
                responseCode = tiktokResponse.data.code;
                responseData = tiktokResponse.data;
                if (action == 'approve_refund') {
                    await mPrisma.return_refund.update({
                        data: {
                            status: 'success'
                        },
                        where: {
                            id: order.return_refund.id 
                        }
                    });
                }
            } catch (err) {
                if (err.response) {
                    responseCode = err.response.data.code;
                    responseData = err.response.data;
                } else {
                    console.log(err);
                    responseCode = 500;
                    responseData = 'Internal Server Error';
                }
            }
            break;
        case SHOPEE:
            if (action == 'cancel') {
                const cancelPayload = {
                    order_sn: order.origin_id,
                    cancel_reason: req.body.cancel_reason,
                    ...(req.body.cancel_reason == 'OUT_OF_STOCK' && {
                        item_list: order.order_items.map((item) => {
                            return {
                                item_id: Number.parseInt(item.products.origin_id.split('-')[0]),
                                model_id: Number.parseInt(item.products.origin_id.split('-')[1])
                            }
                        })
                    })
                }
                try {
                    const cancelOrder = await api.post(
                        SHOPEE_CANCEL_ORDER(order.store.token, order.origin_id, order.store.origin_id, req.body.cancel_reason),
                        JSON.stringify(cancelPayload)).catch(async function (err) {
                        if ((err.status === 403) && (err.response.data.error === 'invalid_acceess_token')) {
                            console.log(`error status ${err.status} response ${err.response.data.error}`);
                            let newToken = await generateShopeeToken(order.store.origin_id, order.store.refresh_token);
                            if (newToken.access_token) {
                                return api.post(
                                    SHOPEE_CANCEL_ORDER(newToken.access_token, order.origin_id, order.store.origin_id, req.body.cancel_reason),
                                    JSON.stringify(cancelPayload)
                                );
                            }
                        } else {
                            console.log(err);
                            return res.status(400).send(err);
                        }
                    });
                    statusCode = cancelOrder.status;
                    responseCode = cancelOrder.statusCode;
                    responseData = cancelOrder.data;
                } catch (err) {
                    if (err.response) {
                        responseCode = err.response.statusCode;
                        responseData = err.response.data;
                    } else {
                        console.log(err);
                        responseCode = 500;
                        responseData = 'Internal Server Error';
                    }
                }
                /* if (cancelOrder.data.error) {
                    return res.status(400).send(cancelOrder.data);
                } */
                // res.status(200).send(cancelPayload);
            } else {
                //GET SHIP PARAMS
                try {

                    let accessToken = order.store.token;
                    const shipParams = await api.get(
                        GET_SHOPEE_SHIP_PARAMS(accessToken, order.origin_id, order.store.origin_id)).catch(async function (err) {
                        if ((err.status === 403) && (err.response.data.error === 'invalid_acceess_token')) {
                            console.log(`error status ${err.status} response ${err.response.data.error}`);
                            let newToken = await generateShopeeToken(order.store.origin_id, order.store.refresh_token);
                            if (newToken.access_token) {
                                accessToken = newToken.access_token;
                                return api.get(
                                    GET_SHOPEE_SHIP_PARAMS(newToken.access_token, order.origin_id, order.store.origin_id)
                                );
                            }
                        } else {
                            console.log(err);
                            return res.status(400).send(err);
                        }
                    });
                    if (shipParams.data.error) {
                        return res.status(400).send(shipParams.data);
                    }
                    // console.log(JSON.stringify(shipParams.data));
                    const shipmentPayload = {
                        order_sn: order.origin_id,
                        pickup: {
                            address_id: 0
                        }
                    };
                    const shipArrangement = await api.post(
                        SHOPEE_SHIP_ORDER(accessToken, order.store.origin_id),
                        JSON.stringify(shipmentPayload)).catch(async function(err) {
                            if ((err.status === 403) && (err.response.data.error === 'invalid_acceess_token')) {
                                console.log(`error status ${err.status} response ${err.response.data.error}`);
                                let newToken = await generateShopeeToken(order.store.origin_id, order.store.refresh_token);
                                if (newToken.access_token) {
                                    accessToken = newToken.access_token;
                                    return api.get(
                                        SHOPEE_SHIP_ORDER(accessToken, order.store.origin_id)
                                    );
                                }
                            } else {
                                console.log(err);
                                return res.status(400).send(err);
                            }
                    });
                    if (shipArrangement.data.error) {
                        return res.status(400).send({
                            parameter: shipParams.data,
                            arrangement: shipArrangement.data
                        });
                    }
                    statusCode = shipArrangement.status;
                    responseCode = shipArrangement.statusCode;
                    responseData = shipArrangement.data;
                } catch (err) {
                    if (err.response) {
                        responseCode = err.response.statusCode;
                        responseData = err.response.data;
                    } else {
                        console.log(err);
                        responseCode = 500;
                        responseData = 'Internal Server Error';
                    }
                }
            }
            break;
        case LAZADA:
            break;
        case BLIBLI:
            break;
        case TOKOPEDIA:
            break;
        default:
            break;
    }
    res.status(statusCode).send({
        order: {
            id: order.id, 
            code: responseCode,
            response: responseData,
            status: order.status,
            data: data
        }
    });
});

module.exports = router;