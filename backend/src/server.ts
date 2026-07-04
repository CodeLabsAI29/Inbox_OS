import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../.env') });

import express, { Request, Response } from 'express';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import compression from 'compression';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';
import { AuthService } from './services/auth.service';
import {
  requireAuth,
  AuthenticatedRequest,
} from './middleware/auth.middleware';
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
import { Server as SocketIoServer } from 'socket.io';
import { WebSocketService } from './services/websocket.service';
import { TelegramBotService } from './services/telegram-bot.service';
import { LinkAttachmentExtractorService } from './services/parser/link-attachment-extractor.service';
import { TelegramNotificationService } from './services/telegram-notification.service';
import { initializeApp, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';

// Route imports
import { ragRouter } from './routes/rag.routes';
import { aiRouter } from './routes/ai.routes';
import { tasksRouter } from './routes/tasks.routes';
import { calendarRouter } from './routes/calendar.routes';
import { expensesRouter } from './routes/expenses.routes';
import { digestsRouter } from './routes/digests.routes';
import { notificationsRouter } from './routes/notifications.routes';
import { feedbackRouter } from './routes/feedback.routes';
import { integrationsRouter } from './routes/integrations.routes';

import { CalendarExtractorService } from './services/actions/calendar-extractor.service';
import { CalendarCreatorService } from './services/actions/calendar-creator.service';
import { calendarEventsQueue } from './jobs/calendar-events.job';

const app = express();

// Initialize Firebase Admin SDK if credentials are provided
let firebaseAdminApp: any = null;
if (process.env.FIREBASE_PROJECT_ID && process.env.FIREBASE_CLIENT_EMAIL && process.env.FIREBASE_PRIVATE_KEY) {
  try {
    firebaseAdminApp = initializeApp({
      credential: cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
      }),
    });
    logger.info('Firebase Admin SDK initialized successfully');
  } catch (err) {
    logger.error('Failed to initialize Firebase Admin SDK:', err);
  }
} else {
  logger.warn('Firebase Admin credentials not fully configured in environment variables.');
}

const prisma = new PrismaClient();
const PORT = process.env.PORT || 8000;

// Security & performance middleware
app.use(helmet({
  crossOriginEmbedderPolicy: false,
  contentSecurityPolicy: process.env.NODE_ENV === 'production' ? undefined : false,
}));
app.use(compression());

// Request timeout (30 seconds)
app.use((req, res, next) => {
  res.setTimeout(30000, () => {
    res.status(408).json({ error: 'Request timeout' });
  });
  next();
});

// CORS: allow localhost in dev + production frontend domains
const ALLOWED_ORIGINS = [
  'http://localhost',
  'http://localhost:3000',
  'http://localhost:5173',
  'http://127.0.0.1',
  'http://127.0.0.1:3000',
  'http://127.0.0.1:5173',
  ...(process.env.FRONTEND_URL ? [process.env.FRONTEND_URL] : []),
  ...(process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(',').map(o => o.trim()) : []),
];

app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (
    origin &&
    (ALLOWED_ORIGINS.some(o => origin === o) ||
      origin.startsWith('http://localhost:') ||
      origin.startsWith('http://127.0.0.1:'))
  ) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  }
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader(
    'Access-Control-Allow-Methods',
    'GET,PUT,POST,DELETE,OPTIONS,PATCH'
  );
  res.setHeader(
    'Access-Control-Allow-Headers',
    'Origin, X-Requested-With, Content-Type, Accept, Authorization'
  );
  if (req.method === 'OPTIONS') {
    res.sendStatus(200);
    return;
  }
  next();
});

app.get('/metrics', async (req: Request, res: Response) => {
  const ip = req.ip || req.socket.remoteAddress || '';
  const cleanIp = ip.startsWith('::ffff:') ? ip.substring(7) : ip;
  const isLocalhost =
    cleanIp === '127.0.0.1' || cleanIp === '::1' || cleanIp === 'localhost';

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
    logger.error('Failed to generate Prometheus metrics', {
      error: err.message,
    });
    res.status(500).end(err);
  }
});

app.use(express.json());
app.use(cookieParser());

/**
 * GET /api/health
 * Lightweight API health check endpoint.
 */
app.get('/api/health', async (req: Request, res: Response) => {
  const telegramHealth = await TelegramBotService.checkHealth();
  res.status(200).json({
    status: 'ok',
    timestamp: new Date(),
    telegram: {
      status: telegramHealth.connected ? '✅ Connected' : '❌ Disconnected',
      webhook: telegramHealth.webhookActive
        ? '✅ Active'
        : '❌ Inactive / Polling',
      botApi: telegramHealth.reachable ? '✅ Reachable' : '❌ Unreachable',
    },
  });
});

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
      return res
        .status(400)
        .json({ error: 'User with this email already exists' });
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
    const isPasswordValid = await AuthService.comparePassword(
      password,
      user.passwordHash
    );
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

    // Dispatch Telegram security notification alert if enabled
    try {
      const userSettings = await prisma.userSettings.findFirst({
        where: { userId: user.id, telegramEnabled: true },
      });
      if (userSettings && userSettings.telegramChatId) {
        await TelegramNotificationService.sendAuthAlert(
          userSettings.telegramChatId,
          `New login detected on your InboxOS account (${user.email}) at ${new Date().toISOString()}`
        );
      }
    } catch (teleErr) {
      logger.error('Failed to send Telegram auth alert:', teleErr);
    }

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
 * POST /api/auth/firebase
 * Accepts Firebase ID token, verifies it, finds/creates a user, and returns standard JWT cookie.
 */
