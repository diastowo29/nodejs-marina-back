const HOST = 'https://fs.tokopedia.net';
const TOKO_GETTOKEN = 'https://accounts.tokopedia.com/token?grant_type=client_credentials';

function TOKO_SHOPINFO (fsId) {
    return `${HOST}/v1/shop/fs/${fsId}/shop-info?page=1&per_page=10`
}
function TOKO_PRODUCTLIST (fsId, shopId) {
    return `${HOST}/inventory/v1/fs/${fsId}/product/info?shop_id=${shopId}&page=1&per_page=10`;
}
function TOKO_PRODUCTGET (fsId, productId) {
    return `${HOST}/inventory/v1/fs/${fsId}/product/info?product_id=${productId}`
}
function TOKO_ACCEPT_ORDER (fsId, orderId) {
    return `${HOST}/v1/order/${orderId}/fs/${fsId}/ack`;
};
function TOKO_REJECT_ORDER (fsId, orderId) {
    return `${HOST}/v1/order/${orderId}/fs/${fsId}/nack`;
};
function TOKO_REPLYCHAT (fsId, msgId) {
    return `${HOST}/v1/chat/fs/${fsId}/messages/${msgId}/reply`;
}
function TOKO_PRINTLABEL (fsId, orderId) {
    return `${HOST}/v1/order/${orderId}/fs/${fsId}/shipping-label`;
}
function TOKO_ORD_CONFIRMSHIP (fsId, orderId) {
    return `${HOST}/v1/order/${orderId}/fs/${fsId}/status`;
}
function TOKO_CATEGORY (fsId) {
    return `${HOST}/inventory/v1/fs/${fsId}/product/category`
}

module.exports = {
    TOKO_GETTOKEN,
    TOKO_SHOPINFO,
    TOKO_PRODUCTLIST,
    TOKO_PRODUCTGET,
    TOKO_ACCEPT_ORDER,
    TOKO_REJECT_ORDER,
    TOKO_REPLYCHAT,
    TOKO_PRINTLABEL,
    TOKO_ORD_CONFIRMSHIP,
    TOKO_CATEGORY
}