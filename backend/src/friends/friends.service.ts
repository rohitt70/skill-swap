import {
  Injectable,
  BadRequestException,
  ConflictException,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { SendFriendRequestDto } from './dto/friends.dto';

@Injectable()
export class FriendsService {
  constructor(
    private prisma: PrismaService,
    private audit: AuditService,
  ) {}

  // Canonical ordering helper to avoid duplicate symmetric friendship pairs
  private canonicalPair(u1: string, u2: string): [string, string] {
    return u1 < u2 ? [u1, u2] : [u2, u1];
  }

  async sendFriendRequest(senderId: string, dto: SendFriendRequestDto) {
    const { recipientId, note } = dto;

    if (senderId === recipientId) {
      throw new BadRequestException('You cannot send a friend request to yourself');
    }

    // Check if recipient exists and is active
    const recipient = await this.prisma.user.findUnique({
      where: { id: recipientId },
      include: { profile: true },
    });
    if (!recipient || !recipient.isActive) {
      throw new NotFoundException('Recipient user not found');
    }

    // Check if blocked in either direction
    const block = await this.prisma.userBlock.findFirst({
      where: {
        OR: [
          { blockerId: senderId, blockedId: recipientId },
          { blockerId: recipientId, blockedId: senderId },
        ],
      },
    });
    if (block) {
      throw new ForbiddenException('Unable to send request due to user privacy/block settings');
    }

    // Check if already friends
    const [userA, userB] = this.canonicalPair(senderId, recipientId);
    const existingFriendship = await this.prisma.friendship.findUnique({
      where: { userAId_userBId: { userAId: userA, userBId: userB } },
    });
    if (existingFriendship) {
      throw new ConflictException('You are already friends with this student');
    }

    // Check if sender already sent a pending request
    const existingOutgoing = await this.prisma.friendRequest.findFirst({
      where: {
        senderId,
        recipientId,
        status: 'PENDING',
      },
    });
    if (existingOutgoing) {
      throw new ConflictException('A friend request has already been sent to this user');
    }

    // Check for reciprocal request (Bob already sent Alice a pending request)
    const existingIncoming = await this.prisma.friendRequest.findFirst({
      where: {
        senderId: recipientId,
        recipientId: senderId,
        status: 'PENDING',
      },
    });

    if (existingIncoming) {
      // Reciprocal match: Auto-accept into a friendship atomically!
      return this.acceptFriendRequest(senderId, existingIncoming.id);
    }

    // Otherwise, create new pending request atomically
    const request = await this.prisma.$transaction(async (tx) => {
      // Upsert to handle any previously rejected/cancelled requests cleanly
      const req = await tx.friendRequest.upsert({
        where: { senderId_recipientId: { senderId, recipientId } },
        update: {
          status: 'PENDING',
          note: note?.trim(),
          updatedAt: new Date(),
        },
        create: {
          senderId,
          recipientId,
          status: 'PENDING',
          note: note?.trim(),
        },
        include: {
          sender: { select: { id: true, profile: true } },
          recipient: { select: { id: true, profile: true } },
        },
      });

      // Create in-app notification
      await tx.notification.create({
        data: {
          userId: recipientId,
          type: 'FRIEND_REQUEST',
          title: 'New Friend Request',
          message: `${req.sender.profile?.displayName || 'A student'} sent you a friend request.`,
          metadata: JSON.stringify({ requestId: req.id, senderId }),
        },
      });

      return req;
    });

    await this.audit.logEvent('FRIEND_REQUEST_SENT', senderId, undefined, { recipientId });
    return request;
  }

  async acceptFriendRequest(userId: string, requestId: string) {
    const request = await this.prisma.friendRequest.findUnique({
      where: { id: requestId },
      include: {
        sender: { select: { id: true, profile: true } },
        recipient: { select: { id: true, profile: true } },
      },
    });

    if (!request) {
      throw new NotFoundException('Friend request not found');
    }

    if (request.recipientId !== userId) {
      throw new ForbiddenException('You can only accept requests sent to you');
    }

    if (request.status !== 'PENDING') {
      throw new BadRequestException(`Cannot accept a request with status ${request.status}`);
    }

    const [userA, userB] = this.canonicalPair(request.senderId, request.recipientId);

    // Atomic transaction: update request status, create friendship, create notification
    const friendship = await this.prisma.$transaction(async (tx) => {
      await tx.friendRequest.update({
        where: { id: requestId },
        data: { status: 'ACCEPTED' },
      });

      const fs = await tx.friendship.upsert({
        where: { userAId_userBId: { userAId: userA, userBId: userB } },
        update: {},
        create: {
          userAId: userA,
          userBId: userB,
        },
      });

      // Automatically create a private conversation for the new friends if none exists
      let conv = await tx.conversation.findFirst({
        where: {
          isGroup: false,
          participants: { every: { userId: { in: [userA, userB] } } },
        },
      });

      if (!conv) {
        conv = await tx.conversation.create({
          data: {
            isGroup: false,
            participants: {
              create: [{ userId: userA }, { userId: userB }],
            },
          },
        });
      }

      await tx.notification.create({
        data: {
          userId: request.senderId,
          type: 'FRIEND_ACCEPTED',
          title: 'Friend Request Accepted',
          message: `${request.recipient.profile?.displayName || 'A peer'} accepted your friend request!`,
          metadata: JSON.stringify({ friendId: userId, conversationId: conv.id }),
        },
      });

      return fs;
    });

    await this.audit.logEvent('FRIEND_REQUEST_ACCEPTED', userId, undefined, {
      requestId,
      friendId: request.senderId,
    });

    return { success: true, message: 'Friend request accepted', friendship };
  }

  async rejectFriendRequest(userId: string, requestId: string) {
    const request = await this.prisma.friendRequest.findUnique({
      where: { id: requestId },
    });

    if (!request || request.recipientId !== userId) {
      throw new NotFoundException('Friend request not found');
    }

    if (request.status !== 'PENDING') {
      throw new BadRequestException('Request is no longer pending');
    }

    await this.prisma.friendRequest.update({
      where: { id: requestId },
      data: { status: 'REJECTED' },
    });

    await this.audit.logEvent('FRIEND_REQUEST_REJECTED', userId, undefined, { requestId });
    return { success: true, message: 'Friend request declined' };
  }

  async cancelFriendRequest(userId: string, requestId: string) {
    const request = await this.prisma.friendRequest.findUnique({
      where: { id: requestId },
    });

    if (!request || request.senderId !== userId) {
      throw new NotFoundException('Friend request not found');
    }

    if (request.status !== 'PENDING') {
      throw new BadRequestException('Cannot cancel a non-pending request');
    }

    await this.prisma.friendRequest.update({
      where: { id: requestId },
      data: { status: 'CANCELLED' },
    });

    return { success: true, message: 'Friend request cancelled' };
  }

  async getIncomingRequests(userId: string) {
    return this.prisma.friendRequest.findMany({
      where: { recipientId: userId, status: 'PENDING' },
      include: {
        sender: {
          select: {
            id: true,
            email: true,
            profile: true,
            skills: { include: { skill: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getOutgoingRequests(userId: string) {
    return this.prisma.friendRequest.findMany({
      where: { senderId: userId, status: 'PENDING' },
      include: {
        recipient: {
          select: {
            id: true,
            profile: true,
            skills: { include: { skill: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getFriendsList(userId: string) {
    const friendships = await this.prisma.friendship.findMany({
      where: {
        OR: [{ userAId: userId }, { userBId: userId }],
      },
      include: {
        userA: {
          select: {
            id: true,
            profile: true,
            skills: { include: { skill: true } },
          },
        },
        userB: {
          select: {
            id: true,
            profile: true,
            skills: { include: { skill: true } },
          },
        },
      },
    });

    return friendships.map((f) => {
      const friend = f.userAId === userId ? f.userB : f.userA;
      return {
        friendshipId: f.id,
        friend,
        since: f.createdAt,
      };
    });
  }

  async removeFriend(userId: string, friendId: string) {
    const [userA, userB] = this.canonicalPair(userId, friendId);

    const friendship = await this.prisma.friendship.findUnique({
      where: { userAId_userBId: { userAId: userA, userBId: userB } },
    });

    if (!friendship) {
      throw new NotFoundException('Friendship not found');
    }

    await this.prisma.friendship.delete({
      where: { id: friendship.id },
    });

    await this.audit.logEvent('FRIEND_REMOVED', userId, undefined, { friendId });
    return { success: true, message: 'Friend removed successfully' };
  }
}
