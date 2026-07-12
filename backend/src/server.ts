import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../.env') });

import './utils/redis-patch';
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
import { encrypt, decrypt } from './utils/crypto';
import { registerWorkerHandlers } from './worker';
import { Server as SocketIoServer } from 'socket.io';
import { WebSocketService } from './services/websocket.service';
// Firebase Admin — modular v14 imports
import { initializeApp as firebaseInitializeApp, getApps, cert } from 'firebase-admin/app';
import { getAuth as firebaseGetAuth } from 'firebase-admin/auth';

import { setupSwagger } from './config/swagger';
import { GmailSyncService } from './services/gmail-sync.service';
import { TelegramBotService } from './services/telegram-bot.service';
import { TelegramConfig } from './config/telegram.config';

// Import route controllers
import { aiRouter } from './routes/ai.routes';
import { calendarRouter } from './routes/calendar.routes';
import { digestsRouter } from './routes/digests.routes';
import { expensesRouter } from './routes/expenses.routes';
import { feedbackRouter } from './routes/feedback.routes';
import { integrationsRouter } from './routes/integrations.routes';
import { notificationsRouter } from './routes/notifications.routes';
import { ragRouter } from './routes/rag.routes';
import { remindersRouter } from './routes/reminders.routes';
import { tasksRouter } from './routes/tasks.routes';

// ── Firebase Admin SDK Initialization ────────────────────────────────────────
// Only initialize once; guard against hot-reload double-init in dev mode.
if (!getApps().length) {
  try {
    firebaseInitializeApp({
      credential: cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        // .env stores literal \n — Node needs real newlines
        privateKey: (process.env.FIREBASE_PRIVATE_KEY || '').replace(/\\n/g, '\n'),
      }),
    });
    logger.info('Firebase Admin SDK initialized');
  } catch (err: any) {
    logger.warn('Firebase Admin SDK init failed (Google Sign-In will be unavailable):', err.message);
  }
}


import { aiRouter } from './routes/ai.routes';
import { calendarRouter } from './routes/calendar.routes';
import { digestsRouter } from './routes/digests.routes';
import { expensesRouter } from './routes/expenses.routes';
import { feedbackRouter } from './routes/feedback.routes';
import { integrationsRouter } from './routes/integrations.routes';
import { notificationsRouter } from './routes/notifications.routes';
import { ragRouter } from './routes/rag.routes';
import { remindersRouter } from './routes/reminders.routes';
import { tasksRouter } from './routes/tasks.routes';

const app = express();
const prisma = new PrismaClient();
const PORT = process.env.PORT || 8000;

const allowedOrigins = [
  'http://localhost',
  'http://127.0.0.1',
  'https://inbox-os-frontend.vercel.app'
];

if (process.env.FRONTEND_URL) {
  allowedOrigins.push(process.env.FRONTEND_URL.replace(/\/$/, ''));
}
if (process.env.ALLOWED_ORIGINS) {
  process.env.ALLOWED_ORIGINS.split(',').forEach(o => allowedOrigins.push(o.trim().replace(/\/$/, '')));
}

app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (origin) {
    const originClean = origin.replace(/\/$/, '');
    const isVercelPreview = originClean.startsWith('https://inbox-os-frontend') && originClean.endsWith('.vercel.app');
    const isAllowed = isVercelPreview || allowedOrigins.some(o => 
      originClean === o || 
      (o.startsWith('http://localhost') && originClean.startsWith('http://localhost:')) ||
      (o.startsWith('http://127.0.0.1') && originClean.startsWith('http://127.0.0.1:'))
    );
    if (isAllowed) {
      res.setHeader('Access-Control-Allow-Origin', origin);
    }
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


/**
 * @swagger
 * /metrics:
 *   get:
 *     summary: Prometheus metrics endpoint
 *     tags:
 *       - Metrics
 *     responses:
 *       200:
 *         description: Metrics data in Prometheus format
 */
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
setupSwagger(app);

// Mount routes
app.use(ragRouter);
app.use('/api/actions/calendar/events', calendarRouter);
app.use('/api/ai', aiRouter);
app.use('/api/digests', digestsRouter);
app.use('/api/expenses', expensesRouter);
app.use('/api/feedback', feedbackRouter);
app.use('/api/integrations', integrationsRouter);
app.use('/api/notifications', notificationsRouter);
app.use('/api/reminders', remindersRouter);
app.use('/api/tasks', tasksRouter);

/**
 * @swagger
 * /api/health:
 *   get:
 *     summary: Health check
 *     tags:
 *       - Health
 *     responses:
 *       200:
 *         description: Service is healthy
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: ok
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *                   example: '2023-01-01T00:00:00Z'
 */
app.get('/api/health', (req: Request, res: Response) => {
  res.status(200).json({
    status: 'ok',
    timestamp: new Date(),
  });
});


/**
 * @swagger
 * /api/auth/register:
 *   post:
 *     summary: Register a new user
 *     tags:
 *       - Auth
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: user@example.com
 *               password:
 *                 type: string
 *                 format: password
 *                 example: secret123
 *     responses:
 *       201:
 *         description: User successfully registered
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: User registered successfully
 *                 user:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                     email:
 *                       type: string
 *                     createdAt:
 *                       type: string
 *                       format: date-time
 *       400:
 *         description: Bad request (missing fields or email already exists)
 *       500:
 *         description: Internal server error
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
      sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
    });

    return res.status(201).json({
      message: 'User registered successfully',
      token,
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
 * @swagger
 * /api/auth/login:
 *   post:
 *     summary: Login a user and set JWT cookie
 *     tags:
 *       - Auth
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: user@example.com
 *               password:
 *                 type: string
 *                 example: secret123
 *     responses:
 *       200:
 *         description: Successful login
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Logged in successfully
 *                 user:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                     email:
 *                       type: string
 *       400:
 *         description: Missing email or password
 *       401:
 *         description: Invalid credentials
 *       500:
 *         description: Internal server error
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
      sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
    });

    return res.status(200).json({
      message: 'Logged in successfully',
      token,
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
 * @swagger
 * /api/auth/logout:
 *   post:
 *     summary: Logout the current user (clears JWT cookie)
 *     tags:
 *       - Auth
 *     responses:
 *       200:
 *         description: Successfully logged out
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Logged out successfully
 *       500:
 *         description: Internal server error
 */
app.post('/api/auth/logout', (_req: Request, res: Response) => {
  res.clearCookie('token', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
  });
  return res.status(200).json({ message: 'Logged out successfully' });
});

