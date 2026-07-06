# 🤖 InboxOS — Updated Phase 2 & 3 Contributor Prompts
## 20 Prompts — Adapted for Node.js/Express/Prisma + React/Vite Stack
### Covers REAL gaps from audit: Outlook, WhatsApp, Calendar, Digest, Expense, Reminder, Rules UI, DND, RAG Integration, Deadline Extraction, Deployment, Security, Analytics

---

# CRITICAL CONTEXT FOR ALL CONTRIBUTORS

**The actual built stack is:**
- **Backend:** Node.js (v20+) + Express (v5.2.1) + Prisma (v5.22.0) + TypeScript strict
- **Frontend:** React 19 + Vite 8 + React Router Dom v7 + TailwindCSS
- **Queue:** BullMQ (Redis-based, not Celery)
- **AI:** OpenAI (gpt-4o-mini) + Google Gemini (@google/genai)
- **Database:** PostgreSQL 15+ via Prisma connection pool
- **Real-time:** Socket.IO (already built and working)
- **Tests:** Jest (backend) + Cypress (frontend E2E)

**Do NOT write Python/FastAPI code. Write Node.js/TypeScript/Prisma code.**

---

# 🏆 PROFESSIONAL TEAM PROMPTS (Phase 2)

## P6 — Parser Specialist

### Prompt 1: HTML-to-Text Conversion Engine [Hard]

```
**System Prompt:** You are an expert Parser Specialist building InboxOS, a next-generation open-source AI email operating system.
**Stack:** Node.js, TypeScript, cheerio, html-to-text, turndown
**Task:** Build the core HTML-to-clean-text conversion engine for email bodies.

**Step-by-Step Instructions:**
1. Create `backend/src/services/parser/html-converter.service.ts`.
2. Implement `HTMLConverterService` class with `convert(htmlString: string): string` method.
3. Use `html-to-text` for initial conversion, then `turndown` for Markdown formatting.
4. Handle edge cases: nested tables, inline styles, broken HTML, script/style tag removal via `cheerio`.
5. Preserve important formatting for invoices: tables with amounts, dates, merchant names must remain as Markdown tables.
6. Strip all JavaScript, CSS, tracking pixels (`<img width="1" height="1">`), and hidden elements (`display:none`).
7. Return clean Markdown-formatted text with configurable max length (default 10000 chars).

**Design/Architecture Constraints:**
- Must handle malformed HTML gracefully (wrap in try-catch, return plain text fallback).
- Invoice tables must be preserved in readable Markdown table format.
- Must be async for Express integration.
- Export as singleton service.

**Acceptance Criteria:**
Feeding a complex HTML email with tables, images, and inline styles returns clean, readable Markdown text. Invoice tables remain structurally intact.

**Output:** Execute the necessary terminal commands to initialize or modify the codebase, and write the complete, production-ready code. Do not use placeholders (e.g., 'TODO: implement logic'). Write fully functional code.
```

---

### Prompt 2: Email Signature Stripper [Medium]

```
**System Prompt:** You are an expert Parser Specialist building InboxOS, a next-generation open-source AI email operating system.
**Stack:** Node.js, TypeScript, regex
**Task:** Implement an intelligent signature detection and removal system.

**Step-by-Step Instructions:**
1. Create `backend/src/services/parser/signature-stripper.service.ts`.
2. Implement `SignatureStripperService` with `strip(text: string): { cleanedBody: string; signature: string | null }`.
3. Detect patterns: lines starting with "--\n", "Best regards", "Sent from my iPhone", "Confidentiality notice", "Disclaimer".
4. Use regex for common patterns + heuristics for name/email/phone blocks at the end.
5. Handle multi-line signatures with names, titles, company names, phone numbers, social links.
6. Support configurable sensitivity: 'strict' (aggressive), 'moderate' (balanced), 'lenient' (conservative).
7. Store extracted signature separately in the Email model (add `signature` field to Prisma schema, migrate).

**Design/Architecture Constraints:**
- Must not strip legitimate content containing signature-like phrases.
- Should handle signatures in multiple languages.
- Must be deterministic — same input always produces same output.
- Must be pure function (no side effects, no DB calls).

**Acceptance Criteria:**
An email with a 5-line signature block returns the clean body without the signature, and the signature is separately extractable and storable.

**Output:** Execute the necessary terminal commands to initialize or modify the codebase, and write the complete, production-ready code. Do not use placeholders (e.g., 'TODO: implement logic'). Write fully functional code.
```

---

### Prompt 3: Quoted Reply Chain Detector [Medium]

```
**System Prompt:** You are an expert Parser Specialist building InboxOS, a next-generation open-source AI email operating system.
**Stack:** Node.js, TypeScript, diff
**Task:** Detect and remove quoted reply chains from email threads.

**Step-by-Step Instructions:**
1. Create `backend/src/services/parser/quoted-reply-detector.service.ts`.
2. Implement `QuotedReplyDetectorService` with `extractFreshContent(text: string): string`.
3. Detect quoted patterns: lines starting with ">", "|", "From:", "On [date] [name] wrote:", "-----Original Message-----", "_BEGIN_quoted_content_".
4. Handle nested quotes (multiple levels of ">>>>>").
5. Use string diffing to detect repeated content blocks between emails in the same thread.
6. Return only the newest/fresh content written by the sender.
7. Store full thread context separately for AI processing (add `threadContext` field to Thread model).

**Design/Architecture Constraints:**
- Must handle various email client quoting styles (Gmail, Outlook, Apple Mail, Thunderbird).
- Should not remove inline quotes where sender references previous text.
- Must preserve full thread for AI layer while providing clean content for display.
- Must be pure function, no DB calls.

**Acceptance Criteria:**
A 10-email thread where each reply quotes the previous returns only the latest sender's actual new content.

**Output:** Execute the necessary terminal commands to initialize or modify the codebase, and write the complete, production-ready code. Do not use placeholders (e.g., 'TODO: implement logic'). Write fully functional code.
```

