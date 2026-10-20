import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger, UseFilters } from '@nestjs/common';
import * as jwt from 'jsonwebtoken';
import { ChatService } from './chat.service';

interface AuthenticatedSocket extends Socket {
  user?: {
    id: string;
    email: string;
    role: string;
  };
}

@WebSocketGateway({
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true,
  },
})
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(ChatGateway.name);

  constructor(private chatService: ChatService) {}

  private extractTokenFromCookie(cookieHeader?: string): string | null {
    if (!cookieHeader) return null;
    const match = cookieHeader.match(/(?:^|;\s*)access_token=([^;]+)/);
    return match ? decodeURIComponent(match[1]) : null;
  }

  async handleConnection(client: AuthenticatedSocket) {
    try {
      const jwtSecret = process.env.JWT_SECRET;
      if (!jwtSecret) {
        this.logger.error('CRITICAL: JWT_SECRET environment variable is missing.');
        client.disconnect();
        return;
      }

      const cookieToken = this.extractTokenFromCookie(client.handshake.headers?.cookie);
      const authHeader = client.handshake.headers?.authorization;
      const bearerToken = authHeader && authHeader.startsWith('Bearer ')
        ? authHeader.substring(7)
        : undefined;

      const token =
        (client.handshake.auth?.token as string) ||
        bearerToken ||
        cookieToken ||
        (client.handshake.query?.token as string);

      if (!token) {
        this.logger.warn(`Disconnecting unauthenticated socket ${client.id}`);
        client.disconnect();
        return;
      }

      const issuer = process.env.JWT_ISSUER || 'skillswap-api';
      const audience = process.env.JWT_AUDIENCE || 'skillswap-client';

      const decoded = jwt.verify(token, jwtSecret, {
        algorithms: ['HS256'],
        issuer,
        audience,
      }) as any;

      if (!decoded || !decoded.sub) {
        throw new Error('Malformed token claims');
      }

      client.user = {
        id: decoded.sub,
        email: decoded.email,
        role: decoded.role,
      };

      // Join user's personal notification room
      client.join(`user:${client.user.id}`);
      this.logger.log(`Socket connected: ${client.id} (User: ${client.user.id})`);
    } catch (err: any) {
      this.logger.warn(`Invalid token on socket connection: ${err.message}`);
      client.disconnect();
    }
  }

  handleDisconnect(client: AuthenticatedSocket) {
    this.logger.log(`Socket disconnected: ${client.id} (User: ${client.user?.id || 'Unknown'})`);
  }

  @SubscribeMessage('join_conversation')
  async handleJoinConversation(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { conversationId: string },
  ) {
    if (!client.user) {
      return { error: 'Unauthorized' };
    }

    try {
      // Server-side authorization check!
      await this.chatService.verifyParticipant(client.user.id, data.conversationId);
      const room = `conversation:${data.conversationId}`;
      client.join(room);

      // Fetch or evaluate session
      const session = await this.chatService.getOrCreateActiveSession(
        client.user.id,
        data.conversationId,
      );

      return { status: 'joined', session };
    } catch (error) {
      return { error: error.message };
    }
  }

  @SubscribeMessage('leave_conversation')
  async handleLeaveConversation(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { conversationId: string },
  ) {
    const room = `conversation:${data.conversationId}`;
    client.leave(room);
    return { status: 'left' };
  }

  @SubscribeMessage('send_message')
  async handleSendMessage(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { conversationId: string; content: string; idempotencyKey?: string },
  ) {
    if (!client.user) {
      return { error: 'Unauthorized' };
    }

    try {
      const message = await this.chatService.saveMessage(
        client.user.id,
        data.conversationId,
        data.content,
      );

      const room = `conversation:${data.conversationId}`;
      // Broadcast to all participants in conversation room
      this.server.to(room).emit('new_message', message);

      return { success: true, messageId: message.id, idempotencyKey: data.idempotencyKey };
    } catch (error) {
      return { error: error.message };
    }
  }

  @SubscribeMessage('typing')
  async handleTyping(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { conversationId: string; isTyping: boolean },
  ) {
    if (!client.user) return;
    const room = `conversation:${data.conversationId}`;
    client.to(room).emit('user_typing', {
      userId: client.user.id,
      conversationId: data.conversationId,
      isTyping: data.isTyping,
    });
  }

  /**
   * Broadcasts session warning or lock notifications to room
   */
  broadcastSessionUpdate(conversationId: string, event: string, payload: any) {
    this.server.to(`conversation:${conversationId}`).emit(event, payload);
  }
}
