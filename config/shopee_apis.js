const SHOPEE_HOST = 'https://partner.test-stable.shopeemobile.com';
const AUTH_ENDPOINT = '/api/v2/shop/auth_partner';
const GET_ORDER_DETAIL_PATH = '/api/v2/order/get_order_detail';
const GET_SHOPEE_SHOP_INFO_PATH = '/api/v2/shop/get_shop_info';
const GET_SHOPEE_TOKEN = '/api/v2/auth/token/get';
var CryptoJS = require("crypto-js");

const PARTNER_ID = process.env.SHOPEE_PARTNER_ID;
const PARTNER_KEY = process.env.SHOPEE_PARTNER_KEY;

const GET_SHOPEE_REFRESH_TOKEN = '/api/v2/auth/access_token/get';
// const GET_SHOPEE_PRODUCTS_LIST = '/api/v2/product/get_item_list';
// const GET_SHOPEE_PRODUCTS_INFO = '/api/v2/product/get_item_base_info';
function GET_SHOPEE_PRODUCTS_LIST (accessToken, shopId) {
    let ts = Math.floor(Date.now() / 1000);
    const path = '/api/v2/product/get_item_list';
    let shopeeSignString = `${PARTNER_ID}${path}${ts}${accessToken}${shopId}`;
    let sign = CryptoJS.HmacSHA256(shopeeSignString, PARTNER_KEY).toString(CryptoJS.enc.Hex);
    let shopInfoParams = `partner_id=${PARTNER_ID}&timestamp=${ts}&access_token=${accessToken}&shop_id=${shopId}&sign=${sign}`;
    return `${SHOPEE_HOST}${path}?${shopInfoParams}&offset=0&page_size=50&item_status=NORMAL`;
}

function GET_SHOPEE_PRODUCTS_INFO (accessToken, productIds, shopId) {
    let ts = Math.floor(Date.now() / 1000);
    const path = '/api/v2/product/get_item_base_info';
    let shopeeSignString = `${PARTNER_ID}${path}${ts}${accessToken}${shopId}`;
    let sign = CryptoJS.HmacSHA256(shopeeSignString, PARTNER_KEY).toString(CryptoJS.enc.Hex);
    let shopInfoParams = `partner_id=${PARTNER_ID}&timestamp=${ts}&access_token=${accessToken}&shop_id=${shopId}&sign=${sign}`;
    return `${SHOPEE_HOST}${path}?${shopInfoParams}&${shopInfoParams}&item_id_list=${productIds.toString()}`;
}

module.exports = {
    GET_ORDER_DETAIL_PATH,
    AUTH_ENDPOINT,
    GET_SHOPEE_TOKEN,
    GET_SHOPEE_SHOP_INFO_PATH,
    SHOPEE_HOST,
    PARTNER_ID,
    PARTNER_KEY,
    GET_SHOPEE_PRODUCTS_LIST,
    GET_SHOPEE_PRODUCTS_INFO,
    GET_SHOPEE_REFRESH_TOKEN,
}