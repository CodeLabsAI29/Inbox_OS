import OpenAI from 'openai';
import { GoogleGenAI } from '@google/genai';
// @ts-ignore
import { PrismaClient } from '@prisma/client';
import * as dotenv from 'dotenv';
import * as path from 'path';
import { KeywordFilter } from './KeywordFilter';

// Load environment variables from the shared configuration directory
dotenv.config({ path: path.resolve(__dirname, '../../../config/env/.env') });

const prisma = new PrismaClient();

export type EmailCategory = 'urgent' | 'finance' | 'job' | 'otp' | 'meeting' | 'newsletter' | 'academic' | 'personal' | 'work' | 'spam';

export interface ClassificationResult {
  category: EmailCategory;
  confidence: number;
}

export class AIService {
  private static openaiInstance: OpenAI | null = null;
  private static geminiInstance: GoogleGenAI | null = null;

  private static getOpenAI(): OpenAI {
    if (!this.openaiInstance) {
      const apiKey = process.env.OPENAI_API_KEY;
      if (!apiKey || apiKey === 'sk-...') {
        throw new Error('OPENAI_API_KEY is not defined or is set to placeholder in environment configuration.');
      }
      this.openaiInstance = new OpenAI({ apiKey });
    }
    return this.openaiInstance;
  }

