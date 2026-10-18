import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateProfileDto, SearchUsersDto } from './dto/users.dto';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async getProfile(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        role: true,
        createdAt: true,
        profile: true,
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

    return user;
  }

  async updateProfile(userId: string, dto: UpdateProfileDto) {
    const profile = await this.prisma.userProfile.upsert({
      where: { userId },
      update: {
        displayName: dto.displayName,
        institution: dto.institution,
        major: dto.major,
        graduationYear: dto.graduationYear,
        bio: dto.bio,
        avatarUrl: dto.avatarUrl,
        preferredFormat: dto.preferredFormat,
        availability: dto.availability,
        timeZone: dto.timeZone,
      },
      create: {
        userId,
        displayName: dto.displayName || 'Student',
        institution: dto.institution || 'University',
        major: dto.major,
        bio: dto.bio,
      },
    });

    return profile;
  }

  async searchUsers(currentUserId: string, dto: SearchUsersDto) {
    const page = dto.page ? Number(dto.page) : 1;
    const limit = dto.limit ? Number(dto.limit) : 20;
    const skip = (page - 1) * limit;

    const where: any = {
      id: { not: currentUserId },
      isActive: true,
    };

    if (dto.query) {
      where.OR = [
        { profile: { displayName: { contains: dto.query, mode: 'insensitive' } } },
        { profile: { bio: { contains: dto.query, mode: 'insensitive' } } },
        { profile: { institution: { contains: dto.query, mode: 'insensitive' } } },
      ];
    }

    if (dto.institution) {
      where.profile = {
        ...(where.profile || {}),
        institution: { contains: dto.institution, mode: 'insensitive' },
      };
    }

    if (dto.skill) {
      where.skills = {
        some: {
          skill: { name: { contains: dto.skill, mode: 'insensitive' } },
        },
      };
    }

    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        select: {
          id: true,
          profile: true,
          skills: {
            include: { skill: true },
          },
        },
        skip,
        take: limit,
      }),
      this.prisma.user.count({ where }),
    ]);

    return {
      data: users,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getRecommendedMatches(currentUserId: string) {
    // Get user's desired skills to learn
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

    // Find peers who teach what current user wants to learn
    const potentialMatches = await this.prisma.user.findMany({
      where: {
        id: { not: currentUserId },
        isActive: true,
      },
      select: {
        id: true,
        profile: true,
        skills: {
          include: { skill: true },
        },
      },
      take: 20,
    });

    // Score based on mutual exchange overlap
    const scored = potentialMatches.map((peer) => {
      let score = 0;
      const peerTeaches = peer.skills
        .filter((s) => s.type === 'TEACH')
        .map((s) => s.skill.name.toLowerCase());
      const peerLearns = peer.skills
        .filter((s) => s.type === 'LEARN')
        .map((s) => s.skill.name.toLowerCase());

      // If peer teaches what user wants to learn
      const teachMatch = peerTeaches.some((skill) => skillsToLearn.includes(skill));
      if (teachMatch) score += 3;

      // If user teaches what peer wants to learn (Mutual Skill Swap!)
      const mutualMatch = peerLearns.some((skill) => skillsToTeach.includes(skill));
      if (mutualMatch) score += 5;

      return {
        ...peer,
        matchScore: score,
        isMutualMatch: teachMatch && mutualMatch,
      };
    });

    return scored.sort((a, b) => b.matchScore - a.matchScore).slice(0, 10);
  }
}
