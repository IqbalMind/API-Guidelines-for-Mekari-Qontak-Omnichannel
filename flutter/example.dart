import 'dart:convert';
import 'package:crypto/crypto.dart';
import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;
import 'package:intl/intl.dart';

// --------------------------
// CONFIG
// --------------------------
const String _clientId = "YOUR_QONTAK_CLIENT_ID";
const String _clientSecret = "YOUR_QONTAK_CLIENT_SECRET";
const String _baseUrl = "https://api.mekari.com";

void main() {
  runApp(const MyApp());
}

class MyApp extends StatelessWidget {
  const MyApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Mekari API Example',
      theme: ThemeData(
        primarySwatch: Colors.blue,
      ),
      home: const ApiExampleScreen(),
    );
  }
}

class ApiExampleScreen extends StatefulWidget {
  const ApiExampleScreen({super.key});

  @override
  State<ApiExampleScreen> createState() => _ApiExampleScreenState();
}

class _ApiExampleScreenState extends State<ApiExampleScreen> {
  final TextEditingController _phoneNumberController = TextEditingController(text: '6281xxxx');
  String _postResponse = 'No response yet.';
  String _logResponse = 'Awaiting broadcast send...';
  bool _isLoading = false;

  @override
  void dispose() {
    _phoneNumberController.dispose();
    super.dispose();
  }

  /// Generate authentication headers for Mekari API using Flutter.
  Map<String, String> _generateHeaders(String method, String path) {
    final dateFormat = DateFormat('EEE, dd MMM yyyy HH:mm:ss', 'en_US').add_jmz();
    final datetimeStr = dateFormat.format(DateTime.now().toUtc());
    final requestLine = '$method $path HTTP/1.1';
    final payload = 'date: $datetimeStr\n$requestLine';

    final hmacSha256 = Hmac(sha256, utf8.encode(_clientSecret));
    final signatureBytes = hmacSha256.convert(utf8.encode(payload));
    final signature = base64Encode(signatureBytes);

    final authHeader = 'hmac username="$_clientId", algorithm="hmac-sha256", headers="date request-line", signature="$signature"';

    return {
      "Authorization": authHeader,
      "Date": datetimeStr,
      "Content-Type": "application/json",
    };
  }

  /// A universal function to send requests to the Mekari API.
  Future<Map<String, dynamic>> _sendMekariRequest(String method, String path, {Map<String, dynamic>? payload}) async {
    final url = Uri.parse(_baseUrl + path);
    final headers = _generateHeaders(method, path);

    try {
      http.Response response;
      if (method.toUpperCase() == 'POST') {
        response = await http.post(
          url,
          headers: headers,
          body: jsonEncode(payload),
        );
      } else {
        response = await http.get(url, headers: headers);
      }
      
      final dynamic decodedResponse = jsonDecode(response.body);
      return {
        'response': decodedResponse,
        'http_code': response.statusCode,
      };
    } catch (e) {
      debugPrint('Error: $e');
      return {
        'response': {'message': e.toString()},
        'http_code': 500,
      };
    }
  }

  // ------------------------------------------------------------------
  // EXAMPLE USAGE: Qontak WhatsApp Broadcast
  // ------------------------------------------------------------------
  Future<void> _sendBroadcastAndCheckLog() async {
    setState(() {
      _isLoading = true;
      _postResponse = 'Sending broadcast...';
      _logResponse = 'Awaiting broadcast send...';
    });

    // --- STEP 1: Send Broadcast (POST Request) ---
    const postPath = "/qontak/chat/v1/broadcasts/whatsapp/direct";
    final postPayload = {
      "to_number": _phoneNumberController.text,
      "to_name": "Muhamad Iqbal",
      "message_template_id": "fbd4da17-a20e-4248-993d-f95566ee10b2",
      "channel_integration_id": "a2e9673a-44ac-493d-aac0-51c5a0bfb1a5",
      "language": {"code": "id"},
      "parameters": {
        "body": [
          {"key": "1", "value": "customer_name", "value_text": "Iqbal"},
          {"key": "2", "value": "link_pdf", "value_text": "https://cdn.qontak.com/uploads/message/file/e1380eaa-bae4-4fa7-b6fc-5ae27a7d324f/20241210175811_Invoice_report_for_Fajar_Taufik.pdf"}
        ]
      },
    };

    final postResult = await _sendMekariRequest('POST', postPath, payload: postPayload);
    setState(() {
      _postResponse = jsonEncode(postResult);
    });

    if (postResult['http_code'] == 201) {
      final broadcastId = postResult['response']['data']['id'];

      // --- Delay before checking the log ---
      setState(() {
        _logResponse = 'Waiting 10 seconds before checking log...';
      });
      await Future.delayed(const Duration(seconds: 10));

      // --- STEP 2: Get Broadcast Log (GET Request) ---
      final logPath = "/qontak/chat/v1/broadcasts/$broadcastId/whatsapp/log";
      final logResult = await _sendMekariRequest('GET', logPath);
      setState(() {
        _logResponse = jsonEncode(logResult);
      });
    }

    setState(() {
      _isLoading = false;
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Mekari API Example'),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            const Text(
              'This example demonstrates sending a WhatsApp broadcast and getting its log using the Mekari API.',
              style: TextStyle(fontSize: 16),
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 20),
            TextField(
              controller: _phoneNumberController,
              decoration: const InputDecoration(
                labelText: 'Recipient Phone Number (e.g., 6281xxxx)',
                border: OutlineInputBorder(),
              ),
            ),
            const SizedBox(height: 20),
            ElevatedButton(
              onPressed: _isLoading ? null : _sendBroadcastAndCheckLog,
              child: _isLoading ? const CircularProgressIndicator() : const Text('Send WhatsApp Broadcast'),
            ),
            const SizedBox(height: 20),
            const Text(
              'Broadcast Send Response:',
              style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16),
            ),
            const SizedBox(height: 10),
            Container(
              padding: const EdgeInsets.all(8.0),
              decoration: BoxDecoration(
                color: Colors.grey[200],
                borderRadius: BorderRadius.circular(8.0),
              ),
              child: SelectableText(_postResponse),
            ),
            const SizedBox(height: 20),
            const Text(
              'Broadcast Log Response:',
              style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16),
            ),
            const SizedBox(height: 10),
            Container(
              padding: const EdgeInsets.all(8.0),
              decoration: BoxDecoration(
                color: Colors.grey[200],
                borderRadius: BorderRadius.circular(8.0),
              ),
              child: SelectableText(_logResponse),
            ),
          ],
        ),
      ),
    );
  }
}
