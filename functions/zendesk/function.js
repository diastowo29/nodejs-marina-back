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

async function doCreateZdTicket (body, zdUrl, zdToken, reason, evidenceImage, evidenceVideo) {
    let subject = '';
    let comment = '';
    let tags = [`m_${body.channel}`];
    switch (body.status) {
        case 'CANCELLATION':
            subject = `[${body.channel.toString().toUpperCase()}] Cancellation Request: ${body.order_id}`;
            comment = `User request a cancellation to order: ${body.order_id} with Reason: ${reason}`;
            tags.push('marina_cancellation');
            break;
        case 'REFUND':
            subject = `[${body.channel.toString().toUpperCase()}] Refund Request: ${body.order_id}`;
            comment = `User request a refund to order: ${body.order_id}
            Image Evidence: ${(evidenceImage && evidenceImage.length > 0) ? evidenceImage.map(img => img.url).join('\n') : 'No image provided'}
            Video Evidence: ` + (evidenceVideo && evidenceVideo.length > 0 ? evidenceVideo.map(vid => vid.url).join('\n') : 'No video provided');
            tags.push('marina_refund');
            break;
        case 'RETURN_AND_REFUND':
            subject = `[${body.channel.toString().toUpperCase()}] Return Request: ${body.order_id}`;
            comment = `User request a return to order: ${body.order_id}
            Image Evidence: ${(evidenceImage && evidenceImage.length > 0) ? evidenceImage.map(img => img.url).join('\n') : 'No image provided'}
            Video Evidence: ` + (evidenceVideo && evidenceVideo.length > 0 ? evidenceVideo.map(vid => vid.url).join('\n') : 'No video provided');
            tags.push('marina_return_refund');
            break;
        default:
            break;
    }
    let ticketData = {
        ticket: {
            subject: subject,
            comment: { body: comment },
            tags: tags,
            requester: { external_id: `${body.channel}-${body.customer_id}-${body.shop_id}` },
            custom_fields: [
                {
                    id: findZd.notes.split('-')[0],
                    value: body.customer_id
                },{
                    id: findZd.notes.split('-')[1],
                    value: body.order_id
                },{
                    id: findZd.notes.split('-')[2],
                    value: body.shop_id
                },{
                    id: findZd.notes.split('-')[3],
                    value: body.channel
                },{
                    id: findZd.notes.split('-')[4],
                    value: body.shop_id
                }
            ]
        }
    }
    // console.log(ticketData)
    createTicket(zdUrl, zdToken, ticketData).then((ticket) => {
        console.log('ticket created: ' + ticket.data.ticket.id);
    }).catch((err) => {
        console.log(err.response.data);
    })
}

module.exports = {
    createTicket
}