const { default: axios } = require("axios")
const { decryptData } = require("../encryption")

async function createTicket (host, token, data) {
    return axios({
        method: 'POST',
        url: `${host}/api/v2/tickets.json`,
        headers: {
            'Authorization': `Basic ${decryptData(token)}`,
            'content-type': 'application/json'
        },
        data: data
    })
}


module.exports = {
    createTicket
}