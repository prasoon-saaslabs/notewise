import { Controller, Get, NotFoundException, Param, Post } from '@nestjs/common';
import { NotesService } from './notes.service';

@Controller('notes')
export class NotesController {
  constructor(private readonly notes: NotesService) {}

  @Get(':meetingId')
  get(@Param('meetingId') meetingId: string) {
    const notes = this.notes.get(meetingId);
    if (!notes) throw new NotFoundException('Notes not found');
    return notes;
  }

  @Post(':meetingId/regenerate')
  regenerate(@Param('meetingId') meetingId: string) {
    return this.notes.regenerate(meetingId);
  }
}
