const { randomUUID } = require("crypto");
var CryptoJS = require("crypto-js");
const { decryptData } = require("../functions/encryption");
const HOST = 'https://auth.tiktok-shops.com';
const OPEN_HOST = 'https://open-api.tiktokglobalshop.com';
const excludeKeys = ["access_token", "sign"]

const tiktokConfig = JSON.parse(decryptData(process.env.TIKTOK_CONFIG));
const APP_KEY = tiktokConfig.TIKTOK_APP_KEY;
const APP_SECRET = tiktokConfig.TIKTOK_APP_SECRET;
const apiVersion = '202309';

function GET_TOKEN_API (authCode) {
    const endpoint = `/api/v2/token/get`;
    return `${HOST}${endpoint}?app_key=${APP_KEY}&app_secret=${APP_SECRET}&auth_code=${authCode}&grant_type=authorized_code`;
}

function GET_REFRESH_TOKEN_API (refreshToken) {
    const endpoint = `/api/v2/token/refresh`;
    return `${HOST}${endpoint}?app_key=${APP_KEY}&app_secret=${APP_SECRET}&refresh_token=${refreshToken}&grant_type=refresh_token`;
}

function GET_ORDER_API (orderId, cipher) {
    const endpoint = `/order/${apiVersion}/orders`;
    const ts = Math.floor(Date.now()/1000);
    const params = {
        timestamp: ts,
        app_key: APP_KEY,
        shop_cipher: decryptData(cipher),
        ids: orderId
    };
    const signed = getSigned(endpoint, params);    
    return `${OPEN_HOST}${endpoint}?app_key=${APP_KEY}&sign=${signed}&timestamp=${ts}&shop_cipher=${decryptData(cipher)}&ids=${orderId}`;
}

function GET_AUTHORIZED_SHOP () {
    const endpoint = `/authorization/${apiVersion}/shops`;
    const ts = Math.floor(Date.now()/1000);
    const params = {
        timestamp: ts,
        app_key: APP_KEY
    }
    const signed = getSigned(endpoint, params);    
    return `${OPEN_HOST}${endpoint}?app_key=${APP_KEY}&sign=${signed}&timestamp=${ts}`;
}

function SEARCH_PRODUCTS (cipher, body) {
    const endpoint = `/product/${apiVersion}/products/search`;
    const ts = Math.floor(Date.now()/1000);
    // const uid = randomUUID();
    const params = {
        timestamp: ts,
        app_key: APP_KEY,
        shop_cipher: decryptData(cipher),
        page_size: 100
        // shop_cipher: cipher,
        // idempotency_key: uid
    };
    const signed = getSigned(endpoint, params, body);
    return `${OPEN_HOST}${endpoint}?app_key=${APP_KEY}&sign=${signed}&timestamp=${ts}&shop_cipher=${decryptData(cipher)}&page_size=100`;
}

function SEARCH_CANCELLATION (cipher, body) {
    const endpoint = `/return_refund/${apiVersion}/cancellations/search`;
    const ts = Math.floor(Date.now()/1000);
    // const uid = randomUUID();
    const params = {
        timestamp: ts,
        app_key: APP_KEY,
        shop_cipher: decryptData(cipher),
        // shop_cipher: cipher,
        // idempotency_key: uid
    };
    const signed = getSigned(endpoint, params, body);
    return `${OPEN_HOST}${endpoint}?app_key=${APP_KEY}&sign=${signed}&timestamp=${ts}&shop_cipher=${decryptData(cipher)}`;
}

function APPROVE_CANCELLATION (cancelId, cipher, body) {
    const endpoint = `/return_refund/${apiVersion}/cancellations/${cancelId}/approve`;
    const ts = Math.floor(Date.now()/1000);
    const uid = randomUUID();
    const params = {
        timestamp: ts,
        app_key: APP_KEY,
        shop_cipher: decryptData(cipher),
        // shop_cipher: cipher,
        idempotency_key: uid
    };
    const signed = getSigned(endpoint, params, body);
    return `${OPEN_HOST}${endpoint}?app_key=${APP_KEY}&sign=${signed}&timestamp=${ts}&shop_cipher=${decryptData(cipher)}&idempotency_key=${uid}`;
}

function APPROVE_REFUND (returnId, cipher, body) {
    const endpoint = `/return_refund/${apiVersion}/returns/${returnId}/approve`;
    const ts = Math.floor(Date.now()/1000);
    const uid = randomUUID();
    const params = {
        timestamp: ts,
        app_key: APP_KEY,
        shop_cipher: decryptData(cipher),
        // shop_cipher: cipher,
        idempotency_key: uid
    };
    const signed = getSigned(endpoint, params, body);
    return `${OPEN_HOST}${endpoint}?app_key=${APP_KEY}&sign=${signed}&timestamp=${ts}&shop_cipher=${decryptData(cipher)}&idempotency_key=${uid}`;
}

