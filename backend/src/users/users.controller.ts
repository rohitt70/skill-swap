import {
  Controller,
  Get,
  Put,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { UpdateProfileDto, SearchUsersDto } from './dto/users.dto';
import { AuthGuard } from '../common/guards/auth.guard';
import { CurrentUser, AuthenticatedUser } from '../common/decorators/current-user.decorator';

@Controller('api/v1/users')
@UseGuards(AuthGuard)
export class UsersController {
  constructor(private usersService: UsersService) {}

  @Get('search')
  async search(@CurrentUser() user: AuthenticatedUser, @Query() query: SearchUsersDto) {
    return this.usersService.searchUsers(user.id, query);
  }

  @Get('recommendations')
  async getRecommendations(@CurrentUser() user: AuthenticatedUser) {
    return this.usersService.getRecommendedMatches(user.id);
  }

  @Get('profile/:id')
  async getProfile(@Param('id') id: string) {
    return this.usersService.getProfile(id);
  }

  @Put('profile')
  async updateProfile(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: UpdateProfileDto,
  ) {
    return this.usersService.updateProfile(user.id, dto);
  }
}