/**
 * @swagger
 * /api/auth/me:
 *   get:
 *     summary: Get current authenticated user profile
 *     tags:
 *       - Auth
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: Authenticated user profile
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 user:
 *                   $ref: '#/components/schemas/User'
 *       401:
 *         description: Unauthorized
 */
app.get('/api/auth/me', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  return res.status(200).json({
    user: req.user,
  });
});

/**
 * POST /api/auth/firebase
 * Verifies a Firebase ID token (from Google Sign-In popup on the frontend)
 * and returns a JWT session cookie. Creates the user in DB if first time.
 */
app.post('/api/auth/firebase', async (req: Request, res: Response) => {
  const { idToken } = req.body;
  if (!idToken) {
    return res.status(400).json({ error: 'idToken is required' });
  }

  if (!getApps().length) {
    return res.status(503).json({ error: 'Firebase Admin not configured on server' });
  }

  try {
    const decoded = await firebaseGetAuth().verifyIdToken(idToken);
    const email = decoded.email;
    if (!email) {
      return res.status(400).json({ error: 'Firebase token has no email' });
    }

    // Find or create user
    let user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      user = await prisma.user.create({
        data: {
          email,
          // Random unusable password — Firebase is the auth provider
          passwordHash: crypto.randomBytes(32).toString('hex'),
        },
      });
    }

    const token = AuthService.generateToken(user.id, user.email, user.username);
    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
    });

    return res.status(200).json({
      message: 'Authenticated via Firebase',
      token,
      user: { id: user.id, email: user.email, username: user.username },
    });
  } catch (err: any) {
    logger.error('Firebase auth error:', { error: err.message });
    return res.status(401).json({ error: 'Invalid or expired Firebase token' });
  }
});

/**
 * POST /api/auth/google/check
 * Checks if a Google account is registered, returning its username if it exists.
 */
app.post('/api/auth/google/check', async (req: Request, res: Response) => {
  const { idToken } = req.body;
  if (!idToken) {
    return res.status(400).json({ error: 'idToken is required' });
  }

  if (!getApps().length) {
    return res.status(503).json({ error: 'Firebase Admin not configured on server' });
  }

  try {
    const decoded = await firebaseGetAuth().verifyIdToken(idToken);
    const email = decoded.email;
    if (!email) {
      return res.status(400).json({ error: 'Firebase token has no email' });
    }

    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (user) {
      return res.status(200).json({
        isRegistered: true,
        username: user.username,
        email,
      });
    } else {
      return res.status(200).json({
        isRegistered: false,
        email,
      });
    }
  } catch (err: any) {
    logger.error('Google registration check error:', { error: err.message });
    return res.status(401).json({ error: 'Invalid or expired Firebase token' });
  }
});

/**
 * POST /api/auth/google/register
 * Registers a new user with Google account verification, username, and password.
 */
app.post('/api/auth/google/register', async (req: Request, res: Response) => {
  const { idToken, username, password } = req.body;
  if (!idToken || !username || !password) {
    return res.status(400).json({ error: 'idToken, username, and password are required' });
  }

  if (username.length < 3) {
    return res.status(400).json({ error: 'Username must be at least 3 characters long' });
  }

  if (password.length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters long' });
  }

  if (!getApps().length) {
    return res.status(503).json({ error: 'Firebase Admin not configured on server' });
  }

  try {
    const decoded = await firebaseGetAuth().verifyIdToken(idToken);
    const email = decoded.email;
    if (!email) {
      return res.status(400).json({ error: 'Firebase token has no email' });
    }

    // Check if email already registered
    const existingEmail = await prisma.user.findUnique({
      where: { email },
    });
    if (existingEmail) {
      return res.status(400).json({ error: 'This Google account is already registered. Please log in.' });
    }

    // Check if username already taken
    const existingUsername = await prisma.user.findUnique({
      where: { username },
    });
    if (existingUsername) {
      return res.status(400).json({ error: 'This username is already taken. Please choose another one.' });
    }

    const passwordHash = await AuthService.hashPassword(password);

    const user = await prisma.user.create({
      data: {
        email,
        username,
        passwordHash,
      },
    });

    const token = AuthService.generateToken(user.id, user.email, user.username);
    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
      maxAge: 24 * 60 * 60 * 1000,
    });

    return res.status(201).json({
      message: 'User registered successfully',
      token,
      user: { id: user.id, email: user.email, username: user.username },
    });
  } catch (err: any) {
    logger.error('Google registration error:', { error: err.message });
    return res.status(500).json({ error: 'Registration failed: ' + err.message });
  }
});

