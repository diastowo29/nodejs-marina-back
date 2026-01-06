var express = require('express');
const { google } = require('googleapis');
const { ManagementClient, AuthenticationClient, TOKEN_FOR_CONNECTION_GRANT_TYPE, ManagementApiError, PostCustomDomains201ResponseTypeEnum, GetBrandingPhoneProviders200ResponseProvidersInnerChannelEnum } = require('auth0');
const {PrismaClient: prismaBaseClient} = require('../../prisma/generated/baseClient');
const { encryptData, decryptData } = require('../../functions/encryption');
const basePrisma = new prismaBaseClient();
const { marinaPsql } = require('../../config/db');

var router = express.Router();
const aoDomainConfig = JSON.parse(decryptData(process.env.A0_DOMAIN_CONFIG))

router.get('/', function(req, res) {
    res.status(200).send(aoDomainConfig)
})

router.post('/schema', async function(req, res, next) {
    // console.log(req.headers)
    if (!req.body.org_id || !req.body.company_name) {
        return res.status(400).send({message: 'org_id or company_name is missing'});
    }
    const orgId = req.body.org_id;
    const companyName = req.body.company_name.toLowerCase().split(' ').join('_');
    marinaPsql(orgId, encryptData(companyName), companyName).file('marina_create.sql').then((db) => {
        res.status(200).send({message: 'success'});
    }).catch((err) => {
        console.log(err);
        res.status(500).send({message: 'Failed to generate schema'});
    })/* .finally(() => {
    }) */
})

router.post('/hook', async function (req, res, next) {
    // console.log(req.headers)
    let authenticationClientOptions = {
        domain: aoDomainConfig.A0_TENANT_DOMAIN,
        clientId: aoDomainConfig.A0_CLIENT_ID,
        clientSecret: aoDomainConfig.A0_CLIENT_SECRET,
        timeoutDuration: 10000,
    };
    if (aoDomainConfig.AUDIENCE) {
        authenticationClientOptions.audience = aoDomainConfig.AUDIENCE;
    }
    if (!req.body.org_id || !req.body.company_name) {
        return res.status(400).send({message: 'org_id or company_name is missing'});
    }
    const company = req.body.company_name.toLowerCase().split(' ').join('_');
    const orgId = req.body.org_id;
    try {
        let sqlAdmin = google.sqladmin('v1beta4')
        authorizeGcp(async client => {
            var request = {
                project: 'marina-apps',
                instance: 'marina-db-sandbox',
                resource: {
                    name: company
                },
                auth: client,
            };
    
            /* ==== feature update ==== */
            /* const sqlInstances = await Promise.all([
                sqlAdmin.databases.insert(request),
                sqlAdmin.users.insert(request)
            ]) */
    
            sqlAdmin.databases.insert(request, async function(err, response) {
                if (err) {
                    console.error(err);
                    return;
                }
                // console.log(JSON.stringify(response, null, 2));
                console.log(`SQL Creation: ${response.config.data.name} status: ${response.data.status}`);
                await basePrisma.clients.create({
                    data: {
                        org_id: company,
                        db_user: orgId,
                        db_pass: encryptData(orgId)
                    }
                })
                res.status(200).send({});
            });
        })
    } catch (err) {
        console.log(err);
        res.status(500).send({message: 'Failed to create database'});
    }
});

router.post('/registration', async function(req, res, next) {
    // console.log(req.body)
    /* let authenticationClientOptions = {
        domain: process.env.A0_TENANT_DOMAIN,
        clientId: process.env.A0_CLIENT_ID,
        clientSecret: process.env.A0_CLIENT_SECRET,
        timeoutDuration: 10000,
    };

    if (process.env.AUDIENCE) {
        authenticationClientOptions.audience = process.env.AUDIENCE;
    }
    try {
        const management = await getManagementApiClient(authenticationClientOptions);
        const newOrg = await management.organizations.create({
            name: `trial-${Date.now()}`
        })
        console.log(newOrg.data);
        const newMember = await management.organizations.addMembers({
            id: newOrg.data.id
        },{
            members: [req.body.params.id]
        })
        console.log(newMember.data);
        res.status(200).send({org_member: newMember.data})
    } catch (err) {
        console.log(err);
        res.status(400).send({message: err.message || 'Registration failed'})
    } */
   res.status(200).send({})
})

router.post('/pre-registration', async function(req, res, next) {
    // console.log(req.body)
    let authenticationClientOptions = {
        domain: aoDomainConfig.A0_TENANT_DOMAIN,
        clientId: aoDomainConfig.A0_CLIENT_ID,
        clientSecret: aoDomainConfig.A0_CLIENT_SECRET,
        timeoutDuration: 10000,
    };
    if (aoDomainConfig.AUDIENCE) {
        authenticationClientOptions.audience = aoDomainConfig.AUDIENCE;
    }
    try {
        const management = await getManagementApiClient(authenticationClientOptions);
        const createOrg = await management.organizations.create({
            name: `trial-${Date.now()}`,
            enabled_connections: [{
                connection_id: req.body.user.connection_id,
                assign_membership_on_login: true,
                is_signup_enabled: true
            }]
        })
        res.status(200).send({org: createOrg.data})
    } catch (err) {
        console.log(err);
        res.status(400).send({message: err.message || 'Registration failed'})
    }
    // res.status(200).send({})
})

async function getAccessToken(options) {
    /* let key = `access_token_${options.clientId}`;
    if (options.audience) {
        key += `_${options.audience}`;
    }

    const record = cache.get(key);
    if (record && record.expires_at > Date.now()) {
        return record.value;
    } */
    console.log(options);
    const authClient = new AuthenticationClient(options);
    // console.log(options);
    const {
        data: { access_token, expires_in },
    } = await authClient.oauth.clientCredentialsGrant({
        audience: options.audience ?? `${options.domain}/api/v2/`,
    });
    // console.log(access_token);

    // Try to cache it
    /* const cacheSetResult = cache.set(key, access_token, { ttl: expires_in });
    if (cacheSetResult.type === 'error') {
        console.error(`Failed to set ${key}: ${cacheSetResult.code}`);
    } */

    return access_token;
}

async function getManagementApiClient(options) {
    const token = await getAccessToken(options);
    return new ManagementClient({
        domain: options.domain,
        token: token,
        httpTimeout: 10000,
    });
}

function authorizeGcp (callback) {
    google.auth.getClient({
        scopes: ['https://www.googleapis.com/auth/cloud-platform']
    }).then(client => {
        callback(client);
    }).catch(err => {
        console.error('authentication failed: ', err);
    });
}

module.exports = router;