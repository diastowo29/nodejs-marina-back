// let env = require('dotenv').config()

let appKeyOMS = process.env.LAZ_OMS_APP_KEY_ID
let appKeyCHAT = process.env.LAZ_APP_KEY_ID
let lazadaHost = 'https://api.lazada.co.id/rest';
let lazadaAuthHost = 'https://auth.lazada.com/rest';

function lazGetToken (appKey) {
    return {
        host: lazadaAuthHost,
        endpoint: '/auth/token/create',
        appKey: appKey,
        pos: 1
    }
}

function lazGetSellerInfo (appKey) {
    return {
        host: lazadaHost,
        endpoint: '/seller/get',
        appKey: appKey,
        pos: 1
    }
}

module.exports = {
    lazGetToken,
    lazGetSellerInfo,
    PATH_WEBHOOK: '/webhook',
    PATH_ORDER: '/order',
    PATH_CANCELLATION: '/cancellation',
    PATH_CHAT: '/chat',
    PATH_AUTH: '/authorize',

    TOKOPEDIA: 'tokopedia',
    TOKOPEDIA_CHAT: 'tokopediaChat',
    LAZADA: 'lazada',
    LAZADA_CHAT: 'lazadaChat',
    BLIBLI: 'blibli',
    BLIBLI_CHAT: 'blibliChat',
    SHOPEE: 'shopee',
    SHOPEE_CHAT: 'shopeeChat',
    TIKTOK: 'tiktok',
    TIKTOK_CHAT: 'tiktokChat', 

    CHAT_TEXT: 'TEXT',
    CHAT_PRODUCT: 'PRODUCT',
    CHAT_INVOICE: 'INVOICE',
    
    lazadaHost:'https://api.lazada.co.id/rest',
    lazadaAuthHost:'https://auth.lazada.com/rest',

    SUN_APP_ID: 'SUNCO_APP_ID',
    SUN_APP_KEY: 'SUNCO_APP_KEY',
    SUN_APP_SECRET: 'SUNCO_APP_SECRET',
    ZD_API_TOKEN: 'ZD_API_TOKEN',

    // lazGenToken: '/auth/token/create',

    // lazGetSessionDetail: '/im/session/get',
    // lazGetOrderDetail: '/order/get',
    // lazGetOrderItems: '/order/items/get',
    // lazGetSellerInfo: '/seller/get',
    lazReadSession: '/im/session/read',
    lazRejectOrder: '',

    // lazGetSellerInfo: {
    //     host: lazadaHost,
    //     endpoint: '/seller/get',
    //     appKey: appKeyCHAT,
    //     pos:1
    // },
    // lazGetToken: {
    //     host: lazadaAuthHost,
    //     endpoint: '/auth/token/create',
    //     appKey: appKeyCHAT,
    //     pos:1
    // },
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
    lazReplyChat: {
        host: lazadaHost,
        endpoint: '/im/message/send',
        appKey: appKeyCHAT,
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

    chatContentType: {  
        TEXT : 'text',
        IMAGE : 'image',
        PRODUCT : 'product',
        INVOICE : 'invoice'
    },

    channelSource: {
        LAZADA: 'Lazada',
        TOKOPEDIA: 'Tokopedia',
        SHOPEE: 'Shopee',
        BLIBLI: 'Blibli',
        TIKTOK: 'Tiktok'
    },

    storeStatuses: {
        ACTIVE: 'Active',
        EXPIRED: 'Expired',
        INACTIVE: 'Inactive',
        DISCONNECTED: 'Disconnected'
    },

    sampleLazOMSToken: '50000701b25svjsdYGEQ3sz1GIDxI0DwxIGyD10be5dc5xufRtaUOv2vjFYPmCZm'
};