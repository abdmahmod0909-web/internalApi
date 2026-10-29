# InternalAPI

> **Enterprise Self-Hosted API Client & Collaboration Platform**  
> A zero-telemetry, production-grade Postman alternative designed for internal company networks.

---

## Features (Phase 1: MVP Completed)

- **Request Builder**: Full support for `GET`, `POST`, `PUT`, `PATCH`, `DELETE`, `HEAD`, and `OPTIONS`. Supports query parameters table with auto-sync, custom headers, path variables (`:id` or `{id}`), and settings (timeout, redirects, SSL bypass).
- **Body Types**:
  - `none`
  - `JSON` (with syntax formatting / prettifier)
  - `Raw` text
  - `Form-Data` (with file upload support)
  - `x-www-form-urlencoded`
  - `GraphQL` (query and variables support)
- **Authentication Helpers**:
  - Bearer Token
  - Basic Auth (Username / Password)
  - API Key (in Header or Query)
  - OAuth 2.0 (Client Credentials with "Get New Access Token" button)
  - Custom Headers
- **Response Viewer**:
  - Status code pill with color badges (200 OK, 4xx, 5xx)
  - Latency breakdown tooltip (DNS, TCP, TLS, TTFB, and Total time)
  - Payload size
  - Pretty, Raw, and Preview (sandboxed HTML render) tabs
  - Search within response
  - One-click Copy Response & Download Response
- **Collections & Folders**:
  - Tree navigation in left sidebar
  - Nested folders support
  - Fast request saving (`Ctrl+S`) and opening
- **Environments & Scoped Variables**:
  - `{{variable}}` syntax support across URL, query parameters, headers, and body
  - Secret variables encrypted at rest with **AES-256-GCM**
  - Environment switching in top navigation
- **Request History**:
  - Searchable execution history with status codes and quick reload
- **Security & Network Proxy**:
  - Complete browser CORS bypass via Fastify backend proxy
  - SSRF protection against cloud metadata endpoints (`169.254.169.254`) and restricted private CIDRs
  - SSL/TLS verification toggle for self-signed certificates in private testing

---

## Quick Start (Local Development)

### Prerequisites
- Node.js 20+ / 24+
- npm 10+

### 1. Install & Build
```bash
npm install
npm run build --workspaces
```

### 2. Run Tests
```bash
npm test
```
All unit tests and API integration tests run via Vitest.

### 3. Start Development Servers
In one terminal, start the Fastify backend:
```bash
npm run dev --workspace=@internalapi/server
```

In a second terminal, start the React frontend:
```bash
npm run dev --workspace=@internalapi/client
```
Open **http://localhost:3000** in your browser.

---

## Production Deployment (Docker & docker-compose)

To deploy InternalAPI for your entire company on a server:

### 1. Configure Environment
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```
Ensure you provide a strong 32-character master key in `INTERNALAPI_SECRET_KEY` for AES-256-GCM variable encryption.

### 2. Start Services via Docker Compose
```bash
docker compose up -d --build
```
This starts:
- **`internalapi-db`**: PostgreSQL 16 database with persistent volume and health check.
- **`internalapi-app`**: Fastify backend + compiled React frontend running on port `3001`.

Access the application at `http://<your-server-ip>:3001` or through your company reverse proxy (Nginx, Traefik, Caddy).

---

## Database Seeding & Migrations

When running with PostgreSQL:
```bash
# Apply Prisma migrations
npm run prisma:migrate --workspace=@internalapi/server

# Run demo seed data (Workspace, Environment, and Sample Collection)
npm run prisma:seed --workspace=@internalapi/server
```

---

## Keyboard Shortcuts

| Shortcut | Action |
|---|---|
| `Ctrl + Enter` (or `Cmd + Enter`) | Send active request |
| `Ctrl + S` (or `Cmd + S`) | Save current request |
| `Ctrl + K` (or `Cmd + K`) | Open Command Palette |
| `Esc` | Close modal / command palette |

---

## Architecture & Project Structure

```
├── packages/
│   ├── shared/          # Shared TypeScript types & recursive {{variable}} engine
│   ├── server/          # Fastify proxy engine, SSRF guard, AES-256 crypto, REST API
│   └── client/          # React 18, Tailwind CSS, Zustand, Monaco-compatible tabs
├── Dockerfile           # Multi-stage production container build
├── docker-compose.yml   # App + PostgreSQL container orchestration
└── .env.example         # Production configuration template
```
