const SunshineConversationsClient = require('sunshine-conversations-client');

function createSuncoUser(userExternalId, username, appId){
    let baseLog = 'createSuncoUser()'
    let usersApi = new SunshineConversationsClient.UsersApi()
    let userCreateBody = new SunshineConversationsClient.UserCreateBody()
  
    userCreateBody.externalId = userExternalId
    userCreateBody.profile = {
        givenName: username
    }

    return usersApi.createUser(appId, userCreateBody).then(
        function(suncoUser) {
            // console.log(`${baseLog} - user #${suncoUser.user.externalId} created as ${username}`)
            return {
                type: 'personal',
                participants: [{
                    userExternalId: suncoUser.user.externalId,
                    subscribeSDKClient: false
                }]
            }
        }, 
        function(error) {
            console.log('user exist id', userExternalId);
            console.log(error.body)
            if (error.body) {
                if (error.body.errors && error.body.errors[0] && error.body.errors[0].title && error.body.errors[0].title.includes('user already exists')) {
                    return usersApi.getUser(appId, userExternalId).then((getUser) => {
                        console.log(getUser.user.externalId);
                        return {
                            type: 'personal',
                            participants: [{
                                userExternalId: getUser.user.externalId,
                                subscribeSDKClient: false
                            }]
                        }
                    }).catch((err) => {
                        console.log(err);
                        return err;
                    })
                    // return 
                }
            } else if(error.status == 429){
                // console.log(`${baseLog} - create user #${userExternalId} error: ${error.response.text}`)
                return {
                    status: error.status,
                    body:{
                        errors:[
                            {
                                title: error.response.text,
                                data: error.response.req.data
                            }
                        ]
                    },
                    error:{
                        title: error.response.text,
                        data: error.response.req.data
                    }
                }
            } else {
                return error;
            }
            // error reading 'error.body.errors'
            // console.log(`${baseLog} - create user #${userExternalId} error: ${error.body.errors[0].title}`)
        }
    )
}

function createSuncoConversation(appId, conversationCreateBody){
    let baseLog = 'createSuncoConversation()'
    let conversationsApi = new SunshineConversationsClient.ConversationsApi()
    
    return conversationsApi.createConversation(appId, conversationCreateBody).then(function(conv) {
        return conv
    }, function(error) {
        console.log(error.body)
        if(error.status == 429){
            return {
                status: error.status,
                body:{
                errors:[
                    {
                        title: error.response.text,
                        data: error.response.req.data
                    }
                ]
                },
                error:{
                    title: error.response.text,
                    data: error.response.req.data
                }
            }
        }
        return error
    })
}

function postMessage(suncoAppId, conversationId, payload) {
    const messageApi = new SunshineConversationsClient.MessagesApi()
    return messageApi.postMessage(suncoAppId, conversationId, payload).then(function(message) {
        console.log(`message sent to ${conversationId}`)
        return message
    }, function(error) {
        console.log(JSON.stringify(error.body));
        if (error.status == 429) {
            return {
                error: {
                    title: error.response.text,
                    data: error.response.req.data
                }
            }
        } else {
            throw new Error(JSON.stringify(error.body));
        }
    })
}

module.exports = {
    createSuncoUser,
    createSuncoConversation,
    postMessage
}