app.post('/api/auth/firebase', async (req: Request, res: Response) => {
  try {
    const { idToken } = req.body;
    if (!idToken) {
      return res.status(400).json({ error: 'Firebase idToken is required' });
    }

    if (!firebaseAdminApp) {
      return res.status(500).json({ error: 'Firebase Admin is not configured on this server.' });
    }

    // Verify token
    const decodedToken = await getAuth().verifyIdToken(idToken);
    const email = decodedToken.email;
    if (!email) {
      return res.status(400).json({ error: 'Email not present in Firebase token' });
    }

    // Check if user exists
    let user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      // Create user with a dummy password hash (since they authenticate with Google/Firebase)
      const dummyPassword = crypto.randomBytes(32).toString('hex');
      const passwordHash = await AuthService.hashPassword(dummyPassword);

      user = await prisma.user.create({
        data: {
          email,
          passwordHash,
        },
      });
    }

    // Generate internal JWT token
    const token = AuthService.generateToken(user.id, user.email);

    // Set cookie
    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
    });

    // Telegram security alert
    try {
      const userSettings = await prisma.userSettings.findFirst({
        where: { userId: user.id, telegramEnabled: true },
      });
      if (userSettings && userSettings.telegramChatId) {
        await TelegramNotificationService.sendAuthAlert(
          userSettings.telegramChatId,
          `New Google login via Firebase detected on your InboxOS account (${user.email}) at ${new Date().toISOString()}`
        );
      }
    } catch (teleErr) {
      logger.error('Failed to send Telegram auth alert:', teleErr);
    }

    return res.status(200).json({
      message: 'Logged in successfully',
      user: {
        id: user.id,
        email: user.email,
      },
    });
  } catch (error: any) {
    console.error('Firebase Auth error:', error);
    return res.status(401).json({ error: 'Invalid Firebase ID token' });
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
app.get(
  '/api/auth/me',
  requireAuth,
  (req: AuthenticatedRequest, res: Response) => {
    return res.status(200).json({
      user: req.user,
    });
  }
);

/**
 * GET /api/users/profile
 * Protected endpoint to fetch current authenticated user profile.
 */
app.get(
  '/api/users/profile',
  requireAuth,
  async (req: AuthenticatedRequest, res: Response) => {
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
            },
          },
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
  }
);

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

    const { sender, recipient, subject, body, messageId, inReplyTo } =
      validation.data;

    // 2. Fetch or dynamically create the recipient User
    let user = await prisma.user.findUnique({
      where: { email: recipient },
    });

    if (!user) {
      user = await prisma.user.create({
        data: {
          email: recipient,
          passwordHash: await AuthService.hashPassword(
            'webhook-generated-password-hash'
          ),
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
    const links = await LinkAttachmentExtractorService.extractLinks(body);
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
        links: links as any,
        attachments: [],
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
 * POST /api/telegram/webhook
 * Receives update callbacks from Telegram Bot API.
 * Validates header secret parameter if configured.
 */
app.post('/api/telegram/webhook', async (req: Request, res: Response) => {
  const secretToken = req.headers['x-telegram-bot-api-secret-token'];
  const configuredSecret = process.env.TELEGRAM_WEBHOOK_SECRET || '';

  if (configuredSecret && secretToken !== configuredSecret) {
    logger.warn(
      '[TelegramBot] Rejected unauthorized webhook request (invalid x-telegram-bot-api-secret-token)'
    );
    return res.status(403).json({ error: 'Unauthorized' });
  }

  try {
    // Process update asynchronously to respond immediately to Telegram
    TelegramBotService.handleUpdate(req.body).catch((e) => {
      logger.error('[TelegramBot] Async handleUpdate error:', e);
    });
    return res.status(200).json({ ok: true });
  } catch (err: any) {
    logger.error('[TelegramBot] Webhook exception error:', err);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
});

/**
 * GET /api/users/me/settings
 * Fetches user-specific preferences. If not initialized, returns system defaults.
 */
app.get(
  '/api/users/me/settings',
  requireAuth,
  async (req: AuthenticatedRequest, res: Response) => {
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
  }
);

/**
 * PUT /api/users/me/settings
 * Updates (or initializes) user-specific preferences, validating parameters via Zod.
 */
const updateSettingsSchema = z.object({
  theme: z.string().min(1).optional(),
  signature: z.string().nullable().optional(),
  autoReply: z.boolean().optional(),
});

app.put(
  '/api/users/me/settings',
  requireAuth,
  async (req: AuthenticatedRequest, res: Response) => {
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
  }
);

// OAuth2 & Encryption config
const oauth2Client = new google.auth.OAuth2(
  process.env.GMAIL_CLIENT_ID,
  process.env.GMAIL_CLIENT_SECRET,
  process.env.GMAIL_REDIRECT_URI ||
    'http://localhost:8000/api/integrations/gmail/callback'
);

/**
 * GET /api/integrations/gmail/auth
 * Generates the Google OAuth URL.
 */
app.get(
  '/api/integrations/gmail/auth',
  requireAuth,
  (req: AuthenticatedRequest, res: Response) => {
    const url = oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: ['https://mail.google.com/'],
      prompt: 'consent',
      state: req.user?.userId,
    });
    return res.json({ url });
  }
);

/**
 * GET /api/integrations/gmail/callback
 * Exchanges the auth code for tokens and saves them to Prisma securely.
 */
app.get(
  '/api/integrations/gmail/callback',
  async (req: Request, res: Response) => {
    const code = req.query.code as string;
    const userId = req.query.state as string;

    if (!code || !userId) {
      return res
        .status(400)
        .json({ error: 'Missing code or state parameters' });
    }

    try {
      const { tokens } = await oauth2Client.getToken(code);
      oauth2Client.setCredentials(tokens);

      const gmail = google.gmail({ version: 'v1', auth: oauth2Client });
      const profile = await gmail.users.getProfile({ userId: 'me' });
      const emailAddress = profile.data.emailAddress;

      if (!emailAddress) {
        return res
          .status(400)
          .json({ error: 'Could not fetch email address from Google' });
      }

      // ── Google Sign-In flow ───────────────────────────────────────────────────
      // If state is 'google-signin', auto-create or find the user by Gmail address
      // then set a JWT cookie and redirect to the dashboard.
      if (userId === 'google-signin') {
        let user = await prisma.user.findUnique({
          where: { email: emailAddress },
        });
        if (!user) {
          user = await prisma.user.create({
            data: {
              email: emailAddress,
              passwordHash: crypto.randomBytes(32).toString('hex'), // unusable password — Google is the auth
            },
          });
        }

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
          where: {
            userId_provider_emailAddress: {
              userId: user.id,
              provider: 'gmail',
              emailAddress,
            },
          },
          update: {
            encryptedTokens,
            syncState: 'connected',
            lastSyncAt: new Date(),
          },
          create: {
            userId: user.id,
            provider: 'gmail',
            emailAddress,
            encryptedTokens,
            syncState: 'connected',
          },
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
            emailAddress,
          },
        },
        update: {
          encryptedTokens,
          syncState: 'connected',
          lastSyncAt: new Date(),
        },
        create: {
          userId,
          provider: 'gmail',
          emailAddress,
          encryptedTokens,
          syncState: 'connected',
        },
      });

      return res
        .status(200)
        .json({ message: 'Gmail connected successfully', emailAddress });
    } catch (error) {
      return res.status(500).json({ error: 'OAuth integration failed' });
    }
  }
);

