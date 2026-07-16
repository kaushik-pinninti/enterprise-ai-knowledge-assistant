# Enterprise AI Knowledge Base - API Specification

This document provides detailed documentation for all server endpoints exposed by the backend API. All client requests to protected endpoints MUST include the JSON Web Token in the `Authorization` header.

Format:
`Authorization: Bearer <your_jwt_access_token>`

---

## 1. Authentication APIs

### Register User
* **Endpoint**: `/api/auth/register`
* **Method**: `POST`
* **Authentication**: None (Rate limited)
* **Request Body**:
  ```json
  {
    "name": "Jane Doe",
    "email": "jane@enterprise.ai",
    "password": "SecurePassword123",
    "role": "Manager"
  }
  ```
* **Success Response (200 OK)**:
  ```json
  {
    "success": true,
    "user": {
      "id": "usr-8a9d2",
      "name": "Jane Doe",
      "email": "jane@enterprise.ai",
      "role": "Manager",
      "isActive": true,
      "emailVerified": false
    },
    "token": "eyJhbGciOi...",
    "refreshToken": "eyJhbGciOi..."
  }
  ```
* **Error Responses**:
  * `400 Bad Request`: Missing fields or email already exists.

### Login User
* **Endpoint**: `/api/auth/login`
* **Method**: `POST`
* **Authentication**: None (Rate limited)
* **Request Body**:
  ```json
  {
    "email": "jane@enterprise.ai",
    "password": "SecurePassword123"
  }
  ```
* **Success Response (200 OK)**:
  ```json
  {
    "success": true,
    "token": "eyJhbGciOi...",
    "refreshToken": "eyJhbGciOi...",
    "user": {
      "id": "usr-8a9d2",
      "name": "Jane Doe",
      "email": "jane@enterprise.ai",
      "role": "Manager",
      "isActive": true
    }
  }
  ```

### Refresh Token
* **Endpoint**: `/api/auth/refresh`
* **Method**: `POST`
* **Request Body**:
  ```json
  {
    "refreshToken": "eyJhbGciOi..."
  }
  ```
* **Success Response (200 OK)**:
  ```json
  {
    "success": true,
    "token": "eyJhbGciOi...",
    "refreshToken": "eyJhbGciOi...",
    "user": { ... }
  }
  ```

### Forgot & Reset Password
* **Endpoints**: `/api/auth/forgot-password`, `/api/auth/reset-password`
* **Methods**: `POST`
* **Request Body (`forgot-password`)**:
  ```json
  { "email": "jane@enterprise.ai" }
  ```
* **Request Body (`reset-password`)**:
  ```json
  { "email": "jane@enterprise.ai", "newPassword": "NewStrongPassword1!" }
  ```

---

## 2. Workspace Management APIs

### Fetch Workspaces
* **Endpoint**: `/api/workspaces`
* **Method**: `GET`
* **Authentication**: Bearer Token
* **Response (200 OK)**:
  ```json
  [
    {
      "id": "work-default",
      "name": "Default Knowledge Space",
      "description": "General enterprise knowledge index",
      "ownerId": "usr-admin"
    }
  ]
  ```

### Create Workspace
* **Endpoint**: `/api/workspaces`
* **Method**: `POST`
* **Authentication**: Bearer Token (Manager & Admin only)
* **Request Body**:
  ```json
  {
    "name": "Engineering Wiki",
    "description": "System architecture maps and specifications"
  }
  ```

---

## 3. Documents & Knowledge Indexing APIs

### Fetch Workspace Documents
* **Endpoint**: `/api/documents?workspaceId=work-default`
* **Method**: `GET`
* **Authentication**: Bearer Token

### Upload Document
* **Endpoint**: `/api/documents/upload`
* **Method**: `POST`
* **Authentication**: Bearer Token (Manager & Admin only)
* **Request Body (Multipart or JSON)**:
  ```json
  {
    "name": "api_contract.pdf",
    "type": "application/pdf",
    "size": 102450,
    "text": "File textual content here...",
    "workspaceId": "work-default"
  }
  ```
* **Success Response (200 OK)**:
  ```json
  {
    "success": true,
    "document": {
      "id": "doc-a1b2c",
      "name": "api_contract.pdf",
      "status": "completed",
      "chunkCount": 3
    }
  }
  ```

### Delete Document
* **Endpoint**: `/api/documents/:id`
* **Method**: `DELETE`
* **Authentication**: Bearer Token (Admin only)

---

## 4. Intelligent AI Chat & Search APIs

### Hybrid Semantic Search
* **Endpoint**: `/api/search`
* **Method**: `POST`
* **Authentication**: Bearer Token (Rate limited)
* **Request Body**:
  ```json
  {
    "query": "What are our security compliance criteria?",
    "workspaceId": "work-default"
  }
  ```
* **Success Response (200 OK)**:
  ```json
  {
    "query": "What are our security compliance criteria?",
    "results": [
      {
        "documentName": "compliance_guide.pdf",
        "text": "All services must run behind a vetted reverse proxy configured with strict HSTS, CORS limits, and rate protection headers...",
        "pageNumber": 12,
        "score": 0.94
      }
    ]
  }
  ```

### Smart Conversational Message
* **Endpoint**: `/api/chat/message`
* **Method**: `POST`
* **Authentication**: Bearer Token (Rate limited)
* **Request Body**:
  ```json
  {
    "message": "Summarize the compliance rules",
    "sessionId": "sess-abc123xyz",
    "workspaceId": "work-default"
  }
  ```
* **Success Response (200 OK)**:
  ```json
  {
    "success": true,
    "reply": "Based on the company compliance guidelines: 1. Proxies must restrict origins. 2. Rate limiting needs to bind on a per-IP registry...",
    "confidenceScore": 0.95,
    "citations": [
      {
        "docName": "compliance_guide.pdf",
        "page": 12,
        "text": "All services must run behind a vetted reverse proxy..."
      }
    ]
  }
  ```

---

## 5. Administrative Control APIs

### Fetch Audit Logs
* **Endpoint**: `/api/admin/audit-logs`
* **Method**: `GET`
* **Authentication**: Bearer Token (Admin Only)

### Change User Role
* **Endpoint**: `/api/admin/change-role`
* **Method**: `POST`
* **Authentication**: Bearer Token (Admin Only)
* **Request Body**:
  ```json
  {
    "userId": "usr-manager",
    "role": "Admin"
  }
  ```

### Fetch Administrative Metrics
* **Endpoint**: `/api/admin/monitoring-metrics`
* **Method**: `GET`
* **Authentication**: Bearer Token (Admin Only)
* **Success Response**:
  ```json
  {
    "cpuUsage": 12,
    "memoryUsage": 45,
    "uptime": "15d 4h 12m",
    "totalRequests": 14205,
    "averageResponseTime": "42ms"
  }
  ```
