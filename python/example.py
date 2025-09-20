import hmac
import hashlib
import base64
import datetime
import requests
import json

# --------------------------
# CONFIG
# --------------------------
# Replace these with your actual credentials and base URL
CLIENT_ID = "YOUR_QONTAK_CLIENT_ID"
CLIENT_SECRET = "YOUR_QONTAK_CLIENT_SECRET"
BASE_URL = "https://api.mekari.com"

def generate_headers(method, path, client_id, client_secret):
    """
    Generate authentication headers for Mekari API using Python.

    Args:
        method (str): The HTTP method (e.g., 'POST', 'GET').
        path (str): The request path (e.g., '/qontak/chat/v1/broadcasts/whatsapp/direct').
        client_id (str): Your Mekari API Client ID.
        client_secret (str): Your Mekari API Client Secret.

    Returns:
        dict: A dictionary of header strings.
    """
    # Mekari API requires RFC 1123 format for the Date header
    datetime_str = datetime.datetime.utcnow().strftime('%a, %d %b %Y %H:%M:%S GMT')
    request_line = f"{method} {path} HTTP/1.1"
    
    # The payload is the date header and the request line, separated by a newline
    payload = f"date: {datetime_str}\n{request_line}"

    # Generate the HMAC-SHA256 signature
    digest = hmac.new(
        client_secret.encode('utf-8'),
        payload.encode('utf-8'),
        hashlib.sha256
    ).digest()
    
    signature = base64.b64encode(digest).decode('utf-8')
    
    auth_header = (
        f'hmac username="{client_id}", '
        f'algorithm="hmac-sha256", '
        f'headers="date request-line", '
        f'signature="{signature}"'
    )
    
    return {
        "Authorization": auth_header,
        "Date": datetime_str,
        "Content-Type": "application/json"
    }

def send_mekari_request(method, path, payload=None):
    """
    A universal function to send requests to the Mekari API.

    Args:
        method (str): The HTTP method ('GET', 'POST', etc.).
        path (str): The API endpoint path.
        payload (dict, optional): The request body for POST/PUT requests. Defaults to None.

    Returns:
        dict: An associative array containing the decoded response and the HTTP status code.
    """
    url = BASE_URL + path
    headers = generate_headers(method, path, CLIENT_ID, CLIENT_SECRET)

    try:
        if method.upper() == 'POST':
            response = requests.post(url, headers=headers, data=json.dumps(payload))
        elif method.upper() == 'GET':
            response = requests.get(url, headers=headers)
        # Add other methods like PUT, DELETE here if needed

        response.raise_for_status()  # Raises an exception for bad status codes (4xx or 5xx)
        
        return {
            'response': response.json(),
            'http_code': response.status_code
        }
    except requests.exceptions.HTTPError as errh:
        print(f"Http Error: {errh}")
        return {'response': None, 'http_code': errh.response.status_code}
    except requests.exceptions.ConnectionError as errc:
        print(f"Error Connecting: {errc}")
        return {'response': None, 'http_code': 500}
    except requests.exceptions.Timeout as errt:
        print(f"Timeout Error: {errt}")
        return {'response': None, 'http_code': 408}
    except requests.exceptions.RequestException as err:
        print(f"Something went wrong: {err}")
        return {'response': None, 'http_code': 500}

# ------------------------------------------------------------------
# EXAMPLE USAGE: Qontak WhatsApp Broadcast
# ------------------------------------------------------------------

if __name__ == "__main__":
    # --- STEP 1: Send Broadcast (POST Request) ---
    post_path = "/qontak/chat/v1/broadcasts/whatsapp/direct"
    post_payload = {
        "to_number": "6281xxxx",  # Replace with the recipient's actual phone number
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
    }

    print("==[ Sending Broadcast (POST) ]==")
    post_result = send_mekari_request('POST', post_path, post_payload)
    
    print(f"Status Code: {post_result['http_code']}")
    print(json.dumps(post_result['response'], indent=4))
    
    # Check if the broadcast was sent successfully
    if post_result['http_code'] != 201:
        print("Failed to send broadcast.")
        exit()
        
    broadcast_id = post_result['response'].get("data", {}).get("id")
    
    if not broadcast_id:
        print("Broadcast ID not found in response.")
        exit()
        
    # --- Delay before checking the log ---
    print("\nWaiting 10 seconds before checking log...")
    import time
    time.sleep(10)
    
    # --- STEP 2: Get Broadcast Log (GET Request) ---
    log_path = f"/qontak/chat/v1/broadcasts/{broadcast_id}/whatsapp/log"
    
    print("\n==[ Getting Broadcast Log (GET) ]==")
    log_result = send_mekari_request('GET', log_path)
    
    print(f"Status Code: {log_result['http_code']}")
    print(json.dumps(log_result['response'], indent=4))
