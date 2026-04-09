const { lazReplyChat } = require("../../config/utils");
const { getTenantDB } = require("../../middleware/tenantIdentifier");
const { lazPostCall } = require("./caller");

async function sendLazadaChat (sendLazadaChatParams) {
    const { chatId, templateId, storeId, contentType, chatLine, token, refreshToken, orgId } = sendLazadaChatParams;
    let apiParams = `session_id=${chatId}&template_id=${templateId}&${contentType}=${chatLine}${(contentType == 'img_url') ? '&width=300&height=300' : ''}`;
    /* const lazPostCallParams = {
        api: lazReplyChat,
        additionalParams: apiParams,
        refreshToken: refreshToken,
        token: token,
        storeId: storeId,
        orgId: 'orgId',
        tenantDB: 'tenantDb',
        isOms: false
    } */
    let chatReply = await lazPostCall(lazReplyChat, apiParams, refreshToken, token, storeId, orgId, getTenantDB(orgId).url, false);
    return chatReply;
}

module.exports = sendLazadaChat;