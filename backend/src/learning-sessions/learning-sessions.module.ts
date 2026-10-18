import { Module } from '@nestjs/common';
import { LearningSessionsService } from './learning-sessions.service';
import { LearningSessionsController } from './learning-sessions.controller';

@Module({
  controllers: [LearningSessionsController],
  providers: [LearningSessionsService],
  exports: [LearningSessionsService],
})
export class LearningSessionsModule {}
