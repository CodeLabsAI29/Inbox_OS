import express, { Request, Response } from 'express';
import cookieParser from 'cookie-parser';
import { PrismaClient } from '@prisma/client';
import { AuthService } from './services/auth.service';
import { requireAuth, AuthenticatedRequest } from './middleware/auth.middleware';

const app = express();
const prisma = new PrismaClient();
const PORT = process.env.PORT || 8000;

// Middleware
app.use(express.json());
app.use(cookieParser());

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
      sameSite: 'strict',
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

// Start Server
const server = app.listen(PORT, () => {
  console.log(`Auth service running on port ${PORT}`);
});

export { app, server, prisma };
