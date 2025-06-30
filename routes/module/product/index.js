var express = require('express');
var router = express.Router();
var {
    PrismaClient
} = require('@prisma/client');

const prisma = new PrismaClient();

router.get('/', async function(req, res, next) {
    let channel = req.query.c;
    let products = await prisma.products.findMany({
        include: {
            product_img: true,
            store: {
                select: {
                    id: true,
                    origin_id: true,
                    name: true,
                    status: true,
                    channel: true
                }
            
            }
        },
        ...(channel && {
            where: {
                store: {
                    channel :{
                        name: channel
                    }
                }
            }
        })
    });
    res.status(200).send(products);
});

router.get('/find', async function(req, res, next) {
    let queryName = req.query.skuname;
    let storeId = req.query.store_id;
    let mStoreId = Number.parseInt(req.query.m_store_id);
    // console.log(storeId);
    console.log(req.query)
    try {
        let products = await prisma.products.findMany({
            where: {
                ...(queryName && {
                    OR: [{
                        name: {
                            contains: queryName,
                            mode: 'insensitive'
                        }
                    },{
                        sku: {
                            contains: queryName,
                            mode: 'insensitive'
                        }
                    }]
                }),
                ...(storeId && {
                    store: {
                        origin_id: storeId.toString()
                    }
                }),
                ...(mStoreId && {
                    store: {
                        id: mStoreId
                    }
                }),
                ...(!queryName && {
                    ...(storeId && {
                        store: {
                            origin_id: storeId.toString()
                        }
                    }),
                    ...(mStoreId && {
                        store: {
                            id: mStoreId
                        }
                    })
                })
            },
            include: {
                product_img: true,
                store: {
                    select: {
                        id: true,
                        origin_id: true
                    }
                }
            }
        });
        res.status(200).send({
            query: queryName,
            result: products
        });
    } catch (err) {
        res.status(500).send({
            error: 'Internal server error', message: err.message
        });
    }
})

module.exports = router;