---

### Prompt 4: Link & Attachment Metadata Extractor [Medium]

```
**System Prompt:** You are an expert Parser Specialist building InboxOS, a next-generation open-source AI email operating system.
**Stack:** Node.js, TypeScript, cheerio, crypto
**Task:** Extract all actionable links and attachment metadata from email content.

**Step-by-Step Instructions:**
1. Create `backend/src/services/parser/link-attachment-extractor.service.ts`.
2. Implement `LinkAttachmentExtractorService` with two methods:
   - `extractLinks(htmlBody: string): LinkMetadata[]`
   - `extractAttachments(rawEmail: ParsedMail): AttachmentMetadata[]`
3. For links: extract href, anchor text, detect if styled as button, categorize (unsubscribe, confirm, download, meeting, payment, etc.).
4. For attachments: extract filename, contentType, byteSize, contentId, inline vs attached flag.
5. Detect suspicious links (URL mismatch between href and display text — phishing indicator).
6. Generate MD5 hash for each attachment for deduplication.
7. Add `links` and `attachments` JSONB fields to the Email model in Prisma schema, migrate.

**Design/Architecture Constraints:**
- Link categorization must use heuristic + optional LLM fallback for ambiguous cases.
- Must handle multipart emails with nested MIME structures (use `mailparser` types).
- All extracted data must be JSON-serializable.
- Must be async and complete in <100ms.

**Acceptance Criteria:**
An email with 3 links (including an unsubscribe button) and 2 attachments (PDF, image) returns complete, categorized metadata for all.

**Output:** Execute the necessary terminal commands to initialize or modify the codebase, and write the complete, production-ready code. Do not use placeholders (e.g., 'TODO: implement logic'). Write fully functional code.
```

---

## P7 — Rules Engine Lead

### Prompt 1: Rules Management Frontend UI [Hard]

```
**System Prompt:** You are an expert Frontend Architect building InboxOS, a next-generation open-source AI email operating system.
**Stack:** React, TypeScript, TailwindCSS, React Hook Form, Zod
**Task:** Build the complete Rules Management UI so users can create, edit, and delete custom routing rules.

**Step-by-Step Instructions:**
1. Create `frontend/src/components/RulesManager.tsx` — the main rules management page.
2. Create `frontend/src/components/RuleBuilder.tsx` — visual rule builder with:
   - Condition builder: dropdown for field (sender, subject, body, domain, category, priority_score, has_attachment), operator (contains, equals, regex, gt, lt, in), value input
   - Action builder: dropdown for action_type (sendTelegram, sendSlack, sendDiscord, sendWhatsApp, createTask, markImportant, addToDigest, ignore), config fields per action
   - Priority slider (1-100)
   - Active toggle
3. Create `frontend/src/components/RuleCard.tsx` — display individual rule with edit/delete buttons.
4. Integrate with existing API endpoints: `GET /api/rules`, `POST /api/rules`, `PUT /api/rules/:id`, `DELETE /api/rules/:id`.
5. Add real-time validation with Zod schemas matching backend.
6. Show a preview: "This rule will match emails where [conditions] and then [actions]."
7. Add drag-and-drop reordering for priority.

**Design/Architecture Constraints:**
- Must use the existing dark glassmorphism design system (bg-base: #080b14, accent: #6366f1).
- Must be responsive — condition builder stacks vertically on mobile.
- Form state must persist during navigation (use React Hook Form with defaultValues).
- Must show loading skeletons while fetching rules.
- Delete must require confirmation modal.

**Acceptance Criteria:**
A user can create a rule: "IF sender contains 'boss@company.com' THEN sendTelegram AND markImportant" and see it active in the rules list.

**Output:** Execute the necessary terminal commands to initialize or modify the codebase, and write the complete, production-ready code. Do not use placeholders (e.g., 'TODO: implement logic'). Write fully functional code.
```

---

### Prompt 2: Time-Based Active Windows & DND Mode [Hard]

```
**System Prompt:** You are an expert Backend Developer building InboxOS, a next-generation open-source AI email operating system.
**Stack:** Node.js, Express, Prisma, date-fns-tz, cron-parser
**Task:** Implement time-based rule activation and Do-Not-Disturb mode.

**Step-by-Step Instructions:**
1. Update Prisma schema — add to `Rule` model:
   - `activeWindow` JSONB: { timezone: string, scheduleType: 'always'|'work_hours'|'custom_cron'|'specific_dates', workHours?: { daysOfWeek: number[], startTime: string, endTime: string }, customCron?: string, specificDates?: { start: Date, end: Date }[] }
   - `isActive` boolean (already exists, extend logic)
2. Update Prisma schema — add to `UserSettings` model:
   - `doNotDisturb` JSONB: { enabled: boolean, startTime: string, endTime: string, timezone: string, daysOfWeek: number[] }
3. Create `backend/src/services/rules/time-validator.service.ts` with `TimeValidatorService`.
4. Implement `isRuleActive(rule: Rule, currentTime?: Date): boolean`.
5. Implement `isDNDActive(userId: string): Promise<boolean>` — checks user settings.
6. Integrate into `RulesEngineService.evaluate()` — skip rules where `isRuleActive` is false.
7. Integrate into all output adapters (Telegram, Slack, Discord, WhatsApp) — check `isDNDActive` before sending.
8. Add `POST /api/users/me/dnd` and `GET /api/users/me/dnd` endpoints.
9. Add DND toggle to frontend Settings page.

**Design/Architecture Constraints:**
- All times must be timezone-aware. Default to user's timezone from settings, fallback UTC.
- Must handle daylight saving time transitions correctly (use date-fns-tz).
- Holiday exclusions should be configurable (store country code + custom dates in settings).
- Time check must add <5ms to rule evaluation.
- DND must suppress ALL notification actions, not just some channels.

**Acceptance Criteria:**
A rule configured for "work hours only (Mon-Fri 9AM-6PM EST)" does not trigger at 11 PM Saturday, but does trigger at 10 AM Tuesday. DND mode from 10 PM to 8 AM suppresses all notifications.

**Output:** Execute the necessary terminal commands to initialize or modify the codebase, and write the complete, production-ready code. Do not use placeholders (e.g., 'TODO: implement logic'). Write fully functional code.
```

