import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ChatService } from './chat.service';
import {
  CreateConversationDto,
  SendMessageDto,
  GetMessagesQueryDto,
} from './dto/chat.dto';
import { AuthGuard } from '../common/guards/auth.guard';
import { CurrentUser, AuthenticatedUser } from '../common/decorators/current-user.decorator';

@Controller('api/v1/chat')
@UseGuards(AuthGuard)
export class ChatController {
  constructor(private chatService: ChatService) {}

  @Get('conversations')
  async getConversations(@CurrentUser() user: AuthenticatedUser) {
    return this.chatService.getUserConversations(user.id);
  }

  @Post('conversations')
  async createDirectConversation(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateConversationDto,
  ) {
    return this.chatService.getOrCreateDirectConversation(user.id, dto.recipientId);
  }

  @Get('conversations/:id/messages')
  async getMessages(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Query() query: GetMessagesQueryDto,
  ) {
    return this.chatService.getConversationMessages(
      user.id,
      id,
      query.limit ? Number(query.limit) : 50,
      query.cursor,
    );
  }

  @Get('conversations/:id/session')
  async getSession(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ) {
    return this.chatService.getOrCreateActiveSession(user.id, id);
  }

  @Post('conversations/:id/messages')
  async sendMessage(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: SendMessageDto,
  ) {
    return this.chatService.saveMessage(user.id, id, dto.content);
  }

  @Post('sessions/:id/rejoin')
  async rejoinSession(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') sessionId: string,
  ) {
    return this.chatService.rejoinSession(user.id, sessionId);
  }

  @Post('sessions/:id/close')
  async closeSession(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') sessionId: string,
  ) {
    return this.chatService.closeSession(user.id, sessionId);
  }
}
