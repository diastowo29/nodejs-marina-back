let throng = require('throng');
let workers = process.env.WEB_CONCURRENCY || 2;
let maxJobsPerWorker = 20;
let { anotherWorkQueue, client } = require('./config/redis.config');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

function start() {
    console.log('anotherWorker');
    anotherWorkQueue.process(maxJobsPerWorker, async (job, done) => {
        console.log(job.data);
        processJob(job, done);
    });
}

async function processJob (jobData, done) {
    console.log('anotherWorker');
    let body = jobData.data.body;
    console.log(body);
}

throng({ workers, start });