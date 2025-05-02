var express = require('express');
var router = express.Router();
var {
    PrismaClient
} = require('@prisma/client');
const prisma = new PrismaClient();

router.get('/', async function(req, res, next) {
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
            ...(req.query.store || req.query.s) ? {
                store: {
                    origin_id: req.query.store || req.query.s
                }
            } : {},
            /* store : {
                channel: {
                    name : req.query.channel || req.query.c
                }
            }, */
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
    if (!req.params.id) {
        return res.status(400).send({
            error: 'id is required'
        })
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
    res.status(200).send(order);
})

module.exports = router;