/**
 * POST /api/auth/google/login
 * Logs in a user by matching their Google account, username, and password.
 */
app.post('/api/auth/google/login', async (req: Request, res: Response) => {
  const { idToken, username, password } = req.body;
  if (!idToken || !username || !password) {
    return res.status(400).json({ error: 'idToken, username, and password are required' });
  }

  if (!getApps().length) {
    return res.status(503).json({ error: 'Firebase Admin not configured on server' });
  }

  try {
    const decoded = await firebaseGetAuth().verifyIdToken(idToken);
    const email = decoded.email;
    if (!email) {
      return res.status(400).json({ error: 'Firebase token has no email' });
    }

    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      return res.status(401).json({ error: 'You are not registered under this Google account.' });
    }

    if (user.username !== username) {
      return res.status(401).json({ error: 'Incorrect username for this Google account.' });
    }

    const isPasswordValid = await AuthService.comparePassword(password, user.passwordHash);
    if (!isPasswordValid) {
      return res.status(401).json({ error: 'Incorrect password.' });
    }

    const token = AuthService.generateToken(user.id, user.email, user.username);
    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
      maxAge: 24 * 60 * 60 * 1000,
    });

    return res.status(200).json({
      message: 'Logged in successfully',
      token,
      user: { id: user.id, email: user.email, username: user.username },
    });
  } catch (err: any) {
    logger.error('Google login error:', { error: err.message });
    return res.status(401).json({ error: 'Authentication failed: ' + err.message });
  }
});

/**
 * @swagger
 * /api/users/profile:
 *   get:
 *     summary: Get user profile with settings
 *     tags:
 *       - Users
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: User profile data
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: string
 *                 email:
 *                   type: string
 *                 createdAt:
 *                   type: string
 *                   format: date-time
 *                 settings:
 *                   type: object
 *                   properties:
 *                     theme:
 *                       type: string
 *                     signature:
 *                       type: string
 *                       nullable: true
 *                     autoReply:
 *                       type: boolean
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: User not found
 */
