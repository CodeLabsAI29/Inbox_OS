import axios from 'axios';
import { IncomingMessage } from 'http';
import { ClassificationResult, ActionItemResult } from '../ai.service';

export class OllamaProvider {
  private static getBaseUrl(): string {
    return process.env.OLLAMA_BASE_URL || 'http://localhost:11434';
  }

  private static getModel(): string {
    return process.env.OLLAMA_MODEL || 'llama3';
  }

  /**
   * Helper to make a post request to Ollama and accumulate stream.
   * Auto-pulls the model if it is missing (404 / not found errors).
   */
  private static async generate(prompt: string): Promise<string> {
    const baseUrl = this.getBaseUrl();
    const model = this.getModel();

    const makeRequest = async () => {
      return await axios.post(
        `${baseUrl}/api/generate`,
        {
          model,
          prompt,
          stream: true,
        },
        {
          responseType: 'stream',
        }
      );
    };

    try {
      const response = await makeRequest();
      return await this.accumulateStream(response.data as IncomingMessage);
    } catch (error: any) {
      // Check if it's a model not found error
      const errorMsg = error.response?.data?.error || error.message || '';
      const isModelMissing =
        error.response?.status === 404 ||
        errorMsg.toLowerCase().includes('not found') ||
        errorMsg.toLowerCase().includes('pull');

      if (isModelMissing) {
        console.warn(`[Ollama] Model '${model}' not found locally. Auto-pulling model from Ollama library...`);
        // Trigger pull request (stream: false to await completion)
        await axios.post(`${baseUrl}/api/pull`, {
          name: model,
          stream: false,
        });
        console.info(`[Ollama] Model '${model}' pulled successfully! Retrying original request...`);
        
        const retryResponse = await makeRequest();
        return await this.accumulateStream(retryResponse.data as IncomingMessage);
      }
      throw error;
    }
  }

  /**
   * Accumulate the Ollama streaming JSON response into a single string.
   */
  private static async accumulateStream(stream: IncomingMessage): Promise<string> {
    return new Promise((resolve, reject) => {
      let accumulatedText = '';
      stream.on('data', (chunk: Buffer) => {
        const textChunk = chunk.toString();
        // Ollama streams JSON lines: {"model":"llama3", "response":"...", "done":false}
        const lines = textChunk.split('\n');
        for (const line of lines) {
          if (line.trim()) {
            try {
              const json = JSON.parse(line);
              if (json.response) {
                accumulatedText += json.response;
              }
            } catch (e) {
              // Partial line chunk parsing failure is expected, skip
            }
          }
        }
      });
      stream.on('end', () => {
        resolve(accumulatedText);
      });
      stream.on('error', (err) => {
        reject(err);
      });
    });
  }

  /**
   * Extract JSON blocks from a text string using regex.
   */
  private static extractJson(text: string): any {
    // Try matching an object block {...}
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      try {
        return JSON.parse(jsonMatch[0]);
      } catch (e) {
        console.error(`[Ollama] Found JSON object block but failed to parse:`, e);
      }
    }

    // Try matching an array block [...]
    const arrayMatch = text.match(/\[[\s\S]*\]/);
    if (arrayMatch) {
      try {
        return JSON.parse(arrayMatch[0]);
      } catch (e) {
        console.error(`[Ollama] Found JSON array block but failed to parse:`, e);
      }
    }

    throw new Error(`[Ollama] Failed to extract any valid JSON block from output: "${text}"`);
  }

  /**
   * Classify email subject and body into category, confidence score, and deadlines.
   */
  public static async classify(subject: string, body: string): Promise<ClassificationResult> {
    const prompt = `You are an expert AI email classification assistant. Your task is to analyze the email's subject line and body text, and classify it into exactly one of the following categories:
- urgent: Requires immediate attention, system alerts, outages, or critical action.
- newsletter: Weekly/daily digests, marketing updates, announcements, or blogs.
- personal: Direct communication from friends, family, or professional contacts.
- work: Business operations, projects, corporate communications, or tasks.
- spam: Junk, unsolicited marketing, phishing, or bulk commercial email.

Also, extract all deadlines mentioned in the email body as ISO 8601 dates (e.g. '2026-07-15T23:59:00Z').

You MUST respond in JSON format matching this schema:
{
  "category": "urgent" | "newsletter" | "personal" | "work" | "spam",
  "confidence": 0.0 to 1.0,
  "deadlines": ["ISO-8601-date-string"]
}

Email subject: "${subject}"
Email body: "${body}"

Response JSON:`;

    const rawResponse = await this.generate(prompt);
    const parsed = this.extractJson(rawResponse);

    return {
      category: parsed.category || 'personal',
      confidence: typeof parsed.confidence === 'number' ? parsed.confidence : 0.5,
      deadlines: Array.isArray(parsed.deadlines) ? parsed.deadlines : [],
    };
  }

  /**
   * Extract action items with deadlines from subject and body.
   */
  public static async extractActionItems(subject: string, body: string): Promise<ActionItemResult[]> {
    const prompt = `You are an expert AI email task extraction assistant. Your job is to analyze the email subject line and body text, and extract all explicit, concrete tasks (e.g., 'Send the report by Friday') mentioned.
For each task, also extract any mentioned deadline as an ISO 8601 string (e.g., '2026-07-15T23:59:00Z'). If no deadline is mentioned, return an empty string for the deadline.
Do not infer, assume, or fabricate tasks or deadlines that are not explicitly and concretely requested.
If there are no explicit, concrete tasks, return an empty array for "actionItems".

You MUST respond in JSON format matching this schema:
{
  "actionItems": [
    {
      "taskDescription": "string",
      "deadline": "string"
    }
  ]
}

Email subject: "${subject}"
Email body: "${body}"

Response JSON:`;

    const rawResponse = await this.generate(prompt);
    const parsed = this.extractJson(rawResponse);

    if (!parsed.actionItems || !Array.isArray(parsed.actionItems)) {
      return [];
    }

    return parsed.actionItems.map((item: any) => ({
      taskDescription: item.taskDescription || '',
      deadline: item.deadline || null,
    }));
  }

  /**
   * Summarize email thread in 2-3 sentences.
   */
  public static async generateSummary(threadEmails: string[]): Promise<string> {
    const prompt = `Summarize the following email thread in 2-3 sentences. Focus on the main outcome or required action.

Email Thread content:
${threadEmails.join('\n\n')}

Summary:`;

    const rawResponse = await this.generate(prompt);
    return rawResponse.trim();
  }
}
