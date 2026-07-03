## **INBOXOS** 

## **Complete Implementation Plan** 

_An Open-Source AI Inbox Operating System_ 

_**Version 1.0** | June 2026_ 

_For Contributors & Core Team_ 

## **Table of Contents** 

|**1. Project Overview**|3|
|---|---|
|**2. Core Vision & Philosophy**|4|
|**3. System Architecture**|5|
|**4. Technology Stack**|7|
|**5. Module Breakdown**|8|
|**6. Database Schema**|12|
|**7. API Design**|14|
|**8. Development Roadmap**|16|
|**9. Team Structure & Roles**|19|
|**10. Getting Started Guide**|21|
|**11. Contribution Guidelines**|23|
|**12. Appendix**|25|



## **1. Project Overview** 

**InboxOS** is an open-source AI inbox operating system that transforms how people interact with email. Instead of merely summarizing messages, InboxOS understands, prioritizes, routes, and acts on incoming email automatically. 

## **The One-Line Idea** 

Most inbox tools stop at _"you got mail, here's a summary."_ InboxOS goes further: it connects to your inbox, understands every incoming email, decides what matters, extracts deadlines and actions, and either routes information to the right place or takes the next action automatically. 

## **The Real Problem** 

People don't struggle because they can't read emails. They struggle because email is a messy mix of: 

- Urgent items hidden in long threads 

- Actionable tasks buried under noise 

- Deadlines scattered across paragraphs 

- Receipts, OTPs, job mails, meeting invites, payment alerts — all mixed together 

- No clear signal of what actually matters right now 

Users don't need "another inbox." They need a system that answers: **What actually matters right now? What do I need to do? What can be ignored? Where should this information go? Can the system do the boring follow-up for me?** 

## **What Makes InboxOS Different** 

InboxOS is not an email client. It is a **decision + execution layer** that sits on top of existing email providers. If Gmail is the hard drive, InboxOS is the operating system that decides what to do with incoming information. 

## **2. Core Vision & Philosophy** 

## **The Pipeline Model** 

Every email entering the system flows through five layers: 

## **Layer 1 — Inbox Ingestion** 

Connect to Gmail/Outlook/IMAP and normalize emails into a standard internal format 

## **Layer 2 — Intelligence Engine** 

AI classifies, scores importance, extracts entities, deadlines, and action items 

## **Layer 3 — Decision Engine** 

Rules + AI decide what should happen next (notify, task, calendar, ignore, digest) 

## **Layer 4 — Action Engine** 

Perform actual actions: create tasks, add calendar events, send WhatsApp alerts, label emails 

## **Layer 5 — Delivery Channels** 

Route outputs to WhatsApp, Slack, Telegram, dashboard, or daily digest 

## **Design Principles** 

- **Modular:** Every layer is an independent package. Beginners can work on isolated 

- modules. 

- **Extensible:** Adding a new connector or output channel should require minimal code 

- changes. 

- **Transparent:** Users see exactly why an email was classified a certain way and what 

- action was taken. 

- **Controllable:** AI makes suggestions, but user-defined rules have the final say. 

- **Privacy-First:** Support for local AI models (Ollama) so sensitive emails never leave the 

- user's machine. 

## **3. System Architecture** 

## **Monorepo Structure** 

The project uses a monorepo structure to keep modules isolated yet easy to integrate: 

`inboxos/` III `apps/` I III `web/ # Next.js dashboard` I III `api/ # FastAPI backend server` I III `packages/` I III `core/ # Shared types, schemas, orchestration` I III `email-connectors/ # Gmail, Outlook, IMAP connectors` I III `parsers/ # HTML-to-text, signature stripping` I III `intelligence/ # AI classification & extraction` I III `rules-engine/ # Routing and rule evaluation` I III `actions/ # Task/calendar/label/expense modules` I III `outputs/ # WhatsApp, Slack, Telegram adapters` I III `ui/ # Reusable frontend components` I III `docker/ # Docker Compose configs` III `docs/ # Documentation & guides` III `scripts/ # Setup & deployment scripts` 