app.get('/api/users/profile', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    let newToken: string | undefined;

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
 * @swagger
 * /api/webhooks/incoming:
 *   post:
 *     summary: Ingest incoming email webhook
 *     tags:
 *       - Webhooks
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/IncomingEmail'
 *     responses:
 *       201:
 *         description: Email ingested successfully
 *       400:
 *         description: Invalid payload
 *       500:
 *         description: Internal server error
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

app.post('/api/telegram/webhook', async (req: Request, res: Response) => {
  try {
    // Verify Telegram secret token if configured
    const secretHeader = req.headers['x-telegram-bot-api-secret-token'];
    if (TelegramConfig.webhookSecret && secretHeader !== TelegramConfig.webhookSecret) {
      logger.warn('[TelegramBot] Rejected webhook request with invalid secret token.');
      return res.status(403).json({ error: 'Forbidden' });
    }

    // Process the update asynchronously to respond to Telegram immediately (with 200 OK)
    TelegramBotService.handleUpdate(req.body).catch((err) => {
      logger.error('[TelegramBot] Webhook update handling error:', err);
    });

    return res.status(200).json({ ok: true });
  } catch (error) {
    logger.error('Telegram webhook endpoint error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});


/**
 * @swagger
 * /api/users/me/settings:
 *   get:
 *     summary: Retrieve current user settings
 *     tags:
 *       - Users
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: Settings object
 *       401:
 *         description: Unauthorized
 */
/**
 * @swagger
 * /api/users/me/settings:
 *   get:
 *     summary: Get current user's settings
 *     tags:
 *       - Users
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: User settings object
 */
app.get('/api/users/me/settings', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    let newToken: string | undefined;

    const settings = await prisma.userSettings.findUnique({
      where: { userId },
    });
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { username: true, email: true },
    });

    return res.status(200).json({
      theme: settings?.theme ?? 'dark',
      signature: settings?.signature ?? null,
      autoReply: settings?.autoReply ?? false,
      username: user?.username ?? null,
      email: user?.email ?? '',
      userId,
    });
  } catch (error) {
    console.error('Fetch settings error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/users/me/ai-profile
 * Retrieve user's AI profile from settings.
 */
app.get('/api/users/me/ai-profile', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const settings = await prisma.userSettings.findUnique({
      where: { userId },
    });

    if (!settings || !settings.aiPreferenceProfile) {
      return res.status(200).json({ weekly: {} });
    }

    try {
      const parsed = JSON.parse(settings.aiPreferenceProfile);
      return res.status(200).json(parsed);
    } catch {
      return res.status(200).json({ weekly: {} });
    }
  } catch (error) {
    console.error('Fetch ai-profile error:', error);
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
  username: z.string().min(3).max(30).optional(),
});

/**
 * @swagger
 * /api/users/me/settings:
 *   put:
 *     summary: Update user settings
 *     tags:
 *       - Users
 *     security:
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UserSettings'
 *     responses:
 *       200:
 *         description: Settings updated
 *       400:
 *         description: Invalid payload
 *       401:
 *         description: Unauthorized
 */
/**
 * @swagger
 * /api/users/me/settings:
 *   put:
 *     summary: Update current user's settings
 *     tags:
 *       - Users
 *     security:
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UserSettings'
 *     responses:
 *       200:
 *         description: Settings updated
 */
app.put('/api/users/me/settings', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    let newToken: string | undefined;

    const validation = updateSettingsSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({
        error: 'Invalid payload schema',
        details: validation.error.flatten(),
      });
    }

    const { theme, signature, autoReply, username } = validation.data;

    if (username) {
      const existing = await prisma.user.findFirst({
        where: { username, NOT: { id: userId } },
      });
      if (existing) {
        return res.status(400).json({ error: 'Username is already taken' });
      }

      await prisma.user.update({
        where: { id: userId },
        data: { username },
      });

      const user = await prisma.user.findUnique({ where: { id: userId } });
      if (user) {
        newToken = AuthService.generateToken(user.id, user.email, username);
        res.cookie('token', newToken, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
          maxAge: 24 * 60 * 60 * 1000,
        });
      }
    }

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
        username: username || null,
      },
    });
  } catch (error) {
    console.error('Update settings error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// OAuth2 & Encryption config
const getOAuth2Client = (req?: Request) => {
  let redirectUri = process.env.GMAIL_REDIRECT_URI;
  if (!redirectUri && req) {
    const protocol = process.env.NODE_ENV === 'production' ? 'https' : req.protocol;
    const host = req.get('host');
    redirectUri = `${protocol}://${host}/api/integrations/gmail/callback`;
  }
  if (!redirectUri) {
    redirectUri = process.env.RENDER_EXTERNAL_URL 
      ? `${process.env.RENDER_EXTERNAL_URL.replace(/\/$/, '')}/api/integrations/gmail/callback` 
      : 'http://localhost:8000/api/integrations/gmail/callback';
  }
  return new google.auth.OAuth2(
    process.env.GMAIL_CLIENT_ID,
    process.env.GMAIL_CLIENT_SECRET,
    redirectUri
  );
};

const oauth2Client = getOAuth2Client();

/**
 * GET /api/integrations/gmail/auth
 * Generates the Google OAuth URL.
 */
/**
 * @swagger
 * /api/integrations/gmail/auth:
 *   get:
 *     summary: Generate Google OAuth URL
 *     tags:
 *       - Integrations
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: OAuth URL
 */
/**
 * @swagger
 * /api/integrations/gmail/auth:
 *   get:
 *     summary: Initiate Gmail OAuth flow
 *     tags:
 *       - Integrations
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       302:
 *         description: Redirect to Google OAuth consent screen
 */
app.get('/api/integrations/gmail/auth', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const client = getOAuth2Client(req);
  const url = client.generateAuthUrl({
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
/**
 * @swagger
 * /api/integrations/gmail/callback:
 *   get:
 *     summary: Google OAuth callback
 *     tags:
 *       - Integrations
 *     parameters:
 *       - in: query
 *         name: code
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: state
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Gmail connected
 *       400:
 *         description: Missing parameters
 *       500:
 *         description: Server error
 */
/**
 * @swagger
 * /api/integrations/gmail/callback:
 *   get:
 *     summary: Gmail OAuth callback handling
 *     tags:
 *       - Integrations
 *     responses:
 *       200:
 *         description: OAuth callback processed
 */
app.get('/api/integrations/gmail/callback', async (req: Request, res: Response) => {
  const code = req.query.code as string;
  const userId = req.query.state as string;
  
  if (!code || !userId) {
    return res.status(400).json({ error: 'Missing code or state parameters' });
  }

  try {
    const client = getOAuth2Client(req);
    const { tokens } = await client.getToken(code);
    client.setCredentials(tokens);

    const gmail = google.gmail({ version: 'v1', auth: client });
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

      const jwtToken = AuthService.generateToken(user.id, user.email);
      res.cookie('token', jwtToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
        maxAge: 24 * 60 * 60 * 1000,
      });

      // Also connect their Gmail account
      const encryptedTokens = encrypt(JSON.stringify(tokens));
      await prisma.emailAccount.upsert({
        where: { userId_provider_emailAddress: { userId: user.id, provider: 'gmail', emailAddress } },
        update: { encryptedTokens, syncState: 'connected', lastSyncAt: new Date() },
        create: { userId: user.id, provider: 'gmail', emailAddress, encryptedTokens, syncState: 'connected' }
      });

      // Trigger sync in background immediately
      GmailSyncService.syncLatestEmails(user.id).catch(err => {
        logger.error('[GmailCallback] Initial Google Sign-in Gmail sync failed:', err);
      });

      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
      return res.redirect(`${frontendUrl}/dashboard?token=${jwtToken}`);
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

    // Trigger sync in background immediately
    GmailSyncService.syncLatestEmails(userId).catch(err => {
      logger.error('[GmailCallback] Initial Gmail connect sync failed:', err);
    });

    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    return res.redirect(`${frontendUrl}/dashboard/settings?tab=integrations`);
  } catch (error) {
    console.error('OAuth callback error:', error);
    return res.status(500).json({ error: 'OAuth integration failed' });
  }
});

/**
 * GET /api/integrations/gmail/status
 * Returns whether the authenticated user has a connected Gmail account.
 */
app.get('/api/integrations/gmail/status', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const account = await prisma.emailAccount.findFirst({
      where: { userId, provider: 'gmail' },
      select: { emailAddress: true, syncState: true, lastSyncAt: true },
    });

    if (!account) {
      return res.json({ connected: false });
    }

    return res.json({
      connected: true,
      emailAddress: account.emailAddress,
      syncState: account.syncState,
      lastSyncAt: account.lastSyncAt,
    });
  } catch (error) {
    console.error('Gmail status error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/integrations/gmail/sync
 * Fetches the latest 50 unread Gmail messages for the authenticated user
 * and stores them in the Email table.
 */
app.post('/api/integrations/gmail/sync', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const account = await prisma.emailAccount.findFirst({
      where: { userId, provider: 'gmail' },
    });

    if (!account) {
      return res.status(400).json({ error: 'No Gmail account connected. Please connect Gmail first.' });
    }

    // Decrypt stored tokens
    let tokens: any;
    try {
      tokens = JSON.parse(decrypt(account.encryptedTokens));
    } catch (e) {
      return res.status(400).json({ error: 'Failed to decrypt Gmail tokens. Please reconnect Gmail.' });
    }

    // Build authenticated Gmail client with stored tokens
    const userOAuth = new google.auth.OAuth2(
      process.env.GMAIL_CLIENT_ID,
      process.env.GMAIL_CLIENT_SECRET,
      process.env.GMAIL_REDIRECT_URI
    );
    userOAuth.setCredentials(tokens);

    // Auto-refresh token if expired
    userOAuth.on('tokens', async (newTokens) => {
      const merged = { ...tokens, ...newTokens };
      const encrypted = encrypt(JSON.stringify(merged));
      await prisma.emailAccount.update({
        where: { id: account.id },
        data: { encryptedTokens: encrypted },
      });
    });

    const gmail = google.gmail({ version: 'v1', auth: userOAuth });

    // Fetch list of latest 50 messages
    const listRes = await gmail.users.messages.list({
      userId: 'me',
      maxResults: 50,
      q: 'in:inbox',
    });

    const messages = listRes.data.messages || [];
    if (messages.length === 0) {
      await prisma.emailAccount.update({
        where: { id: account.id },
        data: { lastSyncAt: new Date() },
      });
      return res.json({ synced: 0, message: 'No messages found in inbox.' });
    }

    let syncedCount = 0;

    for (const msg of messages) {
      if (!msg.id) continue;

      // Skip if already stored
      const existing = await prisma.email.findUnique({ where: { messageId: msg.id } });
      if (existing) continue;

      try {
        const fullMsg = await gmail.users.messages.get({
          userId: 'me',
          id: msg.id,
          format: 'full',
        });

        const headers = fullMsg.data.payload?.headers || [];
        const getHeader = (name: string) =>
          headers.find((h) => h.name?.toLowerCase() === name.toLowerCase())?.value || '';

        const subject = getHeader('Subject') || '(no subject)';
        const from = getHeader('From') || 'unknown@unknown.com';
        const to = getHeader('To') || account.emailAddress;
        const messageId = getHeader('Message-ID') || msg.id;
        const inReplyTo = getHeader('In-Reply-To') || null;

        // Extract plain text body
        let body = '';
        const extractBody = (part: any): string => {
          if (part.mimeType === 'text/plain' && part.body?.data) {
            return Buffer.from(part.body.data, 'base64url').toString('utf-8');
          }
          if (part.parts) {
            for (const p of part.parts) {
              const text = extractBody(p);
              if (text) return text;
            }
          }
          return '';
        };

        if (fullMsg.data.payload) {
          body = extractBody(fullMsg.data.payload);
        }
        if (!body && fullMsg.data.snippet) {
          body = fullMsg.data.snippet;
        }

        // Find or create thread
        let threadId: string | null = null;
        if (inReplyTo) {
          const prev = await prisma.email.findUnique({ where: { messageId: inReplyTo } });
          if (prev) threadId = prev.threadId;
        }
        if (!threadId) {
          const newThread = await prisma.thread.create({
            data: { summary: `Thread: ${subject}` },
          });
          threadId = newThread.id;
        }

        const emailRecord = await prisma.email.create({
          data: {
            messageId,
            inReplyTo,
            sender: from,
            recipient: to,
            subject,
            body,
            status: 'UNREAD',
            userId,
            threadId,
          },
        });
        syncedCount++;
        await EventBus.publish('email.received', { emailId: emailRecord.id });
      } catch (msgErr: any) {
        console.warn(`Failed to sync message ${msg.id}:`, msgErr.message);
      }
    }

    // Update last sync time
    await prisma.emailAccount.update({
      where: { id: account.id },
      data: { lastSyncAt: new Date() },
    });

    return res.json({ synced: syncedCount, total: messages.length });
  } catch (error: any) {
    console.error('Gmail sync error:', error.message);
    return res.status(500).json({ error: 'Gmail sync failed. ' + error.message });
  }
});


/**
 * POST /api/emails/send
 * Sends an outbound email via SMTP
 */
/**
 * @swagger
 * /api/emails/send:
 *   post:
 *     summary: Send an email
 *     tags:
 *       - Emails
 *     security:
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/SendEmailRequest'
 *     responses:
 *       200:
 *         description: Email sent
 *       400:
 *         description: Invalid request
 *       401:
 *         description: Unauthorized
 */
/**
 * @swagger
 * /api/emails/send:
 *   post:
 *     summary: Send an email
 *     tags:
 *       - Emails
 *     security:
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/SendEmailRequest'
 *     responses:
 *       202:
 *         description: Email queued for sending
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
/**
 * @swagger
 * /api/webhooks/config:
 *   post:
 *     summary: Create webhook config
 *     tags:
 *       - Webhooks
 *     security:
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/WebhookConfig'
 *     responses:
 *       200:
 *         description: Webhook created
 *       400:
 *         description: Invalid request
 *       401:
 *         description: Unauthorized
 */
/**
 * @swagger
 * /api/webhooks/config:
 *   post:
 *     summary: Create a new webhook configuration
 *     tags:
 *       - Webhooks
 *     security:
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/WebhookConfig'
 *     responses:
 *       201:
 *         description: Webhook configuration created
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

/**
 * @swagger
 * /api/webhooks/config:
 *   get:
 *     summary: List webhook configs
 *     tags:
 *       - Webhooks
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: List of webhooks
 *       401:
 *         description: Unauthorized
 */
/**
 * @swagger
 * /api/webhooks/config:
 *   get:
 *     summary: List webhook configurations
 *     tags:
 *       - Webhooks
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: List of webhook configs
 */
app.get('/api/webhooks/config', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const hooks = await prisma.webhookEndpoint.findMany({ where: { userId } });
    const formatted = hooks.map((h: { id: string; targetUrl: string; events: string }) => ({ id: h.id, targetUrl: h.targetUrl, events: JSON.parse(h.events) }));
    return res.json(formatted);
  } catch (err) {
    return res.status(500).json({ error: 'Failed to fetch webhooks' });
  }
});

/**
 * @swagger
 * /api/webhooks/config/{id}:
 *   patch:
 *     summary: Update webhook config
 *     tags:
 *       - Webhooks
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/WebhookConfig'
 *     responses:
 *       200:
 *         description: Updated
 *       400:
 *         description: Invalid request
 *       401:
 *         description: Unauthorized
 */
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

/**
 * @swagger
 * /api/webhooks/config/{id}:
 *   delete:
 *     summary: Delete webhook config
 *     tags:
 *       - Webhooks
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Deleted
 *       401:
 *         description: Unauthorized
 */
/**
 * @swagger
 * /api/webhooks/config/{id}:
 *   delete:
 *     summary: Delete a webhook configuration
 *     tags:
 *       - Webhooks
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       204:
 *         description: Webhook deleted
 */
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
/**
 * @swagger
 * /api/emails:
 *   get:
 *     summary: List emails
 *     tags:
 *       - Emails
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *       - in: query
 *         name: offset
 *         schema:
 *           type: integer
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Email list
 *       401:
 *         description: Unauthorized
 */
/**
 * @swagger
 * /api/emails:
 *   get:
 *     summary: List sent emails
 *     tags:
 *       - Emails
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: Array of email objects
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
 * GET /api/emails/:id
 * Returns a single email with its thread list and action items.
 */
/**
 * @swagger
 * /api/emails/{id}:
 *   get:
 *     summary: Get email by ID
 *     tags:
 *       - Emails
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Email details
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Not found
 */
/**
 * @swagger
 * /api/emails/{id}:
 *   get:
 *     summary: Get a single email by ID
 *     tags:
 *       - Emails
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Email object
 */
/**
 * GET /api/emails/search
 * Search emails by subject or body.
 */
app.get('/api/emails/search', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const q = req.query.q as string;
    if (!q || !q.trim()) {
      return res.status(400).json({ error: 'Query parameter "q" is required and cannot be empty' });
    }

    const rawLimit = parseInt(req.query.limit as string);
    const limit = isNaN(rawLimit) || rawLimit <= 0 ? 20 : Math.min(rawLimit, 20);

    const rawOffset = parseInt(req.query.offset as string);
    const offset = isNaN(rawOffset) || rawOffset < 0 ? 0 : rawOffset;

    const where = {
      userId,
      OR: [
        { subject: { contains: q } },
        { body: { contains: q } }
      ]
    };

    const [emails, total] = await Promise.all([
      prisma.email.findMany({
        where,
        take: limit,
        skip: offset,
        orderBy: { createdAt: 'desc' }
      }),
      prisma.email.count({ where })
    ]);

    return res.json({
      emails,
      pagination: {
        total,
        limit,
        offset
      }
    });
  } catch (err: any) {
    console.error('GET /api/emails/search error:', err);
    return res.status(500).json({ error: 'Failed to search emails' });
  }
});

