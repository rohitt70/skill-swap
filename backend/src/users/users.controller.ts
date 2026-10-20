import {
  Controller,
  Get,
  Put,
  Patch,
  Post,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { UsersService } from './users.service';
import {
  UpdateProfileDto,
  SearchUsersDto,
  SocialLinkDto,
  UpdateSettingsDto,
  ChangePasswordDto,
} from './dto/users.dto';
import { AuthGuard } from '../common/guards/auth.guard';
import { CurrentUser, AuthenticatedUser } from '../common/decorators/current-user.decorator';

@Controller('api/v1/users')
export class UsersController {
  constructor(private usersService: UsersService) {}

  @Get()
  @UseGuards(AuthGuard)
  async getUsers(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: SearchUsersDto,
  ) {
    return this.usersService.searchUsers(user.id, query);
  }

  @Get('search')
  @UseGuards(AuthGuard)
  async search(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: SearchUsersDto,
  ) {
    return this.usersService.searchUsers(user.id, query);
  }

  @Get('recommendations')
  @UseGuards(AuthGuard)
  async getRecommendations(@CurrentUser() user: AuthenticatedUser) {
    return this.usersService.getRecommendedMatches(user.id);
  }

  @Get('me')
  @UseGuards(AuthGuard)
  async getMe(@CurrentUser() user: AuthenticatedUser) {
    return this.usersService.getMyProfile(user.id);
  }

  @Get('me/profile')
  @UseGuards(AuthGuard)
  async getMyProfile(@CurrentUser() user: AuthenticatedUser) {
    return this.usersService.getMyProfile(user.id);
  }

  @Patch('me/profile')
  @UseGuards(AuthGuard)
  async patchMyProfile(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: UpdateProfileDto,
  ) {
    return this.usersService.updateProfile(user.id, dto);
  }

  @Put('profile')
  @UseGuards(AuthGuard)
  async updateProfile(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: UpdateProfileDto,
  ) {
    return this.usersService.updateProfile(user.id, dto);
  }

  @Get('me/settings')
  @UseGuards(AuthGuard)
  async getMySettings(@CurrentUser() user: AuthenticatedUser) {
    return this.usersService.getMySettings(user.id);
  }

  @Patch('me/settings')
  @UseGuards(AuthGuard)
  async updateMySettings(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: UpdateSettingsDto,
  ) {
    return this.usersService.updateMySettings(user.id, dto);
  }

  @Post('me/social-links')
  @UseGuards(AuthGuard)
  async addSocialLink(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: SocialLinkDto,
  ) {
    return this.usersService.addSocialLink(user.id, dto);
  }

  @Delete('me/social-links/:id')
  @UseGuards(AuthGuard)
  async deleteSocialLink(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ) {
    return this.usersService.deleteSocialLink(user.id, id);
  }

  @Post('me/change-password')
  @UseGuards(AuthGuard)
  @HttpCode(HttpStatus.OK)
  async changePassword(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: ChangePasswordDto,
  ) {
    return this.usersService.changePassword(user.id, dto);
  }

  @Delete('me')
  @UseGuards(AuthGuard)
  async deleteAccount(@CurrentUser() user: AuthenticatedUser) {
    return this.usersService.deleteAccount(user.id);
  }

  @Get(':id')
  @UseGuards(AuthGuard)
  async getPublicProfile(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ) {
    return this.usersService.getPublicProfile(id, user?.id);
  }
}
