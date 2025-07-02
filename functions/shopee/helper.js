var crypto = require('crypto');
const { AUTH_ENDPOINT } = require('../../config/shopee_apis');

// let host = process.env.SHOPEE_API_HOST;
// let partnerId = process.env.SHOPEE_PARTNER_ID;
let partnerKey = process.env.SHOPEE_PARTNER_KEY;
// let redirectUrl = process.env.SHOPEE_REDIRECT_URL;
// let authEndpoint = AUTH_ENDPOINT;

function doSign (commonParams) {
    // let ts = new Date().getTime() / 1000;
    // let sign = `${partnerId}${endpoint}${Number.parseInt(ts)}`;
    let sign = commonParams;
    let hash = crypto.createHmac('sha256', partnerKey);
    hash.update(sign);
    let signature = hash.digest('hex');
    return signature;
}

// let sign = doSign(authEndpoint);
// console.log(sign);
// console.log(`${host}${authEndpoint}?partner_id=${partnerId}&redirect=${redirectUrl}&timestamp=${Number.parseInt(ts)}&sign=${sign}`);

module.exports = doSign;