---

## P8 — Actions Engineer

### Prompt 1: Calendar Event Extractor & Google Calendar Creator [Hard]

```
**System Prompt:** You are an expert Actions Engineer building InboxOS, a next-generation open-source AI email operating system.
**Stack:** Node.js, TypeScript, googleapis, chrono-node, Prisma
**Task:** Extract meeting details from emails and create Google Calendar events.

**Step-by-Step Instructions:**
1. Update Prisma schema — add `CalendarEvent` model: id, userId, emailId, title, startTime, endTime, location, attendees, meetingLink, googleEventId, status, createdAt.
2. Create `backend/src/services/actions/calendar-extractor.service.ts`.
3. Implement `extractEventDetails(emailAnalysis: any): CalendarEventData | null` using `chrono-node` for natural language date parsing.
4. Detect meeting links: Zoom (`zoom.us/j/`), Google Meet (`meet.google.com`), Teams (`teams.microsoft.com`), Webex.
5. Create `backend/src/services/actions/calendar-creator.service.ts`.
6. Implement `createGoogleCalendarEvent(eventData: CalendarEventData, userId: string)` using `googleapis` Calendar API v3.
7. Store user's Google Calendar OAuth tokens in `Integration` model (encrypted).
8. Add `POST /api/actions/calendar/events` endpoint (triggered by rules engine).
9. Add calendar events to frontend EmailViewer sidebar (upcoming meetings from this email).

**Design/Architecture Constraints:**
- Must handle timezone correctly (parse in sender's timezone, convert to user's timezone).
- Must gracefully handle missing Google Calendar credentials (queue in BullMQ for retry).
- Meeting link detection must support all major platforms.
- Must be idempotent — same email_id produces same calendar event (upsert by googleEventId).
- Must handle ambiguous dates ("next Friday" → calculate from email received date).

**Acceptance Criteria:**
An email with "Interview with XYZ Corp on Friday at 2 PM EST" creates a CalendarEvent record AND a Google Calendar event with correct details, visible in the email's AI sidebar.

**Output:** Execute the necessary terminal commands to initialize or modify the codebase, and write the complete, production-ready code. Do not use placeholders (e.g., 'TODO: implement logic'). Write fully functional code.
```

---

### Prompt 2: Digest Generator & Email Digest Adapter [Medium]

```
**System Prompt:** You are an expert Actions Engineer building InboxOS, a next-generation open-source AI email operating system.
**Stack:** Node.js, TypeScript, Prisma, BullMQ, nodemailer, Handlebars
**Task:** Build the daily/weekly digest generator that aggregates low-priority emails and delivers them via email.

**Step-by-Step Instructions:**
1. Update Prisma schema — add `Digest` model: id, userId, type ('daily'|'weekly'), content JSONB, emailIds string[], sentAt, status ('pending'|'sent'|'failed').
2. Create `backend/src/services/actions/digest-generator.service.ts`.
3. Implement `generateDigest(userId: string, type: 'daily' | 'weekly'): Promise<Digest>`.
4. Query emails: past 24h (daily) or 7d (weekly), category IN ('newsletter','promotional','social') OR priorityScore < 40, NOT already digested.
5. Group by category. For each: sender, subject, aiSummary, link to full email.
6. Use Handlebars for mobile-responsive HTML digest template.
7. Create `backend/src/services/outputs/email-digest.adapter.ts`.
8. Implement `sendDigest(digest: Digest, userId: string)` using `nodemailer` with user's SMTP settings.
9. Schedule via BullMQ repeatable job: daily at 8 AM user timezone.
10. Mark included emails as digested (add `digestId` to Email model).
11. Add digest preview to frontend Settings page.

**Design/Architecture Constraints:**
- Must not include emails already sent in a previous digest.
- Maximum 20 emails per digest; overflow noted with "+X more".
- Must support unsubscribe link per category.
- Template must match dark glassmorphism theme (inline CSS for email clients).
- Must handle users with no digest-worthy emails gracefully.

**Acceptance Criteria:**
A user with 15 newsletters receives one clean daily digest email at 8 AM, grouping them by category with AI summaries. No individual newsletter notifications were sent.

**Output:** Execute the necessary terminal commands to initialize or modify the codebase, and write the complete, production-ready code. Do not use placeholders (e.g., 'TODO: implement logic'). Write fully functional code.
```

---

### Prompt 3: Expense Extractor from Receipts/Invoices [Hard]