/**
 * GET /api/integrations/google_calendar/status
 * Check if the user has connected Google Calendar.
 */
app.get(
  '/api/integrations/google_calendar/status',
  requireAuth,
  async (req: AuthenticatedRequest, res: Response) => {
    const userId = req.user?.userId;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    try {
      const integration = await prisma.integration.findUnique({
        where: {
          userId_provider: {
            userId,
            provider: 'google_calendar',
          },
        },
      });
      return res.json({ connected: !!integration });
    } catch (error) {
      console.error('Error fetching calendar status:', error);
      return res.status(500).json({ error: 'Internal Server Error' });
    }
  }
);

/**
 * GET /api/integrations/google_calendar/auth
 * Generates the Google Calendar OAuth URL.
 */
app.get(
  '/api/integrations/google_calendar/auth',
  requireAuth,
  (req: AuthenticatedRequest, res: Response) => {
    const redirectUri = (process.env.GMAIL_REDIRECT_URI || 'http://localhost:8000/api/integrations/gmail/callback')
      .replace('/gmail/callback', '/google_calendar/callback');

    const calendarOauth2Client = new google.auth.OAuth2(
      process.env.GMAIL_CLIENT_ID,
      process.env.GMAIL_CLIENT_SECRET,
      redirectUri
    );

    const url = calendarOauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: [
        'https://www.googleapis.com/auth/calendar',
        'https://www.googleapis.com/auth/calendar.events'
      ],
      prompt: 'consent',
      state: req.user?.userId,
    });
    return res.json({ url });
  }
);

/**
 * GET /api/integrations/google_calendar/callback
 * Exchanges the auth code for tokens and saves them to Prisma securely.
 */
app.get(
  '/api/integrations/google_calendar/callback',
  async (req: Request, res: Response) => {
    const code = req.query.code as string;
    const userId = req.query.state as string;

    if (!code || !userId) {
      return res
        .status(400)
        .json({ error: 'Missing code or state parameters' });
    }

    try {
      const calendarOauth2Client = new google.auth.OAuth2(
        process.env.GMAIL_CLIENT_ID,
        process.env.GMAIL_CLIENT_SECRET,
        (process.env.GMAIL_REDIRECT_URI || 'http://localhost:8000/api/integrations/gmail/callback')
          .replace('/gmail/callback', '/google_calendar/callback')
      );

      const { tokens } = await calendarOauth2Client.getToken(code);
      const encryptedTokens = encrypt(JSON.stringify(tokens));

      await prisma.integration.upsert({
        where: {
          userId_provider: {
            userId,
            provider: 'google_calendar',
          },
        },
        update: {
          encryptedTokens,
          updatedAt: new Date(),
        },
        create: {
          userId,
          provider: 'google_calendar',
          encryptedTokens,
        },
      });

      // Redirect back to frontend
      return res.redirect('http://localhost:5173/');
    } catch (error) {
      console.error('Calendar OAuth callback error:', error);
      return res.status(500).json({ error: 'OAuth integration failed' });
    }
  }
);

/**
 * POST /api/actions/calendar/events
 * Triggers extracting meeting details from email and creating a calendar event.
 */
app.post(
  '/api/actions/calendar/events',
  requireAuth,
  async (req: AuthenticatedRequest, res: Response) => {
    const { emailId } = req.body;
    const userId = req.user?.userId;

    if (!emailId || !userId) {
      return res.status(400).json({ error: 'Missing emailId or userId' });
    }

    try {
      // 1. Fetch Email
      const email = await prisma.email.findUnique({
        where: { id: emailId },
        include: { analysis: true },
      });

      if (!email) {
        return res.status(404).json({ error: 'Email not found' });
      }

      // 2. Extract Event Details
      const eventData = CalendarExtractorService.extractEventDetails(email.analysis || email);
      if (!eventData) {
        return res.status(400).json({ error: 'No meeting details could be extracted from this email' });
      }

      // 3. Attempt creation
      try {
        const savedEvent = await CalendarCreatorService.createGoogleCalendarEvent(eventData, userId, emailId);
        return res.status(201).json({ success: true, event: savedEvent });
      } catch (err: any) {
        if (err.message === 'MISSING_GOOGLE_CALENDAR_CREDENTIALS') {
          logger.info(`[CalendarRoute] Missing credentials. Queueing calendar event creation for email: ${emailId}`);
          
          // Save a placeholder event with 'pending' status in db
          const pendingEvent = await prisma.calendarEvent.upsert({
            where: {
              googleEventId: 'failed_' + emailId,
            },
            update: {
              status: 'pending',
            },
            create: {
              userId,
              emailId,
              title: eventData.title,
              startTime: eventData.startTime,
              endTime: eventData.endTime,
              location: eventData.location,
              attendees: eventData.attendees,
              meetingLink: eventData.meetingLink,
              googleEventId: 'failed_' + emailId,
              status: 'pending',
            },
          });

          await calendarEventsQueue.add('createEvent', {
            userId,
            emailId,
            eventData,
          }, {
            attempts: 5,
            backoff: {
              type: 'exponential',
              delay: 5000,
            },
          });

          return res.status(202).json({
            success: true,
            message: 'Google Calendar credentials missing. Retrying creation in background.',
            event: pendingEvent,
          });
        }
        throw err;
      }
    } catch (error: any) {
      console.error('Error creating calendar event:', error);
      return res.status(500).json({ error: error.message || 'Internal Server Error' });
    }
  }
);

