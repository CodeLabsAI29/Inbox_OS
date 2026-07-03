# 📬 InboxOS — The AI Inbox Operating System

**Not an email client. A decision + execution layer that reads your inbox, understands what matters, and acts on it automatically.**

<p align="center">
  <img src="https://img.shields.io/badge/Python-3.11%2B-blue?style=for-the-badge&logo=python&logoColor=white" alt="Python Version" />
  <img src="https://img.shields.io/badge/FastAPI-0.100.0%2B-009688?style=for-the-badge&logo=fastapi&logoColor=white" alt="FastAPI" />
  <img src="https://img.shields.io/badge/Next.js-14-black?style=for-the-badge&logo=nextdotjs&logoColor=white" alt="Next.js" />
  <img src="https://img.shields.io/badge/PostgreSQL-15%2B-336791?style=for-the-badge&logo=postgresql&logoColor=white" alt="PostgreSQL" />
  <img src="https://img.shields.io/badge/Redis-7-red?style=for-the-badge&logo=redis&logoColor=white" alt="Redis" />
  <img src="https://img.shields.io/badge/OpenAI-GPT--4o-412991?style=for-the-badge&logo=openai&logoColor=white" alt="OpenAI" />
  <img src="https://img.shields.io/badge/Docker-Supported-2496ED?style=for-the-badge&logo=docker&logoColor=white" alt="Docker" />
  <img src="https://img.shields.io/badge/License-MIT-green?style=for-the-badge" alt="License" />
  
</p>

---

## Table of Contents 