```
**System Prompt:** You are an expert Actions Engineer building InboxOS, a next-generation open-source AI email operating system.
**Stack:** Node.js, TypeScript, OpenAI SDK, Prisma
**Task:** Extract structured expense data from receipt and invoice emails.

**Step-by-Step Instructions:**
1. Update Prisma schema — add `Expense` model: id, userId, emailId, amount, currency, merchantName, category, date, paymentMethod, items JSONB, isRecurring, createdAt.
2. Create `backend/src/services/actions/expense-extractor.service.ts`.
3. Implement `extractExpense(emailId: string): Promise<Expense | null>`.
4. First, keyword filter: check for "receipt", "invoice", "order confirmation", "payment received", "your order".
5. If matched, call OpenAI with structured output schema: { amount: number, currency: string, merchantName: string, category: string, date: string, paymentMethod: string, items: [{name, quantity, unitPrice}] }.
6. Fallback to regex for simple cases: amount patterns like `$XX.XX`, `€XX,XX`.
7. Normalize merchant names ("Uber Technologies Inc" → "Uber").
8. Detect recurring: same merchant + similar amount (±10%) + regular interval (±3 days).
9. Save to `expenses` table. Add expense summary to frontend EmailViewer sidebar.

**Design/Architecture Constraints:**
- Must not call LLM for non-receipt emails (save API costs).
- Amount extraction must handle: $1,234.56, €99,99, ¥1000, £50.00, etc.
- Must handle multiple receipts in one email (split into multiple records).
- Must be async and complete in <2s.
- Currency conversion: store original + USD equivalent (use exchange rate API or cached rates).

**Acceptance Criteria:**
An Amazon order confirmation email extracts: amount=47.99, currency='USD', merchant='Amazon', category='shopping', date='2026-07-01', items=[{name:'Wireless Mouse', quantity:1, unitPrice:29.99}].

**Output:** Execute the necessary terminal commands to initialize or modify the codebase, and write the complete, production-ready code. Do not use placeholders (e.g., 'TODO: implement logic'). Write fully functional code.
```

---

### Prompt 4: Reminder Scheduler with Deadline Tracking [Medium]

```
**System Prompt:** You are an expert Actions Engineer building InboxOS, a next-generation open-source AI email operating system.
**Stack:** Node.js, TypeScript, Prisma, BullMQ, date-fns
**Task:** Build a reminder system that schedules follow-ups based on extracted deadlines.

**Step-by-Step Instructions:**
1. Update Prisma schema — add `Reminder` model: id, userId, emailId, deadline, offsets number[], status, snoozeUntil, createdAt.
2. Update Prisma schema — add `deadline` DateTime? field to `ActionItem` model.
3. Update AI service structured output to include `deadlines: string[]` (extract from email body).
4. Create `backend/src/services/actions/reminder-scheduler.service.ts`.
5. Implement `scheduleReminders(emailId: string, deadlines: Date[]): Promise<Reminder[]>`.
6. Default offsets: 24h before, 1h before, at deadline.
7. Use BullMQ delayed jobs to trigger reminders at calculated times.
8. When reminder fires: create `Notification` record, send via output adapter (Telegram/Slack/etc.).
9. Implement `snoozeReminder(reminderId: string, durationMinutes: number)`.
10. Implement `cancelReminders(emailId: string)` when task is marked done.
11. Add upcoming deadlines widget to frontend dashboard.

**Design/Architecture Constraints:**
- Must handle timezone correctly (all deadlines stored in UTC, displayed in user timezone).
- Reminders must be persistent (BullMQ + PostgreSQL, survive restarts).
- Must deduplicate: same deadline extracted twice → one reminder set.
- Must scale to 10,000+ active reminders per user (BullMQ handles this).
- Must handle past deadlines gracefully (immediate notification + "overdue" flag).

**Acceptance Criteria:**
An email with "Project submission due July 10, 2026 at 11:59 PM EST" schedules 3 BullMQ delayed jobs. The user receives Telegram reminders on July 9 11:59 PM, July 10 10:59 PM, and July 10 11:59 PM — all in EST.

**Output:** Execute the necessary terminal commands to initialize or modify the codebase, and write the complete, production-ready code. Do not use placeholders (e.g., 'TODO: implement logic'). Write fully functional code.
```

---

## P9 — Integration & Outputs Lead

### Prompt 1: WhatsApp Business API / Twilio Adapter [Hard]

```
**System Prompt:** You are an expert Integration Specialist building InboxOS, a next-generation open-source AI email operating system.
**Stack:** Node.js, TypeScript, twilio, Prisma
**Task:** Build the WhatsApp output adapter for delivering urgent email summaries.

**Step-by-Step Instructions:**
1. Create `backend/src/services/outputs/whatsapp.adapter.ts`.
2. Implement `WhatsAppAdapter` class implementing `BaseOutputAdapter`.
3. Implement `sendNotification(userId: string, emailSummary: any): Promise<boolean>`.
4. Support Twilio WhatsApp API (primary) and WhatsApp Business API (Meta, secondary).
5. Format message: "🔔 [Category] from [Sender]\n\n[AI Summary]\n\nAction Required: [Yes/No]\nReply STOP to pause."
6. Handle Twilio rate limits (1 msg/sec sandbox, higher for production).
7. Implement retry with exponential backoff (BullMQ delayed retry).
8. Track delivery status in `Notification` model.
9. Add WhatsApp credentials to `Integration` model (encrypted).
10. Add WhatsApp connection flow to frontend Settings (similar to Gmail OAuth).

**Design/Architecture Constraints:**
- Must check DND settings before sending.
- Message must be under 1600 characters; truncate intelligently with "...".
- Must handle invalid phone numbers (validate E.164 format).
- Credentials encrypted at rest (use existing encryption utility).
- Must support template messages for WhatsApp Business API compliance.

**Acceptance Criteria:**
An urgent email triggers a WhatsApp message delivered to the user's phone within 60 seconds of ingestion. The user can reply "STOP" to pause notifications.

**Output:** Execute the necessary terminal commands to initialize or modify the codebase, and write the complete, production-ready code. Do not use placeholders (e.g., 'TODO: implement logic'). Write fully functional code.
```

