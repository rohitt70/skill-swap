import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import { LearningSessionsService } from './learning-sessions.service';
import { CreateLearningSessionDto, CreateReviewDto } from './dto/learning-sessions.dto';
import { AuthGuard } from '../common/guards/auth.guard';
import { CurrentUser, AuthenticatedUser } from '../common/decorators/current-user.decorator';

@Controller('api/v1/learning-sessions')
@UseGuards(AuthGuard)
export class LearningSessionsController {
  constructor(private sessionsService: LearningSessionsService) {}

  @Post()
  async createSession(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateLearningSessionDto,
  ) {
    return this.sessionsService.createSession(user.id, dto);
  }

  @Get()
  async getSessions(@CurrentUser() user: AuthenticatedUser) {
    return this.sessionsService.getUserSessions(user.id);
  }

  @Post(':id/accept')
  async acceptSession(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ) {
    return this.sessionsService.acceptSession(user.id, id);
  }

  @Post(':id/decline')
  async declineSession(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ) {
    return this.sessionsService.declineSession(user.id, id);
  }

  @Post(':id/cancel')
  async cancelSession(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ) {
    return this.sessionsService.cancelSession(user.id, id);
  }

  @Post(':id/complete')
  async completeSession(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ) {
    return this.sessionsService.completeSession(user.id, id);
  }

  @Post(':id/reviews')
  async submitReview(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: CreateReviewDto,
  ) {
    return this.sessionsService.submitReview(user.id, id, dto);
  }
}
