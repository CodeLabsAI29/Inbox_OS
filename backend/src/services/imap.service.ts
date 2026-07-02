import Imap from 'imap';
import { simpleParser, ParsedMail } from 'mailparser';
import { PrismaClient } from '@prisma/client';
import { EventBus } from './event-bus.service';

const prisma = new PrismaClient();

export interface IMAPConfig {
  user: string;
  password: string;
  host: string;
  port: number;
  tls: boolean;
  tlsOptions?: any;
}

export class IMAPService {
  private imap: Imap | null = null;
  private config: IMAPConfig;
  private userId: string;
  private isReconnecting: boolean = false;
  private keepAliveTimer: NodeJS.Timeout | null = null;

  constructor(userId: string, config: IMAPConfig) {
    this.userId = userId;
    this.config = {
      ...config,
      tls: true, // Enforcement from constraints
      tlsOptions: { rejectUnauthorized: process.env.NODE_ENV === 'production' }
    };
  }

  /**
   * Initialize connection with the IMAP server via TLS.
   */
  public async connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.imap) {
        this.imap.destroy();
      }

      this.imap = new Imap(this.config);

      this.imap.once('ready', () => {
        console.log(`[IMAP] Connected for user ${this.userId}`);
        this.isReconnecting = false;
        resolve();
      });

      this.imap.once('error', (err: any) => {
        console.error(`[IMAP Error] User ${this.userId}:`, err);
        if (!this.isReconnecting) {
          reject(err);
        }
      });

      this.imap.once('close', (hasError: boolean) => {
        console.log(`[IMAP] Connection closed for user ${this.userId}. Error: ${hasError}`);
        this.reconnect();
      });

      this.imap.connect();
    });
  }

  /**
   * Listen for new emails using IMAP IDLE.
   */
  public idle(): void {
    if (!this.imap) throw new Error('Call connect() first');

    this.imap.openBox('INBOX', false, (err, box) => {
      if (err) {
        console.error(`[IMAP] Failed to open INBOX:`, err);
        return;
      }

      console.log(`[IMAP] Listening for new emails on INBOX...`);

      // Start keep-alive (IMAP timeout is often ~29 mins, ping every 15 mins)
      if (this.keepAliveTimer) clearInterval(this.keepAliveTimer);
      this.keepAliveTimer = setInterval(() => {
         // status check keeps the connection alive safely
         this.imap?.status('INBOX', () => {});
      }, 15 * 60 * 1000);

      this.imap!.on('mail', (numNewMsgs: number) => {
        console.log(`[IMAP] Detected ${numNewMsgs} new messages`);
        this.fetchLatestMessages(box.messages.total, numNewMsgs);
      });
    });
  }

  private fetchLatestMessages(totalMessages: number, numNewMsgs: number) {
     if (!this.imap) return;
     // Fetch the newly arrived messages
     const fetchStart = Math.max(1, totalMessages - numNewMsgs + 1);
     const fetchQuery = `${fetchStart}:*`;

     const f = this.imap.seq.fetch(fetchQuery, {
       bodies: '',
       struct: true,
       markSeen: false
     });

     f.on('message', (msg, seqno) => {
       msg.on('body', (stream, info) => {
         let rawEml = '';
         stream.on('data', (chunk) => {
           rawEml += chunk.toString('utf8');
         });
         stream.once('end', async () => {
           await this.processRawEmail(rawEml, seqno);
         });
       });
     });

     f.once('error', (err) => {
       console.error('[IMAP] Fetch error:', err);
     });
  }

  private async processRawEmail(rawEml: string, seqno: number) {
    try {
      const parsed: ParsedMail = await simpleParser(rawEml);
      
      const messageId = parsed.messageId || `imap-seq-${seqno}-${Date.now()}`;
      
      // Check for duplicates
      const existing = await prisma.email.findUnique({ where: { messageId } });
      if (existing) return;

      const subject = parsed.subject || 'No Subject';
      
      const getAddressText = (addr: any) => Array.isArray(addr) ? addr.map(a => a.text).join(', ') : addr?.text || '';
      
      const sender = getAddressText(parsed.from) || 'Unknown Sender';
      const recipient = getAddressText(parsed.to) || this.config.user;
      
      const inReplyTo = parsed.inReplyTo || null;
      const body = typeof parsed.text === 'string' ? parsed.text : (typeof parsed.html === 'string' ? parsed.html : '');

      // Thread resolution
      let threadId = null;
      if (inReplyTo) {
         const parent = await prisma.email.findFirst({ where: { messageId: inReplyTo } });
         if (parent) threadId = parent.threadId;
      }
      
      if (!threadId) {
         const thread = await prisma.thread.create({ data: { summary: subject }});
         threadId = thread.id;
      }

      const emailRecord = await prisma.email.create({
        data: {
          messageId,
          inReplyTo,
          sender,
          recipient,
          subject,
          body,
          status: 'UNREAD',
          userId: this.userId,
          threadId: threadId as string
        }
      });

      // Dispatch event
      await EventBus.publish('email.received', { emailId: emailRecord.id });
      console.log(`[IMAP] Saved new email: ${subject}`);
    } catch (err) {
      console.error('[IMAP] Error parsing/saving email:', err);
    }
  }

  private reconnectAttempts = 0;
  private reconnect(): void {
    if (this.isReconnecting) return;
    this.isReconnecting = true;
    if (this.keepAliveTimer) clearInterval(this.keepAliveTimer);
    
    const delay = Math.min(1000 * 2 ** this.reconnectAttempts, 60000); // max 60s
    this.reconnectAttempts++;
    if (this.reconnectAttempts > 10) {
      console.error('[IMAP] Max reconnect attempts reached. Giving up.');
      return;
    }
    
    console.log(`[IMAP] Reconnecting in ${delay/1000} seconds...`);
    setTimeout(async () => {
      try {
        await this.connect();
        this.idle();
        this.reconnectAttempts = 0; // reset on success
      } catch (err) {
        console.error(`[IMAP] Reconnection failed, retrying...`);
        this.isReconnecting = false;
        this.reconnect();
      }
    }, delay);
  }
}
