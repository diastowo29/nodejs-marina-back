var express = require('express');
const { google } = require('googleapis');
const { ManagementClient, AuthenticationClient, TOKEN_FOR_CONNECTION_GRANT_TYPE, ManagementApiError, PostCustomDomains201ResponseTypeEnum, GetBrandingPhoneProviders200ResponseProvidersInnerChannelEnum } = require('auth0');
const jwt = require('jsonwebtoken');
const {PrismaClient: prismaBaseClient} = require('../../prisma/generated/baseClient');
const { encryptData, decryptData } = require('../../functions/encryption');
const basePrisma = new prismaBaseClient();
const { marinaPsql } = require('../../config/db');
const { redisClient } = require('../../config/redis.config');

var router = express.Router();
const aoDomainConfig = JSON.parse(decryptData(process.env.A0_DOMAIN_CONFIG))

router.get('/', function(req, res) {
    res.status(200).send(aoDomainConfig)
})

router.post('/token', async function(req, res, next) {
    const authHeader = req.headers.authorization;
    // const clientId = req.body.clientId || req.headers['m-client-id'];
    const payload = req.body.payload || {};
    const expiresIn = req.body.expiresIn || process.env.JWT_EXPIRES_IN || '1h';

    if (!authHeader || !authHeader.startsWith('Basic ')) {
        return res.status(401).send({ message: 'Basic authentication is required' });
    }

    // if (!clientId) {
    //     return res.status(401).send({ message: 'Client ID is required' });
    // }

    // Decode Basic auth credentials
    const base64Credentials = authHeader.split(' ')[1];
    let credentials;
    try {
        credentials = Buffer.from(base64Credentials, 'base64').toString('ascii');
    } catch (err) {
        return res.status(401).send({ message: 'Invalid Basic authentication' });
    }

    const [clientId, clientSecret] = credentials.split(':');
    if (!clientId || !clientSecret) {
        return res.status(401).send({ message: 'Invalid Basic authentication credentials' });
    }
    // const expectedSecret = apiSecrets && apiSecrets[clientId] ? apiSecrets[clientId] : process.env.API_SHARED_SECRET;
    const expectedSecret = await redisClient.get(`iframe:${clientId}`);
    console.log(expectedSecret)
    if (!expectedSecret || clientSecret !== expectedSecret) {
        return res.status(401).send({ message: 'Invalid API key or secret' });
    }

    if (!process.env.MARINA_SECRETZ) {
        return res.status(500).send({ message: 'Server is not configured to generate JWT tokens' });
    }

    try {
        const token = jwt.sign(payload, process.env.MARINA_SECRETZ, {
            expiresIn,
            audience: clientId,
            issuer: process.env.JWT_ISSUER || 'marina'
        });
        
        res.status(200).send({ token });
    } catch (err) {
        console.log(err);
        res.status(500).send({ message: 'Failed to generate JWT token' });
    }
});

/* router.get('/token', async function(req, res, next) {
    const payload = {
        iss: 'CLIENT_ID_123',      // The Client ID you gave them
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + (60 * 5) // Valid for only 5 minutes
    };

    const token = jwt.sign(payload, 'YOUR_PROVIDED_API_KEYS', { algorithm: 'HS256' });
    res.status(200).send({ token });
}) */

router.post('/schema', async function(req, res, next) {
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
                        org_id: Buffer.from(`${orgId}:${company}`, 'ascii').toString('base64'),
                        db_user: orgId,
                        db_pass: encryptData(`${orgId}:${company}`)
                    }
                })
                await redisClient.set(`${orgId}:${company}`, encryptData(`${orgId}:${company}`));
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