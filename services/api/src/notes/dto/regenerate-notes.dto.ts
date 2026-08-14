import { IsOptional, IsString, MaxLength } from "class-validator";

export class RegenerateNotesDto {
  @IsOptional()
  @IsString()
  @MaxLength(20_000)
  userNotes?: string;
}