app.get('/api/emails/:id', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const id = req.params.id as string;
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(id)) {
      return res.status(400).json({ error: 'Invalid email ID format' });
    }

    const email = await prisma.email.findUnique({
      where: { id },
      include: {
        actionItems: true,
        analysis: true,
        thread: {
          include: {
            emails: {
              orderBy: {
                createdAt: 'asc'
              }
            }
          }
        }
      }
    });

    if (!email || email.userId !== userId) {
      return res.status(404).json({ error: 'Email not found' });
    }

    return res.json(email);
  } catch (error) {
    console.error('GET /api/emails/:id error:', error);
    return res.status(500).json({ error: 'Failed to fetch email details' });
  }
});

/**
 * Rules Engine Validation Schemas
 */
const ruleConditionSchema = z.object({
  field: z.enum(['from', 'to', 'subject', 'body', 'category', 'priority', 'hasAttachments', 'senderDomain']),
  operator: z.enum(['equals', 'contains', 'startsWith', 'endsWith', 'regex', 'gt', 'lt', 'in']),
  value: z.string()
});

const ruleActionSchema = z.object({
  type: z.enum(['moveToFolder', 'applyLabel', 'markAsRead', 'markAsUrgent', 'forwardTo', 'webhook', 'sendTelegram', 'sendWhatsApp']),
  config: z.record(z.string(), z.any())
});

const createRuleSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  priority: z.number().int().default(0),
  conditions: z.array(ruleConditionSchema).min(1),
  actions: z.array(ruleActionSchema).min(1)
});

/**
 * GET /api/rules
 * List all rules for authenticated user, ordered by priority
 */
/**
 * @swagger
 * /api/rules:
 *   get:
 *     summary: List rules
 *     tags:
 *       - Rules
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: Rules list
 *       401:
 *         description: Unauthorized
 */
/**
 * @swagger
 * /api/rules:
 *   get:
 *     summary: List rule definitions
 *     tags:
 *       - Rules
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: Array of rule objects
 */
app.get('/api/rules', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const rules = await prisma.rule.findMany({
      where: { userId },
      orderBy: { priority: 'desc' },
      include: {
        conditions: true,
        actions: true
      }
    });

    return res.json(rules);
  } catch (error) {
    console.error('GET /api/rules error:', error);
    return res.status(500).json({ error: 'Failed to fetch rules' });
  }
});

/**
 * POST /api/rules
 * Create a new rule with conditions and actions
 */
/**
 * @swagger
 * /api/rules:
 *   post:
 *     summary: Create a rule
 *     tags:
 *       - Rules
 *     security:
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/RuleCreate'
 *     responses:
 *       201:
 *         description: Rule created
 *       400:
 *         description: Invalid request
 *       401:
 *         description: Unauthorized
 */
