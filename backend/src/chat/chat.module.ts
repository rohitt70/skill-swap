import { Module } from '@nestjs/common';
import { ChatService } from './chat.service';
import { ChatController } from './chat.controller';
import { ChatGateway } from './chat.gateway';
import { ChatInactivityScheduler } from './chat-inactivity.scheduler';

@Module({
  controllers: [ChatController],
  providers: [ChatService, ChatGateway, ChatInactivityScheduler],
  exports: [ChatService, ChatGateway],
})
export class ChatModule {}
