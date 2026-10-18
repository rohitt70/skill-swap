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
    origin: '*',
    credentials: true,
  },
})
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(ChatGateway.name);
  private readonly jwtSecret = process.env.JWT_SECRET || 'fallback_secret_for_development_skillswap';

  constructor(private chatService: ChatService) {}

  async handleConnection(client: AuthenticatedSocket) {
    try {
      const token =
        (client.handshake.auth?.token as string) ||
        (client.handshake.query?.token as string) ||
        (client.handshake.headers?.authorization?.replace('Bearer ', ''));

      if (!token) {
        this.logger.warn(`Disconnecting unauthenticated socket ${client.id}`);
        client.disconnect();
        return;
      }

      const decoded = jwt.verify(token, this.jwtSecret) as any;
      client.user = {
        id: decoded.sub,
        email: decoded.email,
        role: decoded.role,
      };

      // Join user's personal notification room
      client.join(`user:${client.user.id}`);
      this.logger.log(`Socket connected: ${client.id} (User: ${client.user.id})`);
    } catch (err) {
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
