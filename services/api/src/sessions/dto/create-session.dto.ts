import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateSessionDto {
  @IsIn(['local', 'desktop'])
  source!: 'local' | 'desktop';

  @IsOptional()
  @IsString()
  @MaxLength(200)
  title?: string;
}
