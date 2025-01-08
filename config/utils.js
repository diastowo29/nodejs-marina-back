let env = require('dotenv').config()

let appKeyOMS = env.parsed.LAZ_OMS_APP_KEY_ID
let appKeyCHAT = env.parsed.LAZ_APP_KEY_ID
let lazadaHost = 'https://api.lazada.co.id/rest';
let lazadaAuthHost = 'https://auth.lazada.com/rest';

module.exports = {
    TOKOPEDIA: 'tokopedia',
    TOKOPEDIA_CHAT: 'tokopediaChat',
    LAZADA: 'lazada',
    LAZADA_CHAT: 'lazadaChat',
    BLIBLI: 'blibli',
    BLIBLI_CHAT: 'blibliChat',
    
    lazadaHost:'https://api.lazada.co.id/rest',
    lazadaAuthHost:'https://auth.lazada.com/rest',

    // lazGetSessionDetail: '/im/session/get',
    // lazGetOrderDetail: '/order/get',
    // lazGetOrderItems: '/order/items/get',
    lazReadSession: '/im/session/read',
    lazGetSellerInfo: '/seller/get',
    lazRejectOrder: '',

    lazGenToken: '/auth/token/create',

    lazGetSessionDetail: {
        host: lazadaHost,
        endpoint: '/im/session/get',
        appKey: appKeyCHAT,
        pos:1
    },
    lazGetOrderDetail: {
        host: lazadaHost,
        endpoint: '/order/get',
        appKey: appKeyOMS,
        pos: 0
    },
    lazGetOrderItems: {
        host: lazadaHost,
        endpoint: '/order/items/get',
        appKey: appKeyOMS,
        pos: 0
    },
    lazRefreshToken: {
        host: this.lazadaAuthHost,
        endpoint: '/auth/token/refresh',
        appKey: appKeyOMS
    },
    lazPackOrder: {
        host: lazadaHost,
        endpoint: '/order/fulfill/pack',
        appKey: appKeyOMS
    },

    sampleLazOMSToken: '50000701b25svjsdYGEQ3sz1GIDxI0DwxIGyD10be5dc5xufRtaUOv2vjFYPmCZm'
};