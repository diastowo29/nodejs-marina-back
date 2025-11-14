let lazadaAuthHost = 'https://auth.lazada.com/rest';
let lazRefreshToken = `/auth/token/refresh`;
const { default: axios } = require("axios");
var CryptoJS = require("crypto-js");
const { decryptData } = require("../encryption");
const { PrismaClient } = require("../../prisma/generated/client");
const { getPrismaClientForTenant } = require("../../services/prismaServices");
let prisma = new PrismaClient();

// let authCode = '0_131455_GASLfFPyp1I932tbZyULcRBt28498';

async function lazCall (api, additionalParams, refToken, token, storeId, orgId, tenantDB, isOms) {
    let lazCommonParams = lazParamz(api.appKey, '', Date.now(), decryptData(token), api.endpoint, additionalParams);
    let completeUrl = `${api.host}${api.endpoint}?${lazCommonParams.params}&sign=${lazCommonParams.signed}`;
    return axios.get(completeUrl).then(async function(result) {
        if (result.data.code == 'IllegalAccessToken') {
            let newToken = await refreshToken(api, refToken, storeId, orgId, tenantDB, isOms);
            if (newToken) {
                lazCall(api, additionalParams, newToken.refresh_token, newToken.access_token);
                return;
            }
        } else if (result.data.code == 'MissingParameter') {
            return result.data;
        } else {
            return result.data;
        }
    }).catch(function (error) {
        console.log(error);
        return error;
    })
}

async function lazPostGetCall (api, additionalParams, refToken, token, storeId, orgId, tenantDB, isOms) {
    let lazCommonParams = lazParamz(api.appKey, '', Date.now(), decryptData(token), api.endpoint, additionalParams);
    let completeUrl = `${api.host}${api.endpoint}?${lazCommonParams.params}&sign=${lazCommonParams.signed}`;
    return axios.post(completeUrl).then(async function(result) {
        if (result.data.code == 'IllegalAccessToken') {
            let newToken = await refreshToken(api, refToken, storeId, orgId, tenantDB, isOms);
            if (newToken) {
                lazCall(api, additionalParams, newToken.refresh_token, newToken.access_token);
                return;
            }
        } else if (result.data.code == 'MissingParameter') {
            return result.data;
        } else {
            return result.data;
        }
    }).catch(function (error) {
        console.log(error);
        return error;
    })
}

async function lazPostCall (api, additionalParams, refToken, token, storeId, orgId, tenantDB, isOms) {
    let lazCommonParams = lazParamz(api.appKey, '', Date.now(), token, api.endpoint, additionalParams);
    lazCommonParams.sorted['sign'] = lazCommonParams.signed;
    let completeUrl = `${api.host}${api.endpoint}`;
    // console.log(completeUrl);
    console.log(lazCommonParams.sorted);
    return axios.post(completeUrl, lazCommonParams.sorted)
    .then(async function(result) {
        console.log(result.data);
        if (result.data.code == 'IllegalAccessToken') {
            let newToken = await refreshToken(api, refToken, storeId, orgId, tenantDB, isOms);
            console.log(newToken);
            if (newToken) {
                lazPostCall(api, additionalParams, newToken.refresh_token, newToken.access_token);
                return;
            }
        } else if (result.data.code == 'MissingParameter') {
            return result.data;
        } else {
            return result.data;
        }
    }).catch(function (error) {
        console.log(error);
        return error;
    })
}

async function populateResult (result) {
    // if (result.data.code == 'IllegalAccessToken') {
    //     let newToken = await refreshToken(refToken);
    //     console.log(newToken);
    //     if (newToken) {
    //         lazPostCall(api, additionalParams, newToken.refresh_token, newToken.access_token);
    //         return;
    //     }
    // } else if (result.data.code == 'MissingParameter') {
    //     console.log(result.data);
    // } else {
    //     return result.data;
    // }
}

async function refreshToken (api, refreshToken, storeId, orgId, tenantDB, isOms) {
    console.log(' --- refreshing token --- ');
    let addonParams = `refresh_token=${refreshToken}`;
    let params = lazParamz(api.appKey, '', Date.now(), 'currentToken', lazRefreshToken, addonParams);
    prisma = getPrismaClientForTenant(orgId, tenantDB.url);
    return axios.get(`${lazadaAuthHost}${lazRefreshToken}?${params.params}&sign=${params.signed}`).then(function(result) {
        console.log(result.data);
        if (result.data.code == '0') {
            let newToken = result.data.access_token;
            let newRefToken = result.data.refresh_token;
            prisma.store.update({
                where: {
                    id: storeId
                },
                data: {
                    ...(isOms) ? {token: newToken, refresh_token: newRefToken} : {secondary_token: newToken, secondary_refresh_token: newRefToken}
                }
            }).then(() => {
                console.log('token updated')
            }).catch((err) => {
                console.log(err);
                console.log('token update failed')
            }).finally(() => {
                return result.data;
            })
        }
    })
}

function lazParamz (key, code, ts, accToken, endpoint, addonParams) {
    let addOns = [];
    if (addonParams!= '') {
        let addOnsSplit = addonParams.split('&')
        addOnsSplit.forEach(addOn => {
            addOns.push({
                [addOn.split('=')[0]]: addOn.split('=')[1]
            })
        });
    }

    let params = {
        app_key: key.split('-_-')[0],
        timestamp: ts,
        ...(accToken == '' ? {} : { access_token: accToken }),
        sign_method: 'sha256'
    };
    if (addOns.length > 0) {
        addOns.forEach(addOn => {
            params = Object.assign(params, addOn);
        });
    }
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
    let signed = CryptoJS.HmacSHA256(joinedPresigned, key.split('-_-')[1]).toString(CryptoJS.enc.Hex).toUpperCase();
    return {signed: signed, params: joinedParams, sorted: sortedObject};
}

// client.hGetAll('lazClient').then(function(data) {
//     /* GET TOKEN FROM REDIS */
//     // console.log(data);
//     // console.log(process.env);
//     let addParams = 'session_id=abcde';
//     let params = lazParamz(appKeyId, '', Date.now(), data.refToken, '50000701d02uDU1f4547d7accteLzYFjkMI3duy9G0AoofPOYwMvv0jvChXo5Fwy', lazGetOrder, addParams);
//     // lazCall(`${lazadaAuthHost}${lazGetOrder}?${params.params}&sign=${params.signed}`, data.refToken)
// })

module.exports = { lazCall, lazParamz, lazPostCall, lazPostGetCall }