function APPROVAL_RR (returnId, cipher, body, approved) {
    const endpoint = `/return_refund/${apiVersion}/returns/${returnId}/${(approved) ? 'approve' : 'reject'}`;
    const ts = Math.floor(Date.now()/1000);
    const uid = randomUUID();
    const params = {
        timestamp: ts,
        app_key: APP_KEY,
        shop_cipher: decryptData(cipher),
        // shop_cipher: cipher,
        idempotency_key: uid
    };
    const signed = getSigned(endpoint, params, body);
    return `${OPEN_HOST}${endpoint}?app_key=${APP_KEY}&sign=${signed}&timestamp=${ts}&shop_cipher=${decryptData(cipher)}&idempotency_key=${uid}`;
}

function REJECT_REFUND (returnId, cipher, body) {
    const endpoint = `/return_refund/${apiVersion}/returns/${returnId}/reject`;
    const ts = Math.floor(Date.now()/1000);
    const uid = randomUUID();
    const params = {
        timestamp: ts,
        app_key: APP_KEY,
        shop_cipher: decryptData(cipher),
        // shop_cipher: cipher,
        idempotency_key: uid
    };
    const signed = getSigned(endpoint, params, body);
    return `${OPEN_HOST}${endpoint}?app_key=${APP_KEY}&sign=${signed}&timestamp=${ts}&shop_cipher=${decryptData(cipher)}&idempotency_key=${uid}`;
}

function REJECT_CANCELLATION (cancelId, cipher, body) {
    const endpoint = `/return_refund/${apiVersion}/cancellations/${cancelId}/reject`;
    const ts = Math.floor(Date.now()/1000);
    const uid = randomUUID();
    const params = {
        timestamp: ts,
        app_key: APP_KEY,
        shop_cipher: decryptData(cipher),
        // shop_cipher: cipher,
        idempotency_key: uid
    };
    const signed = getSigned(endpoint, params, body);
    return `${OPEN_HOST}${endpoint}?app_key=${APP_KEY}&sign=${signed}&timestamp=${ts}&shop_cipher=${decryptData(cipher)}&idempotency_key=${uid}`;
}

function GET_RETURN_RECORDS (returnId, cipher) {
    const endpoint = `/return_refund/${apiVersion}/returns/${returnId}/records`;
    const ts = Math.floor(Date.now()/1000);
    const params = {
        timestamp: ts,
        app_key: APP_KEY,
        shop_cipher: decryptData(cipher),
        // shop_cipher: cipher,
    };
    const signed = getSigned(endpoint, params);
    return `${OPEN_HOST}${endpoint}?app_key=${APP_KEY}&sign=${signed}&timestamp=${ts}&shop_cipher=${decryptData(cipher)}`;
}

function SEARCH_RETURN (cipher, body) {
    const endpoint = `/return_refund/${apiVersion}/returns/search`;
    const ts = Math.floor(Date.now()/1000);
    const params = {
        timestamp: ts,
        app_key: APP_KEY,
        shop_cipher: decryptData(cipher),
    };
    const signed = getSigned(endpoint, params, body);
    return `${OPEN_HOST}${endpoint}?app_key=${APP_KEY}&sign=${signed}&timestamp=${ts}&shop_cipher=${decryptData(cipher)}`;
}

function CANCEL_ORDER (cipher, body) {
    const endpoint = `/return_refund/${apiVersion}/cancellations`;
    const ts = Math.floor(Date.now()/1000);
    const params = {
        timestamp: ts,
        app_key: APP_KEY,
        shop_cipher: decryptData(cipher),
    };
    const signed = getSigned(endpoint, params, body);
    return `${OPEN_HOST}${endpoint}?sign=${signed}&timestamp=${ts}&app_key=${APP_KEY}&shop_cipher=${decryptData(cipher)}`;
}

function SHIP_PACKAGE (cipher, body) {
    const endpoint = `/fulfillment/${apiVersion}/packages/ship`;
    const ts = Math.floor(Date.now()/1000);
    const params = {
        timestamp: ts,
        app_key: APP_KEY,
        shop_cipher: decryptData(cipher),
    };
    const signed = getSigned(endpoint, params, body);
    return `${OPEN_HOST}${endpoint}?app_key=${APP_KEY}&sign=${signed}&timestamp=${ts}&shop_cipher=${decryptData(cipher)}`;
}

function GET_SHIP_DOCUMENT (packageId, cipher) {
    const endpoint = `/fulfillment/${apiVersion}/packages/${packageId}/shipping_documents`;
    const ts = Math.floor(Date.now()/1000);
    const params = {
        timestamp: ts,
        app_key: APP_KEY,
        shop_cipher: decryptData(cipher),
        document_type: 'SHIPPING_LABEL'
    };
    const signed = getSigned(endpoint, params);    
    return `${OPEN_HOST}${endpoint}?app_key=${APP_KEY}&sign=${signed}&timestamp=${ts}&shop_cipher=${decryptData(cipher)}&document_type=SHIPPING_LABEL`;
}

