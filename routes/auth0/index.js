var express = require('express');
var router = express.Router();
var {
    PrismaClient
} = require('@prisma/client');

const prisma = new PrismaClient();
/* GET home page. */
router.post('/hook', async function (req, res, next) {
    console.log(JSON.stringify(req.body));
    let client = await prisma.clients.create({
        data: {
            name : req.body.params.email,
            origin_id: req.body.params.id
        }
    });
    res.status(200).send(client);
});

module.exports = router;