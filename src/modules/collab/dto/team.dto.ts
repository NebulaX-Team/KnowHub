import { IsOptional, IsString, Length } from 'class-validator';

export class CreateTeamDto {
  @IsString()
  @Length(1, 80)
  name: string;

  @IsOptional()
  @IsString()
  @Length(0, 400)
  description?: string;
}
