var express = require('express');
var router = express.Router();
var { PrismaClient } = require('@prisma/client');
const workQueue = require('../../config/redis.config');

let jobOpts = {
    removeOnComplete : true,
    removeOnFail: { 
      age: 86400 
    }
}

const prisma = new PrismaClient();
/* GET home page. */
router.get('/webhook', async function(req, res, next) {
    console.log(job);
    res.status(200).send({});
});

router.post('/webhook', async function(req, res, next) {
    console.log(req);
    res.status(200).send({});
});

module.exports = router;
