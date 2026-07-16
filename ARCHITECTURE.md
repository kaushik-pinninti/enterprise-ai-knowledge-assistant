# System Architecture & Technical Design Documentation

This document describes the high-level architecture, pipeline structures, authentication mechanisms, and data schemas that power the **Enterprise AI Knowledge Base**.

---

## 1. High-Level Architecture

The application is built using a modern **Full-Stack (Client-Server)** decoupling paradigm, secured by an entry-level reverse proxy layer and backed by a dual-engine storage strategy.

```text
                  +----------------------------------------------+
                  |                 Nginx Proxy                  |
                  |     (TLS/HTTPS, GZIP, Security Headers)      |
                  +-----------------------+----------------------+
                                          | Port 80 -> 3000
                                          v
                  +----------------------------------------------+
                  |         Express Full-Stack Node App          |
                  +-----------------------+----------------------+
                                          |
                  +-----------------------+----------------------+
                  |                                              |
                  v                                              v
      +-----------------------+                      +-----------------------+
      |  Vite SPA (Frontend)  |                      |  Express API Router   |
      |   React 18 + Tailwind |                      |     (Backend Services)|
      +-----------------------+                      +-----------+-----------+
                                                                 |
               +----------------------+--------------------------+-------------------+
               |                      |                          |                   |
               v                      v                          v                   v
      +-----------------+   +--------------------+     +------------------+   +-------------------+
      | JWT Auth Engine |   | Gemini AI & RAG    |     | Cloud Firestore  |   | Local JSON Engine |
      | (Centralized)   |   | (Vector Similarity)|     | (Hybrid Cloud DB)|   | (Offline Backup)  |
      +-----------------+   +--------------------+     +------------------+   +-------------------+
```

---

## 2. Database Entity-Relationship (ER) Diagram

The system supports a rich, multi-tenant corporate environment mapping workspace membership, RBAC, documents, vector chunks, chat telemetry, and audit logging.

```text
  +------------------+          +--------------------+          +------------------+
  |      User        |          | WorkspaceMember    |          |    Workspace     |
  +------------------+          +--------------------+          +------------------+
  | PK  id           |<--------o| FK  userId         |     +--->| PK  id           |
  |     email        |          | FK  workspaceId    |o----+    |     name         |
  |     name         |          |     role           |          |     description  |
  |     role (RBAC)  |          |     joinedAt       |          |     createdAt    |
  |     isActive     |          +--------------------+          | FK  ownerId      |
  |     passwordHash |                                          +--------+---------+
  |     emailVerified|                                                   |
  |     mfaEnabled   |                                                   |
  +--------+---------+                                                   |
           |                                                             |
           |                                                             |
           |                                                             |
           | 1                                                           | 1
           |                                                             |
           |                                                             |
           |                                                             |
           v N                                                           v N
  +------------------+                                          +------------------+
  |    AuditLog      |                                          |    Document      |
  +------------------+                                          +------------------+
  | PK  id           |                                          | PK  id           |
  |     timestamp    |                                          |     name         |
  |     action       |                                          |     size         |
  |     details      |                                          |     type         |
  | FK  userId       |                                          |     uploadDate   |
  +------------------+                                          |     uploadedBy   |
                                                                | FK  workspaceId  |
                                                                |     status       |
                                                                +--------+---------+
                                                                         |
                                                                         | 1
                                                                         |
                                                                         |
                                                                         v N
                                                                +------------------+
                                                                |  DocumentChunk   |
                                                                +------------------+
                                                                | PK  id           |
                                                                | FK  documentId   |
                                                                |     chunkIndex   |
                                                                |     text         |
                                                                |     pageNumber   |
                                                                +------------------+
```

---

## 3. Core Technical Workflows

### A. Authentication & Session Flow
The application relies on short-lived secure JWT access tokens for API authorization paired with long-lived secure refresh tokens.

```text
User           Vite Frontend            Express Server               Database
 |                   |                        |                          |
 |----[Login]------->|                        |                          |
 |                   |----[POST /login]------>|                          |
 |                   |                        |--[Fetch User profile]--->|
 |                   |                        |<--[User & PassHash]------|
 |                   |                        |--[Hash/Verify matching]--|
 |                   |                        |                          |
 |                   |<--[Tokens: AT & RT]----|                          |
 |                   |                        |                          |
 |----[API Request]->|                        |                          |
 |    (With Header)  |----[GET /api/docs]---->|                          |
 |                   |    (Verify Signature)  |                          |
 |                   |<--[Data Response]------|                          |
```

### B. Intelligent RAG Pipeline (AI Retrieval)
Enables semantic, context-aware querying against uploaded enterprise intellectual assets using a hybrid indexing strategy.

```text
 1. Document Upload
    +-----------------+     +-----------------------+     +-----------------------+
    | PDF/TXT Source  | --> | Regex Parser/Chunker  | --> | Firestore Chunk Store |
    +-----------------+     +-----------------------+     +-----------------------+

 2. Querying & Synthesis (RAG)
    +-----------------+
    |   User query    |
    +--------+--------+
             |
             v
    +-----------------+
    | Search Matcher  | -- [Term frequency matching & metadata filtering]
    +--------+--------+
             |
             v
    +-----------------+
    | Context Parser  | -- [Extracts best matches and builds structured prompt]
    +--------+--------+
             |
             v
    +-----------------+
    |  Gemini Engine  | -- [Synthesizes definitive response using process.env.GEMINI_API_KEY]
    +--------+--------+
             |
             v
    +-----------------+
    | Structured Ans  | -- [Returned with confidence score & dynamic page citations]
    +-----------------+
```

---

## 4. Folder Structure Diagram

```text
.
├── .github/                   # GitHub templates (Issues, Pull Requests)
│   ├── ISSUE_TEMPLATE/
│   └── PULL_REQUEST_TEMPLATE.md
├── assets/                    # Static visual assets
├── firebase-blueprint.json    # Standardized database collection definitions
├── firestore.rules            # Production-grade Firestore security rules
├── server.ts                  # Production Express API Backend & Vite asset server
├── src/                       # Frontend SPA Source
│   ├── App.tsx                # Main Router and Shell Component
│   ├── index.css              # Global Tailwinds and Typography theme customizers
│   ├── main.tsx               # Applet bootstrap entry-point
│   ├── types.ts               # Shared TypeScript schemas and enums
│   └── components/            # Reusable UI dashboard & console views
├── Dockerfile                 # Multi-stage lean Docker containerization
├── docker-compose.yml         # Local microservice architecture definition
├── nginx.conf                 # Hardened Reverse Proxy configuration
└── package.json               # Package declarations
```

---

## 5. Deployment Architecture

For scalable production workloads, the application can be seamlessly deployed across modern cloud services:

- **Frontend Target**: Vercel or Cloudflare Pages (highly-optimized client CDN edges) or bundled inside the primary container.
- **Backend Target**: Google Cloud Run, AWS ECS, or Railway (scalable, container-native runtime).
- **Database Engine**: Managed Firestore Database or Neon Serverless PostgreSQL for relational workloads.
- **Caching & Brokers**: Redis Enterprise Cloud.
