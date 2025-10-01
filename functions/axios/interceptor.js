const { default: axios } = require("axios");
const { TOKO_GETTOKEN } = require("../../config/toko_apis");
let tokoClientId = process.env.TOKO_CLIENT_ID;
let tokoClientSecret = process.env.TOKO_CLIENT_SECRET;
let genAuthToken = Buffer.from(`${tokoClientId}:${tokoClientSecret}`).toString('base64');
const { getPrismaClient } = require("../../services/prismaServices");
const api = axios.create({
  headers: {
    'Content-Type': 'application/json',
  },
})

api.interceptors.request.use((config) => {
    return config; 
}, (error) => {
    return Promise.reject(error);
});

api.interceptors.response.use((response) => response, async (error) => {
    const originalRequest = error.config;
    
    if (error.hostname != 'partner.test-stable.shopeemobile.com')  {
        if (!error.response) {
            console.error('Network error:', error);
            return Promise.reject(new Error('Network error, please try again later.'));
        }
        if (error.response.status === 401 && !originalRequest._retry) {
            originalRequest._retry = true;
            try {
                // console.log(error.config);
                const newToken = await generateTokpedToken();
                originalRequest.headers['Authorization'] = `Bearer ${newToken.access_token}`;
                if (originalRequest.url.includes('tokopedia')) {
                    const prisma = getPrismaClient(originalRequest.headers['X-Org-Id']);
                    prisma.store.update({
                        where: {
                            channelId: 1
                        },
                        data: {
                            token: newToken.access_token
                        }
                    })
                }
                return api(originalRequest); // Retry the original request with the new token
            } catch (refreshError) {
                console.error('Token refresh failed:', refreshError);
                // Redirect to login or handle the error as needed
                return Promise.reject(refreshError);
            }
        }
    }

    return Promise.reject(error);
});

async function generateTokpedToken () {
    let tokoToken = await axios({
        method: 'POST',
        url: TOKO_GETTOKEN,
        headers: {
            'Authorization': `Basic ${genAuthToken}`
        }
    });
    return tokoToken.data;
}

module.exports = {
    api,
    generateTokpedToken
}