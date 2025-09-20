package main

import (
	"bytes"
	"crypto/hmac"
	"crypto/sha256"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"io/ioutil"
	"log"
	"net/http"
	"time"
)

// --------------------------
// CONFIG
// --------------------------
// Replace these with your actual credentials and base URL
const (
	clientID     = "YOUR_QONTAK_CLIENT_ID"
	clientSecret = "YOUR_QONTAK_CLIENT_SECRET"
	baseURL      = "https://api.mekari.com"
)

// generateHeaders generates authentication headers for Mekari API.
func generateHeaders(method, path, clientID, clientSecret string) (http.Header, error) {
	// Mekari API requires RFC 1123 format for the Date header
	datetimeStr := time.Now().UTC().Format(http.TimeFormat)
	requestLine := fmt.Sprintf("%s %s HTTP/1.1", method, path)
	payload := fmt.Sprintf("date: %s\n%s", datetimeStr, requestLine)

	h := hmac.New(sha256.New, []byte(clientSecret))
	h.Write([]byte(payload))
	signature := base64.StdEncoding.EncodeToString(h.Sum(nil))

	authHeader := fmt.Sprintf(`hmac username="%s", algorithm="hmac-sha256", headers="date request-line", signature="%s"`, clientID, signature)

	headers := make(http.Header)
	headers.Add("Authorization", authHeader)
	headers.Add("Date", datetimeStr)
	headers.Add("Content-Type", "application/json")
	return headers, nil
}

// sendMekariRequest is a universal function to send requests to the Mekari API.
func sendMekariRequest(method, path string, payload interface{}) (map[string]interface{}, int, error) {
	url := baseURL + path
	headers, err := generateHeaders(method, path, clientID, clientSecret)
	if err != nil {
		return nil, 0, fmt.Errorf("failed to generate headers: %w", err)
	}

	var reqBody []byte
	if payload != nil {
		reqBody, err = json.Marshal(payload)
		if err != nil {
			return nil, 0, fmt.Errorf("failed to marshal payload: %w", err)
		}
	}

	req, err := http.NewRequest(method, url, bytes.NewBuffer(reqBody))
	if err != nil {
		return nil, 0, fmt.Errorf("failed to create request: %w", err)
	}
	req.Header = headers

	client := &http.Client{Timeout: 30 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		return nil, 0, fmt.Errorf("failed to make request: %w", err)
	}
	defer resp.Body.Close()

	body, err := ioutil.ReadAll(resp.Body)
	if err != nil {
		return nil, resp.StatusCode, fmt.Errorf("failed to read response body: %w", err)
	}

	var result map[string]interface{}
	if len(body) > 0 {
		if err := json.Unmarshal(body, &result); err != nil {
			return nil, resp.StatusCode, fmt.Errorf("failed to unmarshal response: %w", err)
		}
	}

	return result, resp.StatusCode, nil
}

// ------------------------------------------------------------------
// EXAMPLE USAGE: Qontak WhatsApp Broadcast
// ------------------------------------------------------------------
func main() {
	// --- STEP 1: Send Broadcast (POST Request) ---
	postPath := "/qontak/chat/v1/broadcasts/whatsapp/direct"
	postPayload := map[string]interface{}{
		"to_number":              "6281xxxx",
		"to_name":                "Muhamad Iqbal",
		"message_template_id":    "fbd4da17-a20e-4248-993d-f95566ee10b2",
		"channel_integration_id": "a2e9673a-44ac-493d-aac0-51c5a0bfb1a5",
		"language":               map[string]string{"code": "id"},
		"parameters": map[string]interface{}{
			"body": []map[string]string{
				{"key": "1", "value": "customer_name", "value_text": "Iqbal"},
				{"key": "2", "value": "link_pdf", "value_text": "https://cdn.qontak.com/uploads/message/file/e1380eaa-bae4-4fa7-b6fc-5ae27a7d324f/20241210175811_Invoice_report_for_Fajar_Taufik.pdf"},
			},
		},
	}

	fmt.Println("==[ Sending Broadcast (POST) ]==")
	postResult, postCode, err := sendMekariRequest(http.MethodPost, postPath, postPayload)
	if err != nil {
		log.Fatalf("Error sending broadcast: %v", err)
	}

	fmt.Printf("Status Code: %d\n", postCode)
	prettyJSON, _ := json.MarshalIndent(postResult, "", "    ")
	fmt.Println(string(prettyJSON))

	if postCode != http.StatusCreated {
		log.Fatal("Failed to send broadcast.")
	}

	broadcastID, ok := postResult["data"].(map[string]interface{})["id"].(string)
	if !ok || broadcastID == "" {
		log.Fatal("Broadcast ID not found in response.")
	}

	fmt.Println("\nWaiting 10 seconds before checking log...")
	time.Sleep(10 * time.Second)

	// --- STEP 2: Get Broadcast Log (GET Request) ---
	logPath := fmt.Sprintf("/qontak/chat/v1/broadcasts/%s/whatsapp/log", broadcastID)

	fmt.Println("\n==[ Getting Broadcast Log (GET) ]==")
	logResult, logCode, err := sendMekariRequest(http.MethodGet, logPath, nil)
	if err != nil {
		log.Fatalf("Error getting log: %v", err)
	}

	fmt.Printf("Status Code: %d\n", logCode)
	prettyJSON, _ = json.MarshalIndent(logResult, "", "    ")
	fmt.Println(string(prettyJSON))
}
