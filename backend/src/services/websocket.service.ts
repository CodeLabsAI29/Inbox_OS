import { Server, Socket } from 'socket.io';
import { AuthService } from './auth.service';
import { logger } from '../utils/logger';

export class WebSocketService {
  private static io: Server | null = null;

  /**
   * Initializes the Socket.io server instance and sets up authentication middleware.
   */
  public static initialize(ioServer: Server) {
    this.io = ioServer;

    // Handshake Cookie-based authentication middleware
    this.io.use((socket: Socket, next) => {
      try {
        const cookieHeader = socket.handshake.headers.cookie;
        if (!cookieHeader) {
          return next(new Error('Authentication error: No cookies provided'));
        }

        // Parse cookie header
        const cookies = cookieHeader.split(';').reduce((acc: Record<string, string>, c) => {
          const parts = c.trim().split('=');
          const key = parts[0];
          const value = parts.slice(1).join('=');
          if (key && value) {
            acc[key] = decodeURIComponent(value);
          }
          return acc;
        }, {});

        const token = cookies.token;
        if (!token) {
          return next(new Error('Authentication error: Token cookie missing'));
        }

        const payload = AuthService.verifyToken(token);
        if (!payload || !payload.userId) {
          return next(new Error('Authentication error: Invalid or expired token'));
        }

        // Bind user payload to socket session
        (socket as any).user = payload;
        next();
      } catch (err: any) {
        logger.error('[WebSocket Auth Error] Middleware verification failed:', err);
        next(new Error('Internal authentication parsing error'));
      }
    });

    this.io.on('connection', (socket: Socket) => {
      const user = (socket as any).user;
      const room = `user:${user.userId}`;
      
      socket.join(room);
      logger.info(`[WebSocket] Client connected: ${socket.id} joined room: ${room}`);

      socket.on('disconnect', () => {
        logger.info(`[WebSocket] Client disconnected: ${socket.id}`);
      });
    });
  }

  /**
   * Emits an event to all connected sockets of a specific user.
   */
  public static emitToUser(userId: string, event: string, payload: any) {
    if (!this.io) {
      logger.warn('[WebSocket] Cannot emit event. Socket server is not initialized.');
      return;
    }
    const room = `user:${userId}`;
    this.io.to(room).emit(event, payload);
    logger.info(`[WebSocket] Emitted event "${event}" to room: ${room}`);
  }
}
