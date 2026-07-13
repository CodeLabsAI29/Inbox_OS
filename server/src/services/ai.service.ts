import OpenAI from 'openai';
import { GoogleGenAI } from '@google/genai';
import { PrismaClient } from '@prisma/client';
import * as dotenv from 'dotenv';
import * as path from 'path';
import * as chrono from 'chrono-node';
import { OllamaProvider } from './ai-providers/ollama.provider';
import { KeywordFilter } from './KeywordFilter';

// Load environment variables from the shared configuration directory
dotenv.config({
  path: path.resolve(__dirname, '../../../infrastructure/config/env/.env'),
});

const prisma = new PrismaClient();

export type EmailCategory =
  | 'urgent'
  | 'finance'
  | 'job'
  | 'otp'
  | 'meeting'
  | 'newsletter'
  | 'academic'
  | 'personal'
  | 'work'
  | 'spam';

export interface ClassificationResult {
  category: EmailCategory;
  confidence: number;
  deadlines: string[];
}

export interface ActionItemResult {
  task?: string;
  taskDescription?: string;
  deadline?: string | null;
}

export class AIService {
  private static openaiInstance: OpenAI | null = null;
  private static geminiInstance: GoogleGenAI | null = null;

  public static getOpenAI(): OpenAI {
    if (!this.openaiInstance) {
      const apiKey = process.env.OPENAI_API_KEY;
      if (!apiKey || apiKey === 'sk-...') {
        throw new Error(
          'OPENAI_API_KEY is not defined or is set to placeholder in environment configuration.'
        );
      }
      this.openaiInstance = new OpenAI({ apiKey });
    }
    return this.openaiInstance;
  }

