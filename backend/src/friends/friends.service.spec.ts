import { Test, TestingModule } from '@nestjs/testing';
import { FriendsService } from './friends.service';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { BadRequestException, ConflictException, ForbiddenException, NotFoundException } from '@nestjs/common';

describe('FriendsService', () => {
  let service: FriendsService;
  let prisma: any;
  let audit: any;

  beforeEach(async () => {
    prisma = {
      user: { findUnique: jest.fn() },
      userBlock: { findFirst: jest.fn() },
      friendship: { findUnique: jest.fn(), findMany: jest.fn(), delete: jest.fn(), upsert: jest.fn() },
      friendRequest: {
        findFirst: jest.fn(),
        findUnique: jest.fn(),
        findMany: jest.fn(),
        update: jest.fn(),
        upsert: jest.fn(),
      },
      conversation: { findFirst: jest.fn(), create: jest.fn() },
      notification: { create: jest.fn() },
      $transaction: jest.fn((cb) => cb(prisma)),
    };

    audit = {
      logEvent: jest.fn().mockResolvedValue(true),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FriendsService,
        { provide: PrismaService, useValue: prisma },
        { provide: AuditService, useValue: audit },
      ],
    }).compile();

    service = module.get<FriendsService>(FriendsService);
  });

  describe('sendFriendRequest', () => {
    it('should reject self-request with BadRequestException', async () => {
      await expect(
        service.sendFriendRequest('user-1', { recipientId: 'user-1' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw NotFoundException if recipient is not found or inactive', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      await expect(
        service.sendFriendRequest('user-1', { recipientId: 'user-2' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ConflictException if users are already friends', async () => {
      prisma.user.findUnique.mockResolvedValue({ id: 'user-2', isActive: true });
      prisma.userBlock.findFirst.mockResolvedValue(null);
      prisma.friendship.findUnique.mockResolvedValue({ id: 'f-1', userAId: 'user-1', userBId: 'user-2' });

      await expect(
        service.sendFriendRequest('user-1', { recipientId: 'user-2' }),
      ).rejects.toThrow(ConflictException);
    });

    it('should throw ConflictException if duplicate pending request exists', async () => {
      prisma.user.findUnique.mockResolvedValue({ id: 'user-2', isActive: true });
      prisma.userBlock.findFirst.mockResolvedValue(null);
      prisma.friendship.findUnique.mockResolvedValue(null);
      prisma.friendRequest.findFirst.mockResolvedValueOnce({ id: 'req-1', status: 'PENDING' });

      await expect(
        service.sendFriendRequest('user-1', { recipientId: 'user-2' }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('acceptFriendRequest', () => {
    it('should throw NotFoundException if request does not exist', async () => {
      prisma.friendRequest.findUnique.mockResolvedValue(null);
      await expect(service.acceptFriendRequest('user-1', 'req-999')).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException if user is not the recipient (cannot accept self-sent or third-party request)', async () => {
      prisma.friendRequest.findUnique.mockResolvedValue({
        id: 'req-1',
        senderId: 'user-1',
        recipientId: 'user-2',
        status: 'PENDING',
      });

      // user-1 tries to accept a request sent by themselves
      await expect(service.acceptFriendRequest('user-1', 'req-1')).rejects.toThrow(ForbiddenException);

      // third party user-3 tries to accept
      await expect(service.acceptFriendRequest('user-3', 'req-1')).rejects.toThrow(ForbiddenException);
    });

    it('should successfully accept request, create friendship, and create notification', async () => {
      prisma.friendRequest.findUnique.mockResolvedValue({
        id: 'req-1',
        senderId: 'user-1',
        recipientId: 'user-2',
        status: 'PENDING',
        sender: { id: 'user-1', profile: { displayName: 'Alice' } },
        recipient: { id: 'user-2', profile: { displayName: 'Bob' } },
      });

      prisma.friendRequest.update.mockResolvedValue({ id: 'req-1', status: 'ACCEPTED' });
      prisma.friendship.upsert.mockResolvedValue({ id: 'friendship-1', userAId: 'user-1', userBId: 'user-2' });
      prisma.conversation.findFirst.mockResolvedValue(null);
      prisma.conversation.create.mockResolvedValue({ id: 'conv-1' });
      prisma.notification.create.mockResolvedValue({ id: 'notif-1' });

      const result = await service.acceptFriendRequest('user-2', 'req-1');
      expect(result.success).toBe(true);
      expect(prisma.friendRequest.update).toHaveBeenCalledWith({
        where: { id: 'req-1' },
        data: { status: 'ACCEPTED' },
      });
      expect(prisma.notification.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            userId: 'user-1',
            type: 'FRIEND_ACCEPTED',
          }),
        }),
      );
    });
  });

  describe('rejectFriendRequest', () => {
    it('should throw ForbiddenException/NotFoundException if non-recipient tries to reject', async () => {
      prisma.friendRequest.findUnique.mockResolvedValue({
        id: 'req-1',
        senderId: 'user-1',
        recipientId: 'user-2',
        status: 'PENDING',
      });

      await expect(service.rejectFriendRequest('user-1', 'req-1')).rejects.toThrow(NotFoundException);
    });

    it('should successfully reject pending request', async () => {
      prisma.friendRequest.findUnique.mockResolvedValue({
        id: 'req-1',
        senderId: 'user-1',
        recipientId: 'user-2',
        status: 'PENDING',
      });
      prisma.friendRequest.update.mockResolvedValue({ id: 'req-1', status: 'REJECTED' });

      const result = await service.rejectFriendRequest('user-2', 'req-1');
      expect(result.success).toBe(true);
      expect(prisma.friendRequest.update).toHaveBeenCalledWith({
        where: { id: 'req-1' },
        data: { status: 'REJECTED' },
      });
    });
  });
});