## **Data Flow** 

1. **Fetch:** Connector pulls raw email from provider 

2. **Parse:** Parser converts HTML to clean text, strips signatures 

3. **Understand:** Intelligence layer classifies and extracts structured data 

4. **Decide:** Rules engine evaluates AI output + user rules to determine routing 

5. **Act:** Action engine executes tasks (create calendar event, send WhatsApp, etc.) 

6. **Deliver:** Output adapter sends result to the appropriate channel 

7. **Log:** Everything is stored in the database for dashboard visibility 

## **Key Components** 

## **Connectors Layer** 

Handles authentication and email fetching. Each connector implements a standard interface so the rest of the system is provider-agnostic. 

## **Parser / Extractor** 

Converts ugly HTML into usable text. Handles multipart emails, quoted reply chains, link detection, and attachment metadata. 

**Intelligence Layer** 

The AI brain. Contains classifier, importance scorer, urgency detector, action item extractor, deadline extractor, and entity extractor. 

## **Rules Engine** 

Not every decision should depend solely on AI. Users can define hard rules: always notify from these senders, never notify newsletters, boost priority for college domains. 

## **Action Engine** 

Performs work after a decision is made. Includes task creator, calendar creator, label manager, digest generator, and expense extractor. 

## **Output Adapters** 

Handles delivery to external channels. Each adapter is a separate module with a standard interface. 

## **4. Technology Stack** 

## **Backend** 

|**4. Technology**<br>**Backend**|**Stack**||
|---|---|---|
|**Runtime**|Python 3.11+||
|**Framework**|FastAPI<br>(async,<br>OpenAPI<br>auto-generation,|high|
||performance)||
|**Database**|PostgreSQL 15+ (primary), Redis (caching & job queues)||
|**ORM**|SQLAlchemy 2.0 with async support||
|**Task Queue**|Celery with Redis broker for background processing||
|**AI/ML**|OpenAI API / Gemini API / Ollama (local) via unified interface||
|**Authentication**|OAuth 2.0 for Gmail/Outlook, JWT for internal API auth||
|**Testing**|pytest with async support, coverage reporting||



## **Frontend** 

|**Frontend**||
|---|---|
|**Framework**|Next.js 14+ (App Router)|
|**Language**|TypeScript|
|**Styling**|Tailwind CSS + shadcn/ui components|
|**State Management**|Zustand (lightweight, no boilerplate)|
|**Data Fetching**|TanStack Query (React Query) for server state|
|**Charts**|Recharts for analytics dashboard|



## **DevOps & Infrastructure** 

|**Containerization**|Docker + Docker Compose for local development|
|---|---|
|**CI/CD**|GitHub Actions (lint, test, build on PR)|
|**Monitoring**|Prometheus + Grafana (optional, v2+)|
|**Deployment**|Self-hosted first, cloud-agnostic design|



## **5. Module Breakdown** 

This section details each module, its responsibilities, interfaces, and implementation notes. 

## **5.1 Core Module (packages/core)** 

**Responsibility:** Shared types, Pydantic schemas, base classes, and orchestration logic. 

## **Key Files:** 

- **schemas/email.py** — Standardized email schema (sender, subject, body, attachments, 

- thread_id) 

- **schemas/analysis.py** — AI analysis output (category, priority_score, urgency_score, 

- action_items, deadlines) 

- **schemas/rules.py** — Rule definition schema (conditions, actions, priority) 

- **base/connector.py** — Abstract base class for all email connectors 

- **base/adapter.py** — Abstract base class for all output adapters 

- **config.py** — Environment-based configuration management 

## **5.2 Email Connectors (packages/email-connectors)** 

**Responsibility:** Authenticate with email providers, fetch emails, and normalize into the standard schema. 

## **Supported Providers (v1):** 

- **Gmail Connector** — OAuth 2.0 via Google API, uses Gmail API v1, supports push 

- notifications via Pub/Sub 

- **Outlook Connector** — Microsoft Graph API, OAuth 2.0, supports delta queries for 

- incremental sync 

