# InboxOS API Documentation

**Version:** 1.0.0  
**Last Updated:** June 2026  
**Environment:** Node.js v20+ | Express v5.2.1 | Prisma v5.22.0 | PostgreSQL 15+

---

## Table of Contents

1. [Overview](#overview)
2. [Getting Started](#getting-started)
3. [Authentication](#authentication)
4. [API Endpoints](#api-endpoints)
5. [Error Handling](#error-handling)
6. [Rate Limiting](#rate-limiting)
7. [Security](#security)
8. [Integration Examples](#integration-examples)
9. [WebSockets (Real-time)](#websockets-real-time)
10. [Testing](#testing)

---

## Overview

**InboxOS** is an open-source AI inbox operating system that transforms email management through intelligent classification, prioritization, and automation. The backend API provides a comprehensive set of endpoints for user authentication, email ingestion, webhook handling, integrations, and real-time communication.

### Key Features

- **User Authentication:** JWT-based auth with HttpOnly cookies
- **Email Management:** Receive, process, and send emails
- **AI Intelligence:** Automatic classification, entity extraction, and action item detection
- **OAuth2 Integrations:** Gmail, Outlook, and custom IMAP connectors
- **Real-time Updates:** WebSocket-based push notifications via Socket.IO
- **Webhook Support:** Inbound email webhooks with payload validation
- **Rules Engine:** Custom routing and automation via user-defined rules
- **Analytics:** Real-time metrics and performance monitoring

---

## Getting Started

### Base URL

```
Development:  http://localhost:8000
Production:   https://api.inboxos.com (configured via environment)
```

### Documentation Endpoints

- **Swagger UI:** `http://localhost:8000/api/docs`
- **OpenAPI Spec:** `http://localhost:8000/api/docs.json`
- **Postman Collection:** See `docs/InboxOS_API.postman_collection.json`

### Environment Setup

```bash
# Clone repository
git clone https://github.com/sakshi8778/InboxOS.git
cd InboxOS

# Backend setup
cd backend
npm install
npx prisma generate
npx prisma migrate dev
npm run dev

# Frontend setup (in separate terminal)
cd frontend
npm install
npm run dev
```

### Required Environment Variables

```env
# Server
NODE_ENV=development
PORT=8000
BASE_URL=http://localhost:8000

# Database
DATABASE_URL=postgresql://user:password@localhost:5432/inboxos

# Auth
JWT_SECRET=your-super-secret-key-change-in-production

# Google OAuth
GMAIL_CLIENT_ID=your-google-client-id
GMAIL_CLIENT_SECRET=your-google-client-secret
GMAIL_REDIRECT_URI=http://localhost:8000/api/integrations/gmail/callback

# Redis (for caching & queues)
REDIS_URL=redis://localhost:6379

# AI/LLM
OPENAI_API_KEY=your-openai-api-key
OPENAI_MODEL=gpt-4o-mini
GOOGLE_GEMINI_API_KEY=your-gemini-api-key

# Metrics
METRICS_TOKEN=your-metrics-token (optional)

# Email Configuration
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
```

---

## Authentication

### Authentication Flow

InboxOS uses **JWT-based authentication with HttpOnly cookies**. The JWT token is issued after successful login/registration and stored securely in an HttpOnly cookie, preventing XSS attacks.

### Cookie Configuration

- **Name:** `token`
- **Type:** HttpOnly (inaccessible to JavaScript)
- **Secure:** Only transmitted over HTTPS in production
- **SameSite:** `lax` (prevents CSRF attacks)
- **Max-Age:** 24 hours

### Security Scheme

All protected endpoints require the `cookieAuth` security scheme:

```yaml
cookieAuth:
  type: apiKey
  in: cookie
  name: token
  description: JWT token stored in HttpOnly cookie
```

### Example: Setting Up Auth

```javascript
// Frontend (automatic with credentials)
fetch('http://localhost:8000/api/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  credentials: 'include', // Include cookies
  body: JSON.stringify({
    email: 'user@example.com',
    password: 'securepassword'
  })
});

// Backend (via Express middleware)
app.get('/api/protected', requireAuth, (req, res) => {
  // req.user contains decoded JWT token
  const userId = req.user.userId;
  res.json({ userId });
});
```

---

## API Endpoints

### 1. Health Check

#### GET `/api/health`

Returns the health status of the API.

**Request:**
```bash
curl http://localhost:8000/api/health
```

**Response:**
```json
{
  "status": "ok",
  "timestamp": "2026-01-01T00:00:00.000Z"
}
```

---

### 2. Authentication

#### POST `/api/auth/register`

Register a new user account.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "securepassword"
}
```

**Response (201):**
```json
{
  "message": "User registered successfully",
  "user": {
    "id": "uuid-string",
    "email": "user@example.com",
    "createdAt": "2026-01-01T00:00:00.000Z"
  }
}
```

**Error Responses:**
- `400` — Email already exists or missing fields
- `500` — Internal server error

---

#### POST `/api/auth/login`

Authenticate and receive JWT token.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "securepassword"
}
```

**Response (200):**
```json
{
  "message": "Logged in successfully",
  "user": {
    "id": "uuid-string",
    "email": "user@example.com"
  }
}
```

**Cookies Set:**
- `token` (HttpOnly JWT)

**Error Responses:**
- `400` — Missing email or password
- `401` — Invalid credentials
- `500` — Internal server error

---

#### POST `/api/auth/logout`

Clear authentication cookie and logout the user.

**Request:**
```bash
curl -X POST http://localhost:8000/api/auth/logout \
  -H "Cookie: token=your-jwt-token"
```

**Response (200):**
```json
{
  "message": "Logged out successfully"
}
```

---

#### GET `/api/auth/me`

Get the currently authenticated user's profile.

**Authentication:** Required (cookieAuth)

**Request:**
```bash
curl http://localhost:8000/api/auth/me \
  -H "Cookie: token=your-jwt-token"
```

**Response (200):**
```json
{
  "user": {
    "userId": "uuid-string",
    "email": "user@example.com",
    "iat": 1234567890,
    "exp": 1234654290
  }
}
```

**Error Responses:**
- `401` — Unauthorized (missing or invalid token)

---

### 3. User Management

#### GET `/api/users/profile`

Retrieve authenticated user's profile with settings (cached).

**Authentication:** Required (cookieAuth)

**Response (200):**
```json
{
  "id": "uuid-string",
  "email": "user@example.com",
  "createdAt": "2026-01-01T00:00:00.000Z",
  "settings": {
    "theme": "dark",
    "signature": "Sent from InboxOS",
    "autoReply": false
  }
}
```

**Cache:** 300 seconds (Redis)

**Error Responses:**
- `401` — Unauthorized
- `404` — User not found
- `500` — Internal server error

---

#### GET `/api/users/me/settings`

Get current user's settings.

**Authentication:** Required (cookieAuth)

**Response (200):**
```json
{
  "theme": "dark",
  "signature": null,
  "autoReply": false
}
```

**Default Values (if settings not initialized):**
```json
{
  "theme": "dark",
  "signature": null,
  "autoReply": false
}
```

---

#### PUT `/api/users/me/settings`

Update user settings.

**Authentication:** Required (cookieAuth)

**Request Body:**
```json
{
  "theme": "light",
  "signature": "Best regards,\nUser Name",
  "autoReply": true
}
```

**Response (200):**
```json
{
  "message": "Settings updated successfully",
  "settings": {
    "theme": "light",
    "signature": "Best regards,\nUser Name",
    "autoReply": true
  }
}
```

**Validation:**
- `theme` — string, optional
- `signature` — string or null, optional
- `autoReply` — boolean, optional

**Error Responses:**
- `400` — Invalid payload schema
- `401` — Unauthorized
- `500` — Internal server error

---

### 4. Email Management

#### POST `/api/emails/send`

Send an outbound email via configured SMTP.

**Authentication:** Required (cookieAuth)

**Request Body:**
```json
{
  "to": "recipient@example.com",
  "subject": "Email Subject",
  "text": "Plain text body",
  "html": "<p>HTML body</p>",
  "inReplyTo": "previous-message-id"
}
```

**Response (200):**
```json
{
  "message": "Email sent successfully",
  "messageId": "unique-message-id@inboxos.com"
}
```

**Required Fields:**
- `to` (email string)
- `subject` (string)
- `text` (string)

**Optional Fields:**
- `html` (string)
- `inReplyTo` (string, for threading)

**Error Responses:**
- `400` — Missing required fields
- `401` — Unauthorized
- `500` — Failed to send email

---

### 5. Webhooks

#### POST `/api/webhooks/incoming`

Ingest incoming email via webhook (use with email forwarding services).

**Authentication:** No authentication required (IP whitelisting recommended)

**Request Body:**
```json
{
  "sender": "sender@example.com",
  "recipient": "your-email@inboxos.com",
  "subject": "Email Subject",
  "body": "Email body content",
  "messageId": "unique-message-id@example.com",
  "inReplyTo": "previous-message-id@example.com"
}
```

**Validation (Zod):**
- `sender` — valid email (required)
- `recipient` — valid email (required)
- `subject` — string (required)
- `body` — string (required)
- `messageId` — string (required)
- `inReplyTo` — string (optional)

**Response (201):**
```json
{
  "message": "Email ingested successfully",
  "email": {
    "id": "email-uuid",
    "messageId": "unique-message-id@example.com",
    "subject": "Email Subject",
    "threadId": "thread-uuid",
    "createdAt": "2026-01-01T00:00:00.000Z"
  }
}
```

**Processing Flow:**
1. Strict payload validation
2. Fetch or create recipient user
3. Check for thread association via In-Reply-To header
4. Create Email record
5. Publish async event to `email.received` for AI processing
6. Return 201 immediately (non-blocking)

**Error Responses:**
- `400` — Invalid payload schema with details
- `500` — Internal server error

---

#### POST `/api/webhooks/config`

Create or update webhook configuration for a user.

**Authentication:** Required (cookieAuth)

**Request Body:**
```json
{
  "url": "https://your-service.com/webhook",
  "events": ["email.received", "email.classified"],
  "active": true
}
```

**Response (201):**
```json
{
  "message": "Webhook configured successfully",
  "webhook": {
    "id": "webhook-uuid",
    "url": "https://your-service.com/webhook",
    "events": ["email.received", "email.classified"],
    "active": true,
    "secretKey": "whsk_abcd1234efgh5678",
    "createdAt": "2026-01-01T00:00:00.000Z"
  }
}
```

**Error Responses:**
- `400` — Invalid URL or payload
- `401` — Unauthorized
- `409` — Webhook already exists for this event

---

### 6. OAuth2 Integrations

#### GET `/api/integrations/gmail/auth`

Initiate Gmail OAuth2 flow.

**Authentication:** Required (cookieAuth)

**Response (200):**
```json
{
  "url": "https://accounts.google.com/o/oauth2/v2/auth?..."
}
```

**Usage:**
```javascript
// Frontend
fetch('/api/integrations/gmail/auth', { credentials: 'include' })
  .then(res => res.json())
  .then(data => window.location.href = data.url);
```

---

#### GET `/api/integrations/gmail/callback`

Google OAuth2 callback handler (automatic redirect).

**Query Parameters:**
- `code` (required) — Authorization code from Google
- `state` (required) — User ID or 'google-signin' for new signup

**Response (200):**
```json
{
  "message": "Gmail connected successfully",
  "emailAddress": "user@gmail.com"
}
```

**Flow:**
1. Exchange `code` for access/refresh tokens
2. Fetch user's email address from Gmail API
3. Save encrypted tokens to database
4. If `state='google-signin'`, auto-create user and set JWT cookie
5. Return success or redirect to dashboard

**Error Responses:**
- `400` — Missing code or state parameters
- `500` — OAuth integration failed

---

### 7. Metrics

#### GET `/metrics`

Prometheus-format metrics endpoint (internal use).

**Authentication:** IP whitelist or `X-Metrics-Token` header

**Response (200):**
```
# HELP process_uptime_seconds Process uptime in seconds
# TYPE process_uptime_seconds gauge
process_uptime_seconds 123456

# HELP http_requests_total Total HTTP requests
# TYPE http_requests_total counter
http_requests_total{method="GET",status="200"} 1234
...
```

**Access Control:**
- Allow requests from `127.0.0.1`, `::1`, or private IP ranges
- Check `X-Metrics-Token` header if outside private network
- Requires valid `METRICS_TOKEN` in environment

**Error Responses:**
- `403` — Forbidden (not from allowed IP or invalid token)
- `500` — Internal error generating metrics

---

## Error Handling

### Standard Error Response Format

```json
{
  "error": "Error message describing what went wrong",
  "details": {
    "field1": ["validation error message"],
    "field2": ["another validation error"]
  }
}
```

### Common HTTP Status Codes

| Code | Meaning | Example |
|------|---------|---------|
| `200` | OK | Successful GET, PUT, DELETE |
| `201` | Created | Successful POST |
| `202` | Accepted | Asynchronous job queued |
| `400` | Bad Request | Invalid payload, missing fields |
| `401` | Unauthorized | Missing or invalid JWT token |
| `403` | Forbidden | Insufficient permissions |
| `404` | Not Found | Resource doesn't exist |
| `409` | Conflict | Resource already exists |
| `422` | Unprocessable | Zod validation failed |
| `429` | Too Many Requests | Rate limit exceeded |
| `500` | Server Error | Internal server error |

### Validation Error Example

**Request:**
```bash
curl -X PUT http://localhost:8000/api/users/me/settings \
  -H "Content-Type: application/json" \
  -d '{"theme": ""}'
```

**Response (400):**
```json
{
  "error": "Invalid payload schema",
  "details": {
    "theme": ["String must contain at least 1 character(s)"]
  }
}
```

---

## Rate Limiting

### Limits

- **Per-user limit:** 100 requests per 15 minutes
- **Rate Limiter Middleware:** Applied to all `/api` routes
- **Redis-backed:** Distributed across multiple server instances

### Rate Limit Headers

```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1234567890
```

### Response When Limited (429)

```json
{
  "error": "Too many requests, please try again later",
  "retryAfter": 60
}
```

---

## Security

### Best Practices

1. **Never expose JWT tokens in URLs** — Always use HttpOnly cookies
2. **Use HTTPS in production** — Secure cookies require HTTPS
3. **Validate all inputs** — Zod schemas enforce strict validation
4. **Keep credentials safe** — Store API keys in environment variables
5. **Rotate secrets regularly** — Change JWT_SECRET and API keys
6. **Enable CORS carefully** — Only allow trusted domains

### CORS Configuration

```javascript
// Current CORS policy (backend/src/server.ts)
app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (origin && (
    origin === 'http://localhost' ||
    origin.startsWith('http://localhost:') ||
    origin === 'http://127.0.0.1' ||
    origin.startsWith('http://127.0.0.1:')
  )) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  }
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  // ... rest of CORS headers
});
```

### Data Encryption

- **Sensitive data:** OAuth tokens are encrypted at rest using AES-256-GCM
- **In transit:** All data encrypted via HTTPS in production
- **Passwords:** Hashed with bcrypt (10 salt rounds)

---

## Integration Examples

### Example 1: Complete Auth Flow (JavaScript)

```javascript
// 1. Register
const registerRes = await fetch('http://localhost:8000/api/auth/register', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  credentials: 'include',
  body: JSON.stringify({
    email: 'user@example.com',
    password: 'securepassword'
  })
});

// 2. Check auth
const meRes = await fetch('http://localhost:8000/api/auth/me', {
  credentials: 'include'
});
const { user } = await meRes.json();
console.log(`Logged in as: ${user.email}`);

// 3. Get settings
const settingsRes = await fetch('http://localhost:8000/api/users/me/settings', {
  credentials: 'include'
});
const settings = await settingsRes.json();

// 4. Update settings
const updateRes = await fetch('http://localhost:8000/api/users/me/settings', {
  method: 'PUT',
  headers: { 'Content-Type': 'application/json' },
  credentials: 'include',
  body: JSON.stringify({
    theme: 'light',
    signature: 'My Signature'
  })
});

// 5. Logout
await fetch('http://localhost:8000/api/auth/logout', {
  method: 'POST',
  credentials: 'include'
});
```

### Example 2: Email Ingestion via Webhook

```bash
# Test incoming email webhook
curl -X POST http://localhost:8000/api/webhooks/incoming \
  -H "Content-Type: application/json" \
  -d '{
    "sender": "sender@gmail.com",
    "recipient": "user@inboxos.com",
    "subject": "Test Email",
    "body": "This is a test email body",
    "messageId": "msg-12345@gmail.com",
    "inReplyTo": null
  }'
```

### Example 3: Gmail OAuth Integration

```javascript
// Frontend: Initiate Gmail auth
const gmailAuthRes = await fetch('http://localhost:8000/api/integrations/gmail/auth', {
  credentials: 'include'
});
const { url } = await gmailAuthRes.json();

// Redirect to Google OAuth
window.location.href = url;

// Google redirects back to: /api/integrations/gmail/callback?code=AUTH_CODE&state=USER_ID
// Backend handles token exchange automatically
```

### Example 4: Postman Collection

Pre-built requests are available in `docs/InboxOS_API.postman_collection.json`. Import into Postman:

1. Open Postman → Import → Select file → `InboxOS_API.postman_collection.json`
2. Import environment: `docs/InboxOS_API.postman_environment.json`
3. Set variables: `baseUrl`, `email`, `password`, `gmailAuthCode`
4. Run collection tests

---

## WebSockets (Real-time)

### Socket.IO Connection

The backend supports real-time updates via Socket.IO.

**Connection URL:**
```javascript
const socket = io('http://localhost:8000', {
  reconnection: true,
  reconnectionDelay: 1000,
  reconnectionDelayMax: 5000,
  reconnectionAttempts: 5
});
```

### Events

**Server → Client:**
```javascript
// Email received notification
socket.on('email:received', (data) => {
  console.log('New email:', data.email);
});

// Email classified
socket.on('email:classified', (data) => {
  console.log('Classification:', data.classification);
});

// Task created
socket.on('task:created', (data) => {
  console.log('New task:', data.task);
});
```

**Client → Server:**
```javascript
// Mark email as read
socket.emit('email:mark-read', { emailId: 'uuid' });

// Request sync
socket.emit('sync:request', { syncType: 'full' });
```

---

## Testing

### Running Tests

```bash
# Backend tests
cd backend
npm test

# Specific test file
npm test -- auth.test.ts

# With coverage
npm test -- --coverage
```

### TypeScript & Linting

```bash
# Typecheck
npm run typecheck

# Lint
npm run lint

# Fix linting issues
npm run lint:fix
```

### Manual Testing with cURL

```bash
# Register
curl -X POST http://localhost:8000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"test123"}'

# Health check
curl http://localhost:8000/api/health

# Protected endpoint (requires token)
curl http://localhost:8000/api/auth/me \
  -H "Cookie: token=YOUR_JWT_TOKEN"
```

### Testing with Postman

1. Import collection: `docs/InboxOS_API.postman_collection.json`
2. Import environment: `docs/InboxOS_API.postman_environment.json`
3. Run collection → Tests tab shows results

---

## Frequently Asked Questions

### Q: How do I authenticate requests?

**A:** Use cookies automatically. Set `credentials: 'include'` in fetch:
```javascript
fetch('/api/auth/me', { credentials: 'include' });
```

### Q: Can I use Bearer tokens instead of cookies?

**A:** Currently, the API expects HttpOnly cookies. Bearer token support can be added if needed.

### Q: How do I debug authentication issues?

**A:** Check:
1. Cookie is being sent: `curl -v http://localhost:8000/api/auth/me`
2. JWT token is valid: Decode at jwt.io
3. CORS allows credentials: Check `Access-Control-Allow-Credentials: true`

### Q: What's the rate limit?

**A:** 100 requests per 15 minutes per user. Check `X-RateLimit-*` headers.

### Q: How do I integrate with Gmail?

**A:** 
1. Call `GET /api/integrations/gmail/auth` to get OAuth URL
2. Redirect user to URL
3. Google redirects to `/api/integrations/gmail/callback?code=CODE&state=USERID`
4. Backend exchanges code for tokens automatically

### Q: Can I send emails programmatically?

**A:** Yes, via `POST /api/emails/send` with authentication.

---

## Support & Contributing

- **Documentation:** See `README.md`, `CONTRIBUTING.md`, `WORKFLOW.md`
- **Issues:** Report bugs on GitHub Issues
- **Discussions:** Join our community Discord
- **Docs Site:** https://inboxos.com/docs

---

## Changelog

### v1.0.0 (June 2026)

- ✅ Core API endpoints (auth, users, emails, webhooks)
- ✅ OAuth2 integration (Gmail)
- ✅ Swagger/OpenAPI documentation
- ✅ Rate limiting middleware
- ✅ Postman collection
- ✅ WebSocket support (Socket.IO)
- ✅ Health check and metrics endpoints

---

**Last Updated:** June 2026  
**Maintained by:** InboxOS Core Team
