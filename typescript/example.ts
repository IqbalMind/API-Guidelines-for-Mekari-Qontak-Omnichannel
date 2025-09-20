// This is a single-file TypeScript example.
// To run this, you would need to set up a Node.js project with TypeScript.

import * as crypto from 'crypto';
import * as https from 'https';
import * as url from 'url';

// --------------------------
// CONFIG
// --------------------------
const CLIENT_ID: string = "YOUR_QONTAK_CLIENT_ID";
const CLIENT_SECRET: string = "YOUR_QONTAK_CLIENT_SECRET";
const BASE_URL: string = "https://api.mekari.com";

interface ApiResponse {
    response: any;
    http_code: number;
}

/**
 * Generate authentication headers for Mekari API using TypeScript.
 * @param method The HTTP method (e.g., 'POST', 'GET').
 * @param path The request path (e.g., '/qontak/chat/v1/broadcasts/whatsapp/direct').
 * @param clientId Your Mekari API Client ID.
 * @param clientSecret Your Mekari API Client Secret.
 * @returns A dictionary of header strings.
 */
function generateHeaders(method: string, path: string, clientId: string, clientSecret: string): https.RequestOptions['headers'] {
    const datetimeStr: string = new Date().toUTCString();
    const requestLine: string = `${method} ${path} HTTP/1.1`;
    const payload: string = `date: ${datetimeStr}\n${requestLine}`;

    const hmac: crypto.Hmac = crypto.createHmac('sha256', clientSecret);
    hmac.update(payload);
    const signature: string = hmac.digest('base64');

    const authHeader: string = `hmac username="${clientId}", algorithm="hmac-sha256", headers="date request-line", signature="${signature}"`;

    return {
        'Authorization': authHeader,
        'Date': datetimeStr,
        'Content-Type': 'application/json'
    };
}

/**
 * A universal function to send requests to the Mekari API.
 * @param method The HTTP method ('GET', 'POST', etc.).
 * @param path The API endpoint path.
 * @param payload The request body for POST/PUT requests (optional).
 * @returns A Promise that resolves with the API response.
 */
function sendMekariRequest(method: string, path: string, payload: any = null): Promise<ApiResponse> {
    const fullUrl = BASE_URL + path;
    const parsedUrl = url.parse(fullUrl);
    
    const headers = generateHeaders(method, parsedUrl.path!, CLIENT_ID, CLIENT_SECRET);
    const postData = payload ? JSON.stringify(payload) : null;

    const options: https.RequestOptions = {
        hostname: parsedUrl.hostname,
        path: parsedUrl.path,
        method: method,
        headers: headers
    };

    if (postData) {
        options.headers!['Content-Length'] = Buffer.byteLength(postData);
    }
    
    return new Promise((resolve, reject) => {
        const req = https.request(options, (res) => {
            let data = '';
            res.on('data', (chunk) => {
                data += chunk;
            });

            res.on('end', () => {
                let responseData;
                try {
                    responseData = JSON.parse(data);
                } catch (e) {
                    responseData = { message: 'Failed to parse JSON response' };
                }

                resolve({
                    response: responseData,
                    http_code: res.statusCode || 500
                });
            });
        });

        req.on('error', (e) => {
            reject({
                response: { message: e.message },
                http_code: 500
            });
        });

        if (postData) {
            req.write(postData);
        }
        req.end();
    });
}

// ------------------------------------------------------------------
// EXAMPLE USAGE: Qontak WhatsApp Broadcast
// ------------------------------------------------------------------
(async () => {
    // --- STEP 1: Send Broadcast (POST Request) ---
    const postPath: string = "/qontak/chat/v1/broadcasts/whatsapp/direct";
    const postPayload: any = {
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
    };

    console.log("==[ Sending Broadcast (POST) ]==");
    const postResult = await sendMekariRequest('POST', postPath, postPayload);
    
    console.log(`Status Code: ${postResult.http_code}`);
    console.log(JSON.stringify(postResult.response, null, 4));

    if (postResult.http_code !== 201) {
        console.error("Failed to send broadcast.");
        return;
    }
        
    const broadcastId: string = postResult.response?.data?.id;
    
    if (!broadcastId) {
        console.error("Broadcast ID not found in response.");
        return;
    }
        
    // --- Delay before checking the log ---
    console.log("\nWaiting 10 seconds before checking log...");
    await new Promise(resolve => setTimeout(resolve, 10000));
        
    // --- STEP 2: Get Broadcast Log (GET Request) ---
    const logPath: string = `/qontak/chat/v1/broadcasts/${broadcastId}/whatsapp/log`;
        
    console.log("\n==[ Getting Broadcast Log (GET) ]==");
    const logResult = await sendMekariRequest('GET', logPath);
        
    console.log(`Status Code: ${logResult.http_code}`);
    console.log(JSON.stringify(logResult.response, null, 4));
})();
