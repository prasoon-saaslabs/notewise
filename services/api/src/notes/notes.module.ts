import { Module } from "@nestjs/common";
import { NotesController } from "./notes.controller";
import { NotesService } from "./notes.service";
import { RecapClient } from "./recap.client";

@Module({
  controllers: [NotesController],
  providers: [NotesService, RecapClient],
})
export class NotesModule {}