/**
 * GET /api/actions/calendar/events/:emailId
 * Retrieves calendar events associated with an email.
 */
app.get(
  '/api/actions/calendar/events/:emailId',
  requireAuth,
  async (req: AuthenticatedRequest, res: Response) => {
    const { emailId } = req.params;
    const userId = req.user?.userId;

    if (!emailId || !userId) {
      return res.status(400).json({ error: 'Missing emailId or userId' });
    }

    try {
      const events = await prisma.calendarEvent.findMany({
        where: {
          emailId: emailId as string,
          userId: userId as string,
        },
      });
      return res.json(events);
    } catch (error) {
      console.error('Error fetching calendar events:', error);
      return res.status(500).json({ error: 'Internal Server Error' });
    }
  }
);

/**
 * POST /api/emails/send
 * Sends an outbound email via SMTP
 */
app.post(
  '/api/emails/send',
  requireAuth,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { to, subject, text, html, inReplyTo } = req.body;
      if (!to || !subject || !text) {
        return res.status(400).json({ error: 'Missing to, subject, or text' });
      }

      const userId = req.user?.userId;
      if (!userId) return res.status(401).json({ error: 'Unauthorized' });

      const result = await EmailSenderService.send(userId, {
        to,
        subject,
        text,
        html,
        inReplyTo,
      });
      return res.status(200).json({
        message: 'Email sent successfully',
        messageId: result.messageId,
      });
    } catch (error: any) {
      console.error('Send email error:', error.message);
      return res.status(500).json({ error: 'Failed to send email' });
    }
  }
);

/**
 * Webhook Config Routes
 */
app.post(
  '/api/webhooks/config',
  requireAuth,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { targetUrl, events } = req.body;
      const userId = req.user?.userId;
      if (!userId) return res.status(401).json({ error: 'Unauthorized' });
      if (!targetUrl || !Array.isArray(events))
        return res.status(400).json({ error: 'Invalid payload' });

      const secret = crypto.randomBytes(32).toString('hex');
      const hook = await prisma.webhookEndpoint.create({
        data: { targetUrl, events: JSON.stringify(events), secret, userId },
      });

      return res.json({
        id: hook.id,
        targetUrl: hook.targetUrl,
        events: JSON.parse(hook.events),
        secret: hook.secret,
      });
    } catch (err) {
      return res.status(500).json({ error: 'Failed to create webhook' });
    }
  }
);

app.get(
  '/api/webhooks/config',
  requireAuth,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user?.userId;
      if (!userId) return res.status(401).json({ error: 'Unauthorized' });

      const hooks = await prisma.webhookEndpoint.findMany({
        where: { userId },
      });
      const formatted = hooks.map((h: any) => ({
        id: h.id,
        targetUrl: h.targetUrl,
        events: JSON.parse(h.events),
      }));
      return res.json(formatted);
    } catch (err) {
      return res.status(500).json({ error: 'Failed to fetch webhooks' });
    }
  }
);

app.patch(
  '/api/webhooks/config/:id',
  requireAuth,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user?.userId;
      if (!userId) return res.status(401).json({ error: 'Unauthorized' });
      const { targetUrl, events } = req.body;
      const id = req.params.id as string;

      const hook = await prisma.webhookEndpoint.findUnique({ where: { id } });
      if (!hook || hook.userId !== userId)
        return res.status(404).json({ error: 'Not found' });

      await prisma.webhookEndpoint.update({
        where: { id },
        data: {
          ...(targetUrl && { targetUrl }),
          ...(events && { events: JSON.stringify(events) }),
        },
      });
      return res.json({ message: 'Webhook updated' });
    } catch (err) {
      return res.status(500).json({ error: 'Failed to update webhook' });
    }
  }
);

app.delete(
  '/api/webhooks/config/:id',
  requireAuth,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user?.userId;
      if (!userId) return res.status(401).json({ error: 'Unauthorized' });
      const id = req.params.id as string;

      const hook = await prisma.webhookEndpoint.findUnique({ where: { id } });
      if (!hook || hook.userId !== userId)
        return res.status(404).json({ error: 'Not found' });

      await prisma.webhookEndpoint.delete({ where: { id } });
      return res.json({ message: 'Webhook deleted' });
    } catch (err) {
      return res.status(500).json({ error: 'Failed to delete webhook' });
    }
  }
);

// PUT alias for PATCH /api/webhooks/config/:id
app.put(
  '/api/webhooks/config/:id',
  requireAuth,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user?.userId;
      if (!userId) return res.status(401).json({ error: 'Unauthorized' });
      const { targetUrl, events } = req.body;
      const id = req.params.id as string;

      const hook = await prisma.webhookEndpoint.findUnique({ where: { id } });
      if (!hook || hook.userId !== userId)
        return res.status(404).json({ error: 'Not found' });

      await prisma.webhookEndpoint.update({
        where: { id },
        data: {
          ...(targetUrl && { targetUrl }),
          ...(events && { events: JSON.stringify(events) }),
        },
      });
      return res.json({ message: 'Webhook updated' });
    } catch (err) {
      return res.status(500).json({ error: 'Failed to update webhook' });
    }
  }
);


