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

module.exports = router;