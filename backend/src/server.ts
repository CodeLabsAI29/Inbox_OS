import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../.env') });

import express, { Request, Response } from 'express';
import cookieParser from 'cookie-parser';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';
import { AuthService } from './services/auth.service';
import { requireAuth, AuthenticatedRequest } from './middleware/auth.middleware';
import { rateLimiter } from './middleware/rate-limiter.middleware';
import client from './utils/metrics';
import { logger } from './utils/logger';
import { EventBus } from './services/event-bus.service';
import { RedisService } from './services/redis.service';
import { google } from 'googleapis';
import crypto from 'crypto';
import { EmailSenderService } from './services/email-sender.service';
import { encrypt } from './utils/crypto';
import { registerWorkerHandlers } from './worker';

// If Redis is not running and we fall back to local event emitter, register worker handlers inline.
EventBus.onFallback(() => {
  registerWorkerHandlers().catch((err) => {
    console.error('Failed to register inline worker handlers on EventBus fallback:', err);
  });
});

const app = express();
const prisma = new PrismaClient();
const PORT = process.env.PORT || 8000;

app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (origin && (
    origin === 'http://localhost' ||
    origin.startsWith('http://localhost:') ||
    origin === 'http://127.0.0.1' ||
    origin.startsWith('http://127.0.0.1:')
  )) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  }
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS,PATCH');
  res.setHeader('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  if (req.method === 'OPTIONS') {
    res.sendStatus(200);
    return;
  }
  next();
});

app.get('/metrics', async (req: Request, res: Response) => {
  const ip = req.ip || req.socket.remoteAddress || '';
  const cleanIp = ip.startsWith('::ffff:') ? ip.substring(7) : ip;
  const isLocalhost = cleanIp === '127.0.0.1' || cleanIp === '::1' || cleanIp === 'localhost';

  let isPrivate = false;
  const ipParts = cleanIp.split('.');
  if (ipParts.length === 4) {
    const first = parseInt(ipParts[0], 10);
    const second = parseInt(ipParts[1], 10);
    if (first === 10) isPrivate = true;
    if (first === 172 && second >= 16 && second <= 31) isPrivate = true;
    if (first === 192 && second === 168) isPrivate = true;
  }

  const metricsToken = process.env.METRICS_TOKEN;
  const tokenHeader = req.headers['x-metrics-token'];
  const hasValidToken = metricsToken && tokenHeader === metricsToken;

  if (!isLocalhost && !isPrivate && !hasValidToken) {
    logger.warn('Forbidden access attempt to /metrics', { ip: cleanIp });
    return res.status(403).json({ error: 'Forbidden' });
  }

  try {
    res.set('Content-Type', client.register.contentType);
    res.end(await client.register.metrics());
  } catch (err: any) {
    logger.error('Failed to generate Prometheus metrics', { error: err.message });
    res.status(500).end(err);
  }
});

app.use(express.json());
app.use(cookieParser());
app.use('/api', rateLimiter);

/**
 * POST /api/auth/register
 * Creates a new user in the database.
 */
