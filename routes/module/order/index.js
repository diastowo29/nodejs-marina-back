var express = require('express');
var router = express.Router();
var {
    PrismaClient
} = require('@prisma/client');
// const { workQueue, jobOpts } = require('../../config/redis.config');
// const { LAZADA, LAZADA_CHAT, lazGetOrderItems, lazGenToken, lazadaAuthHost, lazGetSellerInfo, lazadaHost } = require('../../config/utils');
// const { lazParamz, lazCall } = require('../../functions/lazada/caller');

let test = require('dotenv').config()

const prisma = new PrismaClient();
/* GET home page. */

router.get('/', async function(req, res, next) {
    // console.log(req.query)
    // if (req.query.channel) {
    //     console.log(req.query.channel);
    // }
    let order = await prisma.orders.findMany({
        orderBy: [
            { updatedAt: 'desc' }
        ],
        where: {
            ...(req.query.channel || req.query.c) ? {
                store : {
                    channel: { name : req.query.channel || req.query.c }
                }
            } : {},
            ...(req.query.user || req.query.u) ? {
                customers: {
                    origin_id: req.query.user || req.query.u
                }
            } : {},
            store : {
                channel: {
                    name : req.query.channel || req.query.c
                }
            },
            order_items: {
                some: {}
            },
            logistic: {
                isNot: null
            }
        },
       include: {
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
            include: {
                channel: true
            }
        },
        logistic: true
       },
       ...(req.query.user || req.query.u) ? { take: 3, orderBy: { createdAt:'desc' } } : {orderBy: { createdAt:'desc' }}
    })
    res.status(200).send(order);
})

router.get('/:id', async function(req, res, next) {
    if (req.params.id) {
        console.log(req.params.id);
    }
    
    let order = await prisma.orders.findUnique({
        where: {
            id: Number.parseInt(req.params.id)
        },
       include: {
        order_items: {
            include: {
                products: true
            }
        },
        store: {
            include: {
                channel: true
            }
        },
        logistic: true
       }
    });
    res.status(200).send(order);
})

module.exports = router;