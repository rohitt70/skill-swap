import { Test, TestingModule } from '@nestjs/testing';
import { NotificationsService } from './notifications.service';
import { PrismaService } from '../prisma/prisma.service';
import { NotFoundException, ForbiddenException } from '@nestjs/common';

describe('NotificationsService', () => {
  let service: NotificationsService;
  let prisma: any;

  beforeEach(async () => {
    prisma = {
      notification: {
        findMany: jest.fn(),
        count: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
        updateMany: jest.fn(),
      },
      friendRequest: {
        count: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationsService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<NotificationsService>(NotificationsService);
  });

  it('should get unread count including notifications and friend requests', async () => {
    prisma.notification.count.mockResolvedValue(3);
    prisma.friendRequest.count.mockResolvedValue(2);

    const result = await service.getUnreadCount('user-1');
    expect(result).toEqual({
      unreadNotifications: 3,
      pendingFriendRequests: 2,
      total: 5,
    });
    expect(prisma.notification.count).toHaveBeenCalledWith({
      where: { userId: 'user-1', isRead: false },
    });
    expect(prisma.friendRequest.count).toHaveBeenCalledWith({
      where: { recipientId: 'user-1', status: 'PENDING' },
    });
  });

  it('should mark notification as read for authorized owner', async () => {
    prisma.notification.findUnique.mockResolvedValue({
      id: 'notif-1',
      userId: 'user-1',
      isRead: false,
    });
    prisma.notification.update.mockResolvedValue({
      id: 'notif-1',
      userId: 'user-1',
      isRead: true,
    });

    const result = await service.markAsRead('user-1', 'notif-1');
    expect(result.isRead).toBe(true);
    expect(prisma.notification.update).toHaveBeenCalledWith({
      where: { id: 'notif-1' },
      data: { isRead: true },
    });
  });

  it('should throw ForbiddenException if user does not own notification', async () => {
    prisma.notification.findUnique.mockResolvedValue({
      id: 'notif-1',
      userId: 'other-user',
      isRead: false,
    });

    await expect(service.markAsRead('user-1', 'notif-1')).rejects.toThrow(ForbiddenException);
  });

  it('should mark all notifications as read', async () => {
    prisma.notification.updateMany.mockResolvedValue({ count: 4 });

    const result = await service.markAllAsRead('user-1');
    expect(result).toEqual({ success: true, updated: 4 });
    expect(prisma.notification.updateMany).toHaveBeenCalledWith({
      where: { userId: 'user-1', isRead: false },
      data: { isRead: true },
    });
  });
});