- **IMAP Connector** — Generic IMAP/SMTP for custom domains, polling-based with 

- configurable intervals 

## **Interface:** 

Every connector must implement: 

- **authenticate()** — Handle OAuth flow or credential validation 

- **fetch_new()** — Return list of EmailSchema since last sync 

- **mark_read()** — Optionally mark processed emails 

- **get_thread()** — Fetch full thread history for context 

## **5.3 Parsers (packages/parsers)** 

**Responsibility:** Convert raw email content into clean, structured text. 

**Tasks:** 

- Parse multipart emails (text/plain, text/html, attachments) 

- Convert HTML to Markdown using BeautifulSoup / html2text 

- Strip email signatures using regex + heuristics 

- Remove quoted reply chains 

- Detect and extract links, buttons, and attachment metadata 

- Preserve important formatting (tables for invoices, etc.) 

## **5.4 Intelligence Layer (packages/intelligence)** 

**Responsibility:** The AI brain that understands and extracts meaning from emails. 

## **Sub-modules:** 

- **classifier.py** — Classifies email into categories: academic, job, finance, meeting, OTP, 

- newsletter, personal, support 

- **scorer.py** — Assigns priority_score (0-100), urgency_score, actionability_score, 

- confidence_score 

- **extractor.py** — Extracts structured data: deadlines, action_items, entities (people, orgs), 

- amounts, dates, links 

- **summarizer.py** — Generates concise human-readable summary with reasoning 

## **AI Backend Strategy:** 

The intelligence layer uses a **provider-agnostic interface** so users can choose: 

- **OpenAI GPT-4o / GPT-4o-mini** — Best accuracy, requires API key 

- **Google Gemini** — Good balance of cost and performance 

- **Ollama (local)** — Run Llama 3 or Mistral locally for privacy 

All providers implement the same **LLMClient** interface with methods: **classify(), extract(), score(), summarize()** . 

## **Prompt Engineering Approach:** 

Use structured JSON output mode (OpenAI JSON mode / Gemini structured generation) to ensure consistent, parseable responses. Each prompt includes: 

- System prompt defining the task and output schema 

- Few-shot examples for edge cases 

- Email content (truncated to token limit) 

- Thread context (if available) 

## **5.5 Rules Engine (packages/rules-engine)** 

**Responsibility:** Evaluate user-defined rules alongside AI output to make final routing decisions. 

## **Rule Structure:** 

Each rule has: 

- **Conditions:** sender_contains, subject_contains, domain_is, category_is, priority_above, 

- etc. 

- **Actions:** send_to_whatsapp, create_task, add_to_calendar, mark_important, 

- add_to_digest, ignore 

- **Priority:** Rules are evaluated in priority order; first matching rule wins 

- **Active Window:** Optional time-based activation (e.g., only during work hours) 

## **Example Rules:** 

- IF domain_is 'university.edu' THEN priority_boost +20 

- IF category_is 'OTP' THEN send_to_whatsapp INSTANTLY 

- IF category_is 'newsletter' THEN add_to_digest AND ignore 

- IF priority_score > 90 AND urgency = 'high' THEN send_to_whatsapp + create_task 

- IF sender_is 'boss@company.com' THEN always_notify + mark_important 

## **5.6 Action Engine (packages/actions)** 

**Responsibility:** Execute the decisions made by the rules engine. 

## **Available Actions:** 

- **Task Creator** — Creates tasks in the dashboard with deadlines and descriptions 

- **Calendar Creator** — Extracts meeting details and creates Google Calendar events via 

- API 

- **Label Manager** — Applies labels/tags to emails in the original provider (Gmail labels, 

- Outlook categories) 

- **Digest Generator** — Aggregates low-priority emails into a daily/weekly summary 

- **Expense Extractor** — Parses receipt/invoice emails and stores structured finance data 

- **Reminder Scheduler** — Schedules follow-up reminders based on deadlines (e.g., 

- 'assignment due in 24h') 

## **5.7 Output Adapters (packages/outputs)** 

**Responsibility:** Deliver processed information to external channels. 

## **v1 Adapters:** 