/**
 * GET /api/dashboard/stats
 * Returns live dashboard metrics/statistics for the authenticated user.
 */
app.get(
  '/api/dashboard/stats',
  requireAuth,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user?.userId;
      if (!userId) return res.status(401).json({ error: 'Unauthorized' });

      const now = new Date();
      const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      const prev24h = new Date(now.getTime() - 48 * 60 * 60 * 1000);

      // 1. Total Ingested
      const totalIngested = await prisma.email.count({
        where: { userId },
      });
      const last24hIngested = await prisma.email.count({
        where: { userId, createdAt: { gte: last24h } },
      });
      const prev24hIngested = await prisma.email.count({
        where: { userId, createdAt: { gte: prev24h, lt: last24h } },
      });
      let ingestedChange = 0;
      if (prev24hIngested > 0) {
        ingestedChange = Math.round(((last24hIngested - prev24hIngested) / prev24hIngested) * 100);
      } else if (last24hIngested > 0) {
        ingestedChange = 100;
      }

      // 2. Urgent / Pending Actions
      const pendingActions = await prisma.actionItem.count({
        where: {
          isCompleted: false,
          email: { userId },
        },
      });
      const last24hPending = await prisma.actionItem.count({
        where: {
          isCompleted: false,
          email: { userId },
          createdAt: { gte: last24h },
        },
      });
      const prev24hPending = await prisma.actionItem.count({
        where: {
          isCompleted: false,
          email: { userId },
          createdAt: { gte: prev24h, lt: last24h },
        },
      });
      let pendingChange = 0;
      if (prev24hPending > 0) {
        pendingChange = Math.round(((last24hPending - prev24hPending) / prev24hPending) * 100);
      } else if (last24hPending > 0) {
        pendingChange = 100;
      }

      // 3. Resolved Rate
      const totalTasks = await prisma.actionItem.count({
        where: { email: { userId } },
      });
      const completedTasks = await prisma.actionItem.count({
        where: { isCompleted: true, email: { userId } },
      });
      const resolutionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

      // Previous 24h resolution rate to calculate trend
      const prevTotalTasks = await prisma.actionItem.count({
        where: { email: { userId }, createdAt: { lt: last24h } },
      });
      const prevCompletedTasks = await prisma.actionItem.count({
        where: { isCompleted: true, email: { userId }, createdAt: { lt: last24h } },
      });
      const prevResolutionRate = prevTotalTasks > 0 ? Math.round((prevCompletedTasks / prevTotalTasks) * 100) : 0;

      let resolutionChange = 0;
      if (prevResolutionRate > 0) {
        resolutionChange = Math.round(((resolutionRate - prevResolutionRate) / prevResolutionRate) * 100);
      } else if (resolutionRate > 0) {
        resolutionChange = 100;
      }

      return res.status(200).json({
        totalIngested: {
          value: totalIngested,
          change: `${ingestedChange >= 0 ? '+' : ''}${ingestedChange}%`,
          isPositive: ingestedChange >= 0,
        },
        pendingActions: {
          value: pendingActions,
          change: `${pendingChange >= 0 ? '+' : ''}${pendingChange}%`,
          isPositive: pendingChange <= 0, // decrease in pending items is positive
        },
        resolutionRate: {
          value: `${resolutionRate}%`,
          change: `${resolutionChange >= 0 ? '+' : ''}${resolutionChange}%`,
          isPositive: resolutionChange >= 0,
        },
      });
    } catch (error) {
      console.error('Failed to calculate dashboard stats:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }
);

/**
 * GET /api/emails
 * Returns paginated email list for the logged-in user.
 * Called by frontend EmailList.tsx
 */
app.get(
  '/api/emails',
  requireAuth,
  async (req: AuthenticatedRequest, res: Response) => {
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
            id: true,
            messageId: true,
            sender: true,
            recipient: true,
            subject: true,
            body: true,
            status: true,
            category: true,
            createdAt: true,
            threadId: true,
          },
        }),
        prisma.email.count({ where }),
      ]);

      return res.json({ emails, total, limit, offset });
    } catch (err) {
      console.error('GET /api/emails error:', err);
      return res.status(500).json({ error: 'Failed to fetch emails' });
    }
  }
);

/**
 * GET /api/emails/search
 * Search user's emails by subject or body with pagination.
 */
app.get(
  '/api/emails/search',
  requireAuth,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const { q } = req.query;
      if (typeof q !== 'string' || !q.trim()) {
        return res.status(400).json({
          error: 'Query parameter "q" is required and cannot be empty',
        });
      }

      // Parse pagination parameters
      const limitQuery = parseInt(req.query.limit as string, 10);
      const offsetQuery = parseInt(req.query.offset as string, 10);

      const limit =
        isNaN(limitQuery) || limitQuery <= 0 ? 20 : Math.min(limitQuery, 20);
      const offset = isNaN(offsetQuery) || offsetQuery < 0 ? 0 : offsetQuery;

      // Search query object
      const searchFilter = {
        userId,
        OR: [
          { subject: { contains: q } },
          { body: { contains: q } },
        ],
      };

      // Run both count and select queries concurrently
      const [total, emails] = await Promise.all([
        prisma.email.count({ where: searchFilter as any }),
        prisma.email.findMany({
          where: searchFilter as any,
          take: limit,
          skip: offset,
          orderBy: { createdAt: 'desc' },
        }),
      ]);

      return res.status(200).json({
        emails,
        pagination: {
          total,
          limit,
          offset,
        },
      });
    } catch (error) {
      console.error('Email search error:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }
);

/**
 * GET /api/emails/:id
 * Returns a single email with its thread list and action items.
 */
app.get(
  '/api/emails/:id',
  requireAuth,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user?.userId;
      if (!userId) return res.status(401).json({ error: 'Unauthorized' });

      const id = req.params.id as string;
      const uuidRegex =
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(id)) {
        return res.status(400).json({ error: 'Invalid email ID format' });
      }

      const email = await prisma.email.findUnique({
        where: { id },
        include: {
          actionItems: true,
          thread: {
            include: {
              emails: {
                orderBy: {
                  createdAt: 'asc',
                },
              },
            },
          },
        },
      });

      if (!email || email.userId !== userId) {
        return res.status(404).json({ error: 'Email not found' });
      }

      return res.json(email);
    } catch (error) {
      console.error('GET /api/emails/:id error:', error);
      return res.status(500).json({ error: 'Failed to fetch email details' });
    }
  }
);

