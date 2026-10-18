import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { BlockUserDto, ReportUserDto, UpdateReportStatusDto } from './dto/moderation.dto';

@Injectable()
export class ModerationService {
  constructor(
    private prisma: PrismaService,
    private audit: AuditService,
  ) {}

  async blockUser(blockerId: string, dto: BlockUserDto) {
    if (blockerId === dto.targetUserId) {
      throw new BadRequestException('Cannot block yourself');
    }

    const u1 = blockerId < dto.targetUserId ? blockerId : dto.targetUserId;
    const u2 = blockerId < dto.targetUserId ? dto.targetUserId : blockerId;

    await this.prisma.$transaction(async (tx) => {
      // 1. Create block record
      await tx.userBlock.upsert({
        where: { blockerId_blockedId: { blockerId, blockedId: dto.targetUserId } },
        update: { reason: dto.reason },
        create: {
          blockerId,
          blockedId: dto.targetUserId,
          reason: dto.reason,
        },
      });

      // 2. Remove friendship if existing
      await tx.friendship.deleteMany({
        where: { userAId: u1, userBId: u2 },
      });

      // 3. Cancel any pending friend requests
      await tx.friendRequest.deleteMany({
        where: {
          OR: [
            { senderId: blockerId, recipientId: dto.targetUserId },
            { senderId: dto.targetUserId, recipientId: blockerId },
          ],
        },
      });
    });

    await this.audit.logEvent('USER_BLOCKED', blockerId, undefined, { blockedId: dto.targetUserId });
    return { success: true, message: 'User blocked successfully' };
  }

  async unblockUser(blockerId: string, targetUserId: string) {
    const block = await this.prisma.userBlock.findUnique({
      where: { blockerId_blockedId: { blockerId, blockedId: targetUserId } },
    });

    if (!block) {
      throw new NotFoundException('Block record not found');
    }

    await this.prisma.userBlock.delete({
      where: { id: block.id },
    });

    await this.audit.logEvent('USER_UNBLOCKED', blockerId, undefined, { targetUserId });
    return { success: true, message: 'User unblocked' };
  }

  async getBlockedUsers(userId: string) {
    return this.prisma.userBlock.findMany({
      where: { blockerId: userId },
      include: {
        blocked: {
          select: {
            id: true,
            profile: true,
          },
        },
      },
    });
  }

  async reportUser(reporterId: string, dto: ReportUserDto) {
    if (reporterId === dto.reportedUserId) {
      throw new BadRequestException('Cannot report yourself');
    }

    const report = await this.prisma.userReport.create({
      data: {
        reporterId,
        reportedId: dto.reportedUserId,
        reason: dto.reason,
        details: dto.details,
      },
    });

    await this.audit.logEvent('USER_REPORTED', reporterId, undefined, {
      reportedId: dto.reportedUserId,
      reason: dto.reason,
    });

    return { success: true, message: 'Report submitted for review', reportId: report.id };
  }

  // Admin moderation endpoints
  async getAllReports() {
    return this.prisma.userReport.findMany({
      include: {
        reporter: { select: { id: true, email: true, profile: true } },
        reported: { select: { id: true, email: true, profile: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async updateReport(reportId: string, adminUserId: string, dto: UpdateReportStatusDto) {
    const report = await this.prisma.userReport.findUnique({
      where: { id: reportId },
    });
    if (!report) throw new NotFoundException('Report not found');

    const updated = await this.prisma.userReport.update({
      where: { id: reportId },
      data: {
        status: dto.status,
        adminNotes: dto.adminNotes,
      },
    });

    await this.audit.logEvent('ADMIN_REPORT_RESOLVED', adminUserId, undefined, {
      reportId,
      status: dto.status,
    });

    return updated;
  }
}