/**
 * @swagger
 * /api/rules:
 *   post:
 *     summary: Create a new rule
 *     tags:
 *       - Rules
 *     security:
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/RuleCreate'
 *     responses:
 *       201:
 *         description: Rule created
 */
app.post('/api/rules', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const validation = createRuleSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({
        error: 'Invalid request payload',
        details: validation.error.flatten()
      });
    }

    const { name, description, priority, conditions, actions } = validation.data;

    const newRule = await prisma.rule.create({
      data: {
        userId,
        name,
        description,
        priority,
        conditions: {
          create: conditions
        },
        actions: {
          create: actions as any
        }
      },
      include: {
        conditions: true,
        actions: true
      }
    });

    return res.status(201).json(newRule);
  } catch (error) {
    console.error('POST /api/rules error:', error);
    return res.status(500).json({ error: 'Failed to create rule' });
  }
});

/**
 * GET /api/rules/:id
 * Retrieve single rule details
 */
/**
 * @swagger
 * /api/rules/{id}:
 *   get:
 *     summary: Get rule by ID
 *     tags:
 *       - Rules
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Rule details
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Not found
 */
/**
 * @swagger
 * /api/rules/{id}:
 *   get:
 *     summary: Get rule by ID
 *     tags:
 *       - Rules
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Rule object
 */
app.get('/api/rules/:id', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const id = req.params.id as string;
    const rule = await prisma.rule.findUnique({
      where: { id },
      include: {
        conditions: true,
        actions: true
      }
    });

    if (!rule || rule.userId !== userId) {
      return res.status(404).json({ error: 'Rule not found' });
    }

    return res.json(rule);
  } catch (error) {
    console.error('GET /api/rules/:id error:', error);
    return res.status(500).json({ error: 'Failed to fetch rule' });
  }
});

/**
 * PUT /api/rules/:id
 * Update rule by replacing conditions and actions
 */
/**
 * @swagger
 * /api/rules/{id}:
 *   put:
 *     summary: Update rule
 *     tags:
 *       - Rules
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/RuleUpdate'
 *     responses:
 *       200:
 *         description: Rule updated
 *       400:
 *         description: Invalid request
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Not found
 */
