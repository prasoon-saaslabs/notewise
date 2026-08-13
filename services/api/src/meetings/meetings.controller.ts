import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Header,
  NotFoundException,
  Param,
  Patch,
  Res,
  StreamableFile,
} from '@nestjs/common';
import type { Response } from 'express';
import * as fs from 'fs';
import { MeetingsService } from './meetings.service';

@Controller('meetings')
export class MeetingsController {
  constructor(private readonly meetings: MeetingsService) {}

  @Get()
  list() {
    return this.meetings.list();
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() body: { title?: string }) {
    try {
      const meeting = this.meetings.update(id, { title: body?.title });
      if (!meeting) throw new NotFoundException('Meeting not found');
      return meeting;
    } catch (e) {
      if (e instanceof NotFoundException) throw e;
      throw new BadRequestException(e instanceof Error ? e.message : 'Invalid update');
    }
  }

  @Get(':id/audio')
  @Header('Accept-Ranges', 'bytes')
  audio(@Param('id') id: string, @Res({ passthrough: true }) res: Response) {
    const file = this.meetings.resolveAudio(id);
    if (!file) throw new NotFoundException('Audio not found');
    res.set({
      'Content-Type': file.mime,
      'Content-Length': String(file.size),
      'Cache-Control': 'private, max-age=3600',
    });
    const stream = fs.createReadStream(file.path);
    return new StreamableFile(stream);
  }

  @Get(':id')
  get(@Param('id') id: string) {
    const meeting = this.meetings.get(id);
    if (!meeting) throw new NotFoundException('Meeting not found');
    return meeting;
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    const ok = this.meetings.remove(id);
    if (!ok) throw new NotFoundException('Meeting not found');
  }
}
