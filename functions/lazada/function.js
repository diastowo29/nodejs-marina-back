const { lazReplyChat } = require("../../config/utils");
const { getToken } = require("../helper");
const { lazPostCall } = require("./caller");

async function sendLazadaChat (chatId, templateId, storeId, contentType, chatLine) {
    let apiParams = `session_id=${chatId}&template_id=${templateId}&${contentType}=${chatLine}${(contentType == 'img_url') ? '&width=300&height=300' : ''}`;
    let token = await getToken(storeId);
    let chatReply = await lazPostCall(lazReplyChat, apiParams, token.secondary_refresh_token, token.secondary_token);
    return chatReply;
}

module.exports = sendLazadaChat;