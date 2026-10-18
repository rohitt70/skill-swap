import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(private prisma: PrismaService) {}

  async logEvent(action: string, userId?: string, ipAddress?: string, details?: any) {
    try {
      this.logger.log(`Audit: [${action}] by User: [${userId || 'ANONYMOUS'}]`);
      await this.prisma.auditEvent.create({
        data: {
          action,
          userId,
          ipAddress,
          details: details ? JSON.stringify(details) : undefined,
        },
      });
    } catch (err) {
      this.logger.error(`Failed to record audit event: ${err.message}`);
    }
  }
}
