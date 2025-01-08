function gcpParser (message) {
    return JSON.parse(Buffer.from(message, 'base64').toString('utf8'));
}

module.exports = { gcpParser }