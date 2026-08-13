import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import { randomUUID } from 'crypto';
import { DataStore } from '../store/data.store';
import { WorkerClient } from '../common/worker.client';

@Injectable()
export class EnrollmentService {
  private readonly logger = new Logger(EnrollmentService.name);
  private readonly enrollDir: string;

  constructor(
    private readonly store: DataStore,
    private readonly worker: WorkerClient,
  ) {
    this.enrollDir =
      process.env.NOTEWISE_ENROLL_DIR ?? path.join(process.cwd(), '.data', 'enrollment');
    fs.mkdirSync(this.enrollDir, { recursive: true });
  }

  status() {
    const e = this.store.getEnrollment();
    return {
      enrolled: e.enrolled,
      samples: e.samples,
      updatedAt: e.updatedAt,
      hasVoiceprint: Boolean(e.embeddingPath),
    };
  }

  async addSample(file: Express.Multer.File) {
    if (file.size > 10 * 1024 * 1024) {
      throw new BadRequestException('Sample too large');
    }
    const dest = path.join(this.enrollDir, `${randomUUID()}.webm`);
    fs.writeFileSync(dest, file.buffer);

    let embeddingPath: string | undefined;
    try {
      const result = await this.worker.enroll(dest);
      if (result.vector?.length) {
        embeddingPath = path.join(this.enrollDir, 'voiceprint.json');
        fs.writeFileSync(
          embeddingPath,
          JSON.stringify({ vector: result.vector }, null, 2),
        );
      }
    } catch (err) {
      this.logger.warn(`Enrollment worker call failed; sample stored without voiceprint`);
    }
    return this.store.addEnrollmentSample(embeddingPath);
  }
}
