import { PrismaClient, Digest } from '@prisma/client';
import * as Handlebars from 'handlebars';
import { logger } from '../../utils/logger';
import { AIService } from '../ai.service';

const prisma = new PrismaClient();

export interface DigestEmailData {
  id: string;
  sender: string;
  subject: string;
  category: string;
  aiSummary: string;
  link: string;
}

export class DigestGeneratorService {
  private static emailTemplate = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Your InboxOS {{capitalize type}} Digest</title>
  <style>
    body {
      margin: 0;
      padding: 0;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      background-color: #0d0f1a;
      color: #e2e8f0;
      -webkit-font-smoothing: antialiased;
    }
    .wrapper {
      width: 100%;
      table-layout: fixed;
      background-color: #0d0f1a;
      padding: 24px 0;
    }
    .container {
      max-width: 600px;
      margin: 0 auto;
      background-color: rgba(255, 255, 255, 0.01);
      border: 1px solid rgba(255, 255, 255, 0.05);
      border-radius: 24px;
      padding: 32px 24px;
      box-shadow: 0 20px 40px rgba(0, 0, 0, 0.5);
    }
    .header {
      text-align: center;
      margin-bottom: 32px;
      border-bottom: 1px solid rgba(255, 255, 255, 0.05);
      padding-bottom: 24px;
    }
    .logo-container {
      display: inline-block;
      width: 44px;
      height: 44px;
      background: linear-gradient(135deg, #6366f1 0%, #a855f7 100%);
      border-radius: 12px;
      line-height: 44px;
      text-align: center;
      margin-bottom: 12px;
      box-shadow: 0 0 15px rgba(99, 102, 241, 0.4);
    }
    .logo {
      color: #ffffff;
      font-size: 22px;
      font-weight: bold;
    }
    .title {
      font-size: 20px;
      font-weight: 800;
      margin: 0;
      letter-spacing: -0.5px;
      background: linear-gradient(to right, #ffffff, #94a3b8);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
    }
    .subtitle {
      font-size: 12px;
      color: #6366f1;
      text-transform: uppercase;
      letter-spacing: 2px;
      font-weight: 700;
      margin-top: 6px;
    }
    .category-section {
      margin-bottom: 28px;
    }
    .category-badge {
      display: inline-block;
      font-size: 10px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 1px;
      padding: 4px 10px;
      border-radius: 6px;
      margin-bottom: 14px;
    }
    .badge-newsletter {
      background-color: rgba(99, 102, 241, 0.15);
      color: #818cf8;
      border: 1px solid rgba(99, 102, 241, 0.25);
    }
    .badge-promotional {
      background-color: rgba(236, 72, 153, 0.15);
      color: #f472b6;
      border: 1px solid rgba(236, 72, 153, 0.25);
    }
    .badge-social {
      background-color: rgba(20, 184, 166, 0.15);
      color: #2dd4bf;
      border: 1px solid rgba(20, 184, 166, 0.25);
    }
    .badge-general {
      background-color: rgba(148, 163, 184, 0.15);
      color: #cbd5e1;
      border: 1px solid rgba(148, 163, 184, 0.25);
    }
    .card {
      background-color: rgba(255, 255, 255, 0.02);
      border: 1px solid rgba(255, 255, 255, 0.05);
      border-radius: 16px;
      padding: 18px;
      margin-bottom: 12px;
      text-align: left;
    }
    .card-title {
      font-size: 13px;
      font-weight: 700;
      color: #ffffff;
      margin: 0 0 6px 0;
      line-height: 1.4;
    }
    .card-meta {
      font-size: 10px;
      color: #64748b;
      margin-bottom: 10px;
    }
    .card-body {
      font-size: 12px;
      color: #94a3b8;
      line-height: 1.6;
      margin: 0 0 14px 0;
    }
    .card-action {
      display: inline-block;
      font-size: 11px;
      font-weight: 700;
      color: #818cf8;
      text-decoration: none;
      transition: color 0.2s;
    }
    .card-action:hover {
      color: #a5b4fc;
    }
    .overflow-box {
      background: linear-gradient(135deg, rgba(99, 102, 241, 0.05) 0%, rgba(168, 85, 247, 0.05) 100%);
      border: 1px dashed rgba(99, 102, 241, 0.2);
      border-radius: 16px;
      padding: 16px;
      text-align: center;
      margin-top: 24px;
      font-size: 12px;
      color: #a5b4fc;
      font-weight: 600;
    }
    .footer {
      text-align: center;
      margin-top: 36px;
      border-top: 1px solid rgba(255, 255, 255, 0.05);
      padding-top: 24px;
      font-size: 11px;
      color: #475569;
      line-height: 1.8;
    }
    .footer a {
      color: #64748b;
      text-decoration: underline;
    }
    .empty-state {
      text-align: center;
      padding: 40px 20px;
    }
    .empty-state-icon {
      font-size: 40px;
      margin-bottom: 16px;
    }
    .empty-state-title {
      font-size: 16px;
      font-weight: 700;
      color: #ffffff;
      margin-bottom: 8px;
    }
    .empty-state-desc {
      font-size: 12px;
      color: #64748b;
      max-width: 320px;
      margin: 0 auto;
      line-height: 1.6;
    }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="container">
      <div class="header">
        <div class="logo-container">
          <span class="logo">⚡</span>
        </div>
        <h2 class="title">InboxOS Smart Digest</h2>
        <div class="subtitle">{{type}} compilation</div>
      </div>

      {{#if isEmpty}}
        <div class="empty-state">
          <div class="empty-state-icon">✨</div>
          <div class="empty-state-title">Inbox is Clean!</div>
          <div class="empty-state-desc">No low-priority newsletters, promotional, or social updates were received during this period.</div>
        </div>
      {{else}}
        {{#if groupedEmails.newsletters}}
          <div class="category-section">
            <span class="category-badge badge-newsletter">Newsletters</span>
            {{#each groupedEmails.newsletters}}
              <div class="card">
                <h4 class="card-title">{{subject}}</h4>
                <div class="card-meta">From: {{sender}}</div>
                <p class="card-body">{{aiSummary}}</p>
                <a href="{{link}}" target="_blank" class="card-action">View Full Email &rarr;</a>
              </div>
            {{/each}}
          </div>
        {{/if}}

        {{#if groupedEmails.promotional}}
          <div class="category-section">
            <span class="category-badge badge-promotional">Promotional</span>
            {{#each groupedEmails.promotional}}
              <div class="card">
                <h4 class="card-title">{{subject}}</h4>
                <div class="card-meta">From: {{sender}}</div>
                <p class="card-body">{{aiSummary}}</p>
                <a href="{{link}}" target="_blank" class="card-action">View Details &rarr;</a>
              </div>
            {{/each}}
          </div>
        {{/if}}

        {{#if groupedEmails.social}}
          <div class="category-section">
            <span class="category-badge badge-social">Social Updates</span>
            {{#each groupedEmails.social}}
              <div class="card">
                <h4 class="card-title">{{subject}}</h4>
                <div class="card-meta">From: {{sender}}</div>
                <p class="card-body">{{aiSummary}}</p>
                <a href="{{link}}" target="_blank" class="card-action">Open Thread &rarr;</a>
              </div>
            {{/each}}
          </div>
        {{/if}}

        {{#if groupedEmails.general}}
          <div class="category-section">
            <span class="category-badge badge-general">Low Priority Updates</span>
            {{#each groupedEmails.general}}
              <div class="card">
                <h4 class="card-title">{{subject}}</h4>
                <div class="card-meta">From: {{sender}}</div>
                <p class="card-body">{{aiSummary}}</p>
                <a href="{{link}}" target="_blank" class="card-action">View Email &rarr;</a>
              </div>
            {{/each}}
          </div>
        {{/if}}

        {{#if overflowCount}}
          <div class="overflow-box">
            +{{overflowCount}} more updates compiled in your dashboard
          </div>
        {{/if}}
      {{/if}}

      <div class="footer">
        This digest was compiled automatically by <a href="http://localhost:5173" target="_blank">InboxOS</a>.<br>
        Manage subscriptions or unsubscribe: 
        <a href="http://localhost:5173/dashboard/settings?tab=digests" target="_blank">Manage Digest Settings</a>
        {{#unless isEmpty}}
          <br>
          Unsubscribe from: 
          {{#if groupedEmails.newsletters}}<a href="http://localhost:8000/api/digests/unsubscribe?category=newsletter" target="_blank">Newsletters</a>{{/if}}
          {{#if groupedEmails.promotional}} | <a href="http://localhost:8000/api/digests/unsubscribe?category=promotional" target="_blank">Promotional</a>{{/if}}
          {{#if groupedEmails.social}} | <a href="http://localhost:8000/api/digests/unsubscribe?category=social" target="_blank">Social</a>{{/if}}
        {{/unless}}
      </div>
    </div>
  </div>
</body>
</html>
  `;

  static {
    // Register Handlebars helpers
    Handlebars.registerHelper('capitalize', (str: string) => {
      if (!str) return '';
      return str.charAt(0).toUpperCase() + str.slice(1);
    });
  }

  /**
   * Generates a daily or weekly email digest for a user.
   */
  public static async generateDigest(
    userId: string,
    type: 'daily' | 'weekly'
  ): Promise<Digest> {
    logger.info(
      `[DigestGenerator] Generating ${type} digest for user: ${userId}`
    );

    // Define time boundary
    const since = new Date();
    if (type === 'daily') {
      since.setHours(since.getHours() - 24);
    } else {
      since.setDate(since.getDate() - 7);
    }

    // Query for qualifying low-priority, undigested emails
    const emails = await prisma.email.findMany({
      where: {
        userId,
        createdAt: { gte: since },
        digestId: null,
        OR: [
          { category: { in: ['newsletter', 'promotional', 'social'] } },
          {
            analysis: {
              priorityScore: { lt: 40 },
            },
          },
        ],
      },
      include: {
        analysis: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    const totalCount = emails.length;
    logger.info(
      `[DigestGenerator] Found ${totalCount} qualifying emails for ${type} digest.`
    );

    // Cap at 20 emails
    const digestEmails = emails.slice(0, 20);
    const overflowCount = totalCount > 20 ? totalCount - 20 : 0;

    // Group emails by category
    const groupedEmails: Record<string, DigestEmailData[]> = {
      newsletters: [],
      promotional: [],
      social: [],
      general: [],
    };

    const emailIds: string[] = [];

    for (const email of digestEmails) {
      emailIds.push(email.id);

      // Determine category grouping
      let group = 'general';
      const cat = (email.category || '').toLowerCase();
      if (cat === 'newsletter') group = 'newsletters';
      else if (cat === 'promotional') group = 'promotional';
      else if (cat === 'social') group = 'social';

      // Fallback summary
      let summary = email.analysis?.summary || '';
      if (!summary) {
        summary =
          email.body.substring(0, 150) + (email.body.length > 150 ? '...' : '');
      }

      groupedEmails[group].push({
        id: email.id,
        sender: email.sender,
        subject: email.subject,
        category: email.category || 'general',
        aiSummary: summary,
        link: `http://localhost:5173/dashboard?emailId=${email.id}`,
      });
    }

    // Compile template
    const template = Handlebars.compile(this.emailTemplate);
    const isEmpty = totalCount === 0;

    const html = template({
      type,
      isEmpty,
      groupedEmails,
      overflowCount,
    });

    // Create Digest record
    const digest = await prisma.digest.create({
      data: {
        userId,
        type,
        content: {
          html,
          emailCount: totalCount,
          overflowCount,
          groupedEmails,
        } as any,
        emailIds,
        status: 'pending',
      },
    });

    // Link matched emails to the newly created digest
    if (emailIds.length > 0) {
      await prisma.email.updateMany({
        where: {
          id: { in: emailIds },
        },
        data: {
          digestId: digest.id,
        },
      });
    }

    logger.info(
      `[DigestGenerator] Saved digest ${digest.id} with status pending.`
    );
    return digest;
  }
}