app.post('/api/auth/register', async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    // Check if email already exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return res.status(400).json({ error: 'User with this email already exists' });
    }

    // Hash the password with 10 salt rounds
    const passwordHash = await AuthService.hashPassword(password);

    // Create user
    const newUser = await prisma.user.create({
      data: {
        email,
        passwordHash,
      },
    });

    // Generate JWT token for auto-login
    const token = AuthService.generateToken(newUser.id, newUser.email);

    // Set cookie
    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
    });

    return res.status(201).json({
      message: 'User registered successfully',
      user: {
        id: newUser.id,
        email: newUser.email,
        createdAt: newUser.createdAt,
      },
    });
  } catch (error) {
    console.error('Registration error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/auth/login
 * Validates credentials and sets an HTTP-only JWT cookie.
 */
app.post('/api/auth/login', async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    // Fetch user
    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    // Verify password
    const isPasswordValid = await AuthService.comparePassword(password, user.passwordHash);
    if (!isPasswordValid) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    // Generate JWT token
    const token = AuthService.generateToken(user.id, user.email);

    // Set cookie
    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
    });

    return res.status(200).json({
      message: 'Logged in successfully',
      user: {
        id: user.id,
        email: user.email,
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/auth/logout
 * Clears the HTTP-only auth cookie.
 */
app.post('/api/auth/logout', (_req: Request, res: Response) => {
  res.clearCookie('token');
  return res.status(200).json({ message: 'Logged out successfully' });
});

/**
 * GET /api/auth/me
 * Protected endpoint to fetch current authenticated user profile.
 */
app.get('/api/auth/me', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  return res.status(200).json({
    user: req.user,
  });
});

/**
 * GET /api/users/profile
 * Protected endpoint to fetch current authenticated user profile.
 */
app.get('/api/users/profile', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const cacheKey = `user:profile:${userId}`;

    // Try fetching from Redis cache first
    const cachedProfile = await RedisService.get(cacheKey);
    if (cachedProfile) {
      try {
        const parsedProfile = JSON.parse(cachedProfile);
        return res.status(200).json(parsedProfile);
      } catch (parseError) {
        console.warn('Failed to parse cached user profile JSON:', parseError);
      }
    }

    // Fetch from Prisma if not cached
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        createdAt: true,
        settings: {
          select: {
            theme: true,
            signature: true,
            autoReply: true,
          }
        }
      },
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Store in cache for 300 seconds
    await RedisService.setex(cacheKey, 300, JSON.stringify(user));

    return res.status(200).json(user);
  } catch (error) {
    console.error('Fetch profile error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/webhooks/incoming
 * Webhook endpoint that ingests incoming emails, checks for thread association,
 * validates body structures via Zod, and creates records in PostgreSQL.
 */
const incomingEmailSchema = z.object({
  sender: z.string().email(),
  recipient: z.string().email(),
  subject: z.string(),
  body: z.string(),
  messageId: z.string(),
  inReplyTo: z.string().optional(),
});

app.post('/api/webhooks/incoming', async (req: Request, res: Response) => {
  try {
    // 1. Strict payload validation with Zod
    const validation = incomingEmailSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({
        error: 'Invalid payload schema',
        details: validation.error.flatten(),
      });
    }

    const { sender, recipient, subject, body, messageId, inReplyTo } = validation.data;

    // 2. Fetch or dynamically create the recipient User
    let user = await prisma.user.findUnique({
      where: { email: recipient },
    });

    if (!user) {
      user = await prisma.user.create({
        data: {
          email: recipient,
          passwordHash: await AuthService.hashPassword('webhook-generated-password-hash'),
        },
      });
    }

    // 3. Check for thread association via In-Reply-To header / messageId
    let threadId: string | null = null;
    if (inReplyTo) {
      const previousEmail = await prisma.email.findUnique({
        where: { messageId: inReplyTo },
      });
      if (previousEmail) {
        threadId = previousEmail.threadId;
      }
    }

    // If no existing thread is found, spin up a new Thread
    if (!threadId) {
      const newThread = await prisma.thread.create({
        data: {
          summary: `Thread for: ${subject}`,
        },
      });
      threadId = newThread.id;
    }

    // 4. Create the Email record
    const emailRecord = await prisma.email.create({
      data: {
        messageId,
        inReplyTo: inReplyTo || null,
        sender,
        recipient,
        subject,
        body,
        status: 'UNREAD',
        userId: user.id,
        threadId,
      },
    });

    // 5. Publish event to decouple AI processing
    await EventBus.publish('email.received', { emailId: emailRecord.id });

    // 6. Return 201 Created immediately
    return res.status(201).json({
      message: 'Email ingested successfully',
      email: {
        id: emailRecord.id,
        messageId: emailRecord.messageId,
        subject: emailRecord.subject,
        threadId: emailRecord.threadId,
        createdAt: emailRecord.createdAt,
      },
    });
  } catch (error) {
    console.error('Incoming webhook error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/users/me/settings
 * Fetches user-specific preferences. If not initialized, returns system defaults.
 */
app.get('/api/users/me/settings', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const settings = await prisma.userSettings.findUnique({
      where: { userId },
    });

    if (!settings) {
      return res.status(200).json({
        theme: 'dark',
        signature: null,
        autoReply: false,
      });
    }

    return res.status(200).json({
      theme: settings.theme,
      signature: settings.signature,
      autoReply: settings.autoReply,
    });
  } catch (error) {
    console.error('Fetch settings error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * PUT /api/users/me/settings
 * Updates (or initializes) user-specific preferences, validating parameters via Zod.
 */
const updateSettingsSchema = z.object({
  theme: z.string().min(1).optional(),
  signature: z.string().nullable().optional(),
  autoReply: z.boolean().optional(),
});

app.put('/api/users/me/settings', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const validation = updateSettingsSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({
        error: 'Invalid payload schema',
        details: validation.error.flatten(),
      });
    }

    const { theme, signature, autoReply } = validation.data;

    const updatedSettings = await prisma.userSettings.upsert({
      where: { userId },
      update: {
        ...(theme !== undefined && { theme }),
        ...(signature !== undefined && { signature }),
        ...(autoReply !== undefined && { autoReply }),
      },
      create: {
        userId,
        theme: theme ?? 'dark',
        signature: signature ?? null,
        autoReply: autoReply ?? false,
      },
    });

    return res.status(200).json({
      message: 'Settings updated successfully',
      settings: {
        theme: updatedSettings.theme,
        signature: updatedSettings.signature,
        autoReply: updatedSettings.autoReply,
      },
    });
  } catch (error) {
    console.error('Update settings error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// OAuth2 & Encryption config
const oauth2Client = new google.auth.OAuth2(
  process.env.GMAIL_CLIENT_ID,
  process.env.GMAIL_CLIENT_SECRET,
  process.env.GMAIL_REDIRECT_URI || 'http://localhost:8000/api/integrations/gmail/callback'
);

/**
 * GET /api/integrations/gmail/auth
 * Generates the Google OAuth URL.
 */
app.get('/api/integrations/gmail/auth', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const url = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: ['https://mail.google.com/'],
    prompt: 'consent',
    state: req.user?.userId
  });
  return res.json({ url });
});

/**
 * GET /api/integrations/gmail/callback
 * Exchanges the auth code for tokens and saves them to Prisma securely.
 */
app.get('/api/integrations/gmail/callback', async (req: Request, res: Response) => {
  const code = req.query.code as string;
  const userId = req.query.state as string;
  
  if (!code || !userId) {
    return res.status(400).json({ error: 'Missing code or state parameters' });
  }

  try {
    const { tokens } = await oauth2Client.getToken(code);
    oauth2Client.setCredentials(tokens);

    const gmail = google.gmail({ version: 'v1', auth: oauth2Client });
    const profile = await gmail.users.getProfile({ userId: 'me' });
    const emailAddress = profile.data.emailAddress;

    if (!emailAddress) {
       return res.status(400).json({ error: 'Could not fetch email address from Google' });
    }

    // ── Google Sign-In flow ───────────────────────────────────────────────────
    // If state is 'google-signin', auto-create or find the user by Gmail address
    // then set a JWT cookie and redirect to the dashboard.
    if (userId === 'google-signin') {
      let user = await prisma.user.findUnique({ where: { email: emailAddress } });
      if (!user) {
        user = await prisma.user.create({
          data: {
            email: emailAddress,
            passwordHash: crypto.randomBytes(32).toString('hex'), // unusable password — Google is the auth
          }
        });
      }

      const { AuthService } = await import('./services/auth.service');
      const jwtToken = AuthService.generateToken(user.id, user.email);
      res.cookie('token', jwtToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 24 * 60 * 60 * 1000,
      });

      // Also connect their Gmail account
      const encryptedTokens = encrypt(JSON.stringify(tokens));
      await prisma.emailAccount.upsert({
        where: { userId_provider_emailAddress: { userId: user.id, provider: 'gmail', emailAddress } },
        update: { encryptedTokens, syncState: 'connected', lastSyncAt: new Date() },
        create: { userId: user.id, provider: 'gmail', emailAddress, encryptedTokens, syncState: 'connected' }
      });

      return res.redirect('http://localhost:5173/');
    }

    // ── Connect Gmail to existing account flow ────────────────────────────────
    const encryptedTokens = encrypt(JSON.stringify(tokens));

    // Save to Database
    await prisma.emailAccount.upsert({
      where: {
         userId_provider_emailAddress: {
             userId,
             provider: 'gmail',
             emailAddress
         }
      },
      update: {
         encryptedTokens,
         syncState: 'connected',
         lastSyncAt: new Date()
      },
      create: {
         userId,
         provider: 'gmail',
         emailAddress,
         encryptedTokens,
         syncState: 'connected'
      }
    });

    return res.status(200).json({ message: 'Gmail connected successfully', emailAddress });
  } catch (error) {
    console.error('OAuth callback error:', error);
    return res.status(500).json({ error: 'OAuth integration failed' });
  }

});

/**
 * POST /api/emails/send
 * Sends an outbound email via SMTP
 */
app.post('/api/emails/send', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { to, subject, text, html, inReplyTo } = req.body;
    if (!to || !subject || !text) {
      return res.status(400).json({ error: 'Missing to, subject, or text' });
    }
    
    const userId = req.user?.userId;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const result = await EmailSenderService.send(userId, { to, subject, text, html, inReplyTo });
    return res.status(200).json({ message: 'Email sent successfully', messageId: result.messageId });
  } catch (error: any) {
    console.error('Send email error:', error.message);
    return res.status(500).json({ error: 'Failed to send email' });
  }
});

/**
 * Webhook Config Routes
 */
app.post('/api/webhooks/config', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { targetUrl, events } = req.body;
    const userId = req.user?.userId;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });
    if (!targetUrl || !Array.isArray(events)) return res.status(400).json({ error: 'Invalid payload' });

    const secret = crypto.randomBytes(32).toString('hex');
    const hook = await prisma.webhookEndpoint.create({
      data: { targetUrl, events: JSON.stringify(events), secret, userId }
    });
    
    return res.json({ id: hook.id, targetUrl: hook.targetUrl, events: JSON.parse(hook.events), secret: hook.secret });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to create webhook' });
  }
});

