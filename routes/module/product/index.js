var express = require('express');
var router = express.Router();
const { PrismaClient } = require('../../../prisma/generated/client');
const { TIKTOK } = require('../../../config/utils');
let mPrisma = new PrismaClient();

router.get('/', async function(req, res, next) {
    let channel = req.query.c;
    mPrisma = req.prisma;
    let products = await mPrisma.products.findMany({
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

router.get('/sku/:id', async function(req, res, next) {
    const sku = req.params.id;
    if (!sku) {
        res.status(400).send({message: 'parameter is missing'});
    }
    mPrisma = req.prisma;
    mPrisma.products.findFirst({
        where: {
            sku: sku
        },
        select: {
            origin_id: true,
            store: {
                select: {
                    channel: {
                        select: {
                            name: true
                        }
                    }
                }
            }
        }
    }).then((product) => {
        let productId = (product.store.channel.name == TIKTOK) ? product.origin_id.split('-')[0] : product.origin_id;
        res.status(200).send({id: productId});
    }).catch((err) => {
        res.status(500).send({error: err});
    })
})

router.get('/find', async function(req, res, next) {
    // return 400 if there is no valid params
    if (!req.query.skuname && !req.query.store_id && !req.query.m_store_id) {
        return res.status(400).send({
            error: 'Invalid parameters'
        });
    }
    let queryName = req.query.skuname;
    let storeId = req.query.store_id;
    let mStoreId = Number.parseInt(req.query.m_store_id);
    mPrisma = req.prisma;
    try {
        let products = await mPrisma.products.findMany({
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