import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import { ModerationService } from './moderation.service';
import { BlockUserDto, ReportUserDto, UpdateReportStatusDto } from './dto/moderation.dto';
import { AuthGuard } from '../common/guards/auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser, AuthenticatedUser } from '../common/decorators/current-user.decorator';

@Controller('api/v1/moderation')
@UseGuards(AuthGuard)
export class ModerationController {
  constructor(private moderationService: ModerationService) {}

  @Post('block')
  async blockUser(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: BlockUserDto,
  ) {
    return this.moderationService.blockUser(user.id, dto);
  }

  @Delete('block/:id')
  async unblockUser(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') targetId: string,
  ) {
    return this.moderationService.unblockUser(user.id, targetId);
  }

  @Get('blocked')
  async getBlockedUsers(@CurrentUser() user: AuthenticatedUser) {
    return this.moderationService.getBlockedUsers(user.id);
  }

  @Post('report')
  async reportUser(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: ReportUserDto,
  ) {
    return this.moderationService.reportUser(user.id, dto);
  }

  @Get('admin/reports')
  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'MODERATOR')
  async getAllReports() {
    return this.moderationService.getAllReports();
  }

  @Put('admin/reports/:id')
  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'MODERATOR')
  async updateReport(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: UpdateReportStatusDto,
  ) {
    return this.moderationService.updateReport(id, user.id, dto);
  }
}
