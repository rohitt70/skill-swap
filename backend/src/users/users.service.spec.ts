import { Test, TestingModule } from '@nestjs/testing';
import { UsersService } from './users.service';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { NotFoundException, BadRequestException } from '@nestjs/common';

describe('UsersService (Unit & Privacy Tests)', () => {
  let service: UsersService;
  let prisma: PrismaService;

  const mockPrisma = {
    user: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
      update: jest.fn(),
    },
    userProfile: {
      upsert: jest.fn(),
      update: jest.fn(),
    },
    userSettings: {
      findUnique: jest.fn(),
      create: jest.fn(),
      upsert: jest.fn(),
    },
    socialLink: {
      upsert: jest.fn(),
      findUnique: jest.fn(),
      delete: jest.fn(),
    },
    userSession: {
      deleteMany: jest.fn(),
    },
    userSkill: {
      findMany: jest.fn(),
    },
    auditEvent: {
      create: jest.fn(),
    },
  };

  const mockAudit = {
    logEvent: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: AuditService, useValue: mockAudit },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
    prisma = module.get<PrismaService>(PrismaService);
    jest.clearAllMocks();
  });

  describe('Profile & Privacy Enforcement', () => {
    it('PRIVACY-1: Should mask private profile when isProfilePublic is false', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'target-student-id',
        email: 'secret@univ.edu',
        role: 'STUDENT',
        isActive: true,
        profile: { displayName: 'Secret Student', institution: 'Hidden Tech', avatarUrl: null },
        settings: { isProfilePublic: false, showInstitution: false, showSocialLinks: false },
        socialLinks: [{ id: 's1', platform: 'GITHUB', url: 'https://github.com/secret' }],
        skills: [],
        reviewsReceived: [],
      });

      const result = await service.getPublicProfile('target-student-id', 'other-student-id');

      expect(result).toHaveProperty('isPrivate', true);
      expect(result.profile.institution).toBeNull();
      expect((result as any).email).toBeUndefined();
    });

    it('PRIVACY-2: Should omit social links when showSocialLinks is false in public view', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'student-id',
        email: 'public@univ.edu',
        role: 'STUDENT',
        isActive: true,
        profile: { displayName: 'Public Student', institution: 'MIT' },
        settings: { isProfilePublic: true, showSocialLinks: false, showEmail: false, showInstitution: true, showAvailability: true },
        socialLinks: [{ id: 's1', platform: 'LINKEDIN', url: 'https://linkedin.com/in/test' }],
        skills: [],
        reviewsReceived: [],
      });

      const result = await service.getPublicProfile('student-id', 'requester-id');

      expect(result.socialLinks).toEqual([]);
      expect(result.email).toBeUndefined();
    });

    it('SETTINGS-1: Should persist user appearance and privacy settings', async () => {
      mockPrisma.userSettings.upsert.mockResolvedValue({
        userId: 'user-1',
        theme: 'DARK',
        isProfilePublic: true,
      });

      const result = await service.updateMySettings('user-1', {
        theme: 'DARK' as any,
        isProfilePublic: true,
      });

      expect(result.theme).toBe('DARK');
      expect(mockPrisma.userSettings.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userId: 'user-1' },
          update: expect.objectContaining({ theme: 'DARK' }),
        }),
      );
    });

    it('SOCIAL-1: Unauthorized user cannot delete another student social link', async () => {
      mockPrisma.socialLink.findUnique.mockResolvedValue({
        id: 'link-1',
        userId: 'owner-id',
      });

      await expect(
        service.deleteSocialLink('malicious-user-id', 'link-1'),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
