import OpenAI from 'openai';
import { GoogleGenAI } from '@google/genai';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables from the shared configuration directory
dotenv.config({ path: path.resolve(__dirname, '../../../config/env/.env') });

export type EmailCategory = 'urgent' | 'newsletter' | 'personal' | 'work' | 'spam';

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
- newsletter: Weekly/daily digests, marketing updates, announcements, or blogs.
- personal: Direct communication from friends, family, or professional contacts.
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
                    enum: ['urgent', 'newsletter', 'personal', 'work', 'spam'],
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
- newsletter: Weekly/daily digests, marketing updates, announcements, or blogs.
- personal: Direct communication from friends, family, or professional contacts.
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
                  enum: ['urgent', 'newsletter', 'personal', 'work', 'spam'],
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
}
