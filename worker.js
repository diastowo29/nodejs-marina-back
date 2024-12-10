let throng = require('throng');
let workers = process.env.WEB_CONCURRENCY || 2;
let maxJobsPerWorker = 20;
let { workQueue, client, anotherWorkQueue, jobOpts } = require('./config/redis.config');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

function start() {
    console.log('start');
    workQueue.process(maxJobsPerWorker, async (job, done) => {
        console.log(job.data);
        processJob(job, done);
    });
}

async function processJob (jobData, done) {
    let body = jobData.data.body;
    switch (jobData.data.channel) {
        case 'lazada':
            try {
                let orders = await prisma.orders.upsert({
                    where: {
                        origin_id: body.data.trade_order_id
                    },
                    update: {
                        status: body.data.order_status
                    },
                    create: {
                        origin_id: body.data.trade_order_id,
                        status: body.data.order_status
                    }
                })
                anotherWorkQueue.add(body, jobOpts);
                console.log(orders);
            } catch (err) {
                console.log(err);
            }
            break;
        default:
            console.log('channel not supported', jobData.data.channel);
            break;
    }
}

throng({ workers, start });