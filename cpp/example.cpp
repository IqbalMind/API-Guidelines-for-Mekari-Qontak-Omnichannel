#include <iostream>
#include <string>
#include <vector>
#include <map>
#include <iomanip>
#include <ctime>
#include <sstream>

// Requires CPR (C++ Requests library)
#include <cpr/cpr.h>

// For HMAC SHA256, requires OpenSSL
#include <openssl/hmac.h>
#include <openssl/evp.h>
#include <openssl/bio.h>
#include <openssl/buffer.h>

// --------------------------
// CONFIG
// --------------------------
// Replace these with your actual credentials and base URL
const std::string CLIENT_ID = "YOUR_QONTAK_CLIENT_ID";
const std::string CLIENT_SECRET = "YOUR_QONTAK_CLIENT_SECRET";
const std::string BASE_URL = "https://api.mekari.com";

/**
 * @brief Generate HMAC-SHA256 signature and Base64 encode it.
 * * @param key The secret key.
 * @param data The data to sign.
 * @return std::string The Base64 encoded signature.
 */
std::string hmac_sha256(const std::string& key, const std::string& data) {
    unsigned char* digest;
    digest = HMAC(EVP_sha256(), key.c_str(), key.length(), (unsigned char*)data.c_str(), data.length(), NULL, NULL);

    BIO *b64 = BIO_new(BIO_f_base64());
    BIO *mem = BIO_new(BIO_s_mem());
    BIO_push(b64, mem);
    BIO_write(b64, digest, 32); // SHA256 produces a 32-byte digest
    BIO_flush(b64);

    BUF_MEM *bufferPtr;
    BIO_get_mem_ptr(b64, &bufferPtr);
    std::string result(bufferPtr->data, bufferPtr->length);

    BIO_free_all(b64);

    // Remove the newline character that BIO_f_base64 adds
    if (!result.empty() && result.back() == '\n') {
        result.pop_back();
    }

    return result;
}

/**
 * @brief Generate authentication headers for Mekari API.
 * * @param method The HTTP method (e.g., "POST", "GET").
 * @param path The request path.
 * @param client_id The API Client ID.
 * @param client_secret The API Client Secret.
 * @return cpr::Header A CPR header object.
 */
cpr::Header generate_headers(const std::string& method, const std::string& path, 
                             const std::string& client_id, const std::string& client_secret) {
    // Mekari API requires RFC 1123 format for the Date header
    std::time_t t = std::time(nullptr);
    std::tm* gmt = std::gmtime(&t);
    std::stringstream ss;
    ss << std::put_time(gmt, "%a, %d %b %Y %H:%M:%S GMT");
    std::string datetime_str = ss.str();

    std::string request_line = method + " " + path + " HTTP/1.1";
    std::string payload = "date: " + datetime_str + "\n" + request_line;

    std::string signature = hmac_sha256(client_secret, payload);

    std::string auth_header = "hmac username=\"" + client_id + "\", "
                              "algorithm=\"hmac-sha256\", "
                              "headers=\"date request-line\", "
                              "signature=\"" + signature + "\"";

    return cpr::Header{
        {"Authorization", auth_header},
        {"Date", datetime_str},
        {"Content-Type", "application/json"}
    };
}

/**
 * @brief A universal function to send requests to the Mekari API.
 * * @param method The HTTP method ("GET", "POST", etc.).
 * @param path The API endpoint path.
 * @param json_payload The request body for POST/PUT requests (optional).
 * @return cpr::Response The CPR response object.
 */
cpr::Response send_mekari_request(const std::string& method, const std::string& path, const std::string& json_payload = "") {
    std::string url = BASE_URL + path;
    cpr::Header headers = generate_headers(method, path, CLIENT_ID, CLIENT_SECRET);

    if (method == "POST") {
        return cpr::Post(cpr::Url{url}, headers, cpr::Body{json_payload});
    } else if (method == "GET") {
        return cpr::Get(cpr::Url{url}, headers);
    }
    // Add other methods here as needed
    return cpr::Response();
}

// ------------------------------------------------------------------
// EXAMPLE USAGE: Qontak WhatsApp Broadcast
// ------------------------------------------------------------------
int main() {
    // --- STEP 1: Send Broadcast (POST Request) ---
    std::string post_path = "/qontak/chat/v1/broadcasts/whatsapp/direct";
    std::string post_payload = R"({
        "to_number": "6281xxxx",
        "to_name": "Muhamad Iqbal",
        "message_template_id": "fbd4da17-a20e-4248-993d-f95566ee10b2",
        "channel_integration_id": "a2e9673a-44ac-493d-aac0-51c5a0bfb1a5",
        "language": {"code": "id"},
        "parameters": {
            "body": [
                {"key": "1", "value": "customer_name", "value_text": "Iqbal"},
                {"key": "2", "value": "link_pdf", "value_text": "https://cdn.qontak.com/uploads/message/file/e1380eaa-bae4-4fa7-b6fc-5ae27a7d324f/20241210175811_Invoice_report_for_Fajar_Taufik.pdf"}
            ]
        }
    })";

    std::cout << "==[ Sending Broadcast (POST) ]==" << std::endl;
    cpr::Response post_response = send_mekari_request("POST", post_path, post_payload);

    std::cout << "Status Code: " << post_response.status_code << std::endl;
    std::cout << "Response Body: " << post_response.text << std::endl;

    if (post_response.status_code != 201) {
        std::cerr << "Failed to send broadcast." << std::endl;
        return 1;
    }

    // A simple way to get the broadcast ID from the JSON string.
    // For a real application, consider using a JSON parsing library like nlohmann/json.
    std::string broadcast_id;
    size_t id_pos = post_response.text.find("\"id\":");
    if (id_pos != std::string::npos) {
        size_t start = post_response.text.find("\"", id_pos + 5);
        size_t end = post_response.text.find("\"", start + 1);
        if (start != std::string::npos && end != std::string::npos) {
            broadcast_id = post_response.text.substr(start + 1, end - start - 1);
        }
    }

    if (broadcast_id.empty()) {
        std::cerr << "Broadcast ID not found in response." << std::endl;
        return 1;
    }

    std::cout << "\nWaiting 10 seconds before checking log..." << std::endl;
    std::this_thread::sleep_for(std::chrono::seconds(10));

    // --- STEP 2: Get Broadcast Log (GET Request) ---
    std::string log_path = "/qontak/chat/v1/broadcasts/" + broadcast_id + "/whatsapp/log";
    
    std::cout << "\n==[ Getting Broadcast Log (GET) ]==" << std::endl;
    cpr::Response log_response = send_mekari_request("GET", log_path);

    std::cout << "Status Code: " << log_response.status_code << std::endl;
    std::cout << "Response Body: " << log_response.text << std::endl;

    return 0;
}
