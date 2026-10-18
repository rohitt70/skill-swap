import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import { SkillsService } from './skills.service';
import { CreateSkillDto, AddUserSkillDto } from './dto/skills.dto';
import { AuthGuard } from '../common/guards/auth.guard';
import { CurrentUser, AuthenticatedUser } from '../common/decorators/current-user.decorator';

@Controller('api/v1/skills')
@UseGuards(AuthGuard)
export class SkillsController {
  constructor(private skillsService: SkillsService) {}

  @Get('catalog')
  async getCatalog() {
    return this.skillsService.getAllSkills();
  }

  @Post('catalog')
  async createCatalogSkill(@Body() dto: CreateSkillDto) {
    return this.skillsService.createCatalogSkill(dto);
  }

  @Get('my-skills')
  async getMySkills(@CurrentUser() user: AuthenticatedUser) {
    return this.skillsService.getUserSkills(user.id);
  }

  @Post('my-skills')
  async addUserSkill(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: AddUserSkillDto,
  ) {
    return this.skillsService.addUserSkill(user.id, dto);
  }

  @Delete('my-skills/:id')
  async removeUserSkill(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ) {
    return this.skillsService.removeUserSkill(user.id, id);
  }
}
