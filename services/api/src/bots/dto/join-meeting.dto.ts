import { IsOptional, IsString, IsUrl, MaxLength } from 'class-validator';

export class JoinMeetingDto {
  @IsUrl({ require_tld: false })
  meetingUrl!: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  title?: string;
}
