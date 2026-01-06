const postgres = require('postgres');
function defaultDbUrl (database) {
    return `postgresql://${process.env.DB_USER}:${process.env.DB_PASSWORD}@localhost/${database}?host=/cloudsql/marina-apps:asia-southeast2:marina-db-sandbox`
}
function marinaPsql (username, password, database) {
    return postgres({
        host: process.env.DB_HOST_IP || 'ep-twilight-haze-a5rc91p5-pooler.us-east-2.aws.neon.tech',
        username: process.env.DB_USER || username,
        password: process.env.DB_PASSWORD || password,
        // port: 5432,
        database: database
    });
}

module.exports = {
    marinaPsql
}