---

### Prompt 2: Microsoft Outlook Connector [Hard]

```
**System Prompt:** You are an expert Integration Specialist building InboxOS, a next-generation open-source AI email operating system.
**Stack:** Node.js, TypeScript, @azure/msal-node, @microsoft/microsoft-graph-client, Prisma
**Task:** Implement the OAuth 2.0 flow and email sync for Microsoft Outlook/Exchange.

**Step-by-Step Instructions:**
1. Create `backend/src/services/outlook-auth.service.ts`.
2. Implement `generateAuthUrl()` using MSAL (Microsoft Authentication Library).
3. Implement `handleCallback(code: string)` to exchange for access/refresh tokens.
4. Create `backend/src/services/outlook-sync.service.ts`.
5. Implement `syncLatestEmails(userId: string)` using Microsoft Graph API.
6. Fetch latest 50 messages using `/me/messages` with `$select` and `$expand`.
7. Map Graph API response to InboxOS Email schema (sender, recipient, subject, body, headers).
8. Use delta queries (`/me/messages/delta`) for incremental sync on subsequent runs.
9. Store tokens in `Integration` model (encrypted). Store `deltaLink` for incremental sync.
10. Add Outlook OAuth button to frontend Settings page (next to Gmail).

**Design/Architecture Constraints:**
- Must handle token refresh automatically (MSAL manages this).
- Must support both personal Microsoft accounts and Office 365/Exchange.
- Delta sync must not miss emails or create duplicates.
- Must handle Graph API throttling (429 responses with Retry-After).
- Must be async and not block the HTTP response.

**Acceptance Criteria:**
A user clicks "Connect Outlook", approves in Microsoft, and their recent emails appear in the InboxOS inbox within 60 seconds.

**Output:** Execute the necessary terminal commands to initialize or modify the codebase, and write the complete, production-ready code. Do not use placeholders (e.g., 'TODO: implement logic'). Write fully functional code.
```

---

## P10 — Advanced AI Engineer

### Prompt 1: Deadline Extraction & RAG Endpoint Integration [Hard]

```
**System Prompt:** You are an expert AI Engineer building InboxOS, a next-generation open-source AI email operating system.
**Stack:** Node.js, TypeScript, OpenAI SDK, Prisma, pgvector
**Task:** Add deadline extraction to AI outputs AND wire existing RAG (embedEmail/searchSimilarEmails) to production API endpoints.

**Step-by-Step Instructions:**
1. Update `backend/src/services/ai.service.ts`:
   - Modify `classifyEmail()` structured output schema to include `deadlines: string[]` (ISO 8601 dates extracted from email body).
   - Modify `extractActionItems()` to include `deadline: string?` per action item.
2. Update Prisma schema — add `deadlines` string[] to `EmailAnalysis` model, add `deadline` DateTime? to `ActionItem` model. Migrate.
3. Create `backend/src/routes/rag.routes.ts`:
   - `POST /api/rag/index` — trigger embedding for a specific email (or all unindexed).
   - `POST /api/rag/search` — body: { query: string, limit?: number } → returns similar emails with similarity scores.
4. Wire existing `embedEmail()` and `searchSimilarEmails()` in `ai.service.ts` to these endpoints.
5. Ensure pgvector extension is enabled in PostgreSQL (add to migration or raw SQL).
6. Add `embedding` vector(1536) field to `Email` model in Prisma schema (use raw SQL for vector type since Prisma doesn't natively support it).
7. Create background BullMQ job `indexEmailsJob` that batches unindexed emails.
8. Add semantic search UI to frontend: search bar with "AI-powered search" toggle that hits `/api/rag/search`.

**Design/Architecture Constraints:**
- Deadline extraction must use chrono-node as fallback if LLM misses dates.
- Vector dimension must match embedding model exactly (1536 for text-embedding-3-small).
- Search must complete in <500ms for 100K+ emails (use pgvector indexes).
- Must filter by user_id for privacy (never return another user's emails).
- Must handle emails with no body gracefully (skip indexing).

**Acceptance Criteria:**
An email with "Submit by July 15, 2026" extracts deadline "2026-07-15T23:59:00Z". Searching "DBMS project deadline" via `/api/rag/search` returns the exact email ranked #1 with cosine similarity score.

**Output:** Execute the necessary terminal commands to initialize or modify the codebase, and write the complete, production-ready code. Do not use placeholders (e.g., 'TODO: implement logic'). Write fully functional code.
```

---

### Prompt 2: Ollama Local LLM Integration [Medium]

```
**System Prompt:** You are an expert AI Engineer building InboxOS, a next-generation open-source AI email operating system.
**Stack:** Node.js, TypeScript, axios, OpenAI SDK
**Task:** Add Ollama (local LLM) support to the AI service alongside OpenAI and Gemini.

**Step-by-Step Instructions:**
1. Create `backend/src/services/ai-providers/ollama.provider.ts`.
2. Implement `OllamaProvider` class with same interface as existing OpenAI/Gemini providers:
   - `classify(subject: string, body: string): Promise<ClassificationResult>`
   - `extractActionItems(subject: string, body: string): Promise<ActionItem[]>`
   - `generateSummary(threadEmails: string[]): Promise<string>`
3. Use axios to call Ollama API at `http://localhost:11434/api/generate`.
4. Use model `llama3` or `mistral` (configurable via env `OLLAMA_MODEL`).
5. Implement structured output parsing: since Ollama doesn't have native JSON mode, use regex to extract JSON from text output.
6. Add `OLLAMA_BASE_URL` and `OLLAMA_MODEL` to `.env`.
7. Update `backend/src/services/ai.service.ts` — modify provider selection logic to include 'ollama' option.
8. Update frontend AI Settings dropdown — 'ollama' option already exists in UI, ensure backend handles it.
9. Add fallback: if Ollama is unreachable, automatically fallback to OpenAI.

