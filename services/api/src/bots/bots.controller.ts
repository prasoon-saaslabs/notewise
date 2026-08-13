import {
  Body,
  Controller,
  Headers,
  Param,
  Post,
  Req,
} from '@nestjs/common';
import { Request } from 'express';
import { JoinMeetingDto } from './dto/join-meeting.dto';
import { BotsService } from './bots.service';

@Controller('bots')
export class BotsController {
  constructor(private readonly bots: BotsService) {}

  @Post('join')
  join(@Body() dto: JoinMeetingDto) {
    return this.bots.join(dto);
  }

  @Post(':meetingId/stop')
  stop(@Param('meetingId') meetingId: string) {
    return this.bots.stop(meetingId);
  }

  @Post(':meetingId/sync')
  sync(@Param('meetingId') meetingId: string) {
    return this.bots.sync(meetingId);
  }

  @Post('webhooks/:provider')
  webhook(
    @Param('provider') provider: string,
    @Headers('x-webhook-secret') secret: string | undefined,
    @Headers('x-meeting-baas-api-key') baasKey: string | undefined,
    @Req() req: Request,
  ) {
    return this.bots.handleWebhook(provider, secret, req.body, baasKey);
  }
}
