// This example requires Express.js, body-parser, and crypto.
// To run this, install dependencies: npm install express body-parser axios crypto
const express = require('express');
const bodyParser = require('body-parser');
const crypto = require('crypto');
const axios = require('axios');

const app = express();
const port = 3000;

app.use(bodyParser.json());

// --------------------------
// CONFIG
// --------------------------
// Replace these with your actual credentials and base URL
const CLIENT_ID = "YOUR_QONTAK_CLIENT_ID";
const CLIENT_SECRET = "YOUR_QONTAK_CLIENT_SECRET";
const BASE_URL = "https://api.mekari.com";

/**
 * Generate authentication headers for Mekari API using Node.js.
 * @param {string} method The HTTP method (e.g., 'POST', 'GET').
 * @param {string} path The request path (e.g., '/qontak/chat/v1/broadcasts/whatsapp/direct').
 * @param {string} clientId Your Mekari API Client ID.
 * @param {string} clientSecret Your Mekari API Client Secret.
 * @returns {Object} A dictionary of header strings.
 */
const generateHeaders = (method, path, clientId, clientSecret) => {
    const datetimeStr = new Date().toUTCString();
    const requestLine = `${method} ${path} HTTP/1.1`;
    const payload = `date: ${datetimeStr}\n${requestLine}`;

    const hmac = crypto.createHmac('sha256', clientSecret);
    hmac.update(payload);
    const signature = hmac.digest('base64');

    const authHeader = `hmac username="${clientId}", algorithm="hmac-sha256", headers="date request-line", signature="${signature}"`;

    return {
        'Authorization': authHeader,
        'Date': datetimeStr,
        'Content-Type': 'application/json',
    };
};

/**
 * A universal function to send requests to the Mekari API.
 * @param {string} method The HTTP method ('GET', 'POST', etc.).
 * @param {string} path The API endpoint path.
 * @param {Object} [payload=null] The request body for POST/PUT requests.
 * @returns {Promise<Object>} A promise that resolves with the API response.
 */
const sendMekariRequest = async (method, path, payload = null) => {
    const url = BASE_URL + path;
    const headers = generateHeaders(method, path, CLIENT_ID, CLIENT_SECRET);
    
    try {
        const response = await axios({
            method,
            url,
            headers,
            data: payload,
        });

        return {
            response: response.data,
            http_code: response.status
        };
    } catch (error) {
        return {
            response: error.response ? error.response.data : { message: error.message },
            http_code: error.response ? error.response.status : 500
        };
    }
};

// ------------------------------------------------------------------
// API ENDPOINT FOR EXAMPLE USAGE
// ------------------------------------------------------------------
app.post('/api/send-broadcast', async (req, res) => {
    // --- STEP 1: Send Broadcast (POST Request) ---
    const postPath = "/qontak/chat/v1/broadcasts/whatsapp/direct";
    const postPayload = req.body;

    console.log("==[ Sending Broadcast (POST) ]==");
    const postResult = await sendMekariRequest('POST', postPath, postPayload);
    
    console.log("Status Code:", postResult.http_code);
    console.log("Response:", JSON.stringify(postResult.response, null, 4));

    if (postResult.http_code !== 201) {
        console.error("Failed to send broadcast.");
        return res.status(postResult.http_code).json(postResult.response);
    }
        
    const broadcastId = postResult.response?.data?.id;
    
    if (!broadcastId) {
        console.error("Broadcast ID not found in response.");
        return res.status(500).json({ message: "Broadcast ID not found." });
    }
        
    // --- Delay before checking the log ---
    console.log("\nWaiting 10 seconds before checking log...");
    await new Promise(resolve => setTimeout(resolve, 10000));
        
    // --- STEP 2: Get Broadcast Log (GET Request) ---
    const logPath = `/qontak/chat/v1/broadcasts/${broadcastId}/whatsapp/log`;
        
    console.log("\n==[ Getting Broadcast Log (GET) ]==");
    const logResult = await sendMekariRequest('GET', logPath);
        
    console.log("Status Code:", logResult.http_code);
    console.log("Response:", JSON.stringify(logResult.response, null, 4));

    return res.status(logResult.http_code).json(logResult.response);
});

app.listen(port, () => {
    console.log(`Server is running at http://localhost:${port}`);
    console.log("Send a POST request to http://localhost:3000/api/send-broadcast with the broadcast payload in the body.");
    console.log("Example payload:");
    console.log(JSON.stringify({
        "to_number": "6281xxxx",
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
    }, null, 4));
});
