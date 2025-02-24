var express = require('express');
var router = express.Router();
var {
    PrismaClient
} = require('@prisma/client');
const { generateTokpedToken } = require('../../../functions/tokopedia/caller');
const { TOKO_SHOPINFO } = require('../../../config/toko_apis');
const { api } = require('../../../functions/axios/Axioser');

const prisma = new PrismaClient();
router.get('/', async function(req, res, next) {
    let store = await prisma.store.findMany({
        include: {
            channel: true
        }
    })
    res.status(200).send(store);
})

router.get('/connect/test', async function(req, res, next) {
    api.get(TOKO_SHOPINFO(18242), {headers: {Authorization: 'Bearer test123'}}).then(function(result) {
        res.status(200).send(result.data)
    }).catch(function(err) {
        console.log(err)
        res.status(500).send(err.response.data);
    });
})

router.post('/connect/toko', async function(req, res, next) {
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
    let channel = req.body.channel;
    console.log(req.body)
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

router.get('/products', async function(req, res, next) {
    let channels = await prisma.store.findMany({
        include : {
            products: true
        }
    })
    res.status(200).send(channels);
})

module.exports = router;