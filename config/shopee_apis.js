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
    console.log('GET_SHOPEE_PRODUCTS_LIST');
    const path = '/api/v2/product/get_item_list';
    let shopSignedParam = shopeeSign(path, accessToken, shopId);
    return `${SHOPEE_HOST}${path}?${shopSignedParam}&offset=0&page_size=50&item_status=NORMAL`;
}

function GET_SHOPEE_PRODUCTS_INFO (accessToken, productIds, shopId) {
    console.log('GET_SHOPEE_PRODUCTS_INFO');
    const path = '/api/v2/product/get_item_base_info';
    let shopSignedParam = shopeeSign(path, accessToken, shopId);
    return `${SHOPEE_HOST}${path}?${shopSignedParam}&item_id_list=${productIds.toString()}`;
}

function GET_SHOPEE_ORDER_DETAIL (accessToken, orderId, shopId) {
    console.log('GET_SHOPEE_ORDER_DETAIL');
    const path = '/api/v2/order/get_order_detail';
    let shopSignedParam = shopeeSign(path, accessToken, shopId);
    return `${SHOPEE_HOST}${path}?${shopSignedParam}&order_sn_list=${orderId.toString()}&response_optional_fields=buyer_user_id,buyer_username,estimated_shipping_fee,recipient_address,actual_shipping_fee ,goods_to_declare,note,note_update_time,item_list,pay_time,dropshipper, dropshipper_phone,split_up,buyer_cancel_reason,cancel_by,cancel_reason,actual_shipping_fee_confirmed,buyer_cpf_id,fulfillment_flag,pickup_done_time,package_list,shipping_carrier,payment_method,total_amount,buyer_username,invoice_data,order_chargeable_weight_gram,return_request_due_date,edt`;
}

function SHOPEE_CANCEL_ORDER (accessToken, orderId, shopId, reason) {
    const path = '/api/v2/order/cancel_order';
    let shopSignedParam = shopeeSign(path, accessToken, shopId);
    return `${SHOPEE_HOST}${path}?${shopSignedParam}&order_sn=${orderId.toString()}&cancel_reason=${reason}`;
}

function GET_SHOPEE_SHIP_PARAMS (accessToken, orderId, shopId) {
    const path = '/api/v2/logistics/get_shipping_parameter';
    let shopSignedParam = shopeeSign(path, accessToken, shopId);
    return `${SHOPEE_HOST}${path}?${shopSignedParam}&order_sn=${orderId.toString()}`;
}

function SHOPEE_SHIP_ORDER (accessToken, shopId) {
    const path = '/api/v2/logistics/ship_order';
    let shopSignedParam = shopeeSign(path, accessToken, shopId);
    return `${SHOPEE_HOST}${path}?${shopSignedParam}`;
}

function shopeeSign (path, token, shopId) {
    let ts = Math.floor(Date.now() / 1000);
    let shopeeSignString = `${PARTNER_ID}${path}${ts}${token}${shopId}`;
    let sign = CryptoJS.HmacSHA256(shopeeSignString, PARTNER_KEY).toString(CryptoJS.enc.Hex);
    let shopSignedParam = `partner_id=${PARTNER_ID}&timestamp=${ts}&access_token=${token}&shop_id=${shopId}&sign=${sign}`;
    return shopSignedParam;
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
    GET_SHOPEE_ORDER_DETAIL,
    SHOPEE_CANCEL_ORDER,
    SHOPEE_SHIP_ORDER,
    GET_SHOPEE_REFRESH_TOKEN,
    GET_SHOPEE_SHIP_PARAMS
}