# frozen_string_literal: true

require 'httparty'
require 'openssl'
require 'base64'
require 'time'
require 'json'

# --------------------------
# CONFIG
# --------------------------
# Replace these with your actual credentials and base URL
CLIENT_ID = "YOUR_QONTAK_CLIENT_ID"
CLIENT_SECRET = "YOUR_QONTAK_CLIENT_SECRET"
BASE_URL = "https://api.mekari.com"

# Generate authentication headers for Mekari API using Ruby.
def generate_headers(method, path, client_id, client_secret)
  # Mekari API requires RFC 1123 format for the Date header
  datetime_str = Time.now.utc.rfc822
  request_line = "#{method} #{path} HTTP/1.1"
  payload = "date: #{datetime_str}\n#{request_line}"

  digest = OpenSSL::HMAC.digest('sha256', client_secret, payload)
  signature = Base64.strict_encode64(digest)

  auth_header = "hmac username=\"#{client_id}\", " \
                "algorithm=\"hmac-sha256\", " \
                "headers=\"date request-line\", " \
                "signature=\"#{signature}\""

  {
    "Authorization" => auth_header,
    "Date" => datetime_str,
    "Content-Type" => "application/json"
  }
end

# A universal function to send requests to the Mekari API.
def send_mekari_request(method, path, payload: nil)
  url = BASE_URL + path
  headers = generate_headers(method, path, CLIENT_ID, CLIENT_SECRET)

  response = case method.upcase
  when 'POST'
    HTTParty.post(url, headers: headers, body: payload.to_json)
  when 'GET'
    HTTParty.get(url, headers: headers)
  else
    puts "Unsupported method: #{method}"
    return { 'response' => {}, 'http_code' => 405 }
  end

  {
    'response' => response.parsed_response,
    'http_code' => response.code
  }
rescue HTTParty::Error => e
  puts "HTTParty Error: #{e.message}"
  { 'response' => {}, 'http_code' => 500 }
rescue StandardError => e
  puts "Something went wrong: #{e.message}"
  { 'response' => {}, 'http_code' => 500 }
end

# ------------------------------------------------------------------
# EXAMPLE USAGE: Qontak WhatsApp Broadcast
# ------------------------------------------------------------------

# --- STEP 1: Send Broadcast (POST Request) ---
post_path = "/qontak/chat/v1/broadcasts/whatsapp/direct"
post_payload = {
  "to_number" => "6281xxxx",
  "to_name" => "Muhamad Iqbal",
  "message_template_id" => "fbd4da17-a20e-4248-993d-f95566ee10b2",
  "channel_integration_id" => "a2e9673a-44ac-493d-aac0-51c5a0bfb1a5",
  "language" => { "code" => "id" },
  "parameters" => {
    "body" => [
      { "key" => "1", "value" => "customer_name", "value_text" => "Iqbal" },
      { "key" => "2", "value" => "link_pdf", "value_text" => "https://cdn.qontak.com/uploads/message/file/e1380eaa-bae4-4fa7-b6fc-5ae27a7d324f/20241210175811_Invoice_report_for_Fajar_Taufik.pdf" }
    ]
  }
}

puts "==[ Sending Broadcast (POST) ]=="
post_result = send_mekari_request('POST', post_path, payload: post_payload)

puts "Status Code: #{post_result['http_code']}"
puts JSON.pretty_generate(post_result['response'])

if post_result['http_code'] != 201
  puts "Failed to send broadcast."
  exit
end

broadcast_id = post_result.dig('response', 'data', 'id')

unless broadcast_id
  puts "Broadcast ID not found in response."
  exit
end

# --- Delay before checking the log ---
puts "\nWaiting 10 seconds before checking log..."
sleep(10)

# --- STEP 2: Get Broadcast Log (GET Request) ---
log_path = "/qontak/chat/v1/broadcasts/#{broadcast_id}/whatsapp/log"

puts "\n==[ Getting Broadcast Log (GET) ]=="
log_result = send_mekari_request('GET', log_path)

puts "Status Code: #{log_result['http_code']}"
puts JSON.pretty_generate(log_result['response'])
