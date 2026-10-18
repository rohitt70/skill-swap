import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { RegisterDto, LoginDto } from './dto/auth.dto';
import * as argon2 from 'argon2';
import * as jwt from 'jsonwebtoken';
import * as crypto from 'crypto';

@Injectable()
export class AuthService {
  private readonly jwtSecret = process.env.JWT_SECRET || 'fallback_secret_for_development_skillswap';
  private readonly jwtRefreshSecret = process.env.JWT_REFRESH_SECRET || 'fallback_refresh_secret_skillswap';

  constructor(
    private prisma: PrismaService,
    private audit: AuditService,
  ) {}

  async register(dto: RegisterDto, ipAddress?: string) {
    const existing = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase().trim() },
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
          email: dto.email.toLowerCase().trim(),
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

      return newUser;
    });

    await this.audit.logEvent('AUTH_REGISTER', user.id, ipAddress);

    return this.generateTokens(user.id, user.email, user.role, ipAddress);
  }

  async login(dto: LoginDto, ipAddress?: string, userAgent?: string) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase().trim() },
      include: { profile: true },
    });

    if (!user || !user.isActive) {
      throw new UnauthorizedException('Invalid credentials or inactive account');
    }

    const isValid = await argon2.verify(user.passwordHash, dto.password);
    if (!isValid) {
      await this.audit.logEvent('AUTH_LOGIN_FAILED', user.id, ipAddress);
      throw new UnauthorizedException('Invalid credentials');
    }

    await this.audit.logEvent('AUTH_LOGIN_SUCCESS', user.id, ipAddress);

    return this.generateTokens(user.id, user.email, user.role, ipAddress, userAgent);
  }

  async refreshToken(refreshToken: string, ipAddress?: string) {
    try {
      const decoded = jwt.verify(refreshToken, this.jwtRefreshSecret) as any;
      const user = await this.prisma.user.findUnique({
        where: { id: decoded.sub },
      });

      if (!user || !user.isActive) {
        throw new UnauthorizedException('Session invalid');
      }

      // Check session in db
      const hashed = crypto.createHash('sha256').update(refreshToken).digest('hex');
      const session = await this.prisma.userSession.findFirst({
        where: {
          userId: user.id,
          refreshTokenHash: hashed,
          expiresAt: { gt: new Date() },
        },
      });

      if (!session) {
        throw new UnauthorizedException('Session expired or revoked');
      }

      // Invalidate old session and generate new tokens
      await this.prisma.userSession.delete({ where: { id: session.id } });

      return this.generateTokens(user.id, user.email, user.role, ipAddress);
    } catch (e) {
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  async logout(userId: string, refreshToken?: string) {
    if (refreshToken) {
      const hashed = crypto.createHash('sha256').update(refreshToken).digest('hex');
      await this.prisma.userSession.deleteMany({
        where: { userId, refreshTokenHash: hashed },
      });
    } else {
      await this.prisma.userSession.deleteMany({
        where: { userId },
      });
    }
    await this.audit.logEvent('AUTH_LOGOUT', userId);
    return { success: true };
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
  ) {
    const payload = { sub: userId, email, role };
    const accessToken = jwt.sign(payload, this.jwtSecret, { expiresIn: '15m' });
    const refreshToken = jwt.sign(payload, this.jwtRefreshSecret, { expiresIn: '7d' });

    // Store hashed refresh token in database for revocable session management
    const hashed = crypto.createHash('sha256').update(refreshToken).digest('hex');
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    await this.prisma.userSession.create({
      data: {
        userId,
        refreshTokenHash: hashed,
        ipAddress,
        userAgent,
        expiresAt,
      },
    });

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        role: true,
        profile: true,
      },
    });

    return {
      accessToken,
      refreshToken,
      user,
    };
  }
}
