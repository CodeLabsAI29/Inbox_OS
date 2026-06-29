import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret-key-change-in-production';
const JWT_EXPIRES_IN = '24h';
const SALT_ROUNDS = 10;

export class AuthService {
  /**
   * Hashes a plain text password using bcrypt with a minimum of 10 salt rounds.
   */
  public static async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, SALT_ROUNDS);
  }

  /**
   * Compares a plain text password with a hashed password.
   */
  public static async comparePassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
  }

  /**
   * Generates a JWT token containing the user's ID and email.
   */
  public static generateToken(userId: string, email: string): string {
    return jwt.sign(
      { userId, email },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );
  }

  /**
   * Verifies and decodes a JWT token.
   */
  public static verifyToken(token: string): { userId: string; email: string } | null {
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as { userId: string; email: string };
      return decoded;
    } catch (error) {
      return null;
    }
  }
}