- **WhatsApp Adapter** — Uses WhatsApp Business API or Twilio for messaging 

- **Dashboard Adapter** — WebSocket push to Next.js frontend for real-time updates 

- **Email Digest Adapter** — Sends aggregated daily digest via email 

## **v2+ Adapters:** 

- **Slack Adapter** — Webhook-based messaging to channels/DMs 

- **Telegram Adapter** — Bot API for messaging 

- **Discord Adapter** — Webhook integration 

- **Browser Notification** — Push API for web notifications 

## **6. Database Schema** 

PostgreSQL is the primary database. Below are the core tables with their purposes. 

## **Core Tables** 

|**Core Tables**||
|---|---|
|**users**|id, email, name, created_at, updated_at, preferences (JSONB)|
|**email_accounts**|id,<br>user_id,<br>provider<br>(gmail/outlook/imap),<br>credentials|
||(encrypted), sync_state, last_sync_at|
|**emails**|id,<br>account_id,<br>provider_message_id,<br>thread_id,<br>sender,|
||subject, body_text, body_html, received_at, raw_metadata|
||(JSONB)|
|**email_analysis**|id,<br>email_id,<br>category,<br>priority_score,<br>urgency_score,|
||actionability_score,<br>confidence_score,<br>summary,|
||extracted_data (JSONB), analyzed_at|
|**action_items**|id, email_id, description, deadline, status (pending/done),|
||created_at|
|**rules**|id, user_id, name, conditions (JSONB), actions (JSONB),|
||priority_order, is_active, created_at|
|**executed_actions**|id, email_id, rule_id, action_type, status, result_message,|
||executed_at|
|**tasks**|id, user_id, title, description, deadline, status, source_email_id,|
||created_at|
|**expenses**|id, user_id, email_id, amount, currency, merchant, category,|
||date, created_at|
|**digests**|id, user_id, type (daily/weekly), content (JSONB), sent_at,|
||status|
|**notifications**|id, user_id, channel, content, status, sent_at, read_at|



**Key Relationships** 

- **users** 1:N **email_accounts** — One user can connect multiple inboxes 

- **email_accounts** 1:N **emails** — Each account has many emails 

- **emails** 1:1 **email_analysis** — Each email has one analysis result 

- **emails** 1:N **action_items** — One email can generate multiple action items 

- **users** 1:N **rules** — Users define their own routing rules 

- **emails** 1:N **executed_actions** — Track what actions were taken per email 

## **JSONB Fields Strategy** 

JSONB is used for flexible, schema-evolving data: 

- **email_analysis.extracted_data** — Structured extraction result (deadlines, entities, 

- amounts) 

- **rules.conditions & rules.actions** — Dynamic rule definitions 

- **emails.raw_metadata** — Provider-specific metadata (headers, labels, etc.) 

## **7. API Design** 

The backend exposes a RESTful API (FastAPI) with auto-generated OpenAPI docs. 

## **Authentication** 

- **OAuth 2.0** for Gmail/Outlook connection flows 

- **JWT Bearer tokens** for API authentication 

- **Refresh tokens** stored securely (encrypted at rest) 

## **Core Endpoints** 

|**Core Endpoints**||
|---|---|
|**POST /auth/connect/gmail**|Initiate Gmail OAuth flow|
|**GET /auth/callback/gmail**|OAuth callback handler|
|**GET /emails**|List processed emails with filters (category, priority,|
||date range)|
|**GET /emails/{id}**|Get full email details + analysis + executed actions|
|**GET /emails/{id}/analysis**|Get AI analysis result for an email|
|**GET /tasks**|List all tasks created from emails|
|**POST /tasks**|Manually create a task|
|**PATCH /tasks/{id}**|Update task status|
|**GET /rules**|List user's routing rules|
|**POST /rules**|Create a new rule|
|**PATCH /rules/{id}**|Update an existing rule|
|**DELETE /rules/{id}**|Delete a rule|
|**GET /dashboard/stats**|Get inbox statistics (emails processed, categories|
||breakdown, actions taken)|
|**GET /dashboard/heatmap**|Get inbox activity heatmap data (v2+)|



