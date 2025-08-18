let Queue = require('bull');
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
let anotherWorkQueue = new Queue('getOrderDetail', redisUrl, setting);

let jobOpts = {
    removeOnComplete : true,
    removeOnFail: { 
      age: 86400 
    }
}

module.exports = {workQueue, jobOpts, anotherWorkQueue}