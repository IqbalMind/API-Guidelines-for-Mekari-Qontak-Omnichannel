# API Guidelines for Mekari Qontak Omnichannel

This repository contains API integration examples for **Mekari Qontak Omnichannel**, a leading platform for customer engagement and communication.  
The code examples demonstrate how to use the **Mekari API with HMAC authentication** to send WhatsApp Broadcasts and retrieve their logs.

---

## 📖 Official Documentation & Support
- **API Reference:** [Mekari Qontak Omnichannel API](https://docs.qontak.com/docs/omnichannel-hub/3f11066e2ce6c-api-mekari-v1-0)  
- **Product:** [Qontak Chat](https://chat.qontak.com/)  
- **Consultation:** Reach out to **Iqbal Mind on LinkedIn** for further consultation or to subscribe.  

---

## ⚙️ How it Works: The WhatsApp Broadcast Flow
The following diagram illustrates the typical flow for sending a WhatsApp broadcast message using the Mekari Qontak API.

![Qontak Omnichannel Whatsapp Broadcast Flow](https://i.imgur.com/j3Ebt2s.png)

---

## 🔐 Authentication
All API requests require **HMAC-based authentication**.  

This involves generating a unique signature for each request using your `client_id` and `client_secret`.  
The signature is a **Base64-encoded HMAC-SHA256** hash of a payload that includes the `Date` header and the `Request-Line`.

**Authorization header format:**
```http
hmac username="YOUR_CLIENT_ID", algorithm="hmac-sha256", headers="date request-line", signature="YOUR_SIGNATURE"
```
---
## 📂 Repository Structure
```bash
.
├── php/        → PHP code example
├── python/     → Python code example
├── nodejs/     → Node.js code example
├── java/       → Java code example
├── go/         → Go code example
├── cpp/        → C++ code example
├── react/      → React code example
├── typescript/ → TypeScript code example
├── flutter/    → Flutter code example
├── ruby/       → Ruby code example
└── express/    → Express.js code example

```
---

## 🚀 Getting Started

1. Clone this repository:
```bash
git clone https://github.com/IqbalMind/API-Guidelines-for-Mekari-Qontak-Omnichannel.git
cd API-Guidelines-for-Mekari-Qontak-Omnichannel
```

2. Navigate to the folder of your preferred programming language (php/, python/, or nodejs/).

3. Update the client_id and client_secret variables with your actual credentials.

4. Run the example script to test the API calls.

---

## 💻 Code Examples
1. PHP
The PHP example demonstrates a universal function to send requests with the correct HMAC headers, followed by an example of sending a WhatsApp broadcast and then checking its log.

2. Python
The Python example uses the `requests` library for HTTP calls and the built-in `hmac` and `hashlib` modules for signature generation.

3. Node.js
The Node.js example uses `axios` for HTTP requests and the `crypto` module for the HMAC-SHA256 signature.

4. Java
The Java example utilizes the Apache HttpClient for API requests and standard Java `crypto` libraries for HMAC generation.

5. Go
The Go example uses the standard library's net/http for API calls and `crypto/hmac` for authentication.

6. C++
The C++ example uses the `cpr` (C++ Requests) library for HTTP and OpenSSL for HMAC-SHA256 authentication.

7. React
The React example demonstrates how to perform API calls and handle authentication within a modern React application.

8. TypeScript
The TypeScript example provides type-safe API integration with HMAC authentication.

9. Flutter
The Flutter example uses the `http` package to make API calls and demonstrate the HMAC authentication process on both iOS and Android.

10. Ruby
The Ruby example uses the `httparty` gem for HTTP requests and `openssl` for HMAC-SHA256 hashing.

11. Express.js
The Express.js example shows how to set up an API route that handles incoming requests and authenticates them with HMAC.

---
_Created with ❤️ by Muhamad Iqbal Nurmanditya_