function GET_SHIP_TRACKING (orderId, cipher) {
    const endpoint = `/fulfillment/${apiVersion}/orders/${orderId}/tracking`;
    const ts = Math.floor(Date.now()/1000);
    const params = {
        timestamp: ts,
        app_key: APP_KEY,
        shop_cipher: decryptData(cipher),
    };
    const signed = getSigned(endpoint, params);
    return `${OPEN_HOST}${endpoint}?app_key=${APP_KEY}&sign=${signed}&timestamp=${ts}&shop_cipher=${decryptData(cipher)}`;
}

function GET_PRODUCT (productId, cipher) {
    const endpoint = `/product/${apiVersion}/products/${productId}`;
    const ts = Math.floor(Date.now()/1000);
    const params = {
        timestamp: ts,
        app_key: APP_KEY,
        shop_cipher: decryptData(cipher),
    };
    const signed = getSigned(endpoint, params);
    return `${OPEN_HOST}${endpoint}?app_key=${APP_KEY}&sign=${signed}&timestamp=${ts}&shop_cipher=${decryptData(cipher)}`;
}

function GET_CONVERSATION (cipher) {
    const endpoint = `/customer_service/${apiVersion}/conversations`;
    const ts = Math.floor(Date.now()/1000);
    const params = {
        timestamp: ts,
        app_key: APP_KEY,
        shop_cipher: decryptData(cipher),
        page_size: 5
    };
    const signed = getSigned(endpoint, params);
    return `${OPEN_HOST}${endpoint}?app_key=${APP_KEY}&sign=${signed}&timestamp=${ts}&shop_cipher=${decryptData(cipher)}&page_size=5`;
}

function GET_MESSAGE (convId, cipher) {
    const endpoint = `/customer_service/${apiVersion}/conversations/${convId}/messages`;
    const ts = Math.floor(Date.now()/1000);
    const params = {
        timestamp: ts,
        app_key: APP_KEY,
        shop_cipher: decryptData(cipher),
        page_size: 10
    };
    const signed = getSigned(endpoint, params);
    return `${OPEN_HOST}${endpoint}?app_key=${APP_KEY}&sign=${signed}&timestamp=${ts}&shop_cipher=${decryptData(cipher)}&page_size=10`;
}

function SEND_MESSAGE (convId, body, cipher) {
    const endpoint = `/customer_service/${apiVersion}/conversations/${convId}/messages`;
    const ts = Math.floor(Date.now()/1000);
    const params = {
        timestamp: ts,
        app_key: APP_KEY,
        shop_cipher: decryptData(cipher)
    };
    const signed = getSigned(endpoint, params, body);
    return `${OPEN_HOST}${endpoint}?app_key=${APP_KEY}&sign=${signed}&timestamp=${ts}&shop_cipher=${decryptData(cipher)}`;
}

function UPLOAD_IMAGE () {
    const endpoint = `/product/${apiVersion}/images/upload`
    const ts = Math.floor(Date.now()/1000);
    const params = {
        timestamp: ts,
        app_key: APP_KEY,
    };
    const signed = getSigned(endpoint, params);
    return `${OPEN_HOST}${endpoint}?app_key=${APP_KEY}&sign=${signed}&timestamp=${ts}`;
}

// function SEARCH_CANCEL_REQUEST () {}

function getSigned (endpoint, params, body) {
    // console.log(body)
    const sortedParams = Object.keys(params).filter((key) => !excludeKeys.includes(key)).sort().map((key) => ({ key, value: params[key] }));
    const paramString = sortedParams.map(({ key, value }) => `${key}${value}`).join("");
    let signString = `${endpoint}${paramString}`;
    if (body) {
        signString += JSON.stringify(body);
    }
    signString = `${APP_SECRET}${signString}${APP_SECRET}`;
    const signed = CryptoJS.HmacSHA256(signString, APP_SECRET).toString(CryptoJS.enc.Hex);
    return signed;
}

module.exports = {
    GET_TOKEN_API,
    GET_REFRESH_TOKEN_API,
    GET_AUTHORIZED_SHOP,
    GET_ORDER_API,
    APPROVE_CANCELLATION,
    SEND_MESSAGE,
    GET_PRODUCT,
    CANCEL_ORDER,
    REJECT_CANCELLATION,
    UPLOAD_IMAGE,
    SHIP_PACKAGE,
    GET_SHIP_DOCUMENT,
    GET_RETURN_RECORDS,
    SEARCH_RETURN,
    APPROVE_REFUND,
    REJECT_REFUND,
    SEARCH_CANCELLATION,
    GET_SHIP_TRACKING,
    APPROVAL_RR,
    SEARCH_PRODUCTS,
    GET_MESSAGE,
    GET_CONVERSATION
}