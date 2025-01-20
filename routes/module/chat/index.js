var express = require('express');
var router = express.Router();
var {
    PrismaClient
} = require('@prisma/client');

const prisma = new PrismaClient();

router.get('/', async function(req, res, next) {
    let chat = await prisma.omnichat.findMany({
        include: {
            omnichat_user: true,
            store: {
                include: {
                    channel: true
                }
            }
        }
    });
    res.status(200).send(chat);
});

module.exports = router;