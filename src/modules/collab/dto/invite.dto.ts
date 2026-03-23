import { IsEmail, IsIn, IsNumber, IsOptional, Max, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateResourceInviteDto {
  @IsEmail()
  email: string;

  @IsIn(['viewer', 'editor', 'manager'])
  role: 'viewer' | 'editor' | 'manager';

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(90)
  expiresInDays?: number;
}

export class MyInviteQueryDto {
  @IsOptional()
  @IsIn(['pending', 'accepted', 'declined', 'canceled', 'expired'])
  status?: 'pending' | 'accepted' | 'declined' | 'canceled' | 'expired';
}