|**GET /settings**|Get user preferences and connected accounts|
|---|---|
|**PATCH /settings**|Update user preferences|
|**POST /webhooks/gmail**|Receive Gmail push notifications (Pub/Sub)|



## **WebSocket Events** 

Real-time updates to the dashboard via WebSocket: 

- **email.received** — New email processed and analyzed 

- **email.updated** — Email status changed (action taken) 

- **task.created** — New task generated from email 

- **notification.sent** — Notification delivered to external channel 

## **8. Development Roadmap** 

The project is split into three major versions to ensure iterative, achievable progress. 

## **Phase 1: InboxOS v1 (MVP) — Weeks 1-4** 

**Goal:** Build a working end-to-end pipeline with Gmail + WhatsApp + Dashboard 

## **Features:** 

- **Ingestion:** Gmail connector with OAuth + polling sync 

- **Parser:** HTML to text, signature stripping 

- **Intelligence:** Classify into 4 categories (urgent, actionable, informational, ignore) 

- **Extraction:** Summary, reason, action items, deadline, category 

- **Actions:** Send urgent/actionable to WhatsApp, informational to dashboard, ignore 

- newsletters 

- **Dashboard:** List all processed emails with scores, categories, extracted actions 

- **Rules:** Basic rule configuration (sender whitelist/blacklist, category routing) 

## **Success Criteria:** 

- User can connect Gmail and see emails automatically categorized 

- Urgent emails trigger WhatsApp notifications within 60 seconds 

- Dashboard shows clear pipeline view (received → analyzed → acted → delivered) 

- System handles 100+ emails/day without performance degradation 

## **Phase 2: InboxOS v2 — Weeks 5-8** 

**Goal:** Multi-channel support, smart routing, and advanced intelligence 

## **Features:** 

- **Multi-Channel:** Slack, Telegram, Discord adapters 

- **Smart Routing:** 'urgent → WhatsApp', 'finance → expense tracker', 'calendar → Google 

- Calendar' 

- **Personal Rules:** Sender priority lists, category preferences, do-not-disturb windows, 

- score thresholds 

- **Advanced Intelligence:** Thread memory, attachment understanding, duplicate 

- detection, follow-up reminders 

- **Calendar Integration:** Auto-extract meeting details and create events 

- **Expense Tracking:** Parse receipts and store structured finance data 

- **Outlook Connector:** Full Microsoft Graph API support 

## **Phase 3: InboxOS v3 — Weeks 9-12** 

## **Goal:** Platform maturity, plugin system, and team features 

## **Features:** 

- **Plugin System:** Third-party connectors and actions via defined interfaces 

- **Local AI Support:** Self-hosted Ollama integration for privacy-sensitive users 

- **Trainable Model:** User feedback on classifications improves personal importance model 

- **RAG Personalization:** Retrieval-Augmented Generation over past emails for 

- context-aware responses 

- **Reply Assistant:** AI-generated reply drafts based on email context 

- **Daily Briefing:** 'What did I miss today?' morning summary 

- **Inbox Analytics:** Heatmaps, response time tracking, category trends 

- **Team Inbox:** Shared support mailbox workflows, assignment, and escalation 

## **9. Team Structure & Roles** 

InboxOS is designed for team collaboration. Below is a suggested 10-person team split by skill level and module ownership. 

## **Suggested Team Composition** 

|**Role**|**Module**|**Skill Level**|**Responsibilities**||
|---|---|---|---|---|
|Project Lead|Core / Orchestration|Advanced|Architecture decisions, code review,|CI/CD setup, cross-module integration|
|Backend Lead|API / Database|Advanced|FastAPI design, PostgreSQL schema, authentication, WebSocket events||
|AI Engineer|Intelligence|Advanced|Prompt engineering, LLM provider integration, JSON mode tuning, RAG (v3)||
|DevOps Engineer|Infrastructure|Advanced|Docker, deployment, monitoring, security, Redis/Celery setup||
|Frontend Lead|Web Dashboard|Intermediate|Next.js app, Tailwind UI, real-time updates, charts||
|Connector Dev|Email Connectors|Intermediate|Gmail/Outlook/IMAP APIs, OAuth flows, sync logic||
|Parser Dev|Parsers|Intermediate|HTML parsing, text extraction, signature detection||
|Rules Dev|Rules Engine|Intermediate|Rule evaluation logic, condition parser, priority system||
|Action Dev|Actions / Outputs|Beginner+|WhatsApp/Telegram adapters, task creation, calendar integration||
|QA / Docs|Testing / DocumentationBeginner+||Unit tests, integration tests, contributor docs, user guides||



