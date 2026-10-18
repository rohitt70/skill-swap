import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateSkillDto, AddUserSkillDto } from './dto/skills.dto';

@Injectable()
export class SkillsService {
  constructor(private prisma: PrismaService) {}

  async getAllSkills() {
    return this.prisma.skill.findMany({
      orderBy: { name: 'asc' },
    });
  }

  async createCatalogSkill(dto: CreateSkillDto) {
    const normalized = dto.name.trim();
    return this.prisma.skill.upsert({
      where: { name: normalized },
      update: {},
      create: {
        name: normalized,
        category: dto.category?.trim() || 'General',
        description: dto.description?.trim(),
      },
    });
  }

  async getUserSkills(userId: string) {
    return this.prisma.userSkill.findMany({
      where: { userId },
      include: { skill: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async addUserSkill(userId: string, dto: AddUserSkillDto) {
    const normalizedName = dto.skillName.trim();

    // Ensure skill exists in master catalog
    const skill = await this.prisma.skill.upsert({
      where: { name: normalizedName },
      update: {},
      create: {
        name: normalizedName,
        category: dto.category?.trim() || 'General',
      },
    });

    // Check if user already has this skill for this type (TEACH vs LEARN)
    const existing = await this.prisma.userSkill.findUnique({
      where: {
        userId_skillId_type: {
          userId,
          skillId: skill.id,
          type: dto.type,
        },
      },
    });

    if (existing) {
      throw new BadRequestException(`Skill already added to your ${dto.type.toLowerCase()} list`);
    }

    return this.prisma.userSkill.create({
      data: {
        userId,
        skillId: skill.id,
        type: dto.type,
        proficiencyLevel: dto.proficiencyLevel || 'INTERMEDIATE',
        notes: dto.notes?.trim(),
      },
      include: { skill: true },
    });
  }

  async removeUserSkill(userId: string, userSkillId: string) {
    const userSkill = await this.prisma.userSkill.findUnique({
      where: { id: userSkillId },
    });

    if (!userSkill || userSkill.userId !== userId) {
      throw new BadRequestException('Skill record not found or access denied');
    }

    return this.prisma.userSkill.delete({
      where: { id: userSkillId },
    });
  }
}