/**
 * Rules Engine Validation Schemas
 */
const ruleConditionSchema = z.object({
  field: z.enum([
    'from',
    'to',
    'subject',
    'body',
    'category',
    'priority',
    'hasAttachments',
    'senderDomain',
  ]),
  operator: z.enum([
    'equals',
    'contains',
    'startsWith',
    'endsWith',
    'regex',
    'gt',
    'lt',
    'in',
  ]),
  value: z.string(),
});

const ruleActionSchema = z.object({
  type: z.enum([
    'moveToFolder',
    'applyLabel',
    'markAsRead',
    'markAsUrgent',
    'forwardTo',
    'webhook',
    'sendTelegram',
    'sendWhatsApp',
  ]),
  config: z.record(z.string(), z.any()),
});

const createRuleSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  priority: z.number().int().default(0),
  conditions: z.array(ruleConditionSchema).min(1),
  actions: z.array(ruleActionSchema).min(1),
});

/**
 * GET /api/rules
 * List all rules for authenticated user, ordered by priority
 */
app.get(
  '/api/rules',
  requireAuth,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user?.userId;
      if (!userId) return res.status(401).json({ error: 'Unauthorized' });

      const rules = await prisma.rule.findMany({
        where: { userId },
        orderBy: { priority: 'desc' },
        include: {
          conditions: true,
          actions: true,
        },
      });

      return res.json(rules);
    } catch (error) {
      console.error('GET /api/rules error:', error);
      return res.status(500).json({ error: 'Failed to fetch rules' });
    }
  }
);

/**
 * POST /api/rules
 * Create a new rule with conditions and actions
 */
app.post(
  '/api/rules',
  requireAuth,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user?.userId;
      if (!userId) return res.status(401).json({ error: 'Unauthorized' });

      const validation = createRuleSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({
          error: 'Invalid request payload',
          details: validation.error.flatten(),
        });
      }

      const { name, description, priority, conditions, actions } =
        validation.data;

      const newRule = await prisma.rule.create({
        data: {
          userId,
          name,
          description,
          priority,
          conditions: {
            create: conditions,
          },
          actions: {
            create: actions as any,
          },
        },
        include: {
          conditions: true,
          actions: true,
        },
      });

      return res.status(201).json(newRule);
    } catch (error) {
      console.error('POST /api/rules error:', error);
      return res.status(500).json({ error: 'Failed to create rule' });
    }
  }
);

/**
 * GET /api/rules/:id
 * Retrieve single rule details
 */
app.get(
  '/api/rules/:id',
  requireAuth,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user?.userId;
      if (!userId) return res.status(401).json({ error: 'Unauthorized' });

      const id = req.params.id as string;
      const rule = await prisma.rule.findUnique({
        where: { id },
        include: {
          conditions: true,
          actions: true,
        },
      });

      if (!rule || rule.userId !== userId) {
        return res.status(404).json({ error: 'Rule not found' });
      }

      return res.json(rule);
    } catch (error) {
      console.error('GET /api/rules/:id error:', error);
      return res.status(500).json({ error: 'Failed to fetch rule' });
    }
  }
);

/**
 * PUT /api/rules/:id
 * Update rule by replacing conditions and actions
 */
app.put(
  '/api/rules/:id',
  requireAuth,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user?.userId;
      if (!userId) return res.status(401).json({ error: 'Unauthorized' });

      const id = req.params.id as string;
      const existingRule = await prisma.rule.findUnique({ where: { id } });
      if (!existingRule || existingRule.userId !== userId) {
        return res.status(404).json({ error: 'Rule not found' });
      }

      const validation = createRuleSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({
          error: 'Invalid request payload',
          details: validation.error.flatten(),
        });
      }

      const { name, description, priority, conditions, actions } =
        validation.data;

      // Run delete-then-create inside a transaction
      const updatedRule = await prisma.$transaction(async (tx: any) => {
        await tx.ruleCondition.deleteMany({ where: { ruleId: id } });
        await tx.ruleAction.deleteMany({ where: { ruleId: id } });

        return tx.rule.update({
          where: { id },
          data: {
            name,
            description,
            priority,
            conditions: {
              create: conditions,
            },
            actions: {
              create: actions as any,
            },
          },
          include: {
            conditions: true,
            actions: true,
          },
        });
      });

      return res.json(updatedRule);
    } catch (error) {
      console.error('PUT /api/rules/:id error:', error);
      return res.status(500).json({ error: 'Failed to update rule' });
    }
  }
);

/**
 * DELETE /api/rules/:id
 * Deletes a rule
 */
app.delete(
  '/api/rules/:id',
  requireAuth,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user?.userId;
      if (!userId) return res.status(401).json({ error: 'Unauthorized' });

      const id = req.params.id as string;
      const rule = await prisma.rule.findUnique({ where: { id } });
      if (!rule || rule.userId !== userId) {
        return res.status(404).json({ error: 'Rule not found' });
      }

      await prisma.rule.delete({ where: { id } });

      return res.json({ message: 'Rule deleted successfully' });
    } catch (error) {
      console.error('DELETE /api/rules/:id error:', error);
      return res.status(500).json({ error: 'Failed to delete rule' });
    }
  }
);

