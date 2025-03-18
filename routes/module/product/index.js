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
                include: {
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
    let storeId = Number.parseInt(req.query.storeId);
    let products = await prisma.products.findMany({
        where: {
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
            }],
            AND:[
                {
                    storeId: storeId
                }
            ]
        },
        include: {
            product_img: true
        }
    });
    res.status(200).send({
        query: queryName,
        result: products
    });
})

module.exports = router;