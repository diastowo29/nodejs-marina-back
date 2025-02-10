var express = require('express');
var router = express.Router();
var {
    PrismaClient
} = require('@prisma/client');

const prisma = new PrismaClient();
router.get('/', async function(req, res, next) {
    let crm = await Promise.all([
        prisma.zdconnector.findMany()
    ]);
    let crmObj = {
        ...(crm[0].length > 0) ? {zendesk:crm[0]} : {}
    }
    res.status(200).send(crmObj);
})

router.post('/', async function(req, res, next) {
    console.log(req);
    if (req.body.crm == 'zendesk') {
        try {
            let zdCrm = await prisma.zdconnector.create({
                data: {
                    host: req.body.host,
                    name: req.body.name,
                    suncoAppId: req.body.suncoAppId,
                    suncoAppKey: req.body.suncoAppKey,
                    suncoAppSecret: req.body.suncoAppSecret,
                    zdAPIToken: req.body.apiToken,
                    resource: req.body.resource
                }
            })
            res.status(200).send(zdCrm);
        } catch (err) {
            res.status(400).send({failed: err})
        }
    } else {   
        res.status(400).send({error: `crm: ${req.body.crm} not implemented yet`});
    }
})



router.get('/products', async function(req, res, next) {
    let channels = await prisma.store.findMany({
        include : { products: true }
    })
    res.status(200).send(channels);
})

module.exports = router;