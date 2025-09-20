import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import java.security.InvalidKeyException;
import java.security.NoSuchAlgorithmException;
import java.time.ZoneOffset;
import java.time.ZonedDateTime;
import java.time.format.DateTimeFormatter;
import java.util.Base64;
import java.util.HashMap;
import java.util.Map;
import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import org.json.JSONArray;
import org.json.JSONObject;

public class Main {
    // --------------------------
    // CONFIG
    // --------------------------
    // Replace these with your actual credentials and base URL
    private static final String CLIENT_ID = "YOUR_QONTAK_CLIENT_ID";
    private static final String CLIENT_SECRET = "YOUR_QONTAK_CLIENT_SECRET";
    private static final String BASE_URL = "https://api.mekari.com";

    /**
     * Generate authentication headers for Mekari API using Java.
     * @param method The HTTP method (e.g., "POST", "GET").
     * @param path The request path (e.g., "/qontak/chat/v1/broadcasts/whatsapp/direct").
     * @param clientId Your Mekari API Client ID.
     * @param clientSecret Your Mekari API Client Secret.
     * @return A map of header strings.
     * @throws NoSuchAlgorithmException
     * @throws InvalidKeyException
     */
    public static Map<String, String> generateHeaders(String method, String path, String clientId, String clientSecret)
            throws NoSuchAlgorithmException, InvalidKeyException {
        // Mekari API requires RFC 1123 format for the Date header
        String datetimeStr = ZonedDateTime.now(ZoneOffset.UTC).format(DateTimeFormatter.RFC_1123_DATE_TIME);
        String requestLine = String.format("%s %s HTTP/1.1", method, path);
        String payload = String.format("date: %s\n%s", datetimeStr, requestLine);

        Mac mac = Mac.getInstance("HmacSHA256");
        SecretKeySpec secretKeySpec = new SecretKeySpec(clientSecret.getBytes(StandardCharsets.UTF_8), "HmacSHA256");
        mac.init(secretKeySpec);
        byte[] signatureBytes = mac.doFinal(payload.getBytes(StandardCharsets.UTF_8));
        String signature = Base64.getEncoder().encodeToString(signatureBytes);

        String authHeader = String.format("hmac username=\"%s\", algorithm=\"hmac-sha256\", headers=\"date request-line\", signature=\"%s\"",
                clientId, signature);

        Map<String, String> headers = new HashMap<>();
        headers.put("Authorization", authHeader);
        headers.put("Date", datetimeStr);
        headers.put("Content-Type", "application/json");
        return headers;
    }

    /**
     * A universal function to send requests to the Mekari API.
     * @param method The HTTP method ("GET", "POST", etc.).
     * @param path The API endpoint path.
     * @param payload The request body for POST/PUT requests (optional).
     * @return A map containing the decoded response and the HTTP status code.
     */
    public static Map<String, Object> sendMekariRequest(String method, String path, JSONObject payload) {
        Map<String, Object> result = new HashMap<>();
        try {
            URL url = new URL(BASE_URL + path);
            HttpURLConnection conn = (HttpURLConnection) url.openConnection();
            conn.setRequestMethod(method);

            Map<String, String> headers = generateHeaders(method, path, CLIENT_ID, CLIENT_SECRET);
            for (Map.Entry<String, String> entry : headers.entrySet()) {
                conn.setRequestProperty(entry.getKey(), entry.getValue());
            }

            if (payload != null) {
                conn.setDoOutput(true);
                try (OutputStream os = conn.getOutputStream()) {
                    byte[] input = payload.toString().getBytes(StandardCharsets.UTF_8);
                    os.write(input, 0, input.length);
                }
            }

            int responseCode = conn.getResponseCode();
            result.put("http_code", responseCode);

            BufferedReader in;
            if (responseCode >= 200 && responseCode < 300) {
                in = new BufferedReader(new InputStreamReader(conn.getInputStream()));
            } else {
                in = new BufferedReader(new InputStreamReader(conn.getErrorStream()));
            }

            String inputLine;
            StringBuilder response = new StringBuilder();
            while ((inputLine = in.readLine()) != null) {
                response.append(inputLine);
            }
            in.close();

            if (response.length() > 0) {
                result.put("response", new JSONObject(response.toString()).toMap());
            } else {
                result.put("response", new HashMap<>());
            }
        } catch (Exception e) {
            e.printStackTrace();
            result.put("http_code", 500);
            result.put("response", new HashMap<>());
        }
        return result;
    }

    // ------------------------------------------------------------------
    // EXAMPLE USAGE: Qontak WhatsApp Broadcast
    // ------------------------------------------------------------------
    public static void main(String[] args) throws InterruptedException {
        // --- STEP 1: Send Broadcast (POST Request) ---
        String postPath = "/qontak/chat/v1/broadcasts/whatsapp/direct";
        JSONObject postPayload = new JSONObject();
        postPayload.put("to_number", "6281xxxx");
        postPayload.put("to_name", "Muhamad Iqbal");
        postPayload.put("message_template_id", "fbd4da17-a20e-4248-993d-f95566ee10b2");
        postPayload.put("channel_integration_id", "a2e9673a-44ac-493d-aac0-51c5a0bfb1a5");
        postPayload.put("language", new JSONObject().put("code", "id"));

        JSONArray bodyParams = new JSONArray();
        bodyParams.put(new JSONObject().put("key", "1").put("value", "customer_name").put("value_text", "Iqbal"));
        bodyParams.put(new JSONObject().put("key", "2").put("value", "link_pdf").put("value_text", "https://cdn.qontak.com/uploads/message/file/e1380eaa-bae4-4fa7-b6fc-5ae27a7d324f/20241210175811_Invoice_report_for_Fajar_Taufik.pdf"));
        JSONObject parameters = new JSONObject();
        parameters.put("body", bodyParams);
        postPayload.put("parameters", parameters);

        System.out.println("==[ Sending Broadcast (POST) ]==");
        Map<String, Object> postResult = sendMekariRequest("POST", postPath, postPayload);

        System.out.println("Status Code: " + postResult.get("http_code"));
        System.out.println(new JSONObject((Map<String, Object>) postResult.get("response")).toString(4));

        if ((int) postResult.get("http_code") != 201) {
            System.err.println("Failed to send broadcast.");
            return;
        }

        String broadcastId = (String) ((Map<String, Object>) postResult.get("response")).get("id");
        if (broadcastId == null) {
            System.err.println("Broadcast ID not found in response.");
            return;
        }

        System.out.println("\nWaiting 10 seconds before checking log...");
        Thread.sleep(10000);

        // --- STEP 2: Get Broadcast Log (GET Request) ---
        String logPath = String.format("/qontak/chat/v1/broadcasts/%s/whatsapp/log", broadcastId);

        System.out.println("\n==[ Getting Broadcast Log (GET) ]==");
        Map<String, Object> logResult = sendMekariRequest("GET", logPath, null);

        System.out.println("Status Code: " + logResult.get("http_code"));
        System.out.println(new JSONObject((Map<String, Object>) logResult.get("response")).toString(4));
    }
}