1. [Introduction & Problem Statement](#1-introduction--problem-statement)
2. [Key Features](#2-key-features)
3. [System Architecture](#3-system-architecture)
4. [The 5-Layer Pipeline (Detailed)](#4-the-5-layer-pipeline-detailed)
5. [Database Schema](#5-database-schema)
6. [WebSocket Interface Specification](#6-websocket-interface-specification)
7. [API Route Reference](#7-api-route-reference)
8. [Project Structure](#8-project-structure)
9. [Local Development Setup](#9-local-development-setup)
10. [Configuration & Environment Variables](#10-configuration--environment-variables)
11. [Production Deployment Guide](#11-production-deployment-guide)
12. [Keyboard Shortcuts](#12-keyboard-shortcuts)
13. [Performance Optimizations](#13-performance-optimizations)
14. [Team & Contributing](#14-team--contributing)
15. [Appendix](#15-appendix)

---


## 1. Introduction & Problem Statement

The average knowledge worker receives **120+ emails per day**. 

Inboxes have become a cluttered  dumping ground containing a chaotic mix of urgent project threads, high-priority notifications, OTP verification codes, meeting invites, invoices, automated newsletters, and spam. Current tools attempt to solve this with summaries, but a summary is simply shorter noise. 

**InboxOS** represents a paradigm shift. It is a dedicated **decision + execution layer** that sits on top of your existing mail provider. If Gmail or Outlook is the hard drive, InboxOS is the operating system. It parses incoming streams, uses structured AI reasoning to identify deadlines and tasks, evaluates programmatic routing rules, and automatically acts on them—scheduling calendar events, creating dashboard tasks, and pushing urgent alerts directly to your messaging apps. 

InboxOS is built from the ground up to democratize inbox automation: it is open-source, fully self-hostable, and supports local AI models (via Ollama) so that your private emails never leave your machine.

---

## 2. Key Features

*  **5-Layer AI Pipeline:** A structured flow that processes raw emails through ingestion, parser, intelligence, rules, action, and delivery layers.
*  **Multi-Provider Connectors:** Built-in connectors for Gmail, Outlook (Graph API), and generic IMAP servers with full OAuth 2.0 security.
*  **AI Classification Engine:** Automatic sorting of incoming mail into 8 distinct categories (`academic`, `job`, `finance`, `meeting`, `OTP`, `newsletter`, `personal`, `support`) with granular priority scoring ($0$–$100$).
*  **Smart Action Extraction:** Extracts structured entities: deadlines, action items, monetary amounts, and physical/digital locations.
*  **Rules Engine:** User-defined routing conditions with boolean logic, priority evaluation, and active time-of-day windows.
*  **Multi-Channel Delivery:** Real-time push alerts to WhatsApp, Slack webhooks, Telegram, email digests, and custom WebSockets.
*  **Real-Time Dashboard:** Dark glassmorphism dashboard built with Next.js 14 and Tailwind CSS, updating live via WebSocket.
*  **Privacy-First AI:** Run fully local intelligence models using Ollama (Llama 3/Mistral) or hook up to commercial endpoints (OpenAI / Gemini).
*  **Plugin SDK (v3 roadmap):** Unified interfaces for building third-party connectors and execution actions.
*  **Team Inbox (v3 roadmap):** Multi-user support with ticket assignments, audit logs, and response SLA tracking.

---

## 3. System Architecture

InboxOS processes data asynchronously, routing raw email streams through a structured parsing, classification, and execution pipeline.

```mermaid
%%{init: {'theme': 'dark', 'themeVariables': { 'primaryColor': '#1e293b', 'primaryTextColor': '#f8fafc', 'primaryBorderColor': '#3b82f6', 'lineColor': '#6366f1', 'secondaryColor': '#0f172a', 'tertiaryColor': '#1e293b'}}}%%
graph TD
    A[Email Providers <br> Gmail / Outlook / IMAP] -->|OAuth 2.0 Ingestion| B(Connector Layer)
    B -->|Raw Multipart Email| C(Parser Layer)
    C -->|Clean text/plain & Markdown| D(Intelligence Layer)
    D -->|LLM Structured Extraction JSON| E(Rules Engine DSL)
    E -->|Route & Rule Matches| F(Action Engine)
    F -->|System Task Executed| G(Output Adapters)
    G -->|WhatsApp / Slack / WebSocket / SMS| H[Delivery Channels]

    classDef default fill:#1e293b,stroke:#3b82f6,stroke-width:2px,color:#f8fafc;
    classDef storage fill:#0f172a,stroke:#10b981,stroke-width:2px,color:#f8fafc;
    classDef queue fill:#312e81,stroke:#8b5cf6,stroke-width:2px,color:#f8fafc;

    subgraph Infrastructure
        DB[(PostgreSQL 15)]:::storage
        CACHE[(Redis Cache)]:::storage
        WORKER(Celery Workers):::queue
    end

    B -.->|Save Raw Email| DB
    D -.->|Cache Tokens & Embeddings| CACHE
    F -.->|Queue Async Actions| WORKER
    G -.->|WebSocket Stats Broadcast| CACHE
```

---

## 4. The 5-Layer Pipeline (Detailed)

```
[Raw Email] -> (Ingestion) -> (Parse) -> (Intelligence) -> (Rules) -> (Action) -> (Delivery)
```

### Layer 1 — Ingestion
Establishes connection to mail servers. Includes the **Gmail Connector** (using Google API v1 with Pub/Sub push notifications for instant sync), **Outlook Connector** (Microsoft Graph API with delta sync), and an **IMAP Connector** that polls standard mail servers at configurable intervals.

### Layer 2 — Parser
Converts dirty multipart HTML and plain text into clean Markdown. Strips signatures using regex and heuristic layouts, removes quoted reply chains, extracts attachment metadata, and sanitizes dangerous scripts.

### Layer 3 — Intelligence
Interacts with the configured LLM client through a provider-agnostic interface (`LLMClient`). Executes system prompting using few-shot classification templates, utilizing OpenAI's JSON Mode or Gemini's Structured Output to return reliable JSON structures.

### Layer 4 — Rules
An evaluation engine that executes user-defined constraints. It processes logical conditions (`sender_is`, `domain_is`, `category_is`, `priority_above`, `has_attachment`, `sent_before`) and applies priority overrides and active scheduling windows.

### Layer 5 — Delivery
Distributes outputs to external target endpoints. Integrates with the Twilio WhatsApp API, Slack Webhook client, Telegram Bot API, and Next.js WebSockets to keep developers and users notified.

---

### Example Data Flow

| Layer | Input / Data Format | Output / Extracted Data |
| :--- | :--- | :--- |
| **Layer 1: Ingestion** | Raw SMTP / IMAP Socket Connection | `{"id": "msg_9918", "raw_headers": "...", "body_html": "..."}` |
| **Layer 2: Parser** | Raw HTML / Multipart Text | `{"clean_text": "Project update due by Friday 5 PM. Total invoice is $1,200."}` |
| **Layer 3: Intelligence** | Clean text/plain | `{"category": "finance", "priority": 95, "deadline": "2026-07-03T17:00:00Z"}` |
| **Layer 4: Rules** | JSON metadata & categories | `MATCH RULE "Finance Priority Alert" -> Action: WhatsApp Alert & Task Creator` |
| **Layer 5: Delivery** | Scheduled Task & Notification payload | WhatsApp sent: *"Finance Alert: Invoice of $1200 due on Friday at 5 PM."* |

---

## 5. Database Schema

The persistent layer is backed by PostgreSQL 15, optimized for JSONB indexing to handle evolving metadata fields.

```sql
-- Core users table
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    preferences JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Email connections mapping
CREATE TABLE email_accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    provider VARCHAR(50) NOT NULL, -- 'gmail', 'outlook', 'imap'
    encrypted_credentials BYTEA NOT NULL,
    sync_state VARCHAR(50) NOT NULL,
    last_sync_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Persistent email storage
CREATE TABLE emails (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    account_id UUID REFERENCES email_accounts(id) ON DELETE CASCADE,
    provider_message_id VARCHAR(255) NOT NULL,
    thread_id VARCHAR(255),
    sender VARCHAR(255) NOT NULL,
    subject VARCHAR(500) NOT NULL,
    body_text TEXT NOT NULL,
    body_html TEXT,
    received_at TIMESTAMP WITH TIME ZONE NOT NULL,
    raw_metadata JSONB NOT NULL DEFAULT '{}'
);

-- Structured AI analysis results
CREATE TABLE email_analysis (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email_id UUID REFERENCES emails(id) ON DELETE CASCADE,
    category VARCHAR(50) NOT NULL,
    priority_score INT NOT NULL,
    urgency_score INT NOT NULL,
    actionability_score INT NOT NULL,
    confidence_score INT NOT NULL,
    summary TEXT NOT NULL,
    extracted_data JSONB NOT NULL DEFAULT '{}',
    analyzed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Programmatic Action Rules
CREATE TABLE rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    conditions JSONB NOT NULL DEFAULT '[]',
    actions JSONB NOT NULL DEFAULT '[]',
    priority_order INT NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Tasks generated from emails
CREATE TABLE tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    deadline TIMESTAMP WITH TIME ZONE,
    status VARCHAR(50) NOT NULL DEFAULT 'pending', -- 'pending', 'in_progress', 'completed'
    source_email_id UUID REFERENCES emails(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Multi-channel system notifications
CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    channel VARCHAR(50) NOT NULL, -- 'whatsapp', 'slack', 'telegram', 'websocket'
    content TEXT NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'queued', -- 'queued', 'sent', 'failed'
    sent_at TIMESTAMP WITH TIME ZONE,
    read_at TIMESTAMP WITH TIME ZONE
);

-- Core Database Indexes for Performance
CREATE INDEX idx_emails_received_at ON emails (received_at DESC);
CREATE INDEX idx_email_analysis_scores ON email_analysis (priority_score, category);
CREATE INDEX idx_emails_raw_metadata_gin ON emails USING gin (raw_metadata);
CREATE INDEX idx_email_analysis_data_gin ON email_analysis USING gin (extracted_data);
CREATE INDEX idx_tasks_deadline ON tasks (deadline NULLS LAST);
```

---

## 6. WebSocket Interface Specification

Real-time interface connection point: `/ws/{user_id}` (requires JWT in headers or query parameters).

### Server → Client Events

#### `email.received`
Pushed when an incoming email is fetched, parsed, and analyzed by the AI pipeline.
```json
{
  "event": "email.received",
  "timestamp": "2026-06-29T20:15:00Z",
  "data": {
    "email_id": "8a09b2e1-456c-789d-01ef-23456789abcd",
    "sender": "billing@cloudprovider.com",
    "subject": "Overdue Invoice: #INV-29091",
    "analysis": {
      "category": "finance",
      "priority_score": 92,
      "urgency_score": 85,
      "summary": "Urgent request to pay overdue monthly cloud hosting bill.",
      "extracted_data": {
        "due_date": "2026-07-01T23:59:59Z",
        "amount_due": 1240.50,
        "currency": "USD"
      }
    }
  }
}
```

#### `task.created`
Pushed when the action engine automatically extracts a task from an analyzed email.
```json
{
  "event": "task.created",
  "timestamp": "2026-06-29T20:15:02Z",
  "data": {
    "task_id": "9b10c3f2-567d-890e-12fa-34567890bcde",
    "title": "Pay Overdue Invoice: #INV-29091",
    "deadline": "2026-07-01T23:59:59Z",
    "source_email_id": "8a09b2e1-456c-789d-01ef-23456789abcd"
  }
}
```

#### `dashboard.stats`
Broadcast to update real-time graphs and figures in the frontend client.
```json
{
  "event": "dashboard.stats",
  "timestamp": "2026-06-29T20:15:05Z",
  "data": {
    "unread_count": 14,
    "processed_today": 182,
    "categories_distribution": {
      "finance": 12,
      "meeting": 8,
      "newsletter": 145,
      "personal": 17
    }
  }
}
```

---

### Client → Server Events

#### `subscribe_user`
Subscribes the connection channel to user-specific events.
```json
{
  "action": "subscribe_user",
  "user_id": "1a23b4c5-678d-90ee-fffa-bcde12345678"
}
```

#### `mark_read`
Instructs the server to mark a specific email and its tasks as processed.
```json
{
  "action": "mark_read",
  "email_id": "8a09b2e1-456c-789d-01ef-23456789abcd"
}
```

---

## 7. API Route Reference

All API routes require authentication using a Bearer JWT Token unless explicitly labeled `Public`.

| Method | Route | Description | Auth |
| :--- | :--- | :--- | :--- |
| **POST** | `/auth/connect/gmail` | Initiates Gmail OAuth credentials connection flow. | JWT |
| **GET** | `/auth/callback/gmail` | Callback handler for Google credentials token exchange. | Public |
| **GET** | `/emails` | Query processed emails. Supports pagination, category, and score filtering. | JWT |
| **GET** | `/emails/{id}` | Fetches detailed parsed message body, AI analysis, and action items. | JWT |
| **GET** | `/emails/{id}/analysis` | Fetches the raw AI classification output data. | JWT |
| **POST** | `/tasks` | Create manual tasks or trigger an extraction from a specific email. | JWT |
| **PATCH**| `/tasks/{id}` | Update task status (`pending`, `in_progress`, `completed`). | JWT |
| **GET** | `/rules` | Retrieves user-defined evaluation rules. | JWT |
| **POST** | `/rules` | Declares a new rules parsing route definition. | JWT |
| **DELETE**| `/rules/{id}` | Removes a rules parsing route definition. | JWT |
| **GET** | `/dashboard/stats` | Fetches core metrics, category count, and queue states. | JWT |
| **GET** | `/dashboard/heatmap` | Generates activity maps for dashboard analytics. | JWT |
| **GET** | `/settings` | Update/fetch active AI clients, priorities, and secrets. | JWT |
| **POST** | `/webhooks/gmail` | Push endpoint for Google Cloud Pub/Sub instant notification. | Signed |
| **GET** | `/health` | Simple diagnostic route verifying database and Redis connections. | Public |
| **WS** | `/ws/{user_id}` | Live update connection link. | JWT |

---

## 8. Project Structure

This monorepo isolates individual layers and clients under clean folders. All config files are structured under `config/` to keep the root directory pristine.

```text
InboxOS/
├── apps/
│   ├── api/                    # FastAPI python server backend
│   └── web/                    # Next.js 14 frontend client (React + Vite)
├── config/                     # Configuration and Environment mappings
│   ├── docker/
│   │   └── docker-compose.yml  # Relocated Docker Compose runtime configuration
│   ├── env/
│   │   └── .env.example        # Environment variables template file
│   └── git/
│       └── gitignore           # Symbolic link pointing to root .gitignore
├── docs/                       # Developer manuals & ADR logs
│   └── implementation-plan.md  # Core implementation design document
├── packages/                   # Decoupled libraries
│   ├── core/                   # Pydantic schemas, exception logic
│   ├── intelligence/           # AI classifier engines & templates
│   ├── outputs/                # Adapters for Slack, Telegram, WhatsApp
│   └── rules-engine/           # Evaluator DSL parser logic
├── .gitignore                  # Git tracking rules
└── README.md                   # Repository Hero and Reference manual (this file)
```

---

## 9. Local Development Setup

### Prerequisites
*   Python $3.11+$
*   Node.js $18+$
*   PostgreSQL $15+$
*   Redis $7+$

---

### Quick Start (Docker Compose)

The entire pipeline can be deployed locally using the Docker Compose configuration located in the `config/` directory.

```bash
# 1. Clone the repository
git clone https://github.com/inboxos/inboxos.git
cd inboxos

# 2. Copy and configure variables
cp config/env/.env.example config/env/.env
# Edit config/env/.env with your secrets

# 3. Spin up all services (PostgreSQL, Redis, API Backend, Celery, Frontend Dashboard)
docker compose -f config/docker/docker-compose.yml up -d

# 4. Execute database migrations
docker compose -f config/docker/docker-compose.yml exec api alembic upgrade head

# 5. Open the Dashboard UI
# Access the dashboard at http://localhost:5173
```

---

### Manual Setup (Development)

For active local debugging of individual services without Docker containerization.

#### 1. Backend API Server
```bash
cd apps/api
python -m venv venv
source venv/bin/activate # Windows: venv\Scripts\activate
pip install -r requirements.txt
cp ../../config/env/.env.example ../../config/env/.env
uvicorn main:app --reload --port 8000
```

#### 2. Celery Worker Queue (new terminal)
```bash
cd apps/api
source venv/bin/activate
celery -A tasks worker --loglevel=info
```

#### 3. Frontend Dashboard UI (new terminal)
```bash
cd apps/web
npm install
npm run dev
```

#### 4. Telegram Bot Local Webhook Tunnel
For local testing of bidirectional Telegram bot webhooks:
```bash
# 1. Start a local tunnel mapping port 8000
ngrok http 8000

# 2. Copy the resulting HTTPS forwarding URL (e.g., https://abc-123.ngrok-free.app)
#    and paste it as TELEGRAM_WEBHOOK_URL in your config/env/.env file.

# 3. Spin up your backend server. Webhooks will automatically register on startup!
uvicorn main:app --reload
```

---

## 10. Configuration & Environment Variables

Create your configuration files inside `config/env/`.

### Backend Configuration (`config/env/.env`)

| Key | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| `DATABASE_URL` | String | `postgresql+asyncpg://inboxos:inboxos_dev@postgres:5432/inboxos` | SQLAlchemy database URI. |
| `REDIS_URL` | String | `redis://localhost:6379/0` | Redis caching & async broker address. |
| `OPENAI_API_KEY` | String | — | OpenAI key (required if `AI_PROVIDER` is `openai`). |
| `GEMINI_API_KEY` | String | — | Google AI studio key (required if provider is `gemini`). |
| `OLLAMA_BASE_URL` | String | `http://localhost:11434` | Endpoint for local running model. |
| `AI_PROVIDER` | String | `mock` | Selected AI engine (`openai`, `gemini`, `ollama`, `mock`). |
| `JWT_SECRET` | String | `dev-secret-change-in-production-32chars!!` | Cryptographic secret for signing API tokens. |
| `GMAIL_CLIENT_ID` | String | — | Google Developer Console Client Identity credentials. |
| `GMAIL_CLIENT_SECRET` | String | — | Google Developer Console Client Secret credentials. |
| `TWILIO_ACCOUNT_SID` | String | — | Twilio SID credentials (for WhatsApp dispatch). |
| `TWILIO_AUTH_TOKEN` | String | — | Twilio token verification credentials. |

---

### Frontend Configuration (`apps/web/.env`)

| Key | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| `NEXT_PUBLIC_API_URL` | String | `http://localhost:8000` | Address location of FastAPI backend server. |
| `NEXT_PUBLIC_WS_URL` | String | `ws://localhost:8000` | Address location for real-time WebSocket. |

---

## 11. Production Deployment Guide

### Backend Deploy (DigitalOcean App Platform / Render)
1. Provision a managed **PostgreSQL 15** and **Redis** instance.
2. Build the Dockerfile context from `apps/api/` folder.
3. Bind the environment variables to point to production endpoints (ensure `APP_ENV=production` is set).
4. Run `alembic upgrade head` inside a release command wrapper hook before launching.

### Frontend Deploy (Vercel)
1. Connect the repository and configure target build directory to `apps/web`.
2. Configure build framework presets to **Vite** / **Next.js**.
3. Supply `NEXT_PUBLIC_API_URL` and `NEXT_PUBLIC_WS_URL` env parameters pointing to the live API backend server.

### Self-Hosted (Single VPS with Nginx)
For deploying everything on a single virtual private server.
1. Run `docker compose -f config/docker/docker-compose.yml up -d` on the VPS.
2. Bind local Nginx to reverse proxy port `8000` (API backend) and port `5173` (Frontend).
3. Secure the connection with Let's Encrypt SSL certificates:
   ```bash
   sudo apt-get install certbot python3-certbot-nginx
   sudo certbot --nginx -d yourdomain.com
   ```

---

## 12. Keyboard Shortcuts

Increase efficiency inside the dark glassmorphism dashboard UI.

| Shortcut Key | Action |
| :---: | :--- |
| <kbd>/</kbd> | Focus Global Search Bar |
| <kbd>g</kbd> | Navigate to Inbox view |
| <kbd>a</kbd> | Navigate to Alerts and Tasks dashboard |
| <kbd>r</kbd> | Force reload sync channels |
| <kbd>n</kbd> | Create New Routing Rule |
| <kbd>?</kbd> | Toggle Keyboard Shortcuts Overlay |
| <kbd>Esc</kbd> | Dismiss active panels, modals, and filters |

---

## 13. Performance Optimizations

*  **Parser Caching:** Parsed multipart email contexts and structures are serialized and stored in Redis with a 24-hour expiration window.
*  **AI Batch Classification:** Reduces LLM latency by grouping low-importance emails (such as newsletters and support tickets) and classifying them in batches of 5. Uses a lightweight routing model (like `gpt-4o-mini`) for initial sorting before processing with complex extraction pipelines.
*  **Database Composite Indexing:** High-speed queries are achieved using composite indexes built on `(user_id, received_at DESC)` and `(category, priority_score DESC)`.
*  **Instanced Rendering:** The frontend dashboard list utilizes Virtual Scrolling (`react-window`) to smoothly render long inbox logs containing 10,000+ entries.
*  **Connection Pooling:** Backend connections are managed using `AsyncPG` with SQLALchemy async engines, maintaining connections without initialization lag.
*  **Redis-Backed Throttling:** Protects pipeline processes using rate limiters configured to allow a burst of 50 emails/hour per connected inbox user.

---

## 14. Team & Contributing

InboxOS is built by a distributed core team of open-source developers.

| Name / Role | Scope | Experience | Core Focus |
| :--- | :--- | :--- | :--- |
| **Siddharth Mehta** (Lead Architect) | Core Engine | Advanced | Orchestration layer, async database flow |
| **Elena Rostova** (AI Lead) | Intelligence | Advanced | Prompt templates, structured outputs |
| **Marcus Vance** (DevOps Architect) | Infrastructure | Advanced | Celery, Redis scaling, Docker environments |
| **Hana Tanaka** (Frontend Lead) | Web Client | Advanced | Next.js glassmorphism client, WebSockets |
| **Lucas Dupont** (Connector Lead) | Integrations | Advanced | Gmail OAuth and Microsoft Graph sync |
| **8 Community Contributors** | Extensions | Beginners | Webhook integrations, CLI scripts, translation templates |

---

### Contributing to InboxOS
We welcome contributions to the pipeline connectors and adapters!
1. Check the [Good First Issues](https://github.com/inboxos/inboxos/issues?q=is%3Aopen+is%3Aissue+label%3A%22good+first+issue%22) label—we currently maintain **102+ onboarding tasks**!
2. Read the standard `CONTRIBUTING.md` guidelines for branch styles.
3. InboxOS proudly participates in **Hacktoberfest**. Submit your PRs according to guidelines!

---

## 15. Appendix

### Example Flow 1: Academic Deadline Email
*   **Layer 1 (Ingestion):** Gmail connector fetches notification: *"A reminder that your DBMS Mini-Project is due on July 3, 2026, at 11:59 PM."*
*   **Layer 2 (Parser):** Converts HTML elements, removes headers and signature signatures.
*   **Layer 3 (Intelligence):** Sorts to category: `academic`. Assigns `priority_score: 95`. Extracts structured actions: `{"title": "Submit DBMS Mini-Project", "deadline": "2026-07-03T23:59:00Z"}`.
*   **Layer 4 (Rules):** Evaluates matches: Priority is $>90$ and category is `academic` -> Trigger Action: WhatsApp and Dashboard task creation.
*   **Layer 5 (Delivery):** Task added to PostgreSQL database. Send message: *"Urgent: Submit DBMS Mini-Project due on July 3, 2026."*

---

### Example Flow 2: Job Recruiter Email
*   **Layer 1 (Ingestion):** Outlook graph webhook fetches notification: *"Hi applicant, we loved your profile! Schedule a technical call by Friday using this link."*
*   **Layer 2 (Parser):** Converts email formatting to clean text.
*   **Layer 3 (Intelligence):** Sorts to category: `job`. Assigns `priority_score: 98`. Extracts task details: `{"title": "Schedule Technical Interview Call", "deadline": "Friday 5 PM"}`.
*   **Layer 4 (Rules):** Evaluates matches: Matches rule "Job Application Tracker" -> Priority boosted, route task.
*   **Layer 5 (Delivery):** Schedules calendar reminder, pushes task card to user alerts dashboard.

---

### Example Flow 3: Digest Newsletter Email
*   **Layer 1 (Ingestion):** IMAP polling retrieves weekly bulletin newsletter.
*   **Layer 2 (Parser):** Strips tracking pixels and promotional headers.
*   **Layer 3 (Intelligence):** Sorts to category: `newsletter`. Assigns `priority_score: 15` (low importance).
*   **Layer 4 (Rules):** Evaluates matches: Category is `newsletter` -> Match rule: "Newsletter Digest Rollup". Route to newsletter aggregate, bypass direct phone alert.
*   **Layer 5 (Delivery):** Inserts message summary into database weekly briefing logs.

---

### Glossary

*   **Connector:** Component that authenticates and fetches raw data from a specific email provider.
*   **Adapter:** Output router that delivers system messages to targeted messaging APIs (e.g., Slack Webhooks).
*   **Pipeline:** The continuous asynchronous process of ingesting, parsing, classifying, evaluating, and delivering.
*   **LLMClient:** Provider-agnostic engine wrapper handling structured communications with AI models.
*   **Rules Engine:** DSL-based evaluator verifying user constraints on processed email metadata.
*   **Digest:** Grouped summaries of low-importance emails compiled into a single daily or weekly report.
*   **RAG:** Retrieval-Augmented Generation. Used to provide context on previous mail history to the AI agent.
*   **Conjunction:** Logical matching criteria (AND/OR operations) in the Rules Engine.
*   **Orchestration:** Core server code running background pipelines and scheduling Celery queues.

---

### Developer Resources
*   [FastAPI Documentation](https://fastapi.tiangolo.com/)
*   [Next.js App Router Guide](https://nextjs.org/docs)
*   [Google API Gmail SDK](https://developers.google.com/gmail/api/guides)
*   [Microsoft Graph SDK Reference](https://learn.microsoft.com/en-us/graph/use-the-api)
*   [Celery Worker Queue Manual](https://docs.celeryq.dev/en/stable/)
*   [Ollama Local LLM Quickstart](https://github.com/ollama/ollama)