**Design/Architecture Constraints:**
- Must return identical response schemas regardless of provider.
- Must handle Ollama not running (connection refused) with graceful fallback.
- Token counting must be estimated (use tiktoken or simple word-count approximation).
- Must support streaming responses for long generations.
- Must auto-pull model if not available (`POST /api/pull`).

**Acceptance Criteria:**
Setting `AI_PROVIDER=ollama` in `.env` and having Ollama running locally (`ollama run llama3`) successfully classifies emails with no code changes to calling modules.

**Output:** Execute the necessary terminal commands to initialize or modify the codebase, and write the complete, production-ready code. Do not use placeholders (e.g., 'TODO: implement logic'). Write fully functional code.
```

---

## P11 — DevOps & Deployment Lead

### Prompt 1: Production Deployment to Render + Vercel [Hard]

```
**System Prompt:** You are an expert DevOps Engineer building InboxOS, a next-generation open-source AI email operating system.
**Stack:** Render, Vercel, PostgreSQL, Redis, GitHub Actions
**Task:** Deploy the backend to Render and frontend to Vercel with production environment configuration.

**Step-by-Step Instructions:**
1. Create `render.yaml` (Render Blueprint) or `render.yml` defining:
   - Web service: backend, build command `npm install && npm run build`, start command `npm start`
   - PostgreSQL database (managed by Render or external)
   - Redis instance (Redis Cloud or Upstash)
2. Create `vercel.json` in frontend root with:
   - Build command: `npm run build`
   - Output directory: `dist`
   - Rewrites: `/api/*` → backend Render URL
   - Environment variables for API URL
3. Update `backend/src/server.ts` — add CORS configuration for Vercel domain.
4. Update `.env.production` template with all required production variables.
5. Update GitHub Actions CI to deploy on push to `main`:
   - Backend: trigger Render deploy hook
   - Frontend: `vercel --prod` deploy
6. Create `scripts/setup-production.js` that:
   - Runs Prisma migrations on startup
   - Seeds initial data if empty
   - Verifies Redis connection
7. Add health check endpoint that also verifies DB and Redis connectivity.
8. Document deployment steps in `docs/DEPLOYMENT.md`.

**Design/Architecture Constraints:**
- Must use environment variables for ALL secrets (no hardcoded values).
- Database connection must use SSL in production.
- Redis must use TLS in production.
- Must handle Render's free tier sleep (cold start) gracefully.
- Must set up log draining to external service (e.g., Logtail).

**Acceptance Criteria:**
Pushing to `main` automatically deploys backend to `https://inboxos-api.onrender.com` and frontend to `https://inboxos.vercel.app`. The Telegram bot webhook points to the Render URL and receives updates.

**Output:** Execute the necessary terminal commands to initialize or modify the codebase, and write the complete, production-ready code. Do not use placeholders (e.g., 'TODO: implement logic'). Write fully functional code.
```

---

### Prompt 2: Grafana Dashboards for Prometheus Metrics [Medium]

```
**System Prompt:** You are an expert DevOps Engineer building InboxOS, a next-generation open-source AI email operating system.
**Stack:** Prometheus, Grafana, Docker, JSON
**Task:** Create monitoring dashboards for the InboxOS platform.

**Step-by-Step Instructions:**
1. Update `infrastructure/docker/docker-compose.yml` to add `prometheus` and `grafana` services.
2. Create `infrastructure/docker/prometheus/prometheus.yml` scraping `backend:8000/metrics`.
3. Create `infrastructure/docker/grafana/dashboards/inboxos.json` with panels:
   - Email throughput (emails_processed_total counter rate)
   - AI API latency (histogram p50/p95/p99)
   - Rule evaluation time
   - Notification delivery success/failure by channel (Telegram, Slack, Discord, WhatsApp)
   - Active WebSocket connections (Socket.IO adapter metric)
   - Database query duration (Prisma metric if available, or custom)
   - Redis memory usage
   - BullMQ queue depth per queue
4. Create provisioning files for auto-loading dashboards and datasource.
5. Add Prometheus alerting rules: error rate >5%, queue depth >1000, AI API down >2min.
6. Add Alertmanager configuration to send alerts to Slack webhook.
7. Secure Grafana with admin password via environment variable.

**Design/Architecture Constraints:**
- Dashboards must be importable JSON (version controlled in repo).
- Metrics must not expose PII (hash user_id in labels, never log email content).
- Must work both in Docker Compose (local) and production (Render can scrape Prometheus).
- Alertmanager must be configurable via env vars.

**Acceptance Criteria:**
Running `docker-compose up` includes Grafana at `localhost:3000` with pre-loaded InboxOS dashboard showing live email processing metrics.

**Output:** Execute the necessary terminal commands to initialize or modify the codebase, and write the complete, production-ready code. Do not use placeholders (e.g., 'TODO: implement logic'). Write fully functional code.
```

---

### Prompt 3: Security Audit & Hardening [Medium]

```
**System Prompt:** You are an expert Security/QA Dev building InboxOS, a next-generation open-source AI email operating system.
**Stack:** Node.js, Express, GitHub Actions, OWASP ZAP, eslint-plugin-security
**Task:** Implement automated security scanning and production hardening.

