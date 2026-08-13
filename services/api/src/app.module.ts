import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { HealthModule } from './health/health.module';
import { SessionsModule } from './sessions/sessions.module';
import { MeetingsModule } from './meetings/meetings.module';
import { EnrollmentModule } from './enrollment/enrollment.module';
import { BotsModule } from './bots/bots.module';
import { NotesModule } from './notes/notes.module';
import { ProvidersModule } from './providers/providers.module';
import { StoreModule } from './store/store.module';
import { WorkerClientModule } from './common/worker-client.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    StoreModule,
    WorkerClientModule,
    HealthModule,
    SessionsModule,
    MeetingsModule,
    EnrollmentModule,
    BotsModule,
    NotesModule,
    ProvidersModule,
  ],
})
export class AppModule {}