  private static getGemini(): GoogleGenAI {
    if (!this.geminiInstance) {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        throw new Error('GEMINI_API_KEY is not defined in environment configuration.');
      }
      this.geminiInstance = new GoogleGenAI({ apiKey });
    }
    return this.geminiInstance;
  }

  /**
   * Classifies an email's subject and body using the active provider model.
   * Leverages Structured Outputs (JSON Schema) and exponential backoff retry for rate limits.
   */
  public static async classifyEmail(subject: string, body: string): Promise<ClassificationResult> {
    // 1. Try fast heuristic filter first to save cost and reduce latency
    const heuristicCategory = KeywordFilter.classify(body);
    if (heuristicCategory) {
      return {
        category: heuristicCategory,
        confidence: 1.0,
      };
    }

    const provider = process.env.AI_PROVIDER || 'openai';

    if (provider === 'gemini') {
      return this.classifyWithGemini(subject, body);
    } else {
      return this.classifyWithOpenAI(subject, body);
    }
  }

  private static async classifyWithOpenAI(subject: string, body: string): Promise<ClassificationResult> {
    const openai = this.getOpenAI();

    const systemPrompt = `You are an expert AI email classification assistant. Your task is to analyze the email's subject line and body text, and classify it into exactly one of the following categories:
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

Provide a confidence score between 0.0 and 1.0.`;

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
                    enum: ['urgent', 'finance', 'job', 'otp', 'meeting', 'newsletter', 'academic', 'personal', 'work', 'spam'],
                  },
                  confidence: {
                    type: 'number',
                  },
                },
                required: ['category', 'confidence'],
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
        const isRateLimit = error.status === 429 || (error.message && error.message.includes('429'));
        
        if (isRateLimit && attempt < maxAttempts) {
          console.warn(
            `[AIService] OpenAI Rate limit hit (429). Retrying in ${delay}ms... (Attempt ${attempt}/${maxAttempts})`
          );
          await new Promise((resolve) => setTimeout(resolve, delay));
          delay *= 2;
        } else {
          console.error(`[AIService] OpenAI classification failed on attempt ${attempt}:`, error);
          if (attempt >= maxAttempts) {
            throw new Error(`Failed to classify email via OpenAI after ${maxAttempts} attempts: ${error.message || error}`);
          }
          throw error;
        }
      }
    }

    throw new Error('Unknown error during OpenAI email classification.');
  }

  private static async classifyWithGemini(subject: string, body: string): Promise<ClassificationResult> {
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

Provide a confidence score between 0.0 and 1.0.`;

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
                  enum: ['urgent', 'finance', 'job', 'otp', 'meeting', 'newsletter', 'academic', 'personal', 'work', 'spam'],
                },
                confidence: {
                  type: 'NUMBER',
                },
              },
              required: ['category', 'confidence'],
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
          (error.message && (error.message.includes('429') || error.message.includes('ResourceExhausted') || error.message.includes('Quota exceeded') || error.message.includes('quota')));

        if (isRateLimit && attempt < maxAttempts) {
          console.warn(
            `[AIService] Gemini Rate limit hit (429/ResourceExhausted). Retrying in ${delay}ms... (Attempt ${attempt}/${maxAttempts})`
          );
          await new Promise((resolve) => setTimeout(resolve, delay));
          delay *= 2;
        } else {
          console.error(`[AIService] Gemini classification failed on attempt ${attempt}:`, error);
          if (attempt >= maxAttempts) {
            throw new Error(`Failed to classify email via Gemini after ${maxAttempts} attempts: ${error.message || error}`);
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
    const concatenatedBodies = emails.map((email: any) => email.body).join('\n\n');

    // 3. Truncate the concatenated string to a maximum of 8000 tokens (approx 32,000 characters)
    const truncatedText = this.truncateToTokens(concatenatedBodies, 8000);

    // 4. Prompt the LLM depending on active provider
    const provider = process.env.AI_PROVIDER || 'openai';
    let summary = '';

    if (provider === 'gemini') {
      summary = await this.summarizeWithGemini(truncatedText);
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

  private static async summarizeWithOpenAI(threadContent: string): Promise<string> {
    const openai = this.getOpenAI();
    const systemPrompt = 'Summarize the following email thread in 2-3 sentences. Focus on the main outcome or required action.';

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
        const isRateLimit = error.status === 429 || (error.message && error.message.includes('429'));

        if (isRateLimit && attempt < maxAttempts) {
          console.warn(
            `[AIService] OpenAI Rate limit hit (429). Retrying in ${delay}ms... (Attempt ${attempt}/${maxAttempts})`
          );
          await new Promise((resolve) => setTimeout(resolve, delay));
          delay *= 2;
        } else {
          console.error(`[AIService] OpenAI summarization failed on attempt ${attempt}:`, error);
          if (attempt >= maxAttempts) {
            throw new Error(`Failed to summarize thread via OpenAI after ${maxAttempts} attempts: ${error.message || error}`);
          }
          throw error;
        }
      }
    }

    throw new Error('Unknown error during OpenAI thread summarization.');
  }

  private static async summarizeWithGemini(threadContent: string): Promise<string> {
    const ai = this.getGemini();
    const systemInstruction = 'Summarize the following email thread in 2-3 sentences. Focus on the main outcome or required action.';

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
          (error.message && (error.message.includes('429') || error.message.includes('ResourceExhausted') || error.message.includes('Quota exceeded') || error.message.includes('quota')));

        if (isRateLimit && attempt < maxAttempts) {
          console.warn(
            `[AIService] Gemini Rate limit hit (429/ResourceExhausted). Retrying in ${delay}ms... (Attempt ${attempt}/${maxAttempts})`
          );
          await new Promise((resolve) => setTimeout(resolve, delay));
          delay *= 2;
        } else {
          console.error(`[AIService] Gemini summarization failed on attempt ${attempt}:`, error);
          if (attempt >= maxAttempts) {
            throw new Error(`Failed to summarize thread via Gemini after ${maxAttempts} attempts: ${error.message || error}`);
          }
          throw error;
        }
      }
    }

    throw new Error('Unknown error during Gemini thread summarization.');
  }

  /**
   * Extracts explicit, concrete tasks from an email subject and body.
   * Only returns actionable tasks requested in the email. Returns an empty array if none found.
   */
  public static async extractActions(subject: string, body: string): Promise<string[]> {
    const provider = process.env.AI_PROVIDER || 'openai';

    if (provider === 'gemini') {
      return this.extractActionsWithGemini(subject, body);
    } else {
      return this.extractActionsWithOpenAI(subject, body);
    }
  }

  private static async extractActionsWithOpenAI(subject: string, body: string): Promise<string[]> {
    const openai = this.getOpenAI();

    const systemPrompt = `You are an expert AI email task extraction assistant. Your job is to analyze the email subject line and body text, and extract all explicit, concrete tasks (e.g., 'Send the report by Friday') mentioned.
Do not infer, assume, or fabricate tasks that are not explicitly and concretely requested.
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
                  actions: {
                    type: 'array',
                    items: {
                      type: 'string',
                    },
                  },
                },
                required: ['actions'],
                additionalProperties: false,
              },
            },
          },
        });

        const rawContent = response.choices[0]?.message?.content;
        if (!rawContent) {
          throw new Error('OpenAI returned an empty action extraction response.');
        }

        const result = JSON.parse(rawContent) as { actions: string[] };
        return result.actions || [];

      } catch (error: any) {
        attempt++;
        const isRateLimit = error.status === 429 || (error.message && error.message.includes('429'));

        if (isRateLimit && attempt < maxAttempts) {
          console.warn(
            `[AIService] OpenAI Rate limit hit (429) during action extraction. Retrying in ${delay}ms... (Attempt ${attempt}/${maxAttempts})`
          );
          await new Promise((resolve) => setTimeout(resolve, delay));
          delay *= 2;
        } else {
          console.error(`[AIService] OpenAI action extraction failed on attempt ${attempt}:`, error);
          if (attempt >= maxAttempts) {
            throw new Error(`Failed to extract actions via OpenAI after ${maxAttempts} attempts: ${error.message || error}`);
          }
          throw error;
        }
      }
    }

    throw new Error('Unknown error during OpenAI action extraction.');
  }

  private static async extractActionsWithGemini(subject: string, body: string): Promise<string[]> {
    const ai = this.getGemini();

    const systemInstruction = `You are an expert AI email task extraction assistant. Your job is to analyze the email subject line and body text, and extract all explicit, concrete tasks (e.g., 'Send the report by Friday') mentioned.
Do not infer, assume, or fabricate tasks that are not explicitly and concretely requested.
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
                actions: {
                  type: 'ARRAY',
                  items: {
                    type: 'STRING',
                  },
                },
              },
              required: ['actions'],
            },
          },
        });

        const rawContent = response.text;
        if (!rawContent) {
          throw new Error('Gemini returned an empty action extraction response.');
        }

        const result = JSON.parse(rawContent) as { actions: string[] };
        return result.actions || [];

      } catch (error: any) {
        attempt++;
        const isRateLimit =
          error.status === 429 ||
          (error.message && (error.message.includes('429') || error.message.includes('ResourceExhausted') || error.message.includes('Quota exceeded') || error.message.includes('quota')));

        if (isRateLimit && attempt < maxAttempts) {
          console.warn(
            `[AIService] Gemini Rate limit hit (429/ResourceExhausted) during action extraction. Retrying in ${delay}ms... (Attempt ${attempt}/${maxAttempts})`
          );
          await new Promise((resolve) => setTimeout(resolve, delay));
          delay *= 2;
        } else {
          console.error(`[AIService] Gemini action extraction failed on attempt ${attempt}:`, error);
          if (attempt >= maxAttempts) {
            throw new Error(`Failed to extract actions via Gemini after ${maxAttempts} attempts: ${error.message || error}`);
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
    const textToEmbed = this.cleanHtml(`${subject}\n\n${body}`);

    const provider = process.env.AI_PROVIDER || 'openai';
    let embedding: number[] = [];

    if (provider === 'gemini') {
      embedding = await this.generateEmbeddingWithGemini(textToEmbed);
    } else {
      embedding = await this.generateEmbeddingWithOpenAI(textToEmbed);
    }

    const isPostgres = process.env.DATABASE_URL?.startsWith('postgresql') || process.env.DATABASE_URL?.startsWith('postgres');

    if (isPostgres) {
      const embeddingString = `[${embedding.join(',')}]`;
      await prisma.$executeRawUnsafe(
        `UPDATE "Email" SET embedding = $1::vector WHERE id = $2`,
        embeddingString,
        emailId
      );
    } else {
      await prisma.email.update({
        where: { id: emailId },
        data: {
          embedding: JSON.stringify(embedding),
        },
      });
    }

    return embedding;
  }

  private static async generateEmbeddingWithOpenAI(text: string): Promise<number[]> {
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
        const isRateLimit = error.status === 429 || (error.message && error.message.includes('429'));

        if (isRateLimit && attempt < maxAttempts) {
          console.warn(
            `[AIService] OpenAI embedding rate limit hit (429). Retrying in ${delay}ms... (Attempt ${attempt}/${maxAttempts})`
          );
          await new Promise((resolve) => setTimeout(resolve, delay));
          delay *= 2;
        } else {
          console.error(`[AIService] OpenAI embedding failed on attempt ${attempt}:`, error);
          if (attempt >= maxAttempts) {
            throw new Error(`Failed to generate OpenAI embedding after ${maxAttempts} attempts: ${error.message || error}`);
          }
          throw error;
        }
      }
    }

    throw new Error('Unknown error during OpenAI embedding generation.');
  }

  private static async generateEmbeddingWithGemini(text: string): Promise<number[]> {
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
          (error.message && (error.message.includes('429') || error.message.includes('ResourceExhausted') || error.message.includes('Quota exceeded') || error.message.includes('quota')));

        if (isRateLimit && attempt < maxAttempts) {
          console.warn(
            `[AIService] Gemini embedding rate limit hit (429/ResourceExhausted). Retrying in ${delay}ms... (Attempt ${attempt}/${maxAttempts})`
          );
          await new Promise((resolve) => setTimeout(resolve, delay));
          delay *= 2;
        } else {
          console.error(`[AIService] Gemini embedding failed on attempt ${attempt}:`, error);
          if (attempt >= maxAttempts) {
            throw new Error(`Failed to generate Gemini embedding after ${maxAttempts} attempts: ${error.message || error}`);
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
  public static async searchSimilarEmails(query: string, limit: number = 5): Promise<any[]> {
    const provider = process.env.AI_PROVIDER || 'openai';
    let queryEmbedding: number[] = [];

    if (provider === 'gemini') {
      queryEmbedding = await this.generateEmbeddingWithGemini(query);
    } else {
      queryEmbedding = await this.generateEmbeddingWithOpenAI(query);
    }

    const isPostgres = process.env.DATABASE_URL?.startsWith('postgresql') || process.env.DATABASE_URL?.startsWith('postgres');

    if (isPostgres) {
      const embeddingString = `[${queryEmbedding.join(',')}]`;
      const results = await prisma.$queryRawUnsafe<any[]>(
        `SELECT id, "messageId", sender, recipient, subject, body, status, category, "createdAt", "userId", "threadId",
                (1 - (embedding <=> $1::vector)) as similarity
         FROM "Email"
         WHERE embedding IS NOT NULL
         ORDER BY embedding <=> $1::vector ASC
         LIMIT $2`,
        embeddingString,
        limit
      );
      return results;
    } else {
      const emails = await prisma.email.findMany({
        where: {
          embedding: {
            not: null,
          },
        },
      });

      const results = emails
        .map((email: any) => {
          let dbEmbedding: number[] = [];
          try {
            dbEmbedding = JSON.parse(email.embedding!) as number[];
          } catch (e) {
            console.error(`Failed to parse embedding for email ${email.id}:`, e);
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
}


