import { Module } from '@nestjs/common';
import { BotsController } from './bots.controller';
import { BotsService } from './bots.service';
import { MeetingBotRegistry } from './meeting-bot.registry';

@Module({
  controllers: [BotsController],
  providers: [BotsService, MeetingBotRegistry],
  exports: [BotsService],
})
export class BotsModule {}
