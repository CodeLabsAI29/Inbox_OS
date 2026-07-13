# 🚀 InboxOS — Phase 3 Technical Design: Semantic Chunking, Importance Scoring, & Telegram Routing

This document presents the research, architecture, mathematical formulations, database modifications, and codebase blueprints for Phase 3 of InboxOS. 

---

## 📖 Table of Contents
1. [Milestone Objectives](#1-milestone-objectives)
2. [Deep Research: Email Parsing, Sorting, & Text Chunking](#2-deep-research-email-parsing-sorting--text-chunking)
   - [The Need for Text Chunking](#the-need-for-text-chunking)
   - [Chunking Methodologies & Comparative Analysis](#chunking-methodologies--comparative-analysis)
   - [Email Sorting & Topic Modeling](#email-sorting--topic-modeling)
3. [Granular Importance Scoring Engine](#3-granular-importance-scoring-engine)
   - [Scoring Vector Matrix](#scoring-vector-matrix)
   - [Mathematical Formula](#mathematical-formula)
   - [Weight Tuning & Priority Classification](#weight-tuning--priority-classification)
4. [Telegram API Integration & Routing Layer](#4-telegram-api-integration--routing-layer)
   - [Routing Conditions](#routing-conditions)
   - [Bot Operations & Webhook Endpoint Configuration](#bot-operations--webhook-endpoint-configuration)
   - [Payload Formats & MarkdownV2 Escaping Heuristics](#payload-formats--markdownv2-escaping-heuristics)
5. [Prisma Database Migration Plan](#5-prisma-database-migration-plan)
6. [TypeScript Code Blueprints](#6-typescript-code-blueprints)
   - [Text Splitter Service](#text-splitter-service)
   - [Importance Scoring Service](#importance-scoring-service)
   - [Worker Integration Logic](#worker-integration-logic)
7. [Frontend UI Settings Component (React/Tailwind)](#7-frontend-ui-settings-component-reacttailwind)

---

## 1. Milestone Objectives

The objectives for this milestone are:
1. **Semantic Text Chunking**: Break down email content into manageable segments.
2. **Granular Scoring Engine**: Score each email chunk on a $0$–$100$ scale to determine overall importance.
3. **Telegram Notification Routing**: Push alerts for emails scoring above a user-defined threshold (e.g., 70) to the user's Telegram.

---

## 2. Deep Research: Email Parsing, Sorting, & Text Chunking

### The Need for Text Chunking
Processing long emails (such as thread histories, weekly newsletters, or system dumps) presents several challenges:
1. **Context Window Limits**: Long inputs can consume significant tokens and degrade LLM attention accuracy.
2. **Context Dilution ("Lost in the Middle")**: Critical details like action items or invoice totals can be missed if buried in large text blocks.
3. **Multi-topic Emails**: A single email may discuss different projects, billing items, or scheduling requests. Breaking the email into chunks allows the system to analyze each topic independently.

### Chunking Methodologies & Comparative Analysis

We evaluated several chunking strategies:

```text
Fixed-Size Character Splitter (Fixed overlapping regions)
[     Chunk 1 (1000 Chars)    ]
                 [     Chunk 2 (1000 Chars)    ]
                                  [     Chunk 3 (1000 Chars)    ]

Semantic Markdown Header Splitter (Preserves header boundaries)
# 🚨 Server Outage Report
[         Chunk 1 (Contains header and description)         ]
# 📝 System Diagnostics
[         Chunk 2 (Contains tables and logs)                ]
```

#### Comparison of Chunking Strategies:

- **Fixed-Size Overlapping character splitter**:
  - **Description**: Splits text at a fixed character count (e.g., 1000 characters) with a 200-character overlap.
  - **Pros**: Fast and easy to implement.
  - **Cons**: Can cut sentences or tables in half, causing context fragmentation.
- **Recursive Character Splitter**:
  - **Description**: Recursively splits text using separators (`\n\n`, `\n`, ` `, `""`) to keep paragraphs and sentences intact.
  - **Pros**: Maintains text flow and readability.
  - **Cons**: Chunk sizes can vary depending on the paragraph structure.
- **Markdown Header Splitter**:
  - **Description**: Splits text based on Markdown headers (`#`, `##`, `###`).
  - **Pros**: Preserves structural groups and section boundaries.
  - **Cons**: Fails if the source text contains no Markdown headers.
- **HTML Element Boundary Splitter**:
  - **Description**: Splits text using HTML block tags (`<div>`, `<p>`, `<table>`) during the parsing phase.
  - **Pros**: Keeps tables and structured components together.
  - **Cons**: Requires parsing dirty HTML, which increases execution time.

**Proposed Implementation**: A **Hybrid Semantic Markdown Splitter**. The engine will attempt to split by Markdown headers first. If a section exceeds 1,500 characters, it will fall back to a recursive paragraph splitter.

### Email Sorting & Topic Modeling
To categorize emails accurately, we apply a two-step approach:
1. **Chunk-Level Topic Extraction**: The system classifies each chunk into a specific sub-topic (e.g., "OTP Verification Code", "Invoice Total", "Marketing Pitch").
2. **Dynamic Clustering & Aggregation**: It groups the chunks by topic and assigns a primary category to the email based on the highest-priority topic found.

---

## 3. Granular Importance Scoring Engine

We use a multi-dimensional scoring model to rate incoming emails from $0$ to $100$.

### Scoring Vector Matrix
The final score ($I$) is calculated using the following parameters:

- **Sender Reputation Score ($S$)** [0–100]: Based on the user's whitelist settings.
- **AI Urgency Score ($U$)** [0–100]: Evaluates temporal urgency (e.g., "due today" vs. "due next month").
- **AI Actionability Score ($A$)** [0–100]: Rates whether the email requires a direct reply or task execution.
- **Keyword Boost ($K$)** [-30 to +30]: Adjusts the score based on exact keyword matches (e.g., "OTP", "urgent", "unsubscribed").
- **User Feedback Correction ($F$)** [-20 to +20]: Adjusts the score based on historical corrections from the user dashboard.

### Mathematical Formula

$$I = \text{Clamp}\left( (w_1 \cdot S) + (w_2 \cdot U) + (w_3 \cdot A) + K + F, \; 0, \; 100 \right)$$

Where:
- $w_1 = 0.3$ (Sender authority weight)
- $w_2 = 0.4$ (Urgency weight)
- $w_3 = 0.3$ (Actionability weight)
- $\text{Clamp}(x, 0, 100) = \max(0, \min(100, x))$

### Weight Tuning & Priority Classification
Calculated scores are classified into three bands:

- **High Importance** (Score $\ge 70$): Triggers immediate push alerts (e.g., Telegram notifications).
- **Normal Importance** (Score $30$–$69$): Pushed to the dashboard feed without sounding an alert.
- **Low Importance** (Score $< 30$): Sent directly to the digest queue for periodic summaries.

---

## 4. Telegram API Integration & Routing Layer

### Routing Conditions
When a new email is processed, the system checks if a Telegram notification should be sent:

```typescript
const isHighPriority = emailAnalysis.priorityScore >= userSettings.telegramAlertThreshold;
const isWithinDndWindow = checkDndStatus(userSettings);

if (userSettings.telegramEnabled && isHighPriority && !isWithinDndWindow) {
  await TelegramNotificationService.sendImportantEmailAlert(
    userSettings.telegramChatId,
    emailPayload
  );
}
```

### Bot Operations & Webhook Endpoint Configuration
The bot can run in one of two modes:
1. **Long Polling**: Used for local testing and development setups.
2. **Webhook Mode**: Used in production, registering the endpoint `/api/telegram/webhook` to handle messages from Telegram.

### Payload Formats & MarkdownV2 Escaping Heuristics
Telegram's `MarkdownV2` requires escaping special characters (`_`, `*`, `[`, `]`, `(`, `)`, `~`, `` ` ``, `>`, `#`, `+`, `-`, `=`, `|`, `{`, `}`, `.`, `!`). We use a utility helper to clean input text before rendering:

```typescript
function escapeMarkdownV2(text: string): string {
  return text.replace(/[_*\[\]\(\)~`>#\+\-=|{}.!]/g, '\\$&');
}
```

---

## 5. Prisma Database Migration Plan

We will update [schema.prisma](file:///c:/project/InboxOS/backend/prisma/schema.prisma) to add the `EmailChunk` model and add new settings to `UserSettings`:

```prisma
// Update UserSettings
model UserSettings {
  // ... existing fields ...
  telegramAlertThreshold Int     @default(70) // Configure threshold values (10-100)
}

// Add EmailChunk Model
model EmailChunk {
  id              String        @id @default(uuid())
  analysisId      String
  analysis        EmailAnalysis @relation(fields: [analysisId], references: [id], onDelete: Cascade)
  chunkIndex      Int
  bodyContent     String
  priorityScore   Float         @default(0.0)
  topic           String?
  extractedData   Json?
  createdAt       DateTime      @default(now())

  @@index([analysisId])
}
```

---

## 6. TypeScript Code Blueprints

### Text Splitter Service
Create `backend/src/services/parser/text-splitter.service.ts`:

```typescript
export class TextSplitterService {
  /**
   * Splits email markdown body into chunks.
   */
  public static splitMarkdown(text: string, maxChunkSize: number = 1500): string[] {
    if (text.length <= maxChunkSize) return [text];

    const chunks: string[] = [];
    
    // First separator check: Markdown Headers
    const sections = text.split(/(?=\n#{1,4}\s)/);
    let tempChunk = '';

    for (const section of sections) {
      if ((tempChunk + section).length > maxChunkSize) {
        if (tempChunk.trim()) {
          chunks.push(tempChunk.trim());
        }
        
        // Fallback to paragraph splits if a section exceeds the chunk size
        if (section.length > maxChunkSize) {
          const paragraphs = section.split(/\n\n+/);
          for (const para of paragraphs) {
            if ((tempChunk + para).length > maxChunkSize) {
              if (tempChunk.trim()) chunks.push(tempChunk.trim());
              tempChunk = para;
            } else {
              tempChunk += (tempChunk ? '\n\n' : '') + para;
            }
          }
        } else {
          tempChunk = section;
        }
      } else {
        tempChunk += section;
      }
    }

    if (tempChunk.trim()) {
      chunks.push(tempChunk.trim());
    }

    return chunks;
  }
}
```

### Importance Scoring Service
Create `backend/src/services/importance-scoring.service.ts`:

```typescript
import { PrismaClient } from '@prisma/client';

export class ImportanceScoringService {
  private static prisma = new PrismaClient();

  /**
   * Calculates the overall importance score of an email.
   */
  public static calculateScore(
    senderRep: number,
    urgency: number,
    actionability: number,
    keywordBoost: number,
    feedbackAdjustment: number
  ): number {
    const raw = (0.3 * senderRep) + (0.4 * urgency) + (0.3 * actionability) + keywordBoost + feedbackAdjustment;
    return Math.max(0, Math.min(100, raw));
  }

  /**
   * Matches body keywords against configuration rules.
   */
  public static evaluateKeywords(body: string): number {
    let boost = 0;
    const lowerBody = body.toLowerCase();
    
    const rules = [
      { terms: ['otp', 'verification', '2fa'], value: 25 },
      { terms: ['urgent', 'immediate', 'action required', 'outage'], value: 20 },
      { terms: ['invoice due', 'payment overdue', 'receipt'], value: 15 },
      { terms: ['unsubscribe', 'marketing', 'newsletter'], value: -20 }
    ];

    for (const rule of rules) {
      if (rule.terms.some(term => lowerBody.includes(term))) {
        boost += rule.value;
      }
    }

    return boost;
  }
}
```

### Worker Integration Logic
Update the processing loop in [worker.ts](file:///c:/project/InboxOS/backend/src/worker.ts) to run the chunking and scoring logic:

```typescript
// Inside registerWorkerHandlers():
const chunks = TextSplitterService.splitMarkdown(email.body);
const chunkScores: number[] = [];

for (let i = 0; i < chunks.length; i++) {
  const chunkText = chunks[i];
  
  // Call LLM client to score individual chunk
  const analysisResult = await AIService.analyzeChunk(chunkText);
  
  const senderRep = await ImportanceScoringService.evaluateSender(email.sender);
  const keywordBoost = ImportanceScoringService.evaluateKeywords(chunkText);
  
  const finalChunkScore = ImportanceScoringService.calculateScore(
    senderRep,
    analysisResult.urgency,
    analysisResult.actionability,
    keywordBoost,
    0
  );

  chunkScores.push(finalChunkScore);

  // Save EmailChunk entry
  await prisma.emailChunk.create({
    data: {
      analysisId: emailAnalysis.id,
      chunkIndex: i,
      bodyContent: chunkText,
      priorityScore: finalChunkScore,
      topic: analysisResult.topic
    }
  });
}

// Calculate total score based on the highest chunk score
const overallScore = Math.max(...chunkScores);
await prisma.emailAnalysis.update({
  where: { id: emailAnalysis.id },
  data: { priorityScore: overallScore }
});
```

---

## 7. Frontend UI Settings Component (React/Tailwind)

Update the integrations and settings tabs in the React application to display threshold configuration controls:

```tsx
import React, { useState } from 'react';

export const ImportanceThresholdConfig: React.FC = () => {
  const [threshold, setThreshold] = useState(70);
  const [saving, setSaving] = useState(false);

  const saveSettings = async () => {
    setSaving(true);
    try {
      await fetch('/api/users/me/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ telegramAlertThreshold: threshold })
      });
    } catch (err) {
      console.error('Failed to save settings:', err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-slate-900/60 border border-slate-800 p-6 rounded-xl backdrop-blur-md">
      <h3 className="text-md font-semibold text-white">Alert Routing Threshold</h3>
      <p className="text-xs text-slate-400 mt-1">
        Configure the minimum importance score required to trigger external alerts.
      </p>
      
      <div className="mt-4 flex items-center gap-4">
        <input 
          type="range" 
          min="10" 
          max="100" 
          value={threshold} 
          onChange={(e) => setThreshold(Number(e.target.value))}
          className="w-full accent-indigo-500 bg-slate-800"
        />
        <span className="text-lg font-bold text-indigo-400 w-12 text-right">{threshold}</span>
      </div>

      <button 
        onClick={saveSettings} 
        disabled={saving}
        className="mt-4 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-lg text-sm font-semibold transition"
      >
        {saving ? 'Saving...' : 'Save Settings'}
      </button>
    </div>
  );
};
```
