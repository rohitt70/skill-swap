import {
  Injectable,
  NotFoundException,
  BadRequestException,
  UnauthorizedException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import {
  UpdateProfileDto,
  SearchUsersDto,
  SocialLinkDto,
  UpdateSettingsDto,
  ChangePasswordDto,
} from './dto/users.dto';
import * as argon2 from 'argon2';

@Injectable()
export class UsersService {
  constructor(
    private prisma: PrismaService,
    private audit: AuditService,
  ) {}

  /**
   * Helper to calculate profile completeness score (0-100%)
   */
  calculateProfileCompleteness(profile: any, userSkills: any[], socialLinks: any[] = []): number {
    let score = 0;
    if (profile?.displayName) score += 20;
    if (profile?.headline) score += 15;
    if (profile?.bio && profile.bio.length > 20) score += 15;
    if (profile?.institution) score += 10;
    if (profile?.major) score += 10;
    if (profile?.availability) score += 10;
    if (userSkills && userSkills.length > 0) score += 10;
    if (socialLinks && socialLinks.length > 0) score += 10;
    return Math.min(score, 100);
  }

  /**
   * Get current user's complete profile with settings & social links
   */
  async getMyProfile(userId: string) {
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
        socialLinks: {
          orderBy: { createdAt: 'asc' },
        },
        skills: {
          include: { skill: true },
        },
        reviewsReceived: {
          select: {
            id: true,
            rating: true,
            feedback: true,
            createdAt: true,
            author: {
              select: {
                id: true,
                profile: { select: { displayName: true, avatarUrl: true } },
              },
            },
          },
          take: 10,
        },
      },
    });

    if (!user) {
      throw new NotFoundException('User profile not found');
    }

    const completeness = this.calculateProfileCompleteness(
      user.profile,
      user.skills,
      user.socialLinks,
    );

    return {
      ...user,
      completeness,
    };
  }

  /**
   * Update current user's profile
   */
  async updateProfile(userId: string, dto: UpdateProfileDto) {
    const profile = await this.prisma.userProfile.upsert({
      where: { userId },
      update: {
        displayName: dto.displayName,
        headline: dto.headline,
        institution: dto.institution,
        major: dto.major,
        graduationYear: dto.graduationYear,
        location: dto.location,
        bio: dto.bio,
        avatarUrl: dto.avatarUrl,
        portfolioUrl: dto.portfolioUrl,
        preferredFormat: dto.preferredFormat,
        availability: dto.availability,
        timeZone: dto.timeZone,
      },
      create: {
        userId,
        displayName: dto.displayName || 'Student',
        headline: dto.headline,
        institution: dto.institution || 'University',
        major: dto.major,
        graduationYear: dto.graduationYear,
        location: dto.location,
        bio: dto.bio,
        avatarUrl: dto.avatarUrl,
        portfolioUrl: dto.portfolioUrl,
      },
    });

    await this.audit.logEvent('PROFILE_UPDATED', userId);
    return profile;
  }

  /**
   * Get public profile for another student, enforcing privacy settings
   */
  async getPublicProfile(targetUserId: string, requesterUserId?: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: targetUserId },
      include: {
        profile: true,
        settings: true,
        socialLinks: true,
        skills: { include: { skill: true } },
        reviewsReceived: {
          select: {
            id: true,
            rating: true,
            feedback: true,
            createdAt: true,
            author: {
              select: {
                id: true,
                profile: { select: { displayName: true, avatarUrl: true } },
              },
            },
          },
          take: 5,
        },
      },
    });

    if (!user || !user.isActive) {
      throw new NotFoundException('Student profile not found');
    }

    const isOwner = requesterUserId === targetUserId;
    const settings = user.settings;

    // Check if profile is public or requester is owner
    if (!isOwner && settings && !settings.isProfilePublic) {
      return {
        id: user.id,
        isPrivate: true,
        profile: {
          displayName: user.profile?.displayName || 'Student',
          avatarUrl: user.profile?.avatarUrl,
          institution: settings.showInstitution ? user.profile?.institution : null,
        },
        message: 'This student has set their profile to private.',
      };
    }

    // Filter fields according to privacy settings
    const filteredProfile = { ...user.profile };
    if (!isOwner && settings) {
      if (!settings.showInstitution) delete (filteredProfile as any).institution;
      if (!settings.showAvailability) delete (filteredProfile as any).availability;
    }

    const allowedSocialLinks =
      isOwner || !settings || settings.showSocialLinks ? user.socialLinks : [];

    const email = isOwner || settings?.showEmail ? user.email : undefined;

    return {
      id: user.id,
      email,
      role: user.role,
      createdAt: user.createdAt,
      profile: filteredProfile,
      socialLinks: allowedSocialLinks,
      skills: user.skills,
      reviewsReceived: user.reviewsReceived,
      isOwner,
    };
  }

  /**
   * Get user settings (or create defaults)
   */
  async getMySettings(userId: string) {
    let settings = await this.prisma.userSettings.findUnique({
      where: { userId },
    });

    if (!settings) {
      settings = await this.prisma.userSettings.create({
        data: { userId },
      });
    }

    return settings;
  }

  /**
   * Update user settings
   */
  async updateMySettings(userId: string, dto: UpdateSettingsDto) {
    const settings = await this.prisma.userSettings.upsert({
      where: { userId },
      update: {
        theme: dto.theme,
        isProfilePublic: dto.isProfilePublic,
        showSocialLinks: dto.showSocialLinks,
        showEmail: dto.showEmail,
        showAvailability: dto.showAvailability,
        showInstitution: dto.showInstitution,
        emailNotifications: dto.emailNotifications,
        friendRequestNotifications: dto.friendRequestNotifications,
        sessionNotifications: dto.sessionNotifications,
        chatNotifications: dto.chatNotifications,
      },
      create: {
        userId,
        theme: dto.theme || 'SYSTEM',
        isProfilePublic: dto.isProfilePublic ?? true,
        showSocialLinks: dto.showSocialLinks ?? true,
        showEmail: dto.showEmail ?? false,
        showAvailability: dto.showAvailability ?? true,
        showInstitution: dto.showInstitution ?? true,
      },
    });

    await this.audit.logEvent('SETTINGS_UPDATED', userId);
    return settings;
  }

  /**
   * Social links management
   */
  async addSocialLink(userId: string, dto: SocialLinkDto) {
    const platform = dto.platform.toUpperCase().trim();
    return this.prisma.socialLink.upsert({
      where: { userId_platform: { userId, platform } },
      update: { url: dto.url.trim() },
      create: {
        userId,
        platform,
        url: dto.url.trim(),
      },
    });
  }

  async deleteSocialLink(userId: string, linkId: string) {
    const link = await this.prisma.socialLink.findUnique({
      where: { id: linkId },
    });

    if (!link || link.userId !== userId) {
      throw new BadRequestException('Social link not found or unauthorized');
    }

    await this.prisma.socialLink.delete({
      where: { id: linkId },
    });

    return { success: true, message: 'Social link removed' };
  }

  /**
   * Secure password change
   */
  async changePassword(userId: string, dto: ChangePasswordDto) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const isValid = await argon2.verify(user.passwordHash, dto.currentPassword);
    if (!isValid) {
      throw new BadRequestException('Current password does not match');
    }

    const passwordHash = await argon2.hash(dto.newPassword, {
      type: argon2.argon2id,
      memoryCost: 2 ** 16,
      timeCost: 3,
      parallelism: 1,
    });

    await this.prisma.user.update({
      where: { id: userId },
      data: { passwordHash },
    });

    // Invalidate existing sessions for security
    await this.prisma.userSession.deleteMany({
      where: { userId },
    });

    await this.audit.logEvent('PASSWORD_CHANGED', userId);
    return { success: true, message: 'Password updated successfully. Please log in again.' };
  }

  /**
   * Account Deactivation / Deletion
   */
  async deleteAccount(userId: string) {
    await this.prisma.user.update({
      where: { id: userId },
      data: { isActive: false },
    });

    await this.prisma.userSession.deleteMany({
      where: { userId },
    });

    await this.audit.logEvent('ACCOUNT_DEACTIVATED', userId);
    return { success: true, message: 'Account deactivated successfully' };
  }

  /**
   * Search real registered students from database
   */
  async searchUsers(currentUserId: string, dto: SearchUsersDto) {
    const page = dto.page ? Number(dto.page) : 1;
    const limit = dto.limit ? Number(dto.limit) : 20;
    const skip = (page - 1) * limit;

    const where: any = {
      id: { not: currentUserId },
      isActive: true,
      // Only include students who have not made their entire profile private
      OR: [
        { settings: { isProfilePublic: true } },
        { settings: null }, // default is public
      ],
    };

    if (dto.query) {
      where.AND = [
        {
          OR: [
            { profile: { displayName: { contains: dto.query, mode: 'insensitive' } } },
            { profile: { headline: { contains: dto.query, mode: 'insensitive' } } },
            { profile: { bio: { contains: dto.query, mode: 'insensitive' } } },
            { profile: { institution: { contains: dto.query, mode: 'insensitive' } } },
            { profile: { location: { contains: dto.query, mode: 'insensitive' } } },
          ],
        },
      ];
    }

    if (dto.institution) {
      where.profile = {
        ...(where.profile || {}),
        institution: { contains: dto.institution, mode: 'insensitive' },
      };
    }

    if (dto.skill) {
      const skillFilter: any = {
        skill: { name: { contains: dto.skill, mode: 'insensitive' } },
      };
      if (dto.skillType) {
        skillFilter.type = dto.skillType;
      }
      where.skills = {
        some: skillFilter,
      };
    }

    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        select: {
          id: true,
          role: true,
          createdAt: true,
          profile: true,
          settings: {
            select: {
              showSocialLinks: true,
              showInstitution: true,
              showAvailability: true,
            },
          },
          socialLinks: true,
          skills: {
            include: { skill: true },
          },
        },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.user.count({ where }),
    ]);

    // Sanitize results according to user privacy settings
    const sanitized = users.map((u) => {
      const showSocial = u.settings?.showSocialLinks ?? true;
      const showInst = u.settings?.showInstitution ?? true;
      const showAvail = u.settings?.showAvailability ?? true;

      const profile = { ...u.profile };
      if (!showInst) delete (profile as any).institution;
      if (!showAvail) delete (profile as any).availability;

      return {
        id: u.id,
        role: u.role,
        profile,
        socialLinks: showSocial ? u.socialLinks : [],
        skills: u.skills,
      };
    });

    return {
      data: sanitized,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Recommend mutual skill matches
   */
  async getRecommendedMatches(currentUserId: string) {
    const userSkills = await this.prisma.userSkill.findMany({
      where: { userId: currentUserId },
      include: { skill: true },
    });

    const skillsToLearn = userSkills
      .filter((s) => s.type === 'LEARN')
      .map((s) => s.skill.name.toLowerCase());

    const skillsToTeach = userSkills
      .filter((s) => s.type === 'TEACH')
      .map((s) => s.skill.name.toLowerCase());

    const potentialMatches = await this.prisma.user.findMany({
      where: {
        id: { not: currentUserId },
        isActive: true,
        OR: [
          { settings: { isProfilePublic: true } },
          { settings: null },
        ],
      },
      select: {
        id: true,
        profile: true,
        socialLinks: true,
        settings: {
          select: {
            showSocialLinks: true,
          },
        },
        skills: {
          include: { skill: true },
        },
      },
      take: 25,
    });

    const scored = potentialMatches.map((peer) => {
      let score = 0;
      const peerTeaches = peer.skills
        .filter((s) => s.type === 'TEACH')
        .map((s) => s.skill.name.toLowerCase());
      const peerLearns = peer.skills
        .filter((s) => s.type === 'LEARN')
        .map((s) => s.skill.name.toLowerCase());

      const teachMatch = peerTeaches.some((skill) => skillsToLearn.includes(skill));
      if (teachMatch) score += 3;

      const mutualMatch = peerLearns.some((skill) => skillsToTeach.includes(skill));
      if (mutualMatch) score += 5;

      const showSocial = peer.settings?.showSocialLinks ?? true;

      return {
        id: peer.id,
        profile: peer.profile,
        socialLinks: showSocial ? peer.socialLinks : [],
        skills: peer.skills,
        matchScore: score,
        isMutualMatch: teachMatch && mutualMatch,
      };
    });

    return scored
      .filter((s) => s.matchScore > 0)
      .sort((a, b) => b.matchScore - a.matchScore)
      .slice(0, 10);
  }
}
