# Enterprise AI Knowledge Base & RAG System

An advanced, secure, enterprise-grade AI Knowledge Base featuring Semantic Search, Retrieval-Augmented Generation (RAG) powered by Gemini, granular Role-Based Access Control (RBAC), and full compliance monitoring trails.

---

## 🚀 Project Overview

The **Enterprise AI Knowledge Base** bridges unstructured corporate intellectual properties (PDFs, contracts, wikis, and system specs) with highly secure LLM synthesis. Built specifically with strict compliance and audit controls, it enables secure searching, chatting, and document indexing.

---

## ✨ Features

- 🔐 **Dual Multi-Tenant Architecture**: Secured by standard JWT signatures and Multi-Factor Authentication (MFA/TOTP).
- 🏷️ **Granular Role-Based Access Control (RBAC)**: Supports roles (`Admin`, `Manager`, `Employee`) enforcing strict read/write boundaries on global spaces.
- 🧠 **Retrieval-Augmented Generation (RAG)**: Synthesizes deterministic context-aware responses with citations, confidence thresholds, and page tracking.
- ⚡ **PostgreSQL Integration**: Seamlessly connects to Neon PostgreSQL with a highly resilient, local JSON database file engine fallback.
- 📈 **Audit Trail & Observability Hub**: Tracks access requests, administrative setting modifications, active system health status, and real-time rate limit thresholds.
- 🐋 **Production-Ready Containerization**: Orchestrated with high-performance Nginx Reverse Proxy and PostgreSQL database schemas.

---

## 🛠️ Tech Stack

- **Frontend**: React 18, Tailwind CSS, Lucide icons, Motion layout transitions, Recharts.
- **Backend**: Express API Router (NodeJS + TypeScript), JWT authorization, custom rate limiters.
- **AI Synthesis**: `@google/genai` (Gemini API Integration).
- **Security & Proxying**: Nginx Reverse Proxy, CORS headers, Content-Security-Policies (CSP).
- **Database**: PostgreSQL (Neon) with a Local Durable JSON file fallback.

---

## 📐 System Architecture

For a comprehensive explanation of our RAG pipelines and ER Diagrams, please see our dedicated [Architecture Documentation](./ARCHITECTURE.md).

```text
+-------------------+      +-------------------------+      +-------------------------+
|   Vite Frontend   | ---> |  Nginx Reverse Proxy    | ---> |   Express API Server    |
| (React, Tailwind) |      | (Compression & Headers) |      |   (Custom TS Router)    |
+-------------------+      +-------------------------+      +------------+------------+
                                                                         |
                                                                         v
                                                            +------------+------------+
                                                            |  PostgreSQL Database   |
                                                            | (with Local DB Fallback)|
                                                            +-------------------------+
```

---

## 📁 Folder Structure

```text
.
├── .github/              # Issue and Pull Request templates
├── Dockerfile            # Lean multi-stage docker compiler config
├── docker-compose.yml    # Full service orchestration (App, DB, Proxy, Caching)
├── nginx.conf            # Hardened Nginx edge configuration
├── server.ts             # Express REST API application entry point
├── src/                  # React Single-Page Application (SPA) source code
└── db.json               # Seeded enterprise dataset & local cache store
```

---

## ⚙️ Installation & Setup

### Prerequisites
- Node.js (v18+)
- npm

### 1. Local Development
Clone this repository to your local directory, install dependencies, and boot:

```bash
# Install all required packages
npm install

# Start the Node development server & client bundler
npm run dev
```
The application will be served at `http://localhost:3000`.

### 2. Environment Configurations
Create a `.env` file in the root workspace (see `.env.example` for details):

```env
NODE_ENV=development
PORT=3000
JWT_SECRET=your-super-secure-jwt-key
GEMINI_API_KEY=AIzaSy...
APP_URL=http://localhost:3000
DATABASE_URL=postgresql://user:password@ep-cool-name.neon.tech/dbname
```

---

## ☁️ Cloud Deployment

The application is fully compatible and optimized for deployment to the following platforms:

### 1. Database (Neon PostgreSQL)
1. Sign up on [Neon](https://neon.tech/) and create a new serverless PostgreSQL database.
2. Copy your Connection String (`DATABASE_URL`).
3. Place the connection string in your backend deployment's environment variables. The server will automatically create all tables and seed default users on the first startup!

### 2. Backend (Render / Railway)
- **Runtime**: Node.js or Docker.
- **Start Command**: `npm start`
- **Build Command**: `npm run build`
- **Required Environment Variables**:
  - `DATABASE_URL`: Your Neon PostgreSQL connection string.
  - `GEMINI_API_KEY`: Your Google Gemini API Key.
  - `JWT_SECRET`: A secure key to sign JWT authentication sessions.

### 3. Frontend (Vercel)
- Set up a standard static frontend build pointing to the client app.
- Ensure your frontend requests are correctly proxying or directing to your backend's API endpoint.

---

## 🐳 Docker Deployment

The system is configured with a fully orchestrated `docker-compose.yml` defining the main application container and a local PostgreSQL DB instance.

To spin up the production ecosystem locally:

```bash
# Build and release the entire container system
docker compose up -d --build
```

---

## 📑 API Reference

See the full list of register/login parameters, document upload payloads, and AI workspace endpoints in our complete [API Specification](./API_DOCUMENTATION.md).

---

## 🔮 Future Enhancements
- Support for distributed vectors using Pinecone or pgvector.
- Complex chunk parsing utilizing OCR for embedded images.
- Automated pipeline integrations with Slack and Microsoft Teams.

---

## 📄 License
This project is licensed under the MIT License - see the [LICENSE](./LICENSE) file for details.

---

## ✍️ Author
Designed and developed for Enterprise RAG Operations.