/**
 * @swagger
 * /api/rules/{id}:
 *   put:
 *     summary: Update rule by ID
 *     tags:
 *       - Rules
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/RuleUpdate'
 *     responses:
 *       200:
 *         description: Rule updated
 */
app.put('/api/rules/:id', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
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
        details: validation.error.flatten()
      });
    }

    const { name, description, priority, conditions, actions } = validation.data;

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
            create: conditions
          },
          actions: {
            create: actions as any
          }
        },
        include: {
          conditions: true,
          actions: true
        }
      });
    });

    return res.json(updatedRule);
  } catch (error) {
    console.error('PUT /api/rules/:id error:', error);
    return res.status(500).json({ error: 'Failed to update rule' });
  }
});

/**
 * DELETE /api/rules/:id
 * Deletes a rule
 */
/**
 * @swagger
 * /api/rules/{id}:
 *   delete:
 *     summary: Delete rule
 *     tags:
 *       - Rules
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Rule deleted
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Not found
 */
/**
 * @swagger
 * /api/rules/{id}:
 *   delete:
 *     summary: Delete rule by ID
 *     tags:
 *       - Rules
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       204:
 *         description: Rule deleted
 */
app.delete('/api/rules/:id', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
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
});

/**
 * POST /api/rules/:id/toggle
 * Toggles isActive status
 */
/**
 * @swagger
 * /api/rules/{id}/toggle:
 *   post:
 *     summary: Toggle rule active state
 *     tags:
 *       - Rules
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Rule toggled
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Not found
 */
/**
 * @swagger
 * /api/rules/{id}/toggle:
 *   post:
 *     summary: Toggle rule enabled state
 *     tags:
 *       - Rules
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Rule toggled
 */
app.post('/api/rules/:id/toggle', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
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
      data: { isActive: !rule.isActive }
    });

    return res.json({ message: 'Rule toggled successfully', isActive: updated.isActive });
  } catch (error) {
    console.error('POST /api/rules/:id/toggle error:', error);
    return res.status(500).json({ error: 'Failed to toggle rule' });
  }
});

/**
 * GET /api/auth/google
 * PUBLIC — Generates Google OAuth URL for sign-in/sign-up via Google.
 * No JWT required. The callback handles user creation automatically.
 */
/**
 * @swagger
 * /api/auth/google:
 *   get:
 *     summary: Get Google OAuth URL
 *     tags:
 *       - Auth
 *     responses:
 *       200:
 *         description: OAuth URL
 */
/**
 * @swagger
 * /api/auth/google:
 *   get:
 *     summary: Initiate Google OAuth login
 *     tags:
 *       - Auth
 *     responses:
 *       302:
 *         description: Redirect to Google OAuth URL
 */
app.get('/api/auth/google', (req: Request, res: Response) => {
  const client = getOAuth2Client(req);
  const url = client.generateAuthUrl({
    access_type: 'offline',
    scope: ['https://mail.google.com/', 'https://www.googleapis.com/auth/userinfo.email', 'https://www.googleapis.com/auth/userinfo.profile'],
    prompt: 'consent',
    state: 'google-signin' // special flag — callback will auto-create user
  });
  return res.json({ url });
});

// Mount integrated routers
app.use('/api/ai', aiRouter);
app.use('/api/actions/calendar/events', calendarRouter);
app.use('/api/digests', digestsRouter);
app.use('/api/expenses', expensesRouter);
app.use('/api/feedback', feedbackRouter);
app.use('/api/integrations', integrationsRouter);
app.use('/api/notifications', notificationsRouter);
app.use('/api/rag', ragRouter);
app.use('/api/reminders', remindersRouter);
app.use('/api/tasks', tasksRouter);

// Start Server

const server = app.listen(PORT, () => {
  logger.info(`Auth service running on port ${PORT}`);

  // Initialize Telegram Bot Service
  TelegramBotService.init().catch((err) => {
    logger.error('Failed to initialize Telegram Bot Service:', err);
  });

  // Register inline worker handlers to handle BullMQ/Redis tasks
  registerWorkerHandlers().catch((err) => {
    logger.error('Failed to register inline worker handlers:', err);
  });
  
  // Register EventBus fallback handler AFTER server is listening
  // to avoid blocking startup if Redis is slow or unavailable.
  // This allows graceful degradation while the server remains responsive.
  EventBus.onFallback(() => {
    registerWorkerHandlers().catch((err) => {
      console.error('Failed to register inline worker handlers on EventBus fallback:', err);
    });
  });
});

// Initialize Socket.io Server with client-credentials CORS configuration
const io = new SocketIoServer(server, {
  cors: {
    origin: (origin: any, callback: any) => {
      if (!origin) {
        callback(null, true);
        return;
      }
      const originClean = origin.replace(/\/$/, '');
      const isVercelPreview = originClean.startsWith('https://inbox-os-frontend') && originClean.endsWith('.vercel.app');
      const isAllowed = isVercelPreview || allowedOrigins.some(o => 
        originClean === o || 
        (o.startsWith('http://localhost') && originClean.startsWith('http://localhost:')) ||
        (o.startsWith('http://127.0.0.1') && originClean.startsWith('http://127.0.0.1:'))
      );
      if (isAllowed) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: true
  }
});
WebSocketService.initialize(io);

export { app, server, prisma, io };
