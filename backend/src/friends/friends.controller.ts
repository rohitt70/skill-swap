import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import { FriendsService } from './friends.service';
import { SendFriendRequestDto } from './dto/friends.dto';
import { AuthGuard } from '../common/guards/auth.guard';
import { CurrentUser, AuthenticatedUser } from '../common/decorators/current-user.decorator';

@Controller('api/v1/friends')
@UseGuards(AuthGuard)
export class FriendsController {
  constructor(private friendsService: FriendsService) {}

  @Post('request')
  async sendRequest(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: SendFriendRequestDto,
  ) {
    return this.friendsService.sendFriendRequest(user.id, dto);
  }

  @Post('request/:id/accept')
  async acceptRequest(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') requestId: string,
  ) {
    return this.friendsService.acceptFriendRequest(user.id, requestId);
  }

  @Post('request/:id/reject')
  async rejectRequest(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') requestId: string,
  ) {
    return this.friendsService.rejectFriendRequest(user.id, requestId);
  }

  @Post('request/:id/cancel')
  async cancelRequest(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') requestId: string,
  ) {
    return this.friendsService.cancelFriendRequest(user.id, requestId);
  }

  @Get('requests/incoming')
  async getIncoming(@CurrentUser() user: AuthenticatedUser) {
    return this.friendsService.getIncomingRequests(user.id);
  }

  @Get('requests/outgoing')
  async getOutgoing(@CurrentUser() user: AuthenticatedUser) {
    return this.friendsService.getOutgoingRequests(user.id);
  }

  @Get('list')
  async getFriendsList(@CurrentUser() user: AuthenticatedUser) {
    return this.friendsService.getFriendsList(user.id);
  }

  @Delete(':friendId')
  async removeFriend(
    @CurrentUser() user: AuthenticatedUser,
    @Param('friendId') friendId: string,
  ) {
    return this.friendsService.removeFriend(user.id, friendId);
  }
}
