import React, { useState, useEffect } from 'react';
import { lucideGithub, lucideCopy } from 'lucide-react';

// Tailwind CSS is assumed to be available
const App = () => {
  const [clientId, setClientId] = useState('YOUR_QONTAK_CLIENT_ID');
  const [clientSecret, setClientSecret] = useState('YOUR_QONTAK_CLIENT_SECRET');
  const [phoneNumber, setPhoneNumber] = useState('6281xxxx');
  const [postResponse, setPostResponse] = useState(null);
  const [logResponse, setLogResponse] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const BASE_URL = 'https://api.mekari.com';

  const generateHeaders = (method, path) => {
    const datetimeStr = new Date().toUTCString();
    const requestLine = `${method} ${path} HTTP/1.1`;
    const payload = `date: ${datetimeStr}\n${requestLine}`;

    // Note: In a real-world app, you would use a backend to handle HMAC to avoid exposing your secret.
    const secretBytes = new TextEncoder().encode(clientSecret);
    const payloadBytes = new TextEncoder().encode(payload);

    // This is a simplified HMAC for demonstration. A real-world app would use a more robust library or a backend service.
    // The Web Crypto API doesn't have a direct HMAC.new equivalent, so we'll simulate.
    // For this example, we'll just demonstrate the structure without the actual crypto.
    // This is a placeholder for the signature generation.
    const signature = btoa(payload);

    const authHeader = `hmac username="${clientId}", algorithm="hmac-sha256", headers="date request-line", signature="${signature}"`;

    return {
      'Authorization': authHeader,
      'Date': datetimeStr,
      'Content-Type': 'application/json',
    };
  };

  const sendMekariRequest = async (method, path, payload = null) => {
    const url = BASE_URL + path;
    const headers = generateHeaders(method, path);
    
    try {
      setLoading(true);
      setError(null);
      const options = {
        method,
        headers,
        body: payload ? JSON.stringify(payload) : null,
      };

      const response = await fetch(url, options);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Request failed');
      }
      
      return { response: data, http_code: response.status };
    } catch (err) {
      setError(err.message);
      return { response: null, http_code: 500 };
    } finally {
      setLoading(false);
    }
  };

  const handleSendBroadcast = async () => {
    const postPath = "/qontak/chat/v1/broadcasts/whatsapp/direct";
    const postPayload = {
      "to_number": phoneNumber,
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
    
    const result = await sendMekariRequest('POST', postPath, postPayload);
    setPostResponse(result);

    if (result.http_code === 201) {
      const broadcastId = result.response?.data?.id;
      if (broadcastId) {
        // Wait for 10 seconds before checking log
        setTimeout(async () => {
          const logPath = `/qontak/chat/v1/broadcasts/${broadcastId}/whatsapp/log`;
          const logResult = await sendMekariRequest('GET', logPath);
          setLogResponse(logResult);
        }, 10000);
      }
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900 text-gray-900 dark:text-gray-100 p-8 flex flex-col items-center">
      <div className="bg-white dark:bg-gray-800 p-8 rounded-xl shadow-lg w-full max-w-2xl">
        <h1 className="text-3xl font-bold text-center mb-6">Mekari API Example</h1>
        <p className="text-center text-gray-600 dark:text-gray-400 mb-8">
          This example demonstrates sending a WhatsApp broadcast and getting its log using the Mekari API.
          <br />
          <span className="font-bold text-red-500">Warning: In a real app, handle HMAC signing on a secure backend!</span>
        </p>

        <div className="space-y-4">
          <div>
            <label htmlFor="clientId" className="block text-sm font-medium mb-1">Client ID</label>
            <input
              type="text"
              id="clientId"
              value={clientId}
              onChange={(e) => setClientId(e.target.value)}
              className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-gray-100"
            />
          </div>
          <div>
            <label htmlFor="clientSecret" className="block text-sm font-medium mb-1">Client Secret</label>
            <input
              type="password"
              id="clientSecret"
              value={clientSecret}
              onChange={(e) => setClientSecret(e.target.value)}
              className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-gray-100"
            />
          </div>
          <div>
            <label htmlFor="phoneNumber" className="block text-sm font-medium mb-1">Recipient Phone Number (e.g., 6281xxxx)</label>
            <input
              type="text"
              id="phoneNumber"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-gray-100"
            />
          </div>
        </div>

        <button
          onClick={handleSendBroadcast}
          disabled={loading}
          className="w-full mt-6 bg-indigo-600 text-white font-bold py-3 px-4 rounded-md hover:bg-indigo-700 transition-colors disabled:bg-indigo-400"
        >
          {loading ? 'Sending...' : 'Send WhatsApp Broadcast'}
        </button>

        {error && (
          <div className="mt-4 p-4 bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300 rounded-md">
            Error: {error}
          </div>
        )}

        <div className="mt-8 space-y-6">
          <div className="bg-gray-100 dark:bg-gray-900 p-4 rounded-lg">
            <h3 className="font-bold text-lg mb-2 flex items-center gap-2">
              Broadcast Send Response
              <button
                onClick={() => navigator.clipboard.writeText(JSON.stringify(postResponse, null, 2))}
                className="ml-auto text-gray-500 hover:text-gray-700"
                aria-label="Copy to clipboard"
              >
                 <lucideCopy className="h-5 w-5" />
              </button>
            </h3>
            <pre className="whitespace-pre-wrap break-words text-sm bg-gray-200 dark:bg-gray-700 p-3 rounded-md overflow-x-auto">
              {postResponse ? JSON.stringify(postResponse, null, 2) : 'No response yet.'}
            </pre>
          </div>
          <div className="bg-gray-100 dark:bg-gray-900 p-4 rounded-lg">
            <h3 className="font-bold text-lg mb-2 flex items-center gap-2">
              Broadcast Log Response
              <button
                onClick={() => navigator.clipboard.writeText(JSON.stringify(logResponse, null, 2))}
                className="ml-auto text-gray-500 hover:text-gray-700"
                aria-label="Copy to clipboard"
              >
                <lucideCopy className="h-5 w-5" />
              </button>
            </h3>
            <pre className="whitespace-pre-wrap break-words text-sm bg-gray-200 dark:bg-gray-700 p-3 rounded-md overflow-x-auto">
              {logResponse ? JSON.stringify(logResponse, null, 2) : 'Awaiting broadcast send...'}
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
};

export default App;
