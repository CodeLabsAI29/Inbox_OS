# 📬 InboxOS — Complete Architecture & Completed Work Documentation

This document provides a comprehensive technical overview of the completed work, architecture, design decisions, and file-by-file configuration details for **InboxOS**.

---

## 📖 Table of Contents
1. [Core Philosophy & Architecture](#1-core-philosophy--architecture)
2. [Project Layout & Directory Hierarchy](#2-project-layout--directory-hierarchy)
3. [Technology Stack & Dependency Reference](#3-technology-stack--dependency-reference)
4. [Authentication & Session Management](#4-authentication--session-management)
5. [Database Architecture & Schema Analysis](#5-database-architecture--schema-analysis)
   - [Schema Definition](#schema-definition)
   - [PGVector (RAG) vs SQLite Fallback Implementation](#pgvector-rag-vs-sqlite-fallback-implementation)
6. [Ingestion & Sync Workflows](#6-ingestion--sync-workflows)
7. [Parsing & Extraction Engine](#7-parsing--extraction-engine)
8. [AI Intelligence Layer](#8-ai-intelligence-layer)
9. [Rules Engine (Evaluation DSL)](#9-rules-engine-evaluation-dsl)
10. [Action Handlers & Output Notification Adapters](#10-action-handlers--output-notification-adapters)
11. [Background Workers & Job Queues (BullMQ)](#11-background-workers--job-queues-bullmq)
12. [Real-time Communication Layer (Socket.IO)](#12-real-time-communication-layer-socketio)
13. [Frontend Application Architecture](#13-frontend-application-architecture)
14. [Local Development, Docker & Configuration Setup](#14-local-development-docker--configuration-setup)
15. [Codebase Anomalies & Technical Debt Notes](#15-codebase-anomalies--technical-debt-notes)

---

## 1. Core Philosophy & Architecture

InboxOS acts as a decision and automation layer on top of email providers like Gmail, Outlook, and IMAP servers. Rather than displaying email as a static list of messages, InboxOS uses a 5-layer processing pipeline to parse, analyze, categorize, evaluate, and deliver emails as structured events.

```
                  ┌──────────────────────────────┐
                  │   Email Ingestion Webhook    │
                  │   (Gmail/Outlook/IMAP/HTTP)  │
                  └──────────────┬───────────────┘
                                 │
                                 ▼
                  ┌──────────────────────────────┐
                  │    Parser & Sanitization     │
                  │ (Cheerio, Turndown, Links)   │
                  └──────────────┬───────────────┘
                                 │
                                 ▼
                  ┌──────────────────────────────┐
                  │     AI Intelligence Layer    │
                  │   (OpenAI, Gemini, Ollama)   │
                  └──────────────┬───────────────┘
                                 │
                                 ▼
                  ┌──────────────────────────────┐
                  │      Rules Engine DSL        │
                  │ (From, Priority, Match Rules)│
                  └──────────────┬───────────────┘
                                 │
                                 ▼
                  ┌──────────────────────────────┐
                  │    Action & Delivery Layer   │
                  │ (Telegram, Slack, Reminders) │
                  └──────────────────────────────┘
```

The system uses an asynchronous architecture to prevent slow third-party API calls (like LLMs or mail synchronizers) from blocking the web server. When an email is received, it is stored in the database and a processing event is queued in Redis. Background workers then handle the parsing, AI classification, rules matching, and notifications.

---

## 2. Project Layout & Directory Hierarchy

The project is structured as a monorepo containing the frontend client, backend server, database schemas, and dev configurations:

- [README.md](file:///c:/project/InboxOS/README.md): Primary setup and overview guide.
- [package.json](file:///c:/project/InboxOS/package.json): Defines workspace roots (`backend`, `frontend`).
- [backend/](file:///c:/project/InboxOS/backend/): Contains the Express server, background jobs, database model definitions, and tests.
  - [package.json](file:///c:/project/InboxOS/backend/package.json): Lists production and development dependencies.
  - [tsconfig.json](file:///c:/project/InboxOS/backend/tsconfig.json): TypeScript compiler options.
  - [Dockerfile](file:///c:/project/InboxOS/backend/Dockerfile): Multi-stage containerization script.
  - [prisma/](file:///c:/project/InboxOS/backend/prisma/): Contains the PostgreSQL database models.
    - [schema.prisma](file:///c:/project/InboxOS/backend/prisma/schema.prisma): DB models and relations.
    - [seed.ts](file:///c:/project/InboxOS/backend/prisma/seed.ts): Seeds development accounts and rules.
  - [src/](file:///c:/project/InboxOS/backend/src/): Source code.
    - [server.ts](file:///c:/project/InboxOS/backend/src/server.ts): Primary server entrypoint.
    - [worker.ts](file:///c:/project/InboxOS/backend/src/worker.ts): Event handlers for processing emails.
    - [reminder-worker.ts](file:///c:/project/InboxOS/backend/src/reminder-worker.ts): Background dispatcher for task alerts.
    - [config/](file:///c:/project/InboxOS/backend/src/config/): Configuration modules.
    - [middleware/](file:///c:/project/InboxOS/backend/src/middleware/): Auth check and rate-limiting modules.
    - [routes/](file:///c:/project/InboxOS/backend/src/routes/): Scaffolded route files (not mounted).
    - [services/](file:///c:/project/InboxOS/backend/src/services/): Business logic services (AI, sync, notifications).
    - [utils/](file:///c:/project/InboxOS/backend/src/utils/): Logger, metrics, and encryption utilities.
- [frontend/](file:///c:/project/InboxOS/frontend/): Contains the React single page application.
  - [package.json](file:///c:/project/InboxOS/frontend/package.json): Client libraries and scripts.
  - [tailwind.config.js](file:///c:/project/InboxOS/frontend/tailwind.config.js): Style configurations.
  - [vite.config.ts](file:///c:/project/InboxOS/frontend/vite.config.ts): Vite build settings.
  - [src/](file:///c:/project/InboxOS/frontend/src/): Source files.
    - [main.tsx](file:///c:/project/InboxOS/frontend/src/main.tsx): SPA renderer bootstrap.
    - [App.tsx](file:///c:/project/InboxOS/frontend/src/App.tsx): Main layout router and settings.
    - [index.css](file:///c:/project/InboxOS/frontend/index.css): Core Tailwind directives and custom styles.
    - [context/](file:///c:/project/InboxOS/frontend/src/context/): Shared auth and socket state hooks.
    - [components/](file:///c:/project/InboxOS/frontend/src/components/): Dashboard widgets, viewers, lists.
    - [pages/](file:///c:/project/InboxOS/frontend/src/pages/): Recharts analytics dashboard.
- [infrastructure/](file:///c:/project/InboxOS/infrastructure/): Deployment settings.
  - [docker/](file:///c:/project/InboxOS/infrastructure/docker/): Docker Compose environment files.

---

## 3. Technology Stack & Dependency Reference

### Backend Technologies
- **TypeScript & Node.js**: The core runtime environment.
- **Express.js (v5.2.1)**: Handles HTTP request routing.
- **Prisma (v5.16+)**: Manages schema migrations and database queries.
- **Redis (ioredis v5.11+)**: Backs the event bus and the BullMQ background queue.
- **OpenAI & Gemini API Clients**: Integrates models like `gpt-4o-mini` and Gemini Pro.
- **Chrono-Node & Cheerio**: Used to extract dates and parse incoming HTML emails.
- **Socket.IO**: Handles real-time events between the server and the frontend.

### Frontend Technologies
- **React (v19.2+) & Vite (v8.1+)**: The build tool and UI rendering framework.
- **Tailwind CSS**: A utility-first styling framework used to build the dashboard's glassmorphic UI.
- **Framer Motion**: Manages smooth transitions and hover micro-animations.
- **Recharts (v3.9+)**: Powers the dashboard analytics visualizations.

---

## 4. Authentication & Session Management

InboxOS uses a secure, session-based authentication model.

```
[ Frontend Client ]                                      [ Backend Server ]
        │                                                        │
        │─── POST /api/auth/register (Credentials) ─────────────>│
        │                                                        │ Hashing password (bcrypt)
        │                                                        │ Saves User to Database
        │                                                        │ Generates JWT
        │<── Set-Cookie: token=<jwt>; HttpOnly; Secure; ─────────│ Sets JWT Cookie
        │                                                        │
        │─── POST /api/auth/firebase (ID Token) ────────────────>│
        │                                                        │ Verifies ID token with Firebase Admin
        │                                                        │ Matches/creates User
        │<── Set-Cookie: token=<jwt>; HttpOnly; Secure; ─────────│ Sets JWT Cookie
```

### Authentication Flows
1. **Credentials Login / Registration**:
   - `POST /api/auth/register` and `POST /api/auth/login` handle user credentials.
   - Passwords are encrypted using **bcrypt** with 10 salt rounds before being stored.
   - On success, the server signs a **JSON Web Token (JWT)** containing the user's ID and email, valid for 24 hours.
   - The JWT is returned via a secure, HTTP-only cookie named `token`.
2. **Google OAuth & Firebase Integration**:
   - The frontend uses the Firebase Client SDK to open a Google Sign-In popup and retrieve an ID Token.
   - The frontend sends this token to `POST /api/auth/firebase` or `POST /api/auth/google/login`.
   - The backend validates the ID Token using the **Firebase Admin SDK** to check authenticity.
   - If the Google account's email matches an existing user, the backend logs them in and issues a standard session cookie. If not, it creates a new user record.
3. **Session Interception**:
   - The `requireAuth` middleware verifies incoming cookies on protected routes.
   - The middleware decodes the JWT using the configured `JWT_SECRET`. If valid, it attaches the user payload to `req.user` and passes control to the next handler.

---

## 5. Database Architecture & Schema Analysis

The system runs on **PostgreSQL 15+** (with cloud hosting on Supabase in development). 

### Schema Definition
The database schema includes the following models:
- **`User`**: Root credentials (email, password hash).
- **`UserSettings`**: Configurations including Telegram integrations, timezone, and DND settings.
- **`Thread` & `Email`**: Stores parsed email histories and thread groups.
- **`EmailAnalysis`**: Stores AI-generated summaries, priorities, and deadlines.
- **`ActionItem`**: Tracks tasks extracted from email content.
- **`Reminder`**: Handles alerts scheduled relative to specific deadlines.
- **`Rule`**, **`RuleCondition`**, & **`RuleAction`**: Configuration tables for the Rules Engine.

### PGVector (RAG) vs SQLite Fallback Implementation
To support semantic search across past email histories, the `Email` table includes an `embedding` vector field. The system supports two database targets:

1. **PostgreSQL (pgvector)**:
   - When calculating embeddings (`AIService.embedEmail()`), the system converts the generated vector array into a formatted string (e.g., `"[0.12, 0.45, -0.09]"`).
   - It runs a raw SQL update using the pgvector casting syntax:
     ```sql
     UPDATE "Email" SET embedding = $1::vector WHERE id = $2
     ```
   - Searches run cosine similarity comparisons using the `<=>` operator (cosine distance):
     ```sql
     SELECT id, subject, body, (1 - (embedding <=> $1::vector)) as similarity
     FROM "Email" WHERE embedding IS NOT NULL AND "userId" = $2
     ORDER BY embedding <=> $1::vector ASC LIMIT $3
     ```
2. **SQLite (Fallback)**:
   - When pgvector is unavailable, the database saves the vector array as a stringified JSON array.
   - Searches load all records with non-null embeddings into memory, then compute cosine similarity programmatically:
     $$\text{Similarity} = \frac{A \cdot B}{\|A\| \|B\|}$$
   - The system then sorts and slices the results in memory.

---

## 6. Ingestion & Sync Workflows

InboxOS ingests emails through three primary workflows:

```
[Gmail API Sync] ──► Syncs history IDs ──┐
[Outlook API]     ──► Delta tokens ───────┼─► Save to Email Table ─► EventBus.publish()
[Webhook Route]  ──► Ingests HTTP post ──┘
```

1. **Gmail Sync Service** ([gmail-sync.service.ts](file:///c:/project/InboxOS/backend/src/services/gmail-sync.service.ts)):
   - Uses OAuth2 to retrieve Gmail access tokens.
   - Synchronizes messages using history IDs, pulling raw SMTP payloads and publishing them to the processing queue.
2. **Outlook Sync Service** ([outlook-sync.service.ts](file:///c:/project/InboxOS/backend/src/services/outlook-sync.service.ts)):
   - Implements Delta queries via Microsoft Graph API to pull changes since the last sync.
3. **HTTP Webhook Ingestion** (`POST /api/webhooks/incoming`):
   - Ingests emails from external services using structured JSON payloads.
   - Validates inputs (sender, recipient, subject, body) using Zod.
   - Saves the email to the database and publishes the event to the Redis event bus.

---

## 7. Parsing & Extraction Engine

The parsing engine processes raw email bodies to sanitize content and extract structured data:

- **Cheerio HTML Sanitizer**: Strips inline JavaScript, CSS blocks, tracker pixels, and hidden elements to clean up raw HTML.
- **Link & Attachment Extractor** ([link-attachment-extractor.service.ts](file:///c:/project/InboxOS/backend/src/services/parser/link-attachment-extractor.service.ts)):
   - Extracts anchor tags and resolves links.
   - Detects suspicious links (mismatches between display text and target URL) to flag potential phishing attempts.
   - Calculates MD5 hashes for attachments to prevent duplicates.

---

## 8. AI Intelligence Layer

The AI service wraps external API calls to OpenAI, Gemini, and local Ollama instances:

- **Email Classification**: Sorts emails into categories (`urgent`, `finance`, `job`, `otp`, `meeting`, `newsletter`, `academic`, `personal`, `work`, `spam`) using structured JSON outputs.
- **Task & Date Extraction**: Identifies action items and due dates, using Chrono-Node to parse relative terms like "next Friday at 2 PM".
- **Semantic Summarization**: Generates summaries for long email threads to highlight key information.

---

## 9. Rules Engine (Evaluation DSL)

The rules engine evaluates user-defined rules against incoming email metadata:

- **Conditions**: Supported fields include `from`, `to`, `subject`, `body`, `category`, and `priorityScore`. Available operators include `equals`, `contains`, `startsWith`, `endsWith`, `regex`, `gt`, `lt`, and `in`.
- **Actions**: Triggered actions include `markAsRead`, `markAsUrgent`, `sendTelegram`, `sendWhatsApp`, and executing HTTP webhooks.

---

## 10. Action Handlers & Output Notification Adapters

Dispatches alerts and syncs events to external services:

- **Telegram Bot Integration** ([telegram-bot.service.ts](file:///c:/project/InboxOS/backend/src/services/telegram-bot.service.ts)):
   - Connects to the Telegram Bot API using polling or webhook routing.
   - Sends alerts for high-priority emails, formatted with emojis and markdown.
- **Slack & Discord Adapters**: Sends messages to configured channels using incoming webhooks.
- **Calendar & Expense extractors**: Syncs extracted events to Google Calendar and categorizes financial transactions in USD.

---

## 11. Background Workers & Job Queues (BullMQ)

The system uses BullMQ and Redis to manage background tasks:

- **Email Index Worker**: Processes the core ingestion pipeline (parsing, classification, and rules evaluation).
- **Calendar & Digest Workers**: Syncs calendar events and schedules weekly/daily email digests.
- **Reminder Scheduler**: Polls the database for upcoming deadlines and triggers alerts.

---

## 12. Real-time Communication Layer (Socket.IO)

The real-time layer synchronizes state updates between the server and the client:

- **Connection Authentication**: Validates JWTs during the Socket.IO handshake.
- **Real-Time Events**: Streams events like `email.received` and `task.created` to update the frontend dashboard without requiring manual refreshes.

---

## 13. Frontend Application Architecture

The frontend is a React single-page application:

- **Layout Structure**: Provides a sidebar navigation layout with quick filters for different email categories.
- **Email Viewer**: Displays the email body alongside AI analysis results, including suggested replies and extracted tasks.
- **Analytics View**: Visualizes email volume and category distributions using Recharts.

---

## 14. Local Development, Docker & Configuration Setup

Provides configurations for running the application locally:

- **Docker Compose**: Sets up services for PostgreSQL, Redis, the Express backend, and the React frontend.
- **Environment Configurations**: Managed through `.env` files in both the frontend and backend to store credentials, database URLs, and API keys.

---

## 15. Codebase Anomalies & Technical Debt Notes

During the technical review, we identified the following codebase details:
1. **Unmounted Routes**:
   - The route files in `backend/src/routes/` are scaffolded but not mounted in Express.
   - The active routes are defined inline in [server.ts](file:///c:/project/InboxOS/backend/src/server.ts).
2. **Provider Scope**:
   - The active server currently only includes Gmail sync.
   - Outlook and IMAP services exist in the codebase but are not yet wired into the main server endpoints.
3. **Database Fallback**:
   - The pgvector implementation fallbacks to in-memory sorting for SQLite, which may impact performance with larger datasets.