## **Beginner-Friendly Entry Points** 

New contributors can start with these isolated, well-defined tasks: 

- **Output Adapters:** Implement Telegram/Discord webhooks (follow existing WhatsApp 

- adapter pattern) 

- **Parser Improvements:** Add better signature detection for specific email providers 

- **Dashboard UI:** Build reusable components (email card, priority badge, timeline view) 

- **Documentation:** Write setup guides, API docs, or contribution tutorials 

- **Testing:** Add unit tests for parsers, rules engine, or action modules 

- **Localization:** Add i18n support for dashboard strings 

## **10. Getting Started Guide** 

## **Prerequisites** 

- Python 3.11+ 

- Node.js 18+ 

- PostgreSQL 15+ 

- Redis 7+ 

- Docker & Docker Compose (recommended) 

- Git 

## **Quick Start (Docker)** 

The fastest way to get running: 

```
# 1. Clone the repository
git clone https://github.com/inboxos/inboxos.git
cd inboxos
# 2. Copy environment file
cp .env.example .env
# Edit .env with your API keys (OpenAI/Gemini, Gmail OAuth, etc.)
# 3. Start all services
docker-compose up -d
# 4. Run database migrations
docker-compose exec api alembic upgrade head
# 5. Open dashboard
# http://localhost:3000
```

## **Manual Setup (Development)** 

For active development without Docker: 

```
# Backend
python -m venv venv
source venv/bin/activate # Windows: venv\Scripts\activate
pip install -r requirements.txt
cd apps/api
uvicorn main:app --reload
# Frontend (new terminal)
cd apps/web
npm install
npm run dev
# Redis (for Celery)
redis-server
```

```
# Celery Worker (new terminal)
cd apps/api
celery -A tasks worker --loglevel=info
```

## **Environment Variables** 

Key variables in **.env** : 

|Key variables in**.env**:||
|---|---|
|**DATABASE_URL**|postgresql://user:pass@localhost:5432/inboxos|
|**REDIS_URL**|redis://localhost:6379/0|
|**OPENAI_API_KEY**|sk-... (optional if using Gemini/Ollama)|
|**GEMINI_API_KEY**|... (optional if using OpenAI/Ollama)|
|**JWT_SECRET**|Random 32+ char string for token signing|
|**GMAIL_CLIENT_ID**|From Google Cloud Console|
|**GMAIL_CLIENT_SECRET**|From Google Cloud Console|
|**WHATSAPP_API_KEY**|From Twilio or WhatsApp Business API|



## **11. Contribution Guidelines** 

## **Code Standards** 

- **Python:** PEP 8, Black formatter, isort imports, mypy type hints 

- **TypeScript:** Strict mode enabled, ESLint + Prettier 

- **Commits:** Conventional Commits (feat:, fix:, docs:, refactor:, test:) 

- **Branches:** feature/description, bugfix/description, hotfix/description 

## **Pull Request Process** 

1. **Fork** the repository and create a feature branch 

2. **Write tests** for new functionality (pytest for backend, Jest for frontend) 

3. **Run linting** and type checks locally 

4. **Update documentation** if adding new modules or changing APIs 

5. **Submit PR** with clear description, screenshots if UI changes 

6. **Code review** by at least one maintainer before merge 

7. **CI must pass** (GitHub Actions runs tests, lint, build) 

## **Module Development Pattern** 

When adding a new module (e.g., a new output adapter), follow this pattern: 

