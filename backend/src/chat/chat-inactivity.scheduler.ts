import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ChatService } from './chat.service';

@Injectable()
export class ChatInactivityScheduler implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(ChatInactivityScheduler.name);
  private timer: NodeJS.Timeout | null = null;

  constructor(private chatService: ChatService) {}

  onModuleInit() {
    this.logger.log('Starting Chat Inactivity & Lifecycle Background Worker (Interval: 15s)');
    this.timer = setInterval(async () => {
      try {
        await this.chatService.sweepDeadlines();
      } catch (err) {
        this.logger.error(`Error in chat inactivity sweep: ${err.message}`);
      }
    }, 15000);
  }

  onModuleDestroy() {
    if (this.timer) {
      clearInterval(this.timer);
      this.logger.log('Stopped Chat Inactivity Worker');
    }
  }
}
