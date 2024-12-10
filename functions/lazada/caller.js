let lazadaAuthHost = 'https://auth.lazada.com/rest';
let lazadaHost = 'https://api.lazada.co.id/rest';

let lazGenerateTokenApi = `/auth/token/create?`;
let lazRefreshToken = `/auth/token/refresh`;
let lazGetOrder = `/order/get`;
let lazGetOrderItem = `/order/items/get`;
const { default: axios } = require("axios");
var CryptoJS = require("crypto-js");

// require('dotenv/config')
// require('dotenv').config({ path: "../.env" });

let { client } =  require("../../config/redis.config");

let appKeyId = process.env.LAZ_APP_KEY_ID || 'sampleKeyId'
let appKeySecret = process.env.LAZ_APP_KEY_SECRET || 'thesecret'
let authCode = '0_131455_GASLfFPyp1I932tbZyULcRBt28498';

function lazCall (endpoint, refToken) {
    console.log(endpoint);
    axios.get(endpoint).then(async function(result) {
        console.log(result.data);
        if (result.data.code == 'IllegalAccessToken') {
            let newToken = await refreshToken(refToken);
            // console.log('new token', newToken);
            let params = lazParamz(appKeyId, '', Date.now(), 'newToken', newToken, lazGetOrder)
            lazCall(`${lazadaAuthHost}${lazGetOrder}?${params.params}&sign=${params.signed}`, 'newToken')
            // lazCall(endpoint, newToken);
            return;
        } else if (result.data.code == 'MissingParameter') {
            console.log(result.data);
        }
    }).catch(function (error) {
        console.log(error);
    })
}

async function refreshToken (refreshToken) {
    let params = lazParamz(appKeyId, authCode, Date.now(), refreshToken, 'currentToken', lazRefreshToken);
    return axios.get(`${lazadaAuthHost}${lazRefreshToken}?${params.params}&sign=${params.signed}`).then(function(result) {
        console.log(result.data);
        if (result.data.code == '0') {
            let newToken = result.data.access_token;
            let newRefToken = result.data.refresh_token;
            client.hSet('lazClient', {
                accToken: newToken,
                refToken: newRefToken
            });
            return newToken;
        }
    })
}

function lazParamz (key, code, ts, refToken, accToken, endpoint) {
    let params = {
        app_key: key,
        timestamp: ts,
        ...(code=='' ? { access_token: accToken } : { code: code, refresh_token: refToken }),
        sign_method: 'sha256'
    };
    // Sort alphabetically by key :*
    let sortedObject = Object.keys(params).sort().reduce((Obj, key) => {
        Obj[key] = params[key];
        return Obj;
    }, {});
    let joinedPresigned = endpoint;
    let joinedParams;
    for(let keys in sortedObject) {
        let joined = [keys, sortedObject[keys]].join('');
        joinedPresigned = [joinedPresigned, joined].join('');
        joined = [keys, sortedObject[keys]].join('=');
        if (joinedParams) {
            joinedParams = [joinedParams, joined].join('&');
        } else {
            joinedParams = [joinedParams, joined].join('');
        }
    }
    let signed = CryptoJS.HmacSHA256(joinedPresigned, appKeySecret).toString(CryptoJS.enc.Hex).toUpperCase();
    return {signed: signed, params: joinedParams};
}

client.hGetAll('lazClient').then(function(data) {
    console.log(data);
    // console.log(process.env);
    let params = lazParamz(appKeyId, '', Date.now(), data.refToken, data.accToken, lazGetOrder)
    lazCall(`${lazadaAuthHost}${lazGetOrder}?${params.params}&sign=${params.signed}`, data.refToken)
})

module.exports = { lazCall }