`packages/outputs/` III `base.py # Already exists: BaseAdapter interface` III `whatsapp/` I III `__init__.py` I III `adapter.py # Implements BaseAdapter` I III `config.py # Module-specific settings` I III `tests/` I III `test_adapter.py` III `telegram/ # Your new module` III `__init__.py` III `adapter.py # from ..base import BaseAdapter` III `config.py` III `tests/` III `test_adapter.py` 

## **Testing Strategy** 

- **Unit Tests:** Every module has tests/ folder with >80% coverage target 

- **Integration Tests:** Test full pipeline with mocked LLM and email providers 

- **E2E Tests:** Playwright tests for critical dashboard flows (v2+) 

- **Mocking:** Use pytest-mock and responses library for external API calls 

- **Fixtures:** Shared test data in conftest.py (sample emails, analysis results) 

## **Documentation Requirements** 

- **README.md** in every package explaining purpose and usage 

- **API docs** auto-generated from FastAPI OpenAPI spec 

- **Architecture Decision Records (ADRs)** in docs/adr/ for major decisions 

- **Changelog** following Keep a Changelog format 

## **12. Appendix** 

## **A. Example User Flows** 

## **Flow 1: Assignment Email** 

Email: _"DBMS mini-project submission deadline is tomorrow 11:59 PM."_ 

## Pipeline: 

1. **Ingestion:** Gmail connector fetches email 

2. **Parser:** Extracts clean text, strips signature 

3. **Intelligence:** category=academic, priority=92, urgency=high, deadline=2026-06-26 

- 23:59, action=submit project 

4. **Rules:** Priority > 90 → urgent route 

5. **Action:** Send WhatsApp summary + create task in dashboard + schedule reminder 

6. **Delivery:** WhatsApp: "DBMS project due tomorrow 11:59 PM. Task created." 

## **Flow 2: Recruiter Email** 

Email: _"Please select an interview slot by Friday."_ 

Pipeline: 

1. **Ingestion:** Fetched from Gmail 

2. **Parser:** Clean text extracted 

3. **Intelligence:** category=job, priority=95, actionability=high, company=XYZ Corp, deadline=Friday 

4. **Rules:** Job category + high priority → instant alert 

5. **Action:** Send WhatsApp + create reminder + extract to job tracker 

6. **Delivery:** WhatsApp: "XYZ Corp interview slot selection due Friday. [Link]" 

## **Flow 3: Newsletter** 

Email: _"Top 10 AI tools this week"_ 

Pipeline: 

1. **Ingestion:** Fetched from Gmail 

2. **Parser:** Clean text 

3. **Intelligence:** category=newsletter, priority=15, urgency=low 

4. **Rules:** Newsletter category → add to digest, no notification 

5. **Action:** Add to daily digest queue 

6. **Delivery:** Appears in next day's email digest, no interruption 

## **B. Glossary** 

**Connector** 

Module that connects to an email provider and fetches messages 

|**Adapter**|Module that delivers output to an external channel (WhatsApp,|
|---|---|
||Slack, etc.)|
|**Pipeline**|The 5-layer flow: Ingestion→Parse→Intelligence→Rules→|
||Action→Delivery|
|**JSON Mode**|LLM feature that forces structured JSON output instead of free text|
|**RAG**|Retrieval-Augmented Generation: using past emails as context for AI|
||responses|
|**Orchestration**|Coordinating multiple modules to process a single email end-to-end|



## **C. Resources & References** 

- **FastAPI Docs:** https://fastapi.tiangolo.com 

- **Next.js Docs:** https://nextjs.org/docs 

- **Gmail API:** https://developers.google.com/gmail/api 

- **Microsoft Graph:** https://docs.microsoft.com/en-us/graph/ 

- **OpenAI API:** https://platform.openai.com/docs 

- **Ollama:** https://ollama.com 

- **Celery:** https://docs.celeryq.dev 

_This document is a living blueprint. As the project evolves, update sections to reflect actual implementation decisions, new modules, and learned best practices. For questions, open a discussion in the GitHub repository or reach out to the core team._ 

