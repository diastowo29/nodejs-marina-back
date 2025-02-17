var express = require('express');
var router = express.Router();
const { workQueue, jobOpts } = require('../config/redis.config');
const { addTask } = require('../functions/queue/task');

/* GET home page. */
router.get('/', async function(req, res, next) {
  res.status(200).send({});
});

router.get('/job_test', async function(req, res, next) {
  let jobTest = await workQueue.add({
    channel: 'test channel'
  }, jobOpts);
  res.status(200).send(jobTest);
})

router.get('/task_test', async function(req, res, next) {
  try {
    let taskQue = await addTask({channel: 'test channel'});
    res.status(200).send(taskQue);
  } catch (err) {
    console.log(err);
    res.status(400).send({error: err});
  }
})

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
