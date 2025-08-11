var express = require('express');
var router = express.Router();
const { SUN_APP_ID, SUN_APP_KEY, SUN_APP_SECRET, ZD_API_TOKEN } = require('../../../config/utils');
const { getPrismaClient } = require('../../../services/prismaServices');
const { encryptData } = require('../../../functions/encryption');
const { api } = require('../../../functions/axios/interceptor');

// const prisma = new PrismaClient();
router.get('/', async function(req, res, next) {
    const prisma = getPrismaClient(req.tenantDB);
    try {
        let integration = await prisma.integration.findMany({
            include: {
                credent: true
            }
        });
        res.status(200).send(integration);
    } catch (err) {
        res.status(500).send({
            status: 500,
            message: 'Internal Server Error',
            error: err.message
        });
    }
})

router.delete('/:id', async function(req, res, next) {
    const prisma = getPrismaClient(req.tenantDB);
    try {
        let credent = prisma.credent.deleteMany({
            where: {
                integrationId: parseInt(req.params.id)
            }
        })
        let integration = prisma.integration.delete({
            where: {
                id: parseInt(req.params.id)
            }
        });
        const deletedIntegration = await prisma.$transaction([credent, integration]);
        console.log(deletedIntegration)
        res.status(200).send({success: true, delteted: deletedIntegration});
    } catch (err) {
        console.log(err);
        res.status(400).send({failed: err});
    }
})

router.post('/', async function(req, res, next) {
    const prisma = getPrismaClient(req.tenantDB);
    // console.log(req);
    if (req.body.crm == 'zendesk') {
        try {
            const zdConfig = await Promise.all([
                api(zdApiConfig(req.body.host, req.body.apiToken, 'MM_USER_ID')),
                api(zdApiConfig(req.body.host, req.body.apiToken, 'MM_MSG_ID')),
                api(zdApiConfig(req.body.host, req.body.apiToken, 'MM_SHOP_ID')),
                api(zdApiConfig(req.body.host, req.body.apiToken, 'MM_CHANNEL'))
            ]);
            const integration = await prisma.integration.create({
                data: {
                    baseUrl: req.body.host,
                    name: req.body.name,
                    notes: `${zdConfig[0].data.ticket_field.id}-${zdConfig[1].data.ticket_field.id}-${zdConfig[2].data.ticket_field.id}-${zdConfig[3].data.ticket_field.id}`,
                    f_chat: req.body.resource.include('chat'),
                    f_review: req.body.resource.include('review'),
                    f_rr: req.body.resource.include('return') || reqreq.body.resource.include('refund'),
                    f_cancel: req.body.resource.include('cancel'),
                    clients: {
                        connectOrCreate: {
                            where: {
                                origin_id: req.auth.payload.org_id
                            },
                            create: {
                                name: req.auth.payload.org_id,
                                origin_id: req.auth.payload.org_id
                            }
                        }
                    },
                    credent: {
                        createMany: {
                            data: [
                                {key: SUN_APP_ID, value: req.body.suncoAppId},
                                {key: SUN_APP_KEY, value: encryptData(req.body.suncoAppKey)},
                                {key: SUN_APP_SECRET, value: encryptData(req.body.suncoAppSecret)},
                                {key: ZD_API_TOKEN, value: encryptData(req.body.apiToken)}
                            ]
                        }
                    }
                }
            });
            res.status(200).send({
                crm: {
                    id: integration.id,
                    name: integration.name
                }
            });
        } catch (err) {
            console.log(err)
            res.status(400).send({failed: err});
        }
    } else {   
        res.status(400).send({error: `crm: ${req.body.crm} not implemented yet`});
    }
})

function zdApiConfig (host, token, tFieldsTitle) {
    return {
        method: 'POST',
        url: `${host}/api/v2/ticket_fields.json`,
        headers: {
            'Authorization': `Basic ${token}`
        },
        data: JSON.stringify({
            ticket_field: {
                type: "text",
                title: tFieldsTitle
            }
        })
    }
}

router.get('/products', async function(req, res, next) {
    const mPrisma = getPrismaClient(req.tenantDB);
    let channels = await mPrisma.store.findMany({
        include : { products: true }
    })
    res.status(200).send(channels);
})

module.exports = router;