app.get('/api/webhooks/config', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const hooks = await prisma.webhookEndpoint.findMany({ where: { userId } });
    const formatted = hooks.map(h => ({ id: h.id, targetUrl: h.targetUrl, events: JSON.parse(h.events) }));
    return res.json(formatted);
  } catch (err) {
    return res.status(500).json({ error: 'Failed to fetch webhooks' });
  }
});

app.patch('/api/webhooks/config/:id', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });
    const { targetUrl, events } = req.body;
    const id = req.params.id as string;

    const hook = await prisma.webhookEndpoint.findUnique({ where: { id } });
    if (!hook || hook.userId !== userId) return res.status(404).json({ error: 'Not found' });

    await prisma.webhookEndpoint.update({
      where: { id },
      data: {
        ...(targetUrl && { targetUrl }),
        ...(events && { events: JSON.stringify(events) })
      }
    });
    return res.json({ message: 'Webhook updated' });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to update webhook' });
  }
});

app.delete('/api/webhooks/config/:id', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });
    const id = req.params.id as string;

    const hook = await prisma.webhookEndpoint.findUnique({ where: { id } });
    if (!hook || hook.userId !== userId) return res.status(404).json({ error: 'Not found' });

    await prisma.webhookEndpoint.delete({ where: { id } });
    return res.json({ message: 'Webhook deleted' });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to delete webhook' });
  }
});


