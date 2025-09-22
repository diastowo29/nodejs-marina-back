var express = require('express');
var router = express.Router();
const { SUN_APP_ID, SUN_APP_KEY, SUN_APP_SECRET, ZD_API_TOKEN } = require('../../../config/utils');
const { getPrismaClient } = require('../../../services/prismaServices');
const { encryptData } = require('../../../functions/encryption');
const { default: axios } = require('axios');

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
    /* DELETE TICKET FIELDS AND SUNCO WEBHOOK */
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
        let deleteExtId = prisma.omnichat.updateMany({
            where: {
                AND: [{ externalId: { not: null }},
                    { externalId: { not: ''}}]
            },
            data: {
                externalId: null
            }
        })
        prisma.$transaction([credent, integration, deleteExtId]).then((trx) => {
            res.status(200).send({success: true, deleted: trx});
        }).catch((err) => {
            console.log(err);
            res.status(500).send({error: err})
        })
        // console.log(deletedIntegration)
    } catch (err) {
        console.log(err);
        res.status(400).send({failed: err});
    }
})

router.post('/', async function(req, res, next) {
    const prisma = getPrismaClient(req.tenantDB);
    const stores = await prisma.store.findMany({
        select: {
            name: true,
            origin_id: true
        }
    });
    let storeOptions = stores.map(store => ({
        name: store.name,
        value: store.origin_id
    }));
    if (req.body.crm == 'zendesk') {
        try {
            const zdConfig = await Promise.all([
                axios(zdApiConfig(req.body.host, req.body.apiToken, 'Marina User ID')),
                axios(zdApiConfig(req.body.host, req.body.apiToken, 'Marina Message ID')),
                axios(zdApiConfig(req.body.host, req.body.apiToken, 'Marina Store ID')),
                axios(zdApiConfig(req.body.host, req.body.apiToken, 'Marina Channel')),
                axios(zdApiConfigTagger(req.body.host, req.body.apiToken, 'MM_SHOP', storeOptions)),
                axios(suncoApiConfig(req.body.suncoAppId, btoa(`${req.body.suncoAppKey}:${req.body.suncoAppSecret}`)))
            ]);
            const integration = await prisma.integration.create({
                data: {
                    baseUrl: req.body.host,
                    name: req.body.name,
                    notes: `${zdConfig[0].data.ticket_field.id}-${zdConfig[1].data.ticket_field.id}-${zdConfig[2].data.ticket_field.id}-${zdConfig[3].data.ticket_field.id}-${zdConfig[4].data.ticket_field.id}`,
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
            if (err.response) {
                console.log((err.response));
                console.log(JSON.stringify(err.response.data));
                res.status(400).send({failed: err.response.data});
            } else {
                console.log(err);
                res.status(500).send({failed: err});
            }
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
        data: {
            ticket_field: {
                type: "text",
                title: tFieldsTitle
            }
        }
    }
}

function zdApiConfigTagger (host, token, tFieldsTitle, options) {
    return {
        method: 'POST',
        url: `${host}/api/v2/ticket_fields.json`,
        headers: {
            'Authorization': `Basic ${token}`
        },
        data: {
            ticket_field: {
                type: "tagger",
                title: tFieldsTitle,
                custom_field_options: options
            }
        }
    }
}

function suncoApiConfig (appId, token) {
    const backend = process.env.BACKEND_HOST || '55df5b89d466.ngrok-free.app';
    return {
        method: 'POST',
        url: `https://api.smooch.io/v2/apps/${appId}/integrations`,
        headers: { 'Authorization': `Basic ${token}` },
        data: {
            displayName: 'Marina Webhook',
            type: "custom",
            status: "active",
            webhooks: [{
                target: `https://${backend}/api/v1/chats/sunco/event`,
                triggers: [
                    "conversation:message"
                ],
                version: "v2",
                includeFullUser: false,
                includeFullSource: true
            }]
        }
    }
}

/* router.get('/products', async function(req, res, next) {
    const mPrisma = getPrismaClient(req.tenantDB);
    let channels = await mPrisma.store.findMany({
        include : { products: true }
    })
    res.status(200).send(channels);
})
 */
module.exports = router;