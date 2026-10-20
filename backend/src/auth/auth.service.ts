import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  InternalServerErrorException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { RegisterDto, LoginDto } from './dto/auth.dto';
import * as argon2 from 'argon2';
import * as jwt from 'jsonwebtoken';
import * as crypto from 'crypto';
import { parseDurationToMs } from '../common/utils/duration.util';

export interface TokenResult {
  accessToken: string;
  refreshToken: string;
  user: any;
}

interface RecentRotationRecord {
  accessToken: string;
  refreshToken: string;
  user: any;
  rotatedAt: number;
}

@Injectable()
export class AuthService {
  private readonly jwtSecret: string;
  private readonly jwtRefreshSecret: string;
  private readonly jwtExpiresIn: string;
  private readonly jwtRefreshExpiresIn: string;
  private readonly jwtIssuer: string;
  private readonly jwtAudience: string;

  // Cache of recently rotated tokens to protect against race conditions in concurrent requests (30s grace period)
  private readonly recentRotations = new Map<string, RecentRotationRecord>();

  constructor(
    private prisma: PrismaService,
    private audit: AuditService,
  ) {
    this.jwtSecret = process.env.JWT_SECRET || '';
    this.jwtRefreshSecret = process.env.JWT_REFRESH_SECRET || '';
    this.jwtExpiresIn = process.env.JWT_EXPIRES_IN || '15m';
    this.jwtRefreshExpiresIn = process.env.JWT_REFRESH_EXPIRES_IN || '7d';
    this.jwtIssuer = process.env.JWT_ISSUER || 'skillswap-api';
    this.jwtAudience = process.env.JWT_AUDIENCE || 'skillswap-client';

    // Verify expiration configuration can be parsed
    parseDurationToMs(this.jwtExpiresIn);
    parseDurationToMs(this.jwtRefreshExpiresIn);

    // Clean up stale rotation records every 60 seconds
    setInterval(() => this.cleanupRotationCache(), 60000).unref();
  }

  private ensureSecretsConfigured() {
    if (!this.jwtSecret || !this.jwtRefreshSecret) {
      throw new InternalServerErrorException(
        'Authentication configuration error: JWT secrets are not configured.',
      );
    }
  }

  getAccessCookieMaxAge(): number {
    return parseDurationToMs(this.jwtExpiresIn);
  }

  getRefreshCookieMaxAge(): number {
    return parseDurationToMs(this.jwtRefreshExpiresIn);
  }

  generateCsrfToken(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  async register(dto: RegisterDto, ipAddress?: string): Promise<TokenResult> {
    this.ensureSecretsConfigured();
    const normalizedEmail = dto.email.toLowerCase().trim();
    const existing = await this.prisma.user.findUnique({
      where: { email: normalizedEmail },
    });
    if (existing) {
      throw new ConflictException('An account with this email address already exists');
    }

    // Argon2id hashing
    const passwordHash = await argon2.hash(dto.password, {
      type: argon2.argon2id,
      memoryCost: 2 ** 16,
      timeCost: 3,
      parallelism: 1,
    });

    const user = await this.prisma.$transaction(async (tx) => {
      const newUser = await tx.user.create({
        data: {
          email: normalizedEmail,
          passwordHash,
        },
      });

      await tx.userProfile.create({
        data: {
          userId: newUser.id,
          displayName: dto.displayName.trim(),
          institution: dto.institution?.trim() || 'University',
          major: dto.major?.trim(),
        },
      });

      await tx.userSettings.create({
        data: {
          userId: newUser.id,
        },
      });

      return newUser;
    });

    await this.audit.logEvent('AUTH_REGISTER', user.id, ipAddress);

    return this.generateTokens(user.id, user.email, user.role, ipAddress);
  }

  async login(
    dto: LoginDto,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<TokenResult> {
    this.ensureSecretsConfigured();
    const normalizedEmail = dto.email.toLowerCase().trim();
    const user = await this.prisma.user.findUnique({
      where: { email: normalizedEmail },
      include: {
        profile: true,
        settings: true,
        socialLinks: true,
      },
    });

    if (!user || !user.isActive) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const isValid = await argon2.verify(user.passwordHash, dto.password);
    if (!isValid) {
      await this.audit.logEvent('AUTH_LOGIN_FAILED', user.id, ipAddress);
      throw new UnauthorizedException('Invalid email or password');
    }

    await this.audit.logEvent('AUTH_LOGIN_SUCCESS', user.id, ipAddress);

    return this.generateTokens(user.id, user.email, user.role, ipAddress, userAgent);
  }

  async refreshToken(
    refreshToken: string,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<TokenResult> {
    this.ensureSecretsConfigured();
    if (!refreshToken) {
      throw new UnauthorizedException('Refresh token is required');
    }

    let decoded: any;
    try {
      decoded = jwt.verify(refreshToken, this.jwtRefreshSecret, {
        algorithms: ['HS256'],
        issuer: this.jwtIssuer,
        audience: this.jwtAudience,
      });
    } catch (e) {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    if (!decoded || !decoded.sub) {
      throw new UnauthorizedException('Malformed token payload');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: decoded.sub },
    });

    if (!user || !user.isActive) {
      throw new UnauthorizedException('Session invalid or user inactive');
    }

    const hashed = crypto.createHash('sha256').update(refreshToken).digest('hex');

    // 1. Race condition mitigation: Check recent rotations cache for concurrent requests
    const cached = this.recentRotations.get(hashed);
    if (cached && Date.now() - cached.rotatedAt < 30000) {
      return {
        accessToken: cached.accessToken,
        refreshToken: cached.refreshToken,
        user: cached.user,
      };
    }

    // 2. Perform atomic rotation inside a transaction
    return await this.prisma.$transaction(async (tx) => {
      const session = await tx.userSession.findFirst({
        where: {
          userId: user.id,
          refreshTokenHash: hashed,
          expiresAt: { gt: new Date() },
        },
      });

      // 3. Reuse detection: Validly signed token that is absent from active DB sessions and outside grace period
      if (!session) {
        await tx.userSession.deleteMany({
          where: { userId: user.id },
        });
        await this.audit.logEvent(
          'AUTH_REFRESH_TOKEN_REUSE_REVOCATION',
          user.id,
          ipAddress,
        );
        throw new UnauthorizedException(
          'Refresh token reuse detected. All sessions revoked for security.',
        );
      }

      // Delete the consumed session
      await tx.userSession.delete({ where: { id: session.id } });

      // Generate new token pair
      const tokens = await this.generateTokens(
        user.id,
        user.email,
        user.role,
        ipAddress,
        userAgent,
        tx,
      );

      // Record in rotation grace cache for 30 seconds
      this.recentRotations.set(hashed, {
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        user: tokens.user,
        rotatedAt: Date.now(),
      });

      return tokens;
    });
  }

  async logout(userId: string, refreshToken?: string) {
    if (refreshToken) {
      const hashed = crypto.createHash('sha256').update(refreshToken).digest('hex');
      // Revoke only the intended session
      await this.prisma.userSession.deleteMany({
        where: { userId, refreshTokenHash: hashed },
      });
      this.recentRotations.delete(hashed);
    } else {
      // Revoke all sessions if no specific token provided
      await this.prisma.userSession.deleteMany({
        where: { userId },
      });
    }
    await this.audit.logEvent('AUTH_LOGOUT', userId);
    return { success: true, message: 'Logged out successfully' };
  }

  async getMe(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        role: true,
        isVerified: true,
        createdAt: true,
        profile: true,
        settings: true,
        socialLinks: true,
        skills: {
          include: { skill: true },
        },
      },
    });
    if (!user) {
      throw new UnauthorizedException('User not found');
    }
    return user;
  }

  private async generateTokens(
    userId: string,
    email: string,
    role: string,
    ipAddress?: string,
    userAgent?: string,
    prismaClient: any = this.prisma,
  ): Promise<TokenResult> {
    const payload = { sub: userId, email, role };
    const accessToken = jwt.sign(payload, this.jwtSecret, {
      algorithm: 'HS256',
      expiresIn: this.jwtExpiresIn as any,
      issuer: this.jwtIssuer,
      audience: this.jwtAudience,
    });
    const refreshToken = jwt.sign(payload, this.jwtRefreshSecret, {
      algorithm: 'HS256',
      expiresIn: this.jwtRefreshExpiresIn as any,
      issuer: this.jwtIssuer,
      audience: this.jwtAudience,
    });

    // Store hashed refresh token in database
    const hashed = crypto.createHash('sha256').update(refreshToken).digest('hex');
    const refreshMs = parseDurationToMs(this.jwtRefreshExpiresIn);
    const expiresAt = new Date(Date.now() + refreshMs);

    await prismaClient.userSession.create({
      data: {
        userId,
        refreshTokenHash: hashed,
        ipAddress,
        userAgent,
        expiresAt,
      },
    });

    const user = await prismaClient.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        role: true,
        profile: true,
        settings: true,
        socialLinks: true,
      },
    });

    return {
      accessToken,
      refreshToken,
      user,
    };
  }

  private cleanupRotationCache() {
    const now = Date.now();
    for (const [hash, record] of this.recentRotations.entries()) {
      if (now - record.rotatedAt > 60000) {
        this.recentRotations.delete(hash);
      }
    }
  }
}