  private static getGemini(): GoogleGenAI {
    if (!this.geminiInstance) {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        throw new Error(
          'GEMINI_API_KEY is not defined in environment configuration.'
        );
      }
      this.geminiInstance = new GoogleGenAI({ apiKey });
    }
    return this.geminiInstance;
  }

  /**
   * Classifies an email's subject and body using the active provider model.
   * Leverages Structured Outputs (JSON Schema) and exponential backoff retry for rate limits.
   */
  private static extractDatesWithChrono(
    subject: string,
    body: string
  ): string[] {
    const parsedDeadlines: string[] = [];
    const seen = new Set<string>();

    const parseText = (text: string) => {
      if (!text) return;
      const parsed = chrono.parse(text);
      for (const ref of parsed) {
        const date = ref.date();
        const hasHour = ref.start.isCertain('hour');
        let dateStr: string;
        if (!hasHour) {
          const year = date.getFullYear();
          const month = String(date.getMonth() + 1).padStart(2, '0');
          const day = String(date.getDate()).padStart(2, '0');
          dateStr = `${year}-${month}-${day}T23:59:00Z`;
        } else {
          dateStr = date.toISOString();
        }
        if (!seen.has(dateStr)) {
          seen.add(dateStr);
          parsedDeadlines.push(dateStr);
        }
      }
    };

    parseText(subject);
    parseText(body);
    return parsedDeadlines;
  }

  /**
   * Classifies an email's subject and body using the active provider model.
   * Leverages Structured Outputs (JSON Schema) and exponential backoff retry for rate limits.
   */
  public static async classifyEmail(
    subject: string,
    body: string
  ): Promise<ClassificationResult> {
    // 1. Try fast heuristic filter first to save cost and reduce latency
    const heuristicCategory = KeywordFilter.classify(body);
    if (heuristicCategory) {
      return {
        category: heuristicCategory,
        confidence: 1.0,
        deadlines: this.extractDatesWithChrono(subject, body),
      };
    }

    const provider = process.env.AI_PROVIDER || 'gemini';
    let result: ClassificationResult;

    if (provider === 'gemini') {
      result = await this.classifyWithGemini(subject, body);
    } else if (provider === 'ollama') {
      try {
        result = await OllamaProvider.classify(subject, body);
      } catch (error) {
        console.warn(
          `[AIService] Ollama classification failed or unreachable. Falling back to OpenAI. Error:`,
          error
        );
        result = await this.classifyWithOpenAI(subject, body);
      }
    } else {
      result = await this.classifyWithOpenAI(subject, body);
    }

    // Chrono-node fallback if LLM misses dates
    if (!result.deadlines || result.deadlines.length === 0) {
      result.deadlines = this.extractDatesWithChrono(subject, body);
    } else {
      // Ensure LLM deadlines are unique and formatted correctly
      const seen = new Set<string>();
      const formatted: string[] = [];
      for (const d of result.deadlines) {
        const normalized = this.normalizeIsoDate(d);
        if (normalized && !seen.has(normalized)) {
          seen.add(normalized);
          formatted.push(normalized);
        }
      }
      result.deadlines = formatted;
    }

    return result;
  }

  private static async classifyWithOpenAI(
    subject: string,
    body: string
  ): Promise<ClassificationResult> {
    const openai = this.getOpenAI();

    const systemPrompt = `You are an expert AI email classification assistant. Your task is to analyze the email's subject line and body text, classify it into exactly one of the following categories:
- urgent: Requires immediate attention, system alerts, outages, or critical action.
- finance: Financial reports, bills, receipts, bank updates, invoices, or transactions.
- job: Job applications, updates, recruiter messages, offers, or interviews.
- otp: Authentication codes, verification pins, security alerts, or OTP tokens.
- meeting: Calendar invites, scheduling requests, status syncs, or agenda updates.
- newsletter: Weekly/daily digests, marketing updates, announcements, or blogs.
- academic: University, school, homework, course, lectures, grades, or research.
- personal: Direct communication from friends, family, or personal contacts.
- work: Business operations, projects, corporate communications, or tasks.
- spam: Junk, unsolicited marketing, phishing, or bulk commercial email.

Provide a confidence score between 0.0 and 1.0. Also, extract all deadlines mentioned in the email body as ISO 8601 dates (e.g. '2026-07-15T23:59:00Z').`;

    const userPrompt = `Subject: ${subject}\nBody:\n${body}`;

    const maxAttempts = 5;
    let attempt = 0;
    let delay = 1000;

    while (attempt < maxAttempts) {
      try {
        const response = await openai.chat.completions.create({
          model: 'gpt-4o-mini',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt },
          ],
          response_format: {
            type: 'json_schema',
            json_schema: {
              name: 'email_classification',
              strict: true,
              schema: {
                type: 'object',
                properties: {
                  category: {
                    type: 'string',
                    enum: [
                      'urgent',
                      'finance',
                      'job',
                      'otp',
                      'meeting',
                      'newsletter',
                      'academic',
                      'personal',
                      'work',
                      'spam',
                    ],
                  },
                  confidence: {
                    type: 'number',
                  },
                  deadlines: {
                    type: 'array',
                    items: {
                      type: 'string',
                    },
                    description: 'ISO 8601 dates extracted from email body',
                  },
                },
                required: ['category', 'confidence', 'deadlines'],
                additionalProperties: false,
              },
            },
          },
        });

        const rawContent = response.choices[0]?.message?.content;
        if (!rawContent) {
          throw new Error('OpenAI returned an empty classification response.');
        }

        const result = JSON.parse(rawContent) as ClassificationResult;
        return result;
      } catch (error: any) {
        attempt++;
        const isRateLimit =
          error.status === 429 ||
          (error.message && error.message.includes('429'));

        if (isRateLimit && attempt < maxAttempts) {
          console.warn(
            `[AIService] OpenAI Rate limit hit (429). Retrying in ${delay}ms... (Attempt ${attempt}/${maxAttempts})`
          );
          await new Promise((resolve) => setTimeout(resolve, delay));
          delay *= 2;
        } else {
          console.error(
            `[AIService] OpenAI classification failed on attempt ${attempt}:`,
            error
          );
          if (attempt >= maxAttempts) {
            throw new Error(
              `Failed to classify email via OpenAI after ${maxAttempts} attempts: ${error.message || error}`
            );
          }
          throw error;
        }
      }
    }

    throw new Error('Unknown error during OpenAI email classification.');
  }

  private static async classifyWithGemini(
    subject: string,
    body: string
  ): Promise<ClassificationResult> {
    const ai = this.getGemini();

    const systemInstruction = `You are an expert AI email classification assistant. Your task is to analyze the email's subject line and body text, and classify it into exactly one of the following categories:
- urgent: Requires immediate attention, system alerts, outages, or critical action.
- finance: Financial reports, bills, receipts, bank updates, invoices, or transactions.
- job: Job applications, updates, recruiter messages, offers, or interviews.
- otp: Authentication codes, verification pins, security alerts, or OTP tokens.
- meeting: Calendar invites, scheduling requests, status syncs, or agenda updates.
- newsletter: Weekly/daily digests, marketing updates, announcements, or blogs.
- academic: University, school, homework, course, lectures, grades, or research.
- personal: Direct communication from friends, family, or personal contacts.
- work: Business operations, projects, corporate communications, or tasks.
- spam: Junk, unsolicited marketing, phishing, or bulk commercial email.

Provide a confidence score between 0.0 and 1.0. Also, extract all deadlines mentioned in the email body as ISO 8601 dates (e.g. '2026-07-15T23:59:00Z').`;

    const userContent = `Subject: ${subject}\nBody:\n${body}`;

    const maxAttempts = 5;
    let attempt = 0;
    let delay = 1000;

    while (attempt < maxAttempts) {
      try {
        const response = await ai.models.generateContent({
          model: 'gemini-2.5-flash',
          contents: userContent,
          config: {
            systemInstruction: systemInstruction,
            responseMimeType: 'application/json',
            responseSchema: {
              type: 'OBJECT',
              properties: {
                category: {
                  type: 'STRING',
                  enum: [
                    'urgent',
                    'finance',
                    'job',
                    'otp',
                    'meeting',
                    'newsletter',
                    'academic',
                    'personal',
                    'work',
                    'spam',
                  ],
                },
                confidence: {
                  type: 'NUMBER',
                },
                deadlines: {
                  type: 'ARRAY',
                  items: {
                    type: 'STRING',
                  },
                },
              },
              required: ['category', 'confidence', 'deadlines'],
            },
          },
        });

        const rawContent = response.text;
        if (!rawContent) {
          throw new Error('Gemini returned an empty classification response.');
        }

        const result = JSON.parse(rawContent) as ClassificationResult;
        return result;
      } catch (error: any) {
        attempt++;
        const isRateLimit =
          error.status === 429 ||
          (error.message &&
            (error.message.includes('429') ||
              error.message.includes('ResourceExhausted') ||
              error.message.includes('Quota exceeded') ||
              error.message.includes('quota')));

        if (isRateLimit && attempt < maxAttempts) {
          console.warn(
            `[AIService] Gemini Rate limit hit (429/ResourceExhausted). Retrying in ${delay}ms... (Attempt ${attempt}/${maxAttempts})`
          );
          await new Promise((resolve) => setTimeout(resolve, delay));
          delay *= 2;
        } else {
          console.error(
            `[AIService] Gemini classification failed on attempt ${attempt}:`,
            error
          );
          if (attempt >= maxAttempts) {
            throw new Error(
              `Failed to classify email via Gemini after ${maxAttempts} attempts: ${error.message || error}`
            );
          }
          throw error;
        }
      }
    }

    throw new Error('Unknown error during Gemini email classification.');
  }

  /**
   * Generates a 2-3 sentence summary of an email thread and saves it to the Thread model.
   * Fetches all emails belonging to the thread ordered by date, truncates content to 8000 tokens
   * using a conservative heuristic (1 token = 4 characters), and prompts the LLM.
   */
  public static async generateSummary(threadId: string): Promise<string> {
    // 1. Fetch all Emails belonging to the thread ordered by date (oldest to newest)
    const emails = await prisma.email.findMany({
      where: { threadId },
      orderBy: {
        createdAt: 'asc',
      },
    });

    if (emails.length === 0) {
      throw new Error(`No emails found for thread ID: ${threadId}`);
    }

    // 2. Concatenate the bodies into a single string
    const concatenatedBodies = emails
      .map((email: any) => email.body)
      .join('\n\n');

    // 3. Truncate the concatenated string to a maximum of 8000 tokens (approx 32,000 characters)
    const truncatedText = this.truncateToTokens(concatenatedBodies, 8000);

    // 4. Prompt the LLM depending on active provider
    const provider = process.env.AI_PROVIDER || 'gemini';
    let summary = '';

    if (provider === 'gemini') {
      summary = await this.summarizeWithGemini(truncatedText);
    } else if (provider === 'ollama') {
      try {
        summary = await OllamaProvider.generateSummary([truncatedText]);
      } catch (error) {
        console.warn(
          `[AIService] Ollama thread summarization failed or unreachable. Falling back to OpenAI. Error:`,
          error
        );
        summary = await this.summarizeWithOpenAI(truncatedText);
      }
    } else {
      summary = await this.summarizeWithOpenAI(truncatedText);
    }

    // 5. Save the summary to the Thread model
    await prisma.thread.update({
      where: { id: threadId },
      data: {
        summary: summary,
      },
    });

    return summary;
  }

  private static truncateToTokens(text: string, maxTokens: number): string {
    const maxChars = maxTokens * 4;
    if (text.length > maxChars) {
      return text.substring(0, maxChars);
    }
    return text;
  }

  private static async summarizeWithOpenAI(
    threadContent: string
  ): Promise<string> {
    const openai = this.getOpenAI();
    const systemPrompt =
      'Summarize the following email thread in 2-3 sentences. Focus on the main outcome or required action.';

    const maxAttempts = 5;
    let attempt = 0;
    let delay = 1000;

    while (attempt < maxAttempts) {
      try {
        const response = await openai.chat.completions.create({
          model: 'gpt-4o-mini',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: threadContent },
          ],
        });

        const summary = response.choices[0]?.message?.content?.trim();
        if (!summary) {
          throw new Error('OpenAI returned an empty summary response.');
        }

        return summary;
      } catch (error: any) {
        attempt++;
        const isRateLimit =
          error.status === 429 ||
          (error.message && error.message.includes('429'));

        if (isRateLimit && attempt < maxAttempts) {
          console.warn(
            `[AIService] OpenAI Rate limit hit (429). Retrying in ${delay}ms... (Attempt ${attempt}/${maxAttempts})`
          );
          await new Promise((resolve) => setTimeout(resolve, delay));
          delay *= 2;
        } else {
          console.error(
            `[AIService] OpenAI summarization failed on attempt ${attempt}:`,
            error
          );
          if (attempt >= maxAttempts) {
            throw new Error(
              `Failed to summarize thread via OpenAI after ${maxAttempts} attempts: ${error.message || error}`
            );
          }
          throw error;
        }
      }
    }

    throw new Error('Unknown error during OpenAI thread summarization.');
  }

  private static async summarizeWithGemini(
    threadContent: string
  ): Promise<string> {
    const ai = this.getGemini();
    const systemInstruction =
      'Summarize the following email thread in 2-3 sentences. Focus on the main outcome or required action.';

    const maxAttempts = 5;
    let attempt = 0;
    let delay = 1000;

    while (attempt < maxAttempts) {
      try {
        const response = await ai.models.generateContent({
          model: 'gemini-2.5-flash',
          contents: threadContent,
          config: {
            systemInstruction: systemInstruction,
          },
        });

        const summary = response.text?.trim();
        if (!summary) {
          throw new Error('Gemini returned an empty summary response.');
        }

        return summary;
      } catch (error: any) {
        attempt++;
        const isRateLimit =
          error.status === 429 ||
          (error.message &&
            (error.message.includes('429') ||
              error.message.includes('ResourceExhausted') ||
              error.message.includes('Quota exceeded') ||
              error.message.includes('quota')));

        if (isRateLimit && attempt < maxAttempts) {
          console.warn(
            `[AIService] Gemini Rate limit hit (429/ResourceExhausted). Retrying in ${delay}ms... (Attempt ${attempt}/${maxAttempts})`
          );
          await new Promise((resolve) => setTimeout(resolve, delay));
          delay *= 2;
        } else {
          console.error(
            `[AIService] Gemini summarization failed on attempt ${attempt}:`,
            error
          );
          if (attempt >= maxAttempts) {
            throw new Error(
              `Failed to summarize thread via Gemini after ${maxAttempts} attempts: ${error.message || error}`
            );
          }
          throw error;
        }
      }
    }

    throw new Error('Unknown error during Gemini thread summarization.');
  }

  /**
   * Extracts explicit, concrete tasks and their deadlines from an email subject and body.
   */
  public static async extractActionItems(
    subject: string,
    body: string
  ): Promise<ActionItemResult[]> {
    const provider = process.env.AI_PROVIDER || 'gemini';
    let items: ActionItemResult[] = [];

    if (provider === 'gemini') {
      items = await this.extractActionItemsWithGemini(subject, body);
    } else if (provider === 'ollama') {
      try {
        items = await OllamaProvider.extractActionItems(subject, body);
      } catch (error) {
        console.warn(
          `[AIService] Ollama action items extraction failed or unreachable. Falling back to OpenAI. Error:`,
          error
        );
        items = await this.extractActionItemsWithOpenAI(subject, body);
      }
    } else {
      items = await this.extractActionItemsWithOpenAI(subject, body);
    }

    // Chrono-node fallback for missing deadlines on action items
    for (const item of items) {
      // Normalize task and taskDescription fields to be mutually populated
      if (item.task && !item.taskDescription) {
        item.taskDescription = item.task;
      }
      if (item.taskDescription && !item.task) {
        item.task = item.taskDescription;
      }

      if (!item.deadline || item.deadline.trim() === '') {
        // Try parsing the task description first
        let fallbackDate = this.parseDateWithChrono(item.taskDescription || item.task || '');
        if (!fallbackDate) {
          // If not found in task description, parse the email body
          fallbackDate = this.parseDateWithChrono(body);
        }
        item.deadline = fallbackDate;
      } else {
        // Normalize the date to 23:59:00Z if it's a date-only output from LLM
        item.deadline = this.normalizeIsoDate(item.deadline);
      }
    }

    return items;
  }

  /**
   * Backward-compatible wrapper that extracts task description strings.
   */
  public static async extractActions(
    subject: string,
    body: string
  ): Promise<string[]> {
    const items = await this.extractActionItems(subject, body);
    return items.map((item) => item.taskDescription || item.task || '');
  }

  private static parseDateWithChrono(text: string): string | null {
    const parsed = chrono.parse(text);
    if (parsed && parsed.length > 0) {
      const first = parsed[0];
      const date = first.date();
      const hasHour = first.start.isCertain('hour');
      if (!hasHour) {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}T23:59:00Z`;
      }
      return date.toISOString();
    }
    return null;
  }

  private static normalizeIsoDate(dateStr: string): string | null {
    try {
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) return null;
      // If it looks like a simple date YYYY-MM-DD, set to 23:59:00Z
      if (dateStr.length <= 10) {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}T23:59:00Z`;
      }
      return date.toISOString();
    } catch {
      return null;
    }
  }

  private static async extractActionItemsWithOpenAI(
    subject: string,
    body: string
  ): Promise<ActionItemResult[]> {
    const openai = this.getOpenAI();

    const systemPrompt = `You are an expert AI email task extraction assistant. Your job is to analyze the email subject line and body text, and extract all explicit, concrete tasks (e.g., 'Send the report by Friday') mentioned.
For each task, also extract any mentioned deadline as an ISO 8601 string (e.g., '2026-07-15T23:59:00Z'). If no deadline is mentioned, return an empty string for the deadline.
Populate both the 'task' and 'taskDescription' properties with the description of the task.
Do not infer, assume, or fabricate tasks or deadlines that are not explicitly and concretely requested.
If there are no explicit, concrete tasks, return an empty array.`;

    const userPrompt = `Subject: ${subject}\nBody:\n${body}`;

    const maxAttempts = 5;
    let attempt = 0;
    let delay = 1000;

    while (attempt < maxAttempts) {
      try {
        const response = await openai.chat.completions.create({
          model: 'gpt-4o-mini',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt },
          ],
          response_format: {
            type: 'json_schema',
            json_schema: {
              name: 'task_extraction',
              strict: true,
              schema: {
                type: 'object',
                properties: {
                  actionItems: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        task: {
                          type: 'string',
                        },
                        taskDescription: {
                          type: 'string',
                        },
                        deadline: {
                          type: 'string',
                        },
                      },
                      required: ['task', 'taskDescription', 'deadline'],
                      additionalProperties: false,
                    },
                  },
                },
                required: ['actionItems'],
                additionalProperties: false,
              },
            },
          },
        });

        const rawContent = response.choices[0]?.message?.content;
        if (!rawContent) {
          throw new Error(
            'OpenAI returned an empty action extraction response.'
          );
        }

        const result = JSON.parse(rawContent) as {
          actionItems: ActionItemResult[];
        };
        return result.actionItems || [];
      } catch (error: any) {
        attempt++;
        const isRateLimit =
          error.status === 429 ||
          (error.message && error.message.includes('429'));

        if (isRateLimit && attempt < maxAttempts) {
          console.warn(
            `[AIService] OpenAI Rate limit hit (429) during action extraction. Retrying in ${delay}ms... (Attempt ${attempt}/${maxAttempts})`
          );
          await new Promise((resolve) => setTimeout(resolve, delay));
          delay *= 2;
        } else {
          console.error(
            `[AIService] OpenAI action extraction failed on attempt ${attempt}:`,
            error
          );
          if (attempt >= maxAttempts) {
            throw new Error(
              `Failed to extract actions via OpenAI after ${maxAttempts} attempts: ${error.message || error}`
            );
          }
          throw error;
        }
      }
    }

    throw new Error('Unknown error during OpenAI action extraction.');
  }

  private static async extractActionItemsWithGemini(
    subject: string,
    body: string
  ): Promise<ActionItemResult[]> {
    const ai = this.getGemini();

    const systemInstruction = `You are an expert AI email task extraction assistant. Your job is to analyze the email subject line and body text, and extract all explicit, concrete tasks (e.g., 'Send the report by Friday') mentioned.
For each task, also extract any mentioned deadline as an ISO 8601 string (e.g., '2026-07-15T23:59:00Z'). If no deadline is mentioned, return an empty string for the deadline.
Populate both the 'task' and 'taskDescription' properties with the description of the task.
Do not infer, assume, or fabricate tasks or deadlines that are not explicitly and concretely requested.
If there are no explicit, concrete tasks, return an empty array.`;

    const userContent = `Subject: ${subject}\nBody:\n${body}`;

    const maxAttempts = 5;
    let attempt = 0;
    let delay = 1000;

    while (attempt < maxAttempts) {
      try {
        const response = await ai.models.generateContent({
          model: 'gemini-2.5-flash',
          contents: userContent,
          config: {
            systemInstruction: systemInstruction,
            responseMimeType: 'application/json',
            responseSchema: {
              type: 'OBJECT',
              properties: {
                actionItems: {
                  type: 'ARRAY',
                  items: {
                    type: 'OBJECT',
                    properties: {
                      task: {
                        type: 'STRING',
                      },
                      taskDescription: {
                        type: 'STRING',
                      },
                      deadline: {
                        type: 'STRING',
                      },
                    },
                    required: ['task', 'taskDescription', 'deadline'],
                  },
                },
              },
              required: ['actionItems'],
            },
          },
        });

        const rawContent = response.text;
        if (!rawContent) {
          throw new Error(
            'Gemini returned an empty action extraction response.'
          );
        }

        const result = JSON.parse(rawContent) as {
          actionItems: ActionItemResult[];
        };
        return result.actionItems || [];
      } catch (error: any) {
        attempt++;
        const isRateLimit =
          error.status === 429 ||
          (error.message &&
            (error.message.includes('429') ||
              error.message.includes('ResourceExhausted') ||
              error.message.includes('Quota exceeded') ||
              error.message.includes('quota')));

        if (isRateLimit && attempt < maxAttempts) {
          console.warn(
            `[AIService] Gemini Rate limit hit (429/ResourceExhausted) during action extraction. Retrying in ${delay}ms... (Attempt ${attempt}/${maxAttempts})`
          );
          await new Promise((resolve) => setTimeout(resolve, delay));
          delay *= 2;
        } else {
          console.error(
            `[AIService] Gemini action extraction failed on attempt ${attempt}:`,
            error
          );
          if (attempt >= maxAttempts) {
            throw new Error(
              `Failed to extract actions via Gemini after ${maxAttempts} attempts: ${error.message || error}`
            );
          }
          throw error;
        }
      }
    }

    throw new Error('Unknown error during Gemini action extraction.');
  }

  /**
   * Cleans HTML tags from text and normalizes whitespace.
   */
  private static cleanHtml(text: string): string {
    return text
      .replace(/<[^>]*>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  /**
   * Generates a text embedding for an email (subject + body) and saves it to the database.
   * If running under PostgreSQL, uses raw SQL to cast to pgvector.
   * If running under SQLite, stores the embedding as a JSON stringified array.
   */
  public static async embedEmail(emailId: string): Promise<number[]> {
    const email = await prisma.email.findUnique({
      where: { id: emailId },
    });

    if (!email) {
      throw new Error(`Email with ID ${emailId} not found in database.`);
    }

    const subject = email.subject || '';
    const body = email.body || '';
    if (!body.trim()) {
      console.warn(
        `[AIService] Skipping embedding for email ${emailId} because body is empty.`
      );
      return [];
    }

    const textToEmbed = this.cleanHtml(`${subject}\n\n${body}`);

    const provider = process.env.AI_PROVIDER || 'gemini';
    let embedding: number[] = [];

    if (provider === 'gemini') {
      embedding = await this.generateEmbeddingWithGemini(textToEmbed);
    } else if (provider === 'ollama') {
      try {
        embedding = await OllamaProvider.generateEmbedding(textToEmbed);
      } catch (error) {
        console.warn(
          `[AIService] Ollama embedding generation failed or unreachable. Falling back to OpenAI. Error:`,
          error
        );
        embedding = await this.generateEmbeddingWithOpenAI(textToEmbed);
      }
    } else {
      embedding = await this.generateEmbeddingWithOpenAI(textToEmbed);
    }

    const isPostgres =
      process.env.DATABASE_URL?.startsWith('postgresql') ||
      process.env.DATABASE_URL?.startsWith('postgres');

    if (isPostgres) {
      const embeddingString = `[${embedding.join(',')}]`;
      await prisma.$executeRawUnsafe(
        `UPDATE "Email" SET embedding = $1::vector WHERE id = $2`,
        embeddingString,
        emailId
      );
    } else {
      await prisma.$executeRawUnsafe(
        `UPDATE "Email" SET embedding = $1 WHERE id = $2`,
        JSON.stringify(embedding),
        emailId
      );
    }

    return embedding;
  }

  private static async generateEmbeddingWithOpenAI(
    text: string
  ): Promise<number[]> {
    const openai = this.getOpenAI();
    const maxAttempts = 5;
    let attempt = 0;
    let delay = 1000;

    while (attempt < maxAttempts) {
      try {
        const response = await openai.embeddings.create({
          model: 'text-embedding-3-small',
          input: text,
        });

        const embedding = response.data[0]?.embedding;
        if (!embedding || embedding.length === 0) {
          throw new Error('OpenAI returned an empty embedding.');
        }

        return embedding;
      } catch (error: any) {
        attempt++;
        const isRateLimit =
          error.status === 429 ||
          (error.message && error.message.includes('429'));

        if (isRateLimit && attempt < maxAttempts) {
          console.warn(
            `[AIService] OpenAI embedding rate limit hit (429). Retrying in ${delay}ms... (Attempt ${attempt}/${maxAttempts})`
          );
          await new Promise((resolve) => setTimeout(resolve, delay));
          delay *= 2;
        } else {
          console.error(
            `[AIService] OpenAI embedding failed on attempt ${attempt}:`,
            error
          );
          if (attempt >= maxAttempts) {
            throw new Error(
              `Failed to generate OpenAI embedding after ${maxAttempts} attempts: ${error.message || error}`
            );
          }
          throw error;
        }
      }
    }

    throw new Error('Unknown error during OpenAI embedding generation.');
  }

  private static async generateEmbeddingWithGemini(
    text: string
  ): Promise<number[]> {
    const ai = this.getGemini();
    const maxAttempts = 5;
    let attempt = 0;
    let delay = 1000;

    while (attempt < maxAttempts) {
      try {
        const response = await ai.models.embedContent({
          model: 'gemini-embedding-001',
          contents: text,
        });

        const embedding = response.embeddings?.[0]?.values;
        if (!embedding || embedding.length === 0) {
          throw new Error('Gemini returned an empty embedding.');
        }

        return embedding;
      } catch (error: any) {
        attempt++;
        const isRateLimit =
          error.status === 429 ||
          (error.message &&
            (error.message.includes('429') ||
              error.message.includes('ResourceExhausted') ||
              error.message.includes('Quota exceeded') ||
              error.message.includes('quota')));

        if (isRateLimit && attempt < maxAttempts) {
          console.warn(
            `[AIService] Gemini embedding rate limit hit (429/ResourceExhausted). Retrying in ${delay}ms... (Attempt ${attempt}/${maxAttempts})`
          );
          await new Promise((resolve) => setTimeout(resolve, delay));
          delay *= 2;
        } else {
          console.error(
            `[AIService] Gemini embedding failed on attempt ${attempt}:`,
            error
          );
          if (attempt >= maxAttempts) {
            throw new Error(
              `Failed to generate Gemini embedding after ${maxAttempts} attempts: ${error.message || error}`
            );
          }
          throw error;
        }
      }
    }

    throw new Error('Unknown error during Gemini embedding generation.');
  }

  /**
   * Search for past emails similar to the search query.
   * If running under PostgreSQL, uses raw SQL native pgvector cosine similarity.
   * If running under SQLite, retrieves all embedded emails and calculates similarity in-memory.
   */
  public static async searchSimilarEmails(
    query: string,
    limit: number = 5,
    userId?: string
  ): Promise<any[]> {
    const provider = process.env.AI_PROVIDER || 'gemini';
    let queryEmbedding: number[] = [];

    if (provider === 'gemini') {
      queryEmbedding = await this.generateEmbeddingWithGemini(query);
    } else if (provider === 'ollama') {
      try {
        queryEmbedding = await OllamaProvider.generateEmbedding(query);
      } catch (error) {
        console.warn(
          `[AIService] Ollama embedding query generation failed or unreachable. Falling back to OpenAI. Error:`,
          error
        );
        queryEmbedding = await this.generateEmbeddingWithOpenAI(query);
      }
    } else {
      queryEmbedding = await this.generateEmbeddingWithOpenAI(query);
    }

    const isPostgres =
      process.env.DATABASE_URL?.startsWith('postgresql') ||
      process.env.DATABASE_URL?.startsWith('postgres');

    if (isPostgres) {
      const embeddingString = `[${queryEmbedding.join(',')}]`;
      let results: any[];
      if (userId) {
        results = (await prisma.$queryRawUnsafe(
          `SELECT id, "messageId", sender, recipient, subject, body, status, category, "createdAt", "userId", "threadId",
                  (1 - (embedding <=> $1::vector)) as similarity
           FROM "Email"
           WHERE embedding IS NOT NULL AND "userId" = $2
           ORDER BY embedding <=> $1::vector ASC
           LIMIT $3`,
          embeddingString,
          userId,
          limit
        )) as any[];
      } else {
        results = (await prisma.$queryRawUnsafe(
          `SELECT id, "messageId", sender, recipient, subject, body, status, category, "createdAt", "userId", "threadId",
                  (1 - (embedding <=> $1::vector)) as similarity
           FROM "Email"
           WHERE embedding IS NOT NULL
           ORDER BY embedding <=> $1::vector ASC
           LIMIT $2`,
          embeddingString,
          limit
        )) as any[];
      }
      return results;
    } else {
      let emails: any[];
      if (userId) {
        emails = await prisma.$queryRawUnsafe<any[]>(
          `SELECT * FROM "Email" WHERE embedding IS NOT NULL AND "userId" = $1`,
          userId
        );
      } else {
        emails = await prisma.$queryRawUnsafe<any[]>(
          `SELECT * FROM "Email" WHERE embedding IS NOT NULL`
        );
      }

      const results = emails
        .map((email: any) => {
          let dbEmbedding: number[] = [];
          try {
            dbEmbedding = JSON.parse(email.embedding!) as number[];
          } catch (e) {
            console.error(
              `Failed to parse embedding for email ${email.id}:`,
              e
            );
          }

          const similarity = this.cosineSimilarity(queryEmbedding, dbEmbedding);
          return {
            ...email,
            similarity,
          };
        })
        .sort((a: any, b: any) => b.similarity - a.similarity)
        .slice(0, limit);

      return results;
    }
  }

  private static cosineSimilarity(a: number[], b: number[]): number {
    if (a.length === 0 || b.length === 0 || a.length !== b.length) {
      return 0;
    }
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;
    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }
    if (normA === 0 || normB === 0) {
      return 0;
    }
    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  }

  /**
   * Generate a text reply or completion from AI given a prompt.
   * Used by email reply generation, expense extraction, and digest generation.
   */
  public static async generateReply(prompt: string): Promise<string> {
    const provider = process.env.AI_PROVIDER || 'gemini';

    try {
      if (provider === 'gemini') {
        const gemini = this.getGemini();
        const response = await gemini.models.generateContent({
          model: 'gemini-1.5-flash',
          contents: [{ role: 'user', parts: [{ text: prompt }] }],
        });
        return response.text || '';
      } else if (provider === 'ollama') {
        try {
          return await OllamaProvider.generate(prompt);
        } catch (error) {
          console.warn(
            `[AIService] Ollama generateReply failed or unreachable. Falling back to OpenAI. Error:`,
            error
          );
          const openai = this.getOpenAI();
          const response = await openai.chat.completions.create({
            model: 'gpt-4o-mini',
            messages: [{ role: 'user', content: prompt }],
            max_tokens: 1500,
            temperature: 0.7,
          });
          return response.choices[0]?.message?.content || '';
        }
      } else {
        const openai = this.getOpenAI();
        const response = await openai.chat.completions.create({
          model: 'gpt-4o-mini',
          messages: [{ role: 'user', content: prompt }],
          max_tokens: 1500,
          temperature: 0.7,
        });
        return response.choices[0]?.message?.content || '';
      }
    } catch (err: any) {
      throw new Error(`AI generateReply failed: ${err.message}`);
    }
  }

  /**
   * Categorizes a link's purpose using LLM (OpenAI, Gemini, or Ollama)
   */
  public static async categorizeLink(
    href: string,
    text: string
  ): Promise<string> {
    const provider = process.env.AI_PROVIDER || 'gemini';
    const systemPrompt = `You are a link classification assistant. Categorize the given link (based on URL and anchor text) into one of the following categories:
- unsubscribe
- confirm
- download
- meeting
- payment
- other

Provide the result as a JSON object with a single field 'category'.`;
    const userPrompt = `URL: ${href}\nAnchor Text: ${text}`;

    try {
      if (provider === 'gemini') {
        const gemini = this.getGemini();
        const response = await gemini.models.generateContent({
          model: 'gemini-2.5-flash',
          contents: userPrompt,
          config: {
            systemInstruction: systemPrompt,
            responseMimeType: 'application/json',
            responseSchema: {
              type: 'OBJECT',
              properties: {
                category: {
                  type: 'STRING',
                  enum: [
                    'unsubscribe',
                    'confirm',
                    'download',
                    'meeting',
                    'payment',
                    'other',
                  ],
                },
              },
              required: ['category'],
            },
          },
        });
        const parsed = JSON.parse(response.text || '{}');
        return parsed.category || 'other';
      } else if (provider === 'ollama') {
        try {
          return await OllamaProvider.categorizeLink(href, text);
        } catch (error) {
          console.warn(
            `[AIService] Ollama link categorization failed or unreachable. Falling back to OpenAI. Error:`,
            error
          );
          return await this.categorizeLinkWithOpenAI(systemPrompt, userPrompt);
        }
      } else if (provider === 'mock') {
        const lowerHref = href.toLowerCase();
        if (
          lowerHref.includes('zoom.us') ||
          lowerHref.includes('meet.google.com')
        ) {
          return 'meeting';
        }
        return 'other';
      } else {
        return await this.categorizeLinkWithOpenAI(systemPrompt, userPrompt);
      }
    } catch (err: any) {
      console.warn(
        `[AIService] Link categorization fallback to 'other' due to error:`,
        err.message
      );
      return 'other';
    }
  }

  private static async categorizeLinkWithOpenAI(
    systemPrompt: string,
    userPrompt: string
  ): Promise<string> {
    const openai = this.getOpenAI();
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      response_format: {
        type: 'json_schema',
        json_schema: {
          name: 'link_categorization',
          strict: true,
          schema: {
            type: 'object',
            properties: {
              category: {
                type: 'string',
                enum: [
                  'unsubscribe',
                  'confirm',
                  'download',
                  'meeting',
                  'payment',
                  'other',
                ],
              },
            },
            required: ['category'],
            additionalProperties: false,
          },
        },
      },
    });
    const parsed = JSON.parse(response.choices[0]?.message?.content || '{}');
    return parsed.category || 'other';
  }

  /**
   * Extracts explicit deadline dates/times from an email subject and body.
   * Returns an array of ISO 8601 strings (UTC). Returns empty array if none found.
   */
  public static async extractDeadlines(
    subject: string,
    body: string
  ): Promise<string[]> {
    const provider = process.env.AI_PROVIDER || 'gemini';
    if (provider === 'gemini') {
      return this.extractDeadlinesWithGemini(subject, body);
    } else {
      return this.extractDeadlinesWithOpenAI(subject, body);
    }
  }

  private static async extractDeadlinesWithOpenAI(
    subject: string,
    body: string
  ): Promise<string[]> {
    const openai = this.getOpenAI();

    const systemPrompt = `You are an expert at extracting deadlines from emails.
Extract ALL explicit deadline dates and times mentioned in the email subject or body.
Convert them to ISO 8601 format in UTC (e.g. "2026-07-10T04:59:00.000Z").
If a timezone is mentioned (e.g. "EST", "PST", "IST"), convert to UTC correctly.
"EST" = UTC-5, "EDT" = UTC-4, "PST" = UTC-8, "PDT" = UTC-7, "IST" = UTC+5:30.
If no explicit deadline is present, return an empty array.
Do NOT infer or fabricate deadlines. Only return dates explicitly stated.`;

    const userPrompt = `Subject: ${subject}\nBody:\n${body}`;
    const maxAttempts = 5;
    let attempt = 0;
    let delay = 1000;

    while (attempt < maxAttempts) {
      try {
        const response = await openai.chat.completions.create({
          model: 'gpt-4o-mini',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt },
          ],
          response_format: {
            type: 'json_schema',
            json_schema: {
              name: 'deadline_extraction',
              strict: true,
              schema: {
                type: 'object',
                properties: {
                  deadlines: {
                    type: 'array',
                    items: { type: 'string' },
                    description: 'ISO 8601 UTC datetime strings',
                  },
                },
                required: ['deadlines'],
                additionalProperties: false,
              },
            },
          },
        });

        const rawContent = response.choices[0]?.message?.content;
        if (!rawContent) {
          throw new Error('OpenAI returned an empty deadline extraction response.');
        }
        const result = JSON.parse(rawContent) as { deadlines: string[] };
        return result.deadlines || [];
      } catch (error: any) {
        attempt++;
        const isRateLimit =
          error.status === 429 ||
          (error.message && error.message.includes('429'));
        if (isRateLimit && attempt < maxAttempts) {
          console.warn(
            `[AIService] OpenAI Rate limit hit during deadline extraction. Retrying in ${delay}ms...`
          );
          await new Promise((resolve) => setTimeout(resolve, delay));
          delay *= 2;
        } else {
          console.error('[AIService] Deadline extraction (OpenAI) failed:', error);
          if (attempt >= maxAttempts) return [];
          throw error;
        }
      }
    }
    return [];
  }

  private static async extractDeadlinesWithGemini(
    subject: string,
    body: string
  ): Promise<string[]> {
    const ai = this.getGemini();

    const systemInstruction = `You are an expert at extracting deadlines from emails.
Extract ALL explicit deadline dates and times mentioned in the email subject or body.
Convert them to ISO 8601 format in UTC (e.g. "2026-07-10T04:59:00.000Z").
If a timezone is mentioned (e.g. "EST", "PST", "IST"), convert to UTC correctly.
"EST" = UTC-5, "EDT" = UTC-4, "PST" = UTC-8, "PDT" = UTC-7, "IST" = UTC+5:30.
If no explicit deadline is present, return an empty array.
Do NOT infer or fabricate deadlines. Only return dates explicitly stated.`;

    const userContent = `Subject: ${subject}\nBody:\n${body}`;
    const maxAttempts = 5;
    let attempt = 0;
    let delay = 1000;

    while (attempt < maxAttempts) {
      try {
        const response = await ai.models.generateContent({
          model: 'gemini-2.5-flash',
          contents: userContent,
          config: {
            systemInstruction,
            responseMimeType: 'application/json',
            responseSchema: {
              type: 'OBJECT',
              properties: {
                deadlines: {
                  type: 'ARRAY',
                  items: { type: 'STRING' },
                },
              },
              required: ['deadlines'],
            },
          },
        });

        const rawContent = response.text;
        if (!rawContent) {
          throw new Error('Gemini returned an empty deadline extraction response.');
        }
        const result = JSON.parse(rawContent) as { deadlines: string[] };
        return result.deadlines || [];
      } catch (error: any) {
        attempt++;
        const isRateLimit =
          error.status === 429 ||
          (error.message &&
            (error.message.includes('429') ||
              error.message.includes('ResourceExhausted') ||
              error.message.includes('quota')));
        if (isRateLimit && attempt < maxAttempts) {
          console.warn(
            `[AIService] Gemini Rate limit hit during deadline extraction. Retrying in ${delay}ms...`
          );
          await new Promise((resolve) => setTimeout(resolve, delay));
          delay *= 2;
        } else {
          console.error('[AIService] Deadline extraction (Gemini) failed:', error);
          if (attempt >= maxAttempts) return [];
          throw error;
        }
      }
    }
    return [];
  }
}
