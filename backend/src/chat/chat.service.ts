import {
  Injectable,
  ForbiddenException,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { ChatSessionStatus } from '@prisma/client';

@Injectable()
export class ChatService {
  private readonly logger = new Logger(ChatService.name);

  // Default lifecycle settings (configurable)
  private readonly warningMinutes = Number(process.env.CHAT_INACTIVITY_WARNING_MINUTES || 5);
  private readonly lockMinutes = Number(process.env.CHAT_INACTIVITY_LOCK_MINUTES || 10);
  private readonly rejoinWindowMinutes = Number(process.env.CHAT_REJOIN_WINDOW_MINUTES || 15);
  private readonly absoluteLimitMinutes = Number(process.env.CHAT_ABSOLUTE_LIMIT_MINUTES || 60);

  constructor(
    private prisma: PrismaService,
    private audit: AuditService,
  ) {}

  /**
   * Verify whether a user is an authorized participant in the conversation.
   */
  async verifyParticipant(userId: string, conversationId: string) {
    const participant = await this.prisma.conversationParticipant.findUnique({
      where: {
        conversationId_userId: { conversationId, userId },
      },
    });

    if (!participant) {
      throw new ForbiddenException('Access denied: You are not a participant in this conversation');
    }

    return participant;
  }

  async getUserConversations(userId: string) {
    const participants = await this.prisma.conversationParticipant.findMany({
      where: { userId },
      include: {
        conversation: {
          include: {
            participants: {
              include: {
                user: {
                  select: {
                    id: true,
                    email: true,
                    profile: true,
                  },
                },
              },
            },
            messages: {
              take: 1,
              orderBy: { createdAt: 'desc' },
              select: {
                id: true,
                content: true,
                senderId: true,
                createdAt: true,
              },
            },
            chatSessions: {
              take: 1,
              orderBy: { startedAt: 'desc' },
            },
          },
        },
      },
      orderBy: { conversation: { updatedAt: 'desc' } },
    });

    return participants.map((p) => {
      const conv = p.conversation;
      const otherParticipants = conv.participants
        .filter((part) => part.userId !== userId)
        .map((part) => part.user);
      const lastMessage = conv.messages[0] || null;
      const latestSession = conv.chatSessions[0] || null;

      return {
        id: conv.id,
        isGroup: conv.isGroup,
        title: conv.title,
        updatedAt: conv.updatedAt,
        otherParticipants,
        lastMessage,
        latestSession,
      };
    });
  }

  async getOrCreateDirectConversation(userId: string, recipientId: string) {
    if (userId === recipientId) {
      throw new BadRequestException('Cannot start conversation with yourself');
    }

    // Check if users are connected as friends
    const u1 = userId < recipientId ? userId : recipientId;
    const u2 = userId < recipientId ? recipientId : userId;

    const friendship = await this.prisma.friendship.findUnique({
      where: { userAId_userBId: { userAId: u1, userBId: u2 } },
    });

    if (!friendship) {
      throw new ForbiddenException('You must be accepted friends before starting a conversation');
    }

    // Check for existing conversation with these two participants
    let conversation = await this.prisma.conversation.findFirst({
      where: {
        isGroup: false,
        AND: [
          { participants: { some: { userId } } },
          { participants: { some: { userId: recipientId } } },
        ],
      },
      include: {
        participants: {
          include: {
            user: { select: { id: true, profile: true } },
          },
        },
      },
    });

    if (!conversation) {
      conversation = await this.prisma.conversation.create({
        data: {
          isGroup: false,
          participants: {
            create: [{ userId }, { userId: recipientId }],
          },
        },
        include: {
          participants: {
            include: {
              user: { select: { id: true, profile: true } },
            },
          },
        },
      });
    }

    return conversation;
  }

  async getConversationMessages(
    userId: string,
    conversationId: string,
    limit = 50,
    cursor?: string,
  ) {
    await this.verifyParticipant(userId, conversationId);

    const queryOptions: any = {
      where: { conversationId, isDeleted: false },
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        sender: {
          select: {
            id: true,
            profile: { select: { displayName: true, avatarUrl: true } },
          },
        },
      },
    };

    if (cursor) {
      queryOptions.cursor = { id: cursor };
      queryOptions.skip = 1;
    }

    const messages = await this.prisma.message.findMany(queryOptions);

    // Update last read for participant
    await this.prisma.conversationParticipant.update({
      where: { conversationId_userId: { conversationId, userId } },
      data: { lastReadAt: new Date() },
    });

    return messages.reverse();
  }

  /**
   * Evaluates or creates the active chat session for a conversation.
   * Enforces 5-minute warning, 10-minute lock, and 60-minute absolute cap.
   */
  async getOrCreateActiveSession(userId: string, conversationId: string) {
    await this.verifyParticipant(userId, conversationId);

    // Find the latest session
    let session = await this.prisma.chatSession.findFirst({
      where: { conversationId },
      orderBy: { startedAt: 'desc' },
    });

    const now = new Date();

    if (!session || session.status === 'CLOSED' || session.status === 'EXPIRED') {
      // Create new active session with 60m absolute expiry
      const expiresAt = new Date(now.getTime() + this.absoluteLimitMinutes * 60 * 1000);
      session = await this.prisma.chatSession.create({
        data: {
          conversationId,
          status: 'ACTIVE',
          startedAt: now,
          lastActivityAt: now,
          expiresAt,
        },
      });

      await this.audit.logEvent('CHAT_SESSION_CREATED', userId, undefined, {
        conversationId,
        sessionId: session.id,
      });

      return this.enrichSessionState(session, now);
    }

    // Evaluate existing session deadlines
    return this.evaluateSessionState(session, now);
  }

  /**
   * State evaluator based on server-authoritative timestamps
   */
  async evaluateSessionState(session: any, now: Date) {
    const startedTime = new Date(session.startedAt).getTime();
    const lastActivityTime = new Date(session.lastActivityAt).getTime();
    const absoluteExpiryTime = new Date(session.expiresAt).getTime();
    const nowTime = now.getTime();

    // 1. Check absolute session limit (60 mins)
    if (nowTime >= absoluteExpiryTime) {
      if (session.status !== 'EXPIRED') {
        session = await this.prisma.chatSession.update({
          where: { id: session.id },
          data: { status: 'EXPIRED' },
        });
        await this.audit.logEvent('CHAT_SESSION_EXPIRED', undefined, undefined, {
          sessionId: session.id,
          reason: 'ABSOLUTE_LIMIT_REACHED',
        });
      }
      return this.enrichSessionState(session, now);
    }

    // 2. Check inactivity lock (10 mins)
    const inactiveMillis = nowTime - lastActivityTime;
    const lockThresholdMillis = this.lockMinutes * 60 * 1000;
    const warningThresholdMillis = this.warningMinutes * 60 * 1000;
    const rejoinWindowMillis = this.rejoinWindowMinutes * 60 * 1000;

    if (session.status === 'LOCKED') {
      // Check if rejoin window exceeded
      const lockedTime = session.lockedAt ? new Date(session.lockedAt).getTime() : lastActivityTime;
      if (nowTime - lockedTime > rejoinWindowMillis) {
        session = await this.prisma.chatSession.update({
          where: { id: session.id },
          data: { status: 'EXPIRED' },
        });
      }
      return this.enrichSessionState(session, now);
    }

    if (inactiveMillis >= lockThresholdMillis) {
      // Transition to LOCKED
      session = await this.prisma.chatSession.update({
        where: { id: session.id },
        data: { status: 'LOCKED', lockedAt: now },
      });
      await this.audit.logEvent('CHAT_SESSION_LOCKED', undefined, undefined, {
        sessionId: session.id,
        reason: 'INACTIVITY_TIMEOUT',
      });
      return this.enrichSessionState(session, now);
    }

    if (inactiveMillis >= warningThresholdMillis && session.status === 'ACTIVE') {
      // Transition to IDLE_WARNING
      session = await this.prisma.chatSession.update({
        where: { id: session.id },
        data: { status: 'IDLE_WARNING' },
      });
      return this.enrichSessionState(session, now);
    }

    return this.enrichSessionState(session, now);
  }

  private enrichSessionState(session: any, now: Date) {
    const lastActivityTime = new Date(session.lastActivityAt).getTime();
    const lockThresholdMillis = this.lockMinutes * 60 * 1000;
    const absoluteExpiryTime = new Date(session.expiresAt).getTime();

    const millisUntilLock = Math.max(0, lockThresholdMillis - (now.getTime() - lastActivityTime));
    const millisUntilAbsoluteExpiry = Math.max(0, absoluteExpiryTime - now.getTime());

    return {
      ...session,
      secondsUntilLock: Math.floor(millisUntilLock / 1000),
      secondsUntilAbsoluteExpiry: Math.floor(millisUntilAbsoluteExpiry / 1000),
      isWarningActive: session.status === 'IDLE_WARNING',
      isLocked: session.status === 'LOCKED',
      isExpired: session.status === 'EXPIRED',
    };
  }

  async recordQualifyingActivity(sessionId: string) {
    const session = await this.prisma.chatSession.findUnique({
      where: { id: sessionId },
    });

    if (!session) return null;

    const now = new Date();
    // Cannot refresh if locked or expired
    if (session.status === 'LOCKED' || session.status === 'EXPIRED' || session.status === 'CLOSED') {
      return session;
    }

    // Reset inactivity deadline back to ACTIVE
    return this.prisma.chatSession.update({
      where: { id: sessionId },
      data: {
        lastActivityAt: now,
        status: 'ACTIVE',
      },
    });
  }

  async rejoinSession(userId: string, sessionId: string) {
    const session = await this.prisma.chatSession.findUnique({
      where: { id: sessionId },
      include: { conversation: true },
    });

    if (!session) {
      throw new NotFoundException('Session not found');
    }

    await this.verifyParticipant(userId, session.conversationId);

    const now = new Date();
    const absoluteExpiryTime = new Date(session.expiresAt).getTime();
    if (now.getTime() >= absoluteExpiryTime) {
      await this.prisma.chatSession.update({
        where: { id: sessionId },
        data: { status: 'EXPIRED' },
      });
      throw new BadRequestException('Session has reached its absolute 60-minute duration limit. Please start a new session.');
    }

    if (session.status === 'EXPIRED' || session.status === 'CLOSED') {
      throw new BadRequestException('This chat session has expired. You may start a fresh session.');
    }

    // Rejoin resets inactivity and marks ACTIVE
    const updated = await this.prisma.chatSession.update({
      where: { id: sessionId },
      data: {
        status: 'ACTIVE',
        lastActivityAt: now,
        lockedAt: null,
      },
    });

    await this.audit.logEvent('CHAT_SESSION_REJOINED', userId, undefined, { sessionId });
    return this.enrichSessionState(updated, now);
  }

  async closeSession(userId: string, sessionId: string) {
    const session = await this.prisma.chatSession.findUnique({
      where: { id: sessionId },
    });

    if (!session) throw new NotFoundException('Session not found');
    await this.verifyParticipant(userId, session.conversationId);

    const updated = await this.prisma.chatSession.update({
      where: { id: sessionId },
      data: { status: 'CLOSED', closedAt: new Date() },
    });

    await this.audit.logEvent('CHAT_SESSION_CLOSED', userId, undefined, { sessionId });
    return updated;
  }

  async saveMessage(userId: string, conversationId: string, content: string) {
    await this.verifyParticipant(userId, conversationId);

    // Get current active session
    const session = await this.getOrCreateActiveSession(userId, conversationId);

    if (session.isLocked || session.isExpired) {
      throw new BadRequestException(
        `Cannot send message: Chat session is currently ${session.status}. Please rejoin or start a new session.`,
      );
    }

    // Atomic transaction: Persist message, touch conversation updatedAt, reset activity timestamp
    const [message] = await this.prisma.$transaction([
      this.prisma.message.create({
        data: {
          conversationId,
          senderId: userId,
          content: content.trim(),
        },
        include: {
          sender: {
            select: {
              id: true,
              profile: { select: { displayName: true, avatarUrl: true } },
            },
          },
        },
      }),
      this.prisma.conversation.update({
        where: { id: conversationId },
        data: { updatedAt: new Date() },
      }),
      this.prisma.chatSession.update({
        where: { id: session.id },
        data: {
          lastActivityAt: new Date(),
          status: 'ACTIVE',
        },
      }),
    ]);

    return message;
  }

  /**
   * Background sweep method to transition idle and expired sessions across the system
   */
  async sweepDeadlines() {
    const now = new Date();

    // 1. Mark absolute limits as EXPIRED
    await this.prisma.chatSession.updateMany({
      where: {
        status: { in: ['ACTIVE', 'IDLE_WARNING', 'LOCKED'] },
        expiresAt: { lte: now },
      },
      data: { status: 'EXPIRED' },
    });

    // 2. Mark inactive sessions (> 10m) as LOCKED
    const lockCutoff = new Date(now.getTime() - this.lockMinutes * 60 * 1000);
    await this.prisma.chatSession.updateMany({
      where: {
        status: { in: ['ACTIVE', 'IDLE_WARNING'] },
        lastActivityAt: { lte: lockCutoff },
      },
      data: {
        status: 'LOCKED',
        lockedAt: now,
      },
    });

    // 3. Mark warning sessions (> 5m) as IDLE_WARNING
    const warningCutoff = new Date(now.getTime() - this.warningMinutes * 60 * 1000);
    await this.prisma.chatSession.updateMany({
      where: {
        status: 'ACTIVE',
        lastActivityAt: { lte: warningCutoff },
      },
      data: { status: 'IDLE_WARNING' },
    });
  }
}
