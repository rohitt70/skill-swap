import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { CreateLearningSessionDto, CreateReviewDto } from './dto/learning-sessions.dto';

@Injectable()
export class LearningSessionsService {
  constructor(
    private prisma: PrismaService,
    private audit: AuditService,
  ) {}

  async createSession(learnerId: string, dto: CreateLearningSessionDto) {
    if (learnerId === dto.teacherId) {
      throw new BadRequestException('Cannot book a learning session with yourself');
    }

    const scheduledDate = new Date(dto.scheduledAt);
    if (isNaN(scheduledDate.getTime()) || scheduledDate < new Date()) {
      throw new BadRequestException('Scheduled date must be a valid future timestamp');
    }

    const teacher = await this.prisma.user.findUnique({
      where: { id: dto.teacherId },
      include: { profile: true },
    });
    if (!teacher || !teacher.isActive) {
      throw new NotFoundException('Teacher student not found');
    }

    const session = await this.prisma.$transaction(async (tx) => {
      const created = await tx.learningSession.create({
        data: {
          learnerId,
          teacherId: dto.teacherId,
          skillName: dto.skillName.trim(),
          topic: dto.topic.trim(),
          scheduledAt: scheduledDate,
          durationMins: dto.durationMins || 60,
          format: dto.format || 'VIRTUAL',
          location: dto.location,
          notes: dto.notes,
          status: 'PROPOSED',
        },
        include: {
          learner: { select: { id: true, profile: true } },
          teacher: { select: { id: true, profile: true } },
        },
      });

      await tx.notification.create({
        data: {
          userId: dto.teacherId,
          type: 'SESSION_BOOKED',
          title: 'Learning Session Proposed',
          message: `${created.learner.profile?.displayName || 'A peer'} proposed a learning session on "${created.skillName}".`,
          metadata: JSON.stringify({ sessionId: created.id }),
        },
      });

      return created;
    });

    await this.audit.logEvent('LEARNING_SESSION_PROPOSED', learnerId, undefined, {
      sessionId: session.id,
      teacherId: dto.teacherId,
    });

    return session;
  }

  async getUserSessions(userId: string) {
    return this.prisma.learningSession.findMany({
      where: {
        OR: [{ learnerId: userId }, { teacherId: userId }],
      },
      include: {
        learner: { select: { id: true, profile: true } },
        teacher: { select: { id: true, profile: true } },
        reviews: true,
      },
      orderBy: { scheduledAt: 'desc' },
    });
  }

  async acceptSession(userId: string, sessionId: string) {
    const session = await this.prisma.learningSession.findUnique({
      where: { id: sessionId },
    });
    if (!session) throw new NotFoundException('Session not found');

    if (session.teacherId !== userId) {
      throw new ForbiddenException('Only the requested teacher can accept this booking');
    }

    if (session.status !== 'PROPOSED') {
      throw new BadRequestException(`Cannot accept session with status ${session.status}`);
    }

    const updated = await this.prisma.learningSession.update({
      where: { id: sessionId },
      data: { status: 'ACCEPTED' },
    });

    await this.prisma.notification.create({
      data: {
        userId: session.learnerId,
        type: 'SESSION_STATUS',
        title: 'Session Accepted',
        message: `Your learning session on "${session.skillName}" has been accepted!`,
      },
    });

    return updated;
  }

  async declineSession(userId: string, sessionId: string) {
    const session = await this.prisma.learningSession.findUnique({
      where: { id: sessionId },
    });
    if (!session) throw new NotFoundException('Session not found');

    if (session.teacherId !== userId) {
      throw new ForbiddenException('Only the teacher can decline this booking');
    }

    return this.prisma.learningSession.update({
      where: { id: sessionId },
      data: { status: 'DECLINED' },
    });
  }

  async cancelSession(userId: string, sessionId: string) {
    const session = await this.prisma.learningSession.findUnique({
      where: { id: sessionId },
    });
    if (!session) throw new NotFoundException('Session not found');

    if (session.learnerId !== userId && session.teacherId !== userId) {
      throw new ForbiddenException('You are not a participant in this session');
    }

    return this.prisma.learningSession.update({
      where: { id: sessionId },
      data: { status: 'CANCELLED' },
    });
  }

  async completeSession(userId: string, sessionId: string) {
    const session = await this.prisma.learningSession.findUnique({
      where: { id: sessionId },
    });
    if (!session) throw new NotFoundException('Session not found');

    if (session.learnerId !== userId && session.teacherId !== userId) {
      throw new ForbiddenException('You are not a participant in this session');
    }

    return this.prisma.learningSession.update({
      where: { id: sessionId },
      data: { status: 'COMPLETED' },
    });
  }

  async submitReview(authorId: string, sessionId: string, dto: CreateReviewDto) {
    const session = await this.prisma.learningSession.findUnique({
      where: { id: sessionId },
    });

    if (!session) throw new NotFoundException('Session not found');

    if (session.status !== 'COMPLETED') {
      throw new BadRequestException('Reviews can only be submitted for completed sessions');
    }

    if (session.learnerId !== authorId && session.teacherId !== authorId) {
      throw new ForbiddenException('Only participants can submit a review');
    }

    const targetId = session.learnerId === authorId ? session.teacherId : session.learnerId;

    const review = await this.prisma.review.create({
      data: {
        learningSessionId: sessionId,
        authorId,
        targetId,
        rating: dto.rating,
        feedback: dto.feedback?.trim(),
      },
    });

    // Update target student's average reputation score
    const allReviews = await this.prisma.review.findMany({
      where: { targetId },
      select: { rating: true },
    });

    const averageRating =
      allReviews.reduce((sum, r) => sum + r.rating, 0) / allReviews.length;

    await this.prisma.userProfile.update({
      where: { userId: targetId },
      data: { reputationScore: Math.round(averageRating * 10) / 10 },
    });

    return review;
  }
}
