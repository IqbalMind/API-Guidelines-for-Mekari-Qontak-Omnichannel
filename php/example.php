<?php

// --------------------------
// CONFIG
// --------------------------
// Replace these with your actual credentials and base URL
$client_id = "YOUR_QONTAK_CLIENT_ID";
$client_secret = "YOUR_QONTAK_CLIENT_SECRET";
$base_url = "https://api.mekari.com";

/**
 * Generate authentication headers for Mekari API using native PHP.
 *
 * @param string $method The HTTP method (e.g., 'POST', 'GET').
 * @param string $path The request path (e.g., '/qontak/chat/v1/broadcasts/whatsapp/direct').
 * @param string $client_id Your Mekari API Client ID.
 * @param string $client_secret Your Mekari API Client Secret.
 * @return array An array of header strings formatted for cURL.
 */
function generate_headers($method, $path, $client_id, $client_secret) {
    $datetime = gmdate("D, d M Y H:i:s") . " GMT";
    $request_line = "{$method} {$path} HTTP/1.1";
    $payload = "date: {$datetime}\n{$request_line}";
    $digest = hash_hmac('sha256', $payload, $client_secret, true);
    $signature = base64_encode($digest);
    $auth_header = sprintf(
        'hmac username="%s", algorithm="hmac-sha256", headers="date request-line", signature="%s"',
        $client_id,
        $signature
    );
    return [
        "Authorization: {$auth_header}",
        "Date: {$datetime}",
        "Content-Type: application/json"
    ];
}

/**
 * A universal function to send requests to the Mekari API.
 *
 * @param string $method The HTTP method ('GET', 'POST', etc.).
 * @param string $path The API endpoint path.
 * @param array|null $payload The request body for POST/PUT requests. Null for GET.
 * @return array An associative array containing the decoded response and the HTTP status code.
 */
function send_mekari_request($method, $path, $payload = null) {
    global $base_url, $client_id, $client_secret; // Access global config variables

    $url = $base_url . $path;
    $headers = generate_headers($method, $path, $client_id, $client_secret);

    $ch = curl_init($url);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_HTTPHEADER, $headers);

    // Configure cURL options based on the HTTP method
    switch (strtoupper($method)) {
        case 'POST':
            curl_setopt($ch, CURLOPT_POST, true);
            if ($payload) {
                curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($payload));
            }
            break;
        case 'GET':
            curl_setopt($ch, CURLOPT_HTTPGET, true);
            break;
        // Add other methods like PUT, DELETE as needed
    }

    $response = curl_exec($ch);
    $http_code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);

    return [
        'response' => json_decode($response, true),
        'http_code' => $http_code
    ];
}

// ------------------------------------------------------------------
// EXAMPLE USAGE: Qontak WhatsApp Broadcast
// ------------------------------------------------------------------

// --- STEP 1: Send Broadcast (POST Request) ---
$post_path = "/qontak/chat/v1/broadcasts/whatsapp/direct";
$post_payload = [
    "to_number" => "62xxxxx", // Replace with the recipient's actual phone number
    "to_name" => "Muhamad Iqbal",
    "message_template_id" => "fbd4da17-a20e-4248-993d-f95566ee10b2",
    "channel_integration_id" => "a2e9673a-44ac-493d-aac0-51c5a0bfb1a5",
    "language" => ["code" => "id"],
    "parameters" => [
        "body" => [
            ["key" => "1", "value" => "customer_name", "value_text" => "Iqbal"],
            ["key" => "2", "value" => "link_pdf", "value_text" => "https://cdn.qontak.com/uploads/message/file/e1380eaa-bae4-4fa7-b6fc-5ae27a7d324f/20241210175811_Invoice_report_for_Fajar_Taufik.pdf"]
        ]
    ]
];

echo "==[ Sending Broadcast (POST) ]==\n";
$post_result = send_mekari_request('POST', $post_path, $post_payload);

echo "Status Code: " . $post_result['http_code'] . "\n";
print_r($post_result['response']);

// Check if the broadcast was sent successfully
if ($post_result['http_code'] != 201) {
    echo "Failed to send broadcast.\n";
    exit();
}

// Extract the broadcast ID from the response
$broadcast_id = $post_result['response']["data"]["id"] ?? null;

if (!$broadcast_id) {
    echo "Broadcast ID not found in response.\n";
    exit();
}


// --- Delay before checking the log ---
echo "\nWaiting 10 seconds before checking log...\n";
sleep(10);


// --- STEP 2: Get Broadcast Log (GET Request) ---
$log_path = "/qontak/chat/v1/broadcasts/{$broadcast_id}/whatsapp/log";

echo "\n==[ Getting Broadcast Log (GET) ]==\n";
// For GET requests, the payload argument is omitted
$log_result = send_mekari_request('GET', $log_path);

echo "Status Code: " . $log_result['http_code'] . "\n";
print_r($log_result['response']);

echo PHP_EOL;

?>