**Step-by-Step Instructions:**
1. Add `eslint-plugin-security` to frontend and backend ESLint configs.
2. Add `npm audit --audit-level=high` to CI pipeline (already partially there, make it fail the build).
3. Create `.github/workflows/security.yml` running:
   - `npm audit` (fail on high/critical)
   - `eslint` with security rules
   - Secret scanning with `gitleaks` (or GitHub native secret scanning)
   - Container scanning with Trivy on the backend Docker image
4. Implement security headers in Express:
   - `helmet` middleware for HSTS, CSP, X-Frame-Options, X-Content-Type-Options
   - Rate limiting per IP (separate from authenticated user rate limiting)
   - CORS whitelist (no wildcard in production)
   - Request size limit (10MB max for email bodies)
5. Add input sanitization for all user inputs (use `express-validator` or `zod` strictly).
6. Ensure password policies: minimum 8 chars, complexity requirements (already partially implemented, verify).
7. Create `SECURITY.md` with vulnerability reporting process and security contact.
8. Run OWASP ZAP baseline scan against local instance, document findings.

**Design/Architecture Constraints:**
- Must not break existing functionality (test all endpoints after adding helmet).
- Security scans must complete in <10 minutes for CI.
- False positives must be documented in `.zap/ignore` or similar.
- Container must run as non-root user (already in Dockerfile, verify).

**Acceptance Criteria:**
CI fails if a HIGH severity vulnerability is introduced. The application passes an OWASP ZAP baseline scan with no HIGH risk findings.

**Output:** Execute the necessary terminal commands to initialize or modify the codebase, and write the complete, production-ready code. Do not use placeholders (e.g., 'TODO: implement logic'). Write fully functional code.
```

---

# 🌱 BEGINNER-FRIENDLY PROMPTS (Phase 2-3)

## B9 — Beginner Frontend

### Prompt 1: Inbox Analytics Dashboard [Medium]

```
**System Prompt:** You are an expert Frontend Developer building InboxOS, a next-generation open-source AI email operating system.
**Stack:** React, TypeScript, Recharts, TailwindCSS, TanStack Query
**Task:** Build the analytics dashboard showing inbox insights.

**Step-by-Step Instructions:**
1. Create `frontend/src/pages/AnalyticsPage.tsx`.
2. Create backend endpoints (or ensure they exist):
   - `GET /api/dashboard/stats` — returns category breakdown, priority trends, action completion rates
   - `GET /api/dashboard/heatmap` — returns email volume by hour/day for the last 90 days
3. Build components:
   - `CategoryBreakdownChart` — Pie chart of email categories (Recharts)
   - `PriorityTrendChart` — Line chart of average priority over time
   - `ActivityHeatmap` — CSS-grid heatmap of email volume (GitHub-style green squares)
   - `TopSendersTable` — Table of most frequent senders with email counts
   - `ActionCompletionGauge` — Circular progress of completed vs pending actions
4. Add date range picker: 7d, 30d, 90d, custom (use date-fns for calculations).
5. Fetch data with TanStack Query (caching, loading states, error handling).
6. Add to SidebarNav as "Analytics" item with `BarChart3` icon.
7. Make responsive — charts stack on mobile, heatmap scrolls horizontally.

