import { Injectable, Logger } from '@nestjs/common';
import {
  MeetingBaasProvider,
  MeetingBotProvider,
  RecallStyleMeetingBotProvider,
  SimulationMeetingBotProvider,
} from './meeting-bot.providers';

@Injectable()
export class MeetingBotRegistry {
  private readonly logger = new Logger(MeetingBotRegistry.name);
  private readonly provider: MeetingBotProvider;

  constructor() {
    const requested = (process.env.MEETING_BOT_PROVIDER ?? 'auto').toLowerCase();
    const apiKey = (process.env.MEETING_BOT_API_KEY ?? '').trim();
    const apiUrl = (process.env.MEETING_BOT_API_URL ?? '').trim();
    const webhookBase = (process.env.MEETING_BOT_WEBHOOK_BASE_URL ?? '').replace(/\/$/, '');

    const baasWebhook = webhookBase
      ? `${webhookBase}/bots/webhooks/meetingbaas`
      : undefined;
    const recallWebhook = webhookBase
      ? `${webhookBase}/bots/webhooks/recall`
      : undefined;

    if (requested === 'meetingbaas' || requested === 'baas') {
      if (!apiKey) {
        this.logger.warn('meetingbaas selected but MEETING_BOT_API_KEY missing — simulation');
        this.provider = new SimulationMeetingBotProvider();
      } else {
        this.provider = new MeetingBaasProvider(
          apiKey,
          apiUrl || 'https://api.meetingbaas.com',
          baasWebhook,
        );
      }
    } else if (requested === 'recall') {
      if (!apiKey || !apiUrl) {
        this.logger.warn('recall selected but URL/key missing — simulation');
        this.provider = new SimulationMeetingBotProvider();
      } else {
        this.provider = new RecallStyleMeetingBotProvider(apiUrl, apiKey, recallWebhook);
        this.logger.log('Meeting bot provider: recall');
      }
    } else if (requested === 'auto') {
      if (apiKey) {
        // Prefer Meeting BaaS when only a key is present (default URL).
        if (!apiUrl || apiUrl.includes('meetingbaas')) {
          this.provider = new MeetingBaasProvider(
            apiKey,
            apiUrl || 'https://api.meetingbaas.com',
            baasWebhook,
          );
          this.logger.log('Meeting bot provider: meetingbaas (auto)');
        } else {
          this.provider = new RecallStyleMeetingBotProvider(apiUrl, apiKey, recallWebhook);
          this.logger.log('Meeting bot provider: recall (auto)');
        }
      } else {
        this.provider = new SimulationMeetingBotProvider();
        this.logger.warn(
          'No MEETING_BOT_API_KEY — using simulation sandbox (live notes UI works; bot will not appear in Meet)',
        );
      }
    } else {
      this.provider = new SimulationMeetingBotProvider();
    }
  }

  get(): MeetingBotProvider {
    return this.provider;
  }
}
