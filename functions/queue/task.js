const {v2beta3} = require('@google-cloud/tasks');
const { workQueue, jobOpts } = require('../../config/redis.config');
const client = new v2beta3.CloudTasksClient();
let project = process.env.GCP_PROJECT_ID;
let queue = process.env.GCP_QUEUE;
let location = process.env.GCP_LOCATION;
let url = process.env.GCP_WORKER_URL;

async function addTask (payload) {
    const queuePath = client.queuePath(project, location, queue);
    const task = {
        httpRequest: {
            httpMethod: 'POST',
            url,
            body: Buffer.from(JSON.stringify(payload)).toString('base64'),
            headers: { 'Content-Type': 'application/json' },
        }
    };
    return client.createTask({ parent: queuePath, task });
}

function pushTask (env, payload) {
    if (env == 'development') {
        console.log('job added')
        workQueue.add(payload, jobOpts);
    } else {
        addTask(payload);
    }
}

module.exports = {
    addTask,
    pushTask
}