**Design/Architecture Constraints:**
- Must use existing dark glassmorphism design system (bg-base: #080b14, bg-elevated: #111827, accent: #6366f1).
- Charts must be interactive (tooltips on hover with exact values).
- Must handle empty states ("No data for this period") gracefully.
- Must match existing loading patterns (skeleton loaders).

**Acceptance Criteria:**
The Analytics page renders 5 interactive data visualizations with real data from the API. Changing the date range updates all charts. Mobile view stacks charts vertically without horizontal scroll.

**Output:** Execute the necessary terminal commands to initialize or modify the codebase, and write the complete, production-ready code. Do not use placeholders (e.g., 'TODO: implement logic'). Write fully functional code.
```

---

## B10 — Beginner AI/Data

### Prompt 1: User Feedback Collection for Trainable Model [Easy]

```
**System Prompt:** You are an expert AI/Data Dev building InboxOS, a next-generation open-source AI email operating system.
**Stack:** Node.js, TypeScript, Prisma, Express
**Task:** Build the feedback collection system that enables the trainable personal model.

**Step-by-Step Instructions:**
1. Update Prisma schema — add `UserFeedback` model: id, userId, emailId, feedbackType ('thumbs_up','thumbs_down','category_correction','priority_adjustment'), originalValue, correctedValue, createdAt.
2. Create `POST /api/feedback` endpoint with Zod validation.
3. Create `backend/src/services/ai/feedback-collector.service.ts`.
4. Implement `recordFeedback(userId, emailId, feedbackType, correctedValue?)`.
5. Aggregate feedback weekly per user:
   - Count corrections per category
   - Track preferred senders (thumbs_up senders)
   - Track ignored categories (thumbs_down patterns)
6. Store aggregated profile as JSONB in `UserSettings` model: `aiPreferenceProfile`.
7. Expose `GET /api/users/me/ai-profile` to view learned preferences.
8. Add thumbs up/down buttons to frontend EmailViewer (next to category badge).
9. Show a toast: "Thanks! Your feedback improves future classifications."

**Design/Architecture Constraints:**
- Feedback must not store email content (only emailId for reference).
- Must prevent feedback spam (rate limit: 100 feedbacks/day per user, use existing rate limiter).
- Profile updates must be incremental (update counts, don't recompute everything).
- Must handle feedback on deleted emails gracefully (ignore, don't crash).

**Acceptance Criteria:**
A user thumbs-downs a "newsletter" classification and selects "should be urgent". The system records this and the user's AI profile shows "Corrected newsletter → urgent: 1 time". Future similar emails from this sender get boosted priority.

**Output:** Execute the necessary terminal commands to initialize or modify the codebase, and write the complete, production-ready code. Do not use placeholders (e.g., 'TODO: implement logic'). Write fully functional code.
```

---

## B11 — Beginner Docs/DevEx

### Prompt 1: API Documentation with Express + OpenAPI [Easy]

```
**System Prompt:** You are an expert Docs/DevEx Dev building InboxOS, a next-generation open-source AI email operating system.
**Stack:** Node.js, Express, swagger-jsdoc, swagger-ui-express
**Task:** Set up auto-generated API documentation for the Express backend.

**Step-by-Step Instructions:**
1. Install `swagger-jsdoc` and `swagger-ui-express`.
2. Create `backend/src/config/swagger.ts` with OpenAPI 3.0 spec:
   - Title: "InboxOS API"
   - Version: "1.0.0"
   - Servers: local and production URLs
   - Security scheme: JWT Bearer (cookie-based)
3. Add JSDoc comments to ALL route files:
   - `@swagger` tags for each endpoint
   - Request body schemas (Zod shapes documented)
   - Response schemas with example values
   - Authentication requirements
4. Mount Swagger UI at `/api/docs`.
5. Mount OpenAPI JSON at `/api/docs.json`.
6. Create `docs/API_GUIDE.md` with:
   - Authentication (JWT in HTTP-only cookie)
   - Rate limiting details
   - WebSocket connection guide (Socket.IO)
   - Error code reference
   - Code examples in JavaScript (fetch), Python (requests), and cURL
7. Export Postman collection as `docs/InboxOS_API.postman_collection.json`.

**Design/Architecture Constraints:**
- All schemas must have example values.
- Enum fields must document all possible values.
- WebSocket events must be documented (add a separate WebSocket section).
- Must include a "Getting Started" quickstart (authenticate → fetch emails).
- Must be accurate — test every example curl command.

**Acceptance Criteria:**
A new developer can visit `http://localhost:8000/api/docs`, see all endpoints with schemas, and make their first authenticated API call within 5 minutes using the provided examples.

**Output:** Execute the necessary terminal commands to initialize or modify the codebase, and write the complete, production-ready code. Do not use placeholders (e.g., 'TODO: implement logic'). Write fully functional code.
```

---

# 📊 FINAL COVERAGE SUMMARY

## Built (from original 65 prompts):
✅ Core DB, Auth, Email Ingestion, Event Bus (BullMQ)
✅ AI Classification, Worker, Summary, Action Extraction
✅ React Scaffold, Auth Views, Inbox List, Email Detail, Compose
✅ Gmail OAuth, Gmail Sync, IMAP, SMTP, Webhook Management
✅ Docker, CI/CD, Terraform, Rate Limiting, Basic Monitoring
✅ Health Check, Profile, Search, Validation, Folders
✅ Button, Avatar, Empty State, Sidebar, Modal
✅ Synthetic Data, Prompt Templates, Keyword Filter, RAG Dataset, Latency Analysis
✅ Test OAuth, Discord, Slack, Gravatar, Parse Attachments
✅ ESLint, API Tests, Cypress, Vulnerability Check, Password Strength
✅ Setup Guide, Schema Docs, Postman, Contributing, Workflow
✅ React Memo, DB Indexes, Redis Cache, Lighthouse, Minify
✅ Mobile Sidebar, Responsive List, FAB, Touch Targets, Pull to Refresh
✅ Telegram Bot (built beyond prompts), WebSocket Real-Time, AI Draft Assist

## NEW 20 Prompts Fill These Gaps:
🆕 P6.1  HTML-to-Text Converter (Node.js/cheerio)
🆕 P6.2  Signature Stripper (Node.js/regex)
🆕 P6.3  Quoted Reply Detector (Node.js/diff)
🆕 P6.4  Link & Attachment Extractor (Node.js/cheerio)
🆕 P7.1  Rules Management UI (React/Hook Form/Zod)
🆕 P7.2  Time-Based Windows & DND (Node.js/date-fns-tz)
🆕 P8.1  Calendar Event Extractor & Google Calendar (Node.js/googleapis)
🆕 P8.2  Digest Generator & Email Digest Adapter (Node.js/BullMQ/nodemailer)
🆕 P8.3  Expense Extractor (Node.js/OpenAI)
🆕 P8.4  Reminder Scheduler (Node.js/BullMQ)
🆕 P9.1  WhatsApp Adapter (Node.js/Twilio)
🆕 P9.2  Outlook Connector (Node.js/MSAL/Graph)
🆕 P10.1 Deadline Extraction + RAG Integration (Node.js/pgvector)
🆕 P10.2 Ollama Local LLM (Node.js/axios)
🆕 P11.1 Production Deployment (Render + Vercel)
🆕 P11.2 Grafana Dashboards (Docker/Prometheus)
🆕 P11.3 Security Audit & Hardening (Node.js/helmet/ZAP)
🆕 B9.1  Analytics Dashboard UI (React/Recharts)
🆕 B10.1 User Feedback for Trainable Model (Node.js/Prisma)
🆕 B11.1 API Documentation (Express/Swagger)

## Total: 85 Prompts (65 original + 20 new)
## Stack Alignment: 100% Node.js/Express/Prisma + React/Vite
## Estimated Completion: 95-98% of InboxOS v1.0-v3.0 functionality
