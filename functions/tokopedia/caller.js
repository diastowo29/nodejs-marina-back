const { TOKO_GETTOKEN } = require("../../config/toko_apis");
let tokoClientId = process.env.TOKO_CLIENT_ID;
let tokoClientSecret = process.env.TOKO_CLIENT_SECRET;
let authToken = Buffer.from(`${tokoClientId}:${tokoClientSecret}`).toString('base64');
const axios = require('axios');

async function generateTokpedToken () {
    let tokoToken = await axios({
        method: 'POST',
        url: TOKO_GETTOKEN,
        headers: {
            'Authorization': `Basic ${authToken}`
        }
    });
    return tokoToken.data;
}

module.exports = {
    generateTokpedToken
}