import { Injectable } from '@nestjs/common';
import { WorkerClient } from '../common/worker.client';
import { ProvidersService } from '../providers/providers.service';

@Injectable()
export class HealthService {
  constructor(
    private readonly worker: WorkerClient,
    private readonly providers: ProvidersService,
  ) {}

  async check() {
    const worker = await this.worker.health();
    return {
      status: worker === 'ok' ? 'ok' : 'degraded',
      api: 'ok',
      worker,
      providers: this.providers.list(),
    };
  }
}