/**
 * POST /api/rules/:id/toggle
 * Toggles isActive status
 */
app.post(
  '/api/rules/:id/toggle',
  requireAuth,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user?.userId;
      if (!userId) return res.status(401).json({ error: 'Unauthorized' });

      const id = req.params.id as string;
      const rule = await prisma.rule.findUnique({ where: { id } });
      if (!rule || rule.userId !== userId) {
        return res.status(404).json({ error: 'Rule not found' });
      }

      const updated = await prisma.rule.update({
        where: { id },
        data: { isActive: !rule.isActive },
      });

      return res.json({
        message: 'Rule toggled successfully',
        isActive: updated.isActive,
      });
    } catch (error) {
      console.error('POST /api/rules/:id/toggle error:', error);
      return res.status(500).json({ error: 'Failed to toggle rule' });
    }
  }
);

/**
 * GET /api/auth/google
 * PUBLIC — Generates Google OAuth URL for sign-in/sign-up via Google.
 * No JWT required. The callback handles user creation automatically.
 */
app.get('/api/auth/google', (req: Request, res: Response) => {
  const url = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: [
      'https://mail.google.com/',
      'https://www.googleapis.com/auth/userinfo.email',
      'https://www.googleapis.com/auth/userinfo.profile',
    ],
    prompt: 'consent',
    state: 'google-signin', // special flag — callback will auto-create user
  });
  return res.json({ url });
});

/**
 * POST /api/auth/refresh
 * Refresh JWT token using existing valid cookie token.
 */
app.post('/api/auth/refresh', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    const email = req.user?.email;
    if (!userId || !email) return res.status(401).json({ error: 'Unauthorized' });

    const newToken = AuthService.generateToken(userId, email);
    res.cookie('token', newToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 24 * 60 * 60 * 1000,
    });
    return res.json({ message: 'Token refreshed successfully' });
  } catch (err: any) {
    logger.error('[Auth] Refresh error:', err.message);
    return res.status(500).json({ error: 'Failed to refresh token' });
  }
});

/**
 * PUT /api/users/profile
 * Update user profile fields
 */
const updateProfileSchema = z.object({
  email: z.string().email().optional(),
});

app.put(
  '/api/users/profile',
  requireAuth,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user?.userId;
      if (!userId) return res.status(401).json({ error: 'Unauthorized' });

      const validation = updateProfileSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({ error: 'Invalid payload', details: validation.error.flatten() });
      }

      const { email } = validation.data;
      const updated = await prisma.user.update({
        where: { id: userId },
        data: { ...(email && { email }) },
        select: { id: true, email: true, createdAt: true },
      });

      // Invalidate profile cache
      await RedisService.del(`user:profile:${userId}`);
      return res.json(updated);
    } catch (err: any) {
      logger.error('[Users] PUT /profile error:', err.message);
      return res.status(500).json({ error: 'Failed to update profile' });
    }
  }
);

/**
 * GET /api/users/me/ai-profile
 * Returns AI behavior profile for the user (feedback stats + settings)
 */
app.get(
  '/api/users/me/ai-profile',
  requireAuth,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user?.userId;
      if (!userId) return res.status(401).json({ error: 'Unauthorized' });

      const [settings, feedbackCount, totalEmails] = await Promise.all([
        prisma.userSettings.findUnique({ where: { userId } }),
        prisma.userFeedback.count({ where: { userId } }),
        prisma.email.count({ where: { userId } }),
      ]);

      const aiProvider = process.env.AI_PROVIDER || 'openai';
      return res.json({
        aiProvider,
        totalEmailsProcessed: totalEmails,
        feedbackGiven: feedbackCount,
        preferences: {
          theme: settings?.theme || 'dark',
          autoReply: settings?.autoReply || false,
        },
      });
    } catch (err: any) {
      logger.error('[Users] GET /me/ai-profile error:', err.message);
      return res.status(500).json({ error: 'Failed to fetch AI profile' });
    }
  }
);

/**
 * GET /api/users/me/dnd
 * Get Do Not Disturb settings
 */
app.get(
  '/api/users/me/dnd',
  requireAuth,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user?.userId;
      if (!userId) return res.status(401).json({ error: 'Unauthorized' });

      const settings = await prisma.userSettings.findUnique({ where: { userId } });
      return res.json({
        dndEnabled: settings?.dndEnabled || false,
        dndStart: settings?.dndStart || null,
        dndEnd: settings?.dndEnd || null,
      });
    } catch (err: any) {
      logger.error('[Users] GET /me/dnd error:', err.message);
      return res.status(500).json({ error: 'Failed to fetch DnD settings' });
    }
  }
);

const dndSchema = z.object({
  dndEnabled: z.boolean(),
  dndStart: z.string().regex(/^\d{2}:\d{2}$/).optional().nullable(),
  dndEnd: z.string().regex(/^\d{2}:\d{2}$/).optional().nullable(),
});

/**
 * POST /api/users/me/dnd
 * Enable or disable Do Not Disturb mode
 */
app.post(
  '/api/users/me/dnd',
  requireAuth,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user?.userId;
      if (!userId) return res.status(401).json({ error: 'Unauthorized' });

      const validation = dndSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({ error: 'Invalid payload', details: validation.error.flatten() });
      }

      const { dndEnabled, dndStart, dndEnd } = validation.data;
      const settings = await prisma.userSettings.upsert({
        where: { userId },
        update: { dndEnabled, dndStart: dndStart ?? null, dndEnd: dndEnd ?? null },
        create: { userId, dndEnabled, dndStart: dndStart ?? null, dndEnd: dndEnd ?? null },
      });

      logger.info('[Users] DnD settings updated', { userId, dndEnabled });
      return res.json({ dndEnabled: settings.dndEnabled, dndStart: settings.dndStart, dndEnd: settings.dndEnd });
    } catch (err: any) {
      logger.error('[Users] POST /me/dnd error:', err.message);
      return res.status(500).json({ error: 'Failed to update DnD settings' });
    }
  }
);

