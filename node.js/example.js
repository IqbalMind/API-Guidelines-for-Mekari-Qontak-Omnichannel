const axios = require('axios');
const crypto = require('crypto');

// --------------------------
// CONFIG
// --------------------------
// Replace these with your actual credentials and base URL
const CLIENT_ID = "YOUR_QONTAK_CLIENT_ID";
const CLIENT_SECRET = "YOUR_QONTAK_CLIENT_SECRET";
const BASE_URL = "https://api.mekari.com";

/**
 * Generate authentication headers for Mekari API using Node.js.
 * * @param {string} method The HTTP method (e.g., 'POST', 'GET').
 * @param {string} path The request path (e.g., '/qontak/chat/v1/broadcasts/whatsapp/direct').
 * @param {string} clientId Your Mekari API Client ID.
 * @param {string} clientSecret Your Mekari API Client Secret.
 * @returns {object} An object of header strings.
 */
function generateHeaders(method, path, clientId, clientSecret) {
    // Mekari API requires RFC 1123 format for the Date header
    const datetime = new Date().toUTCString();
    const requestLine = `${method} ${path} HTTP/1.1`;
    
    // The payload is the date header and the request line, separated by a newline
    const payload = `date: ${datetime}\n${requestLine}`;
    
    // Generate the HMAC-SHA256 signature
    const hmac = crypto.createHmac('sha256', clientSecret);
    hmac.update(payload);
    const signature = hmac.digest('base64');
    
    const authHeader = `hmac username="${clientId}", algorithm="hmac-sha256", headers="date request-line", signature="${signature}"`;
    
    return {
        "Authorization": authHeader,
        "Date": datetime,
        "Content-Type": "application/json"
    };
}

/**
 * A universal function to send requests to the Mekari API.
 * * @param {string} method The HTTP method ('GET', 'POST', etc.).
 * @param {string} path The API endpoint path.
 * @param {object} [payload=null] The request body for POST/PUT requests.
 * @returns {Promise<object>} A promise that resolves with the response data and status code.
 */
async function sendMekariRequest(method, path, payload = null) {
    const url = BASE_URL + path;
    const headers = generateHeaders(method, path, CLIENT_ID, CLIENT_SECRET);
    
    try {
        let response;
        if (method.toUpperCase() === 'POST') {
            response = await axios.post(url, payload, { headers });
        } else if (method.toUpperCase() === 'GET') {
            response = await axios.get(url, { headers });
        }
        
        return {
            response: response.data,
            http_code: response.status
        };
    } catch (error) {
        if (error.response) {
            // The request was made and the server responded with a status code
            // that falls out of the range of 2xx
            console.error("HTTP Error:", error.response.status);
            return {
                response: error.response.data,
                http_code: error.response.status
            };
        } else if (error.request) {
            // The request was made but no response was received
            console.error("No response received:", error.request);
            return { response: null, http_code: 500 };
        } else {
            // Something happened in setting up the request that triggered an Error
            console.error('Error:', error.message);
            return { response: null, http_code: 500 };
        }
    }
}

// ------------------------------------------------------------------
// EXAMPLE USAGE: Qontak WhatsApp Broadcast
// ------------------------------------------------------------------

async function runExample() {
    // --- STEP 1: Send Broadcast (POST Request) ---
    const postPath = "/qontak/chat/v1/broadcasts/whatsapp/direct";
    const postPayload = {
        "to_number": "6281xxxx", // Replace with the recipient's actual phone number
        "to_name": "Muhamad Iqbal",
        "message_template_id": "fbd4da17-a20e-4248-993d-f95566ee10b2",
        "channel_integration_id": "a2e9673a-44ac-493d-aac0-51c5a0bfb1a5",
        "language": { "code": "id" },
        "parameters": {
            "body": [
                { "key": "1", "value": "customer_name", "value_text": "Iqbal" },
                { "key": "2", "value": "link_pdf", "value_text": "https://cdn.qontak.com/uploads/message/file/e1380eaa-bae4-4fa7-b6fc-5ae27a7d324f/20241210175811_Invoice_report_for_Fajar_Taufik.pdf" }
            ]
        }
    };

    console.log("==[ Sending Broadcast (POST) ]==");
    const postResult = await sendMekariRequest('POST', postPath, postPayload);
    
    console.log(`Status Code: ${postResult.http_code}`);
    console.log(JSON.stringify(postResult.response, null, 2));

    // Check if the broadcast was sent successfully
    if (postResult.http_code !== 201) {
        console.error("Failed to send broadcast.");
        return;
    }

    const broadcastId = postResult.response?.data?.id;

    if (!broadcastId) {
        console.error("Broadcast ID not found in response.");
        return;
    }

    // --- Delay before checking the log ---
    console.log("\nWaiting 10 seconds before checking log...");
    await new Promise(resolve => setTimeout(resolve, 10000));

    // --- STEP 2: Get Broadcast Log (GET Request) ---
    const logPath = `/qontak/chat/v1/broadcasts/${broadcastId}/whatsapp/log`;

    console.log("\n==[ Getting Broadcast Log (GET) ]==");
    const logResult = await sendMekariRequest('GET', logPath);

    console.log(`Status Code: ${logResult.http_code}`);
    console.log(JSON.stringify(logResult.response, null, 2));
}

runExample();
