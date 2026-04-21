let Queue = require('bull');
const { createClient } = require('redis');
let redisHost = process.env.REDIS_IP || '127.0.0.1';
let redisPort = process.env.REDIS_PORT || '6379';
var redisUrl = `redis://${redisHost}:${redisPort}`;
// console.log(redisUrl);
const setting = {
    settings: {
        maxStalledCount: 1
    }
}

/* let workQueue = new Queue('newSendMessage', {
    redis: {
        username: 'default',
        password: 'SUfflD6BtgLI875WO1JQKv972YD0csl3',
        host: 'redis-18018.c334.asia-southeast2-1.gce.redns.redis-cloud.com',
        port: 18018,
        tls: { rejectUnauthorized: false },
    }
}, {
    setting
}); */

let workQueue = new Queue('newSendMessage', redisUrl, setting);

let jobOpts = {
    removeOnComplete : true,
    removeOnFail: { 
      age: 86400 
    }
}

const redisClient = createClient({
    username: 'default',
    password: 'W33UuigvdjX9WIinrZDDwohs5D2xWyyY',
    socket: {
        host: 'redis-13095.crce289.asia-seast2-2.gcp.cloud.redislabs.com',
        port: 13095
    }
})
redisClient.on('error', err => console.log('Redis Client Error', err));

module.exports = {workQueue, jobOpts, redisClient}