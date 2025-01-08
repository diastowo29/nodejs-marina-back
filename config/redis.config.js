let Queue = require('bull');
var REDIS_URL = 'redis://127.0.0.1:6379'
let redisClient = require('redis');
let client = redisClient.createClient();
client.connect();

const setting = {
    settings: {
        maxStalledCount: 3
    }
}
/* let workQueue = new Queue('newSendMessage', {
    redis: {
        password: REDIS_URL.split('@')[0].split(':')[2],
        host: REDIS_URL.split('@')[1].split(':')[0],
        port: parseInt(REDIS_URL.split('@')[1].split(':')[1]),
        tls: { rejectUnauthorized: false },
    }
}, {
    settings: {
        maxStalledCount: 2
    }
}); */

let workQueue = new Queue('newSendMessage', REDIS_URL, setting);
let anotherWorkQueue = new Queue('getOrderDetail', REDIS_URL, setting);

let jobOpts = {
    removeOnComplete : true,
    removeOnFail: { 
      age: 86400 
    }
}

module.exports = {workQueue, jobOpts, client, anotherWorkQueue}