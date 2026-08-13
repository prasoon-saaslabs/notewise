import {
  Body,
  Controller,
  Param,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { CreateSessionDto } from './dto/create-session.dto';
import { SessionsService } from './sessions.service';

@Controller('sessions')
export class SessionsController {
  constructor(private readonly sessions: SessionsService) {}

  @Post()
  create(@Body() dto: CreateSessionDto) {
    return this.sessions.create(dto);
  }

  @Post(':id/chunks')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: 25 * 1024 * 1024 },
    }),
  )
  uploadChunk(
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
    @Body('sequence') sequence?: string,
  ) {
    return this.sessions.addChunk(id, file, Number(sequence ?? 0));
  }

  @Post(':id/live')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: 25 * 1024 * 1024 },
    }),
  )
  liveTranscribe(
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.sessions.liveTranscribe(id, file);
  }

  @Post(':id/finalize')
  finalize(@Param('id') id: string) {
    return this.sessions.finalize(id);
  }
}
