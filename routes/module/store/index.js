var express = require('express');
var router = express.Router();
const { generateTokpedToken } = require('../../../functions/tokopedia/caller');
const checkJwt = require('../../../middleware/auth');
const jwt = require('jsonwebtoken');

// const prisma = new PrismaClient();
router.get('/', async function(req, res, next) {
    const mPrisma = req.prisma;
    let store = await mPrisma.store.findMany({
        include: {
            channel: true
        }
    })
    res.status(200).send(store);
})

// router.get('/jwt', checkJwt, function(req, res, next) {
//     console.log(req.headers.authorization);
//     console.log(req.auth.header)
//     res.status(200).send({});
// })

/* router.get('/generate_jwt', function(req, res, next) {
    const token = jwt.sign({
        time: Date(),
        userId: 12,
    }, process.env.MARINA_SECRETZ);
    res.status(200).send({token: token});
}) */

router.get('/jwts', checkJwt, function(req, res, next) {
    console.log(req.auth);
    // console.log(req.headers.authorization);
    // console.log(req.auth.header)
    // try {
    //     // const token = req.header(tokenHeaderKey);
    //     const token = req.headers.authorization.split(' ')[1];
    //     const verified = jwt.verify(token, 'test123');
    //     if (verified) {
    //         return res.send("Successfully Verified");
    //     } else {
    //         // Access Denied
    //         return res.status(401).send(error);
    //     }
    // } catch (error) {
    //     // Access Denied
    //     return res.status(400).send(error);
    // }

    res.status(200).send({});
})

router.get('/:id', async function(req, res, next) {
    const prisma = req.prisma;
    let store = await prisma.store.findUnique({
        where: {
            id: Number.parseInt(req.params.id)
        },
        include: {
            channel: true
        }
    })
    res.status(200).send(store);
})

router.get('/connect/test', async function(req, res, next) {
    /* api.get(TOKO_SHOPINFO(18242), {headers: {Authorization: 'Bearer test123'}}).then(function(result) {
        res.status(200).send(result.data)
    }).catch(function(err) {
        console.log(err)
        res.status(500).send(err.response.data);
    }); */
})

router.post('/connect/toko', async function(req, res, next) {
    const prisma = req.prisma;
    let storeId = req.body.store_id;
    try {
        let tokoToken = await generateTokpedToken();
        if (tokoToken.data.error) {
            return res.status(400).send(tokoToken.data);
        }
        /* --GA BUTUH KYKNYA-- */
        /* let tokoInfo = await axios({
            method: 'GET',
            url: TOKO_SHOPINFO(18242),
            headers: {
                'Authorization': `Bearer ${tokoToken.data.access_token}`
            }
        }); */
        let storeUpdate = await prisma.store.update({
            where: {
                origin_id: storeId
            },
            data: {
                token: tokoToken.data.access_token
            }
        })
        res.status(200).send({store: storeUpdate});
    } catch (err) {
        console.log(err)
        console.log(err.response.data);
        res.status(500).send(err.response.data);
    }

})

router.post('/', async function(req, res, next) {
    const prisma = req.prisma;
    let channel = req.body.channel;
    // console.log(req.body)
    let storeCreate = await prisma.store.create({
        data: {
            channel: {
                connect: {
                    name: channel
                }
            },
            name: req.body.channel_name,
            url: req.body.channel_url
        }
    });

    res.status(200).send({});
})

router.get('/:id/products', async function(req, res, next) {
    const prisma = req.prisma;
    let products = await prisma.products.findMany({
        where: {
            storeId: Number.parseInt(req.params.id)
        },
        include: {
            product_img: true
        }
    })
    res.status(200).send(products);
})

router.get('/:id/orders', async function(req, res, next) {
    const prisma = req.prisma;
    let orders = await prisma.orders.findMany({
        where: {
            storeId: Number.parseInt(req.params.id)
        },
        include: {
            order_items: true,
            store: {
                select: {
                    id: true,
                    name: true,
                    status: true
                }
            }
        }
    })
    res.status(200).send(orders);
})

router.get('/products', async function(req, res, next) {
    const prisma = req.prisma;
    let channels = await prisma.store.findMany({
        include : {
            products: true
        }
    })
    res.status(200).send(channels);
})

module.exports = router;