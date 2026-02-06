const postgres = require('postgres');
const { decryptData } = require('../functions/encryption');

function marinaPsql (username, password, database) {
    const dbConfig = JSON.parse(decryptData(process.env.DB_CONFIG));
    return postgres({
        host: dbConfig.DB_HOST_IP || 'ep-twilight-haze-a5rc91p5-pooler.us-east-2.aws.neon.tech',
        username: dbConfig.DB_USER || username,
        password: dbConfig.DB_PASSWORD || password,
        database: database
    });
}

module.exports = {
    marinaPsql
}