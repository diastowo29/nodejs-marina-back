const postgres = require('postgres');

function marinaPsql (username, password, database) {
    return postgres({
        host: process.env.DB_HOST || 'ep-twilight-haze-a5rc91p5-pooler.us-east-2.aws.neon.tech',
        username: process.env.DB_USER || username,
        password: process.env.DB_PASSWORD || password,
        database: database
    })
}

module.exports = {
    marinaPsql
}