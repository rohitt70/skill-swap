import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import {
  ConflictException,
  UnauthorizedException,
  InternalServerErrorException,
} from '@nestjs/common';
import * as argon2 from 'argon2';
import * as jwt from 'jsonwebtoken';

describe('AuthService (Unit & Security Tests)', () => {
  let service: AuthService;
  let prisma: PrismaService;

  const mockPrisma = {
    user: {
      findUnique: jest.fn(),
      create: jest.fn(),
    },
    userProfile: {
      create: jest.fn(),
    },
    userSettings: {
      create: jest.fn(),
    },
    userSession: {
      create: jest.fn(),
      findFirst: jest.fn(),
      delete: jest.fn(),
      deleteMany: jest.fn(),
    },
    $transaction: jest.fn((callback) => callback(mockPrisma)),
  };

  const mockAudit = {
    logEvent: jest.fn(),
  };

  const testSecret = 'test_access_jwt_secret_at_least_32_characters';
  const testRefreshSecret = 'test_refresh_jwt_secret_at_least_32_characters';

  beforeEach(async () => {
    process.env.JWT_SECRET = testSecret;
    process.env.JWT_REFRESH_SECRET = testRefreshSecret;
    process.env.JWT_EXPIRES_IN = '15m';
    process.env.JWT_REFRESH_EXPIRES_IN = '7d';
    process.env.JWT_ISSUER = 'skillswap-api';
    process.env.JWT_AUDIENCE = 'skillswap-client';

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: AuditService, useValue: mockAudit },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    prisma = module.get<PrismaService>(PrismaService);
    jest.clearAllMocks();
  });

  describe('Configuration & Missing Secrets', () => {
    it('AUTH-0: Fails safely when secrets are not configured', async () => {
      delete process.env.JWT_SECRET;
      delete process.env.JWT_REFRESH_SECRET;

      const unconfiguredService = new AuthService(mockPrisma as any, mockAudit as any);

      await expect(
        unconfiguredService.login({ email: 'test@univ.edu', password: 'Password123!' }),
      ).rejects.toThrow(InternalServerErrorException);

      await expect(
        unconfiguredService.register({
          email: 'test@univ.edu',
          password: 'Password123!',
          displayName: 'Test',
        }),
      ).rejects.toThrow(InternalServerErrorException);
    });

    it('AUTH-CSRF: Generates a 64-character random hex CSRF token', () => {
      const token = service.generateCsrfToken();
      expect(token).toBeDefined();
      expect(token).toMatch(/^[0-9a-f]{64}$/);
    });
  });

  describe('Registration & Duplicate Prevention', () => {
    it('AUTH-1: Must reject duplicate email registration with ConflictException', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ id: 'existing-id', email: 'test@univ.edu' });

      await expect(
        service.register({
          email: 'Test@univ.edu',
          password: 'Password123!',
          displayName: 'Test User',
        }),
      ).rejects.toThrow(ConflictException);
    });

    it('AUTH-2: Must hash password using Argon2 and create user + profile + settings atomically', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);
      mockPrisma.user.create.mockResolvedValue({
        id: 'new-user-id',
        email: 'new@univ.edu',
        role: 'STUDENT',
      });
      mockPrisma.userProfile.create.mockResolvedValue({ id: 'profile-id', userId: 'new-user-id' });
      mockPrisma.userSettings.create.mockResolvedValue({ id: 'settings-id', userId: 'new-user-id' });
      mockPrisma.userSession.create.mockResolvedValue({ id: 'session-id' });

      const result = await service.register({
        email: 'new@univ.edu',
        password: 'Password123!',
        displayName: 'New Student',
      });

      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
      expect(mockPrisma.user.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            email: 'new@univ.edu',
            passwordHash: expect.stringMatching(/^\$argon2id\$/),
          }),
        }),
      );
      expect(mockPrisma.userSettings.create).toHaveBeenCalled();
    });
  });

  describe('Login & Credentials', () => {
    it('AUTH-3: Must reject invalid email or password with UnauthorizedException', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      await expect(
        service.login({ email: 'wrong@univ.edu', password: 'Password123!' }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('AUTH-4: Must reject inactive user account', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'user-id',
        email: 'inactive@univ.edu',
        passwordHash: '$argon2id$...',
        isActive: false,
      });

      await expect(
        service.login({ email: 'inactive@univ.edu', password: 'Password123!' }),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('JWT Tokens, Rotation & Race Mitigation', () => {
    it('AUTH-5: Must generate HS256 tokens with short-lived 15m access token, issuer, and audience', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'user-123',
        email: 'student@univ.edu',
        role: 'STUDENT',
        isActive: true,
        passwordHash: await argon2.hash('Password123!'),
      });
      mockPrisma.userSession.create.mockResolvedValue({ id: 'sess-1' });

      const tokens = await service.login({
        email: 'student@univ.edu',
        password: 'Password123!',
      });

      expect(tokens.accessToken).toBeDefined();
      expect(tokens.refreshToken).toBeDefined();

      const decodedAccess: any = jwt.decode(tokens.accessToken, { complete: true });
      expect(decodedAccess.header.alg).toBe('HS256');
      expect(decodedAccess.payload.sub).toBe('user-123');
      expect(decodedAccess.payload.iss).toBe('skillswap-api');
      expect(decodedAccess.payload.aud).toBe('skillswap-client');
      expect(decodedAccess.payload.exp - decodedAccess.payload.iat).toBe(15 * 60);

      const decodedRefresh: any = jwt.decode(tokens.refreshToken, { complete: true });
      expect(decodedRefresh.header.alg).toBe('HS256');
      expect(decodedRefresh.payload.sub).toBe('user-123');
      expect(decodedRefresh.payload.iss).toBe('skillswap-api');
      expect(decodedRefresh.payload.aud).toBe('skillswap-client');
      expect(decodedRefresh.payload.exp - decodedRefresh.payload.iat).toBe(7 * 24 * 60 * 60);
    });

    it('AUTH-6: Refresh token rotation deletes old session and creates new token pair', async () => {
      const validRefreshToken = jwt.sign(
        { sub: 'user-123', email: 'student@univ.edu', role: 'STUDENT' },
        testRefreshSecret,
        {
          algorithm: 'HS256',
          expiresIn: '7d',
          issuer: 'skillswap-api',
          audience: 'skillswap-client',
        },
      );

      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'user-123',
        email: 'student@univ.edu',
        role: 'STUDENT',
        isActive: true,
      });
      mockPrisma.userSession.findFirst.mockResolvedValue({
        id: 'active-session-id',
        userId: 'user-123',
      });
      mockPrisma.userSession.delete.mockResolvedValue({ id: 'active-session-id' });
      mockPrisma.userSession.create.mockResolvedValue({ id: 'new-session-id' });

      const result = await service.refreshToken(validRefreshToken);

      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
      expect(mockPrisma.userSession.delete).toHaveBeenCalledWith({
        where: { id: 'active-session-id' },
      });
      expect(mockPrisma.userSession.create).toHaveBeenCalled();
    });

    it('AUTH-7: Concurrent refresh request within grace period returns rotated tokens without revoking sessions', async () => {
      const validRefreshToken = jwt.sign(
        { sub: 'user-123', email: 'student@univ.edu', role: 'STUDENT' },
        testRefreshSecret,
        {
          algorithm: 'HS256',
          expiresIn: '7d',
          issuer: 'skillswap-api',
          audience: 'skillswap-client',
        },
      );

      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'user-123',
        email: 'student@univ.edu',
        role: 'STUDENT',
        isActive: true,
      });
      mockPrisma.userSession.findFirst.mockResolvedValue({
        id: 'active-session-id',
        userId: 'user-123',
      });
      mockPrisma.userSession.delete.mockResolvedValue({ id: 'active-session-id' });
      mockPrisma.userSession.create.mockResolvedValue({ id: 'new-session-id' });

      // First rotation request
      const firstRotation = await service.refreshToken(validRefreshToken);

      // Concurrent second rotation request with same token immediately following
      const secondConcurrent = await service.refreshToken(validRefreshToken);

      expect(secondConcurrent.accessToken).toBe(firstRotation.accessToken);
      expect(secondConcurrent.refreshToken).toBe(firstRotation.refreshToken);
      // deleteMany should NOT have been called (no false reuse alarm)
      expect(mockPrisma.userSession.deleteMany).not.toHaveBeenCalled();
    });

    it('AUTH-8: Refresh token reuse detection revokes all sessions when used outside grace period', async () => {
      const validTokenSignature = jwt.sign(
        { sub: 'user-123', email: 'student@univ.edu', role: 'STUDENT' },
        testRefreshSecret,
        {
          algorithm: 'HS256',
          expiresIn: '7d',
          issuer: 'skillswap-api',
          audience: 'skillswap-client',
        },
      );

      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'user-123',
        email: 'student@univ.edu',
        role: 'STUDENT',
        isActive: true,
      });
      // Session not found (consumed long ago and not in cache)
      mockPrisma.userSession.findFirst.mockResolvedValue(null);
      mockPrisma.userSession.deleteMany.mockResolvedValue({ count: 3 });

      await expect(service.refreshToken(validTokenSignature)).rejects.toThrow(
        /Refresh token reuse detected/,
      );

      expect(mockPrisma.userSession.deleteMany).toHaveBeenCalledWith({
        where: { userId: 'user-123' },
      });
      expect(mockAudit.logEvent).toHaveBeenCalledWith(
        'AUTH_REFRESH_TOKEN_REUSE_REVOCATION',
        'user-123',
        undefined,
      );
    });

    it('AUTH-9: Targeted logout revokes only the specific session matching refresh token', async () => {
      mockPrisma.userSession.deleteMany.mockResolvedValue({ count: 1 });

      const res = await service.logout('user-123', 'some-refresh-token');

      expect(res.success).toBe(true);
      expect(mockPrisma.userSession.deleteMany).toHaveBeenCalledWith({
        where: {
          userId: 'user-123',
          refreshTokenHash: expect.any(String),
        },
      });
      expect(mockAudit.logEvent).toHaveBeenCalledWith('AUTH_LOGOUT', 'user-123');
    });

    it('AUTH-10: Full logout without refresh token revokes all sessions for user', async () => {
      mockPrisma.userSession.deleteMany.mockResolvedValue({ count: 2 });

      const res = await service.logout('user-123');

      expect(res.success).toBe(true);
      expect(mockPrisma.userSession.deleteMany).toHaveBeenCalledWith({
        where: { userId: 'user-123' },
      });
      expect(mockAudit.logEvent).toHaveBeenCalledWith('AUTH_LOGOUT', 'user-123');
    });
  });
});
