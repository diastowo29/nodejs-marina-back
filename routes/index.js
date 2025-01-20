var express = require('express');
var router = express.Router();
var { PrismaClient } = require('@prisma/client');
// const { workQueue, client } = require('../config/redis.config');

/* GET home page. */
router.get('/', async function(req, res, next) {
  // const users = await prisma.channel.findMany({});
  // client.h
  // let lazClient = await client.hGetAll('lazClient');
  // res.status(200).send(lazClient);
  res.status(200).send({});
});

router.get('/laz', async function(req, res, next) {
  // await client.hSet('lazClient', {
  //   accToken: 'tokenab'
  // });
  res.status(200).send({});
})

router.get('/job', async function(req, res, next) {
  // router.get('/jobs', function(req, res, next) {
    // workQueue.getJobs(['paused', 'waiting', 'failed']).then(function(thisJob) {
    //   res.status(200).send(thisJob == null ? {} : thisJob)
    // })
  // })
  res.status(200).send({});
})

router.get('/job/retry',async function(req, res, next) {
  // await workQueue.getJobs(['failed']).then(function(thisJob) {
  //   thisJob.forEach(async (failedJob) => {
  //     console.log(failedJob.id);
  //     let job = await workQueue.getJob(failedJob.id);
  //     job.retry();
  //     // console.log(job);
  //   });
  // })
  res.status(200).send({});
})

module.exports = router;