/**
 * GET /api/emails
 * Returns paginated email list for the logged-in user.
 * Called by frontend EmailList.tsx
 */
app.get('/api/emails', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const limit = parseInt(req.query.limit as string) || 10;
    const offset = parseInt(req.query.offset as string) || 0;
    const category = req.query.category as string | undefined;

    const where: any = { userId };
    if (category && category !== 'all') where.category = category;

    const [emails, total] = await Promise.all([
      prisma.email.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
        select: {
          id: true, messageId: true, sender: true, recipient: true,
          subject: true, body: true, status: true, category: true,
          createdAt: true, threadId: true
        }
      }),
      prisma.email.count({ where })
    ]);

    return res.json({ emails, total, limit, offset });
  } catch (err) {
    console.error('GET /api/emails error:', err);
    return res.status(500).json({ error: 'Failed to fetch emails' });
  }
});

/**
 * GET /api/auth/google
 * PUBLIC — Generates Google OAuth URL for sign-in/sign-up via Google.
 * No JWT required. The callback handles user creation automatically.
 */
app.get('/api/auth/google', (req: Request, res: Response) => {
  const url = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: ['https://mail.google.com/', 'https://www.googleapis.com/auth/userinfo.email', 'https://www.googleapis.com/auth/userinfo.profile'],
    prompt: 'consent',
    state: 'google-signin' // special flag — callback will auto-create user
  });
  return res.json({ url });
});

// Start Server

const server = app.listen(PORT, () => {
  logger.info(`Auth service running on port ${PORT}`);
});

export { app, server, prisma };