/**
 * POST /api/emails/:id/read
 * Mark an email as read
 */
app.post(
  '/api/emails/:id/read',
  requireAuth,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user?.userId;
      if (!userId) return res.status(401).json({ error: 'Unauthorized' });
      const id = req.params.id as string;

      const email = await prisma.email.findUnique({ where: { id } });
      if (!email || email.userId !== userId) return res.status(404).json({ error: 'Email not found' });

      await prisma.email.update({ where: { id }, data: { status: 'READ' } });
      return res.json({ message: 'Email marked as read' });
    } catch (err: any) {
      logger.error('[Emails] POST /:id/read error:', err.message);
      return res.status(500).json({ error: 'Failed to mark email as read' });
    }
  }
);

/**
 * POST /api/emails/:id/archive
 * Archive an email
 */
app.post(
  '/api/emails/:id/archive',
  requireAuth,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user?.userId;
      if (!userId) return res.status(401).json({ error: 'Unauthorized' });
      const id = req.params.id as string;

      const email = await prisma.email.findUnique({ where: { id } });
      if (!email || email.userId !== userId) return res.status(404).json({ error: 'Email not found' });

      await prisma.email.update({ where: { id }, data: { status: 'ARCHIVED' } });
      logger.info('[Emails] Email archived', { id, userId });
      return res.json({ message: 'Email archived successfully' });
    } catch (err: any) {
      logger.error('[Emails] POST /:id/archive error:', err.message);
      return res.status(500).json({ error: 'Failed to archive email' });
    }
  }
);

/**
 * DELETE /api/emails/:id
 * Permanently delete an email
 */
app.delete(
  '/api/emails/:id',
  requireAuth,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user?.userId;
      if (!userId) return res.status(401).json({ error: 'Unauthorized' });
      const id = req.params.id as string;

      const email = await prisma.email.findUnique({ where: { id } });
      if (!email || email.userId !== userId) return res.status(404).json({ error: 'Email not found' });

      await prisma.email.delete({ where: { id } });
      logger.info('[Emails] Email deleted', { id, userId });
      return res.json({ message: 'Email deleted successfully' });
    } catch (err: any) {
      logger.error('[Emails] DELETE /:id error:', err.message);
      return res.status(500).json({ error: 'Failed to delete email' });
    }
  }
);

/**
 * GET /api/dashboard/heatmap
 * Returns email volume by hour and day for heatmap visualization
 */
app.get(
  '/api/dashboard/heatmap',
  requireAuth,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user?.userId;
      if (!userId) return res.status(401).json({ error: 'Unauthorized' });

      const days = parseInt(req.query.days as string) || 30;
      const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

      const emails = await prisma.email.findMany({
        where: { userId, createdAt: { gte: since } },
        select: { createdAt: true },
        orderBy: { createdAt: 'asc' },
      });

      // Build heatmap: { dayOfWeek: { hour: count } }
      const heatmap: Record<number, Record<number, number>> = {};
      for (let d = 0; d < 7; d++) {
        heatmap[d] = {};
        for (let h = 0; h < 24; h++) heatmap[d][h] = 0;
      }

      for (const email of emails) {
        const d = email.createdAt.getDay();
        const h = email.createdAt.getHours();
        heatmap[d][h] = (heatmap[d][h] || 0) + 1;
      }

      return res.json({ heatmap, totalEmails: emails.length, days });
    } catch (err: any) {
      logger.error('[Dashboard] GET /heatmap error:', err.message);
      return res.status(500).json({ error: 'Failed to generate heatmap' });
    }
  }
);

// Mount all routers
app.use('/api/rag', ragRouter);
app.use('/api/ai', aiRouter);
app.use('/api/tasks', tasksRouter);
app.use('/api/calendar/events', calendarRouter);
app.use('/api/expenses', expensesRouter);
app.use('/api/digests', digestsRouter);
app.use('/api/notifications', notificationsRouter);
app.use('/api/feedback', feedbackRouter);
app.use('/api/integrations', integrationsRouter);


// Start Server

const server = app.listen(PORT, () => {
  logger.info(`Auth service running on port ${PORT}`);

  // Register EventBus fallback handler AFTER server is listening
  // to avoid blocking startup if Redis is slow or unavailable.
  // This allows graceful degradation while the server remains responsive.
  EventBus.onFallback(() => {
    registerWorkerHandlers().catch((err) => {
      console.error(
        'Failed to register inline worker handlers on EventBus fallback:',
        err
      );
    });
  });

  // Initialize Telegram Bot Service
  TelegramBotService.init().catch((err) => {
    logger.error('Failed to initialize Telegram Bot Service:', err);
  });
});

// Initialize Socket.io Server with client-credentials CORS configuration
const io = new SocketIoServer(server, {
  cors: {
    origin: (origin: any, callback: any) => {
      if (
        !origin ||
        origin.startsWith('http://localhost') ||
        origin.startsWith('http://127.0.0.1')
      ) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: true,
  },
});
WebSocketService.initialize(io);

// Graceful Shutdown hooks
const gracefulShutdown = () => {
  logger.info('Received shutdown signal. Starting graceful cleanup...');
  TelegramBotService.shutdown();
  server.close(() => {
    logger.info('HTTP server closed.');
    prisma.$disconnect().then(() => {
      logger.info('Prisma client disconnected. Exiting.');
      process.exit(0);
    });
  });
};

process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);

export { app, server, prisma, io };
