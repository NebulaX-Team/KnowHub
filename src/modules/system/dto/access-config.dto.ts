import { IsBoolean, IsOptional } from 'class-validator';

export class UpdateAccessConfigDto {
  @IsOptional()
  @IsBoolean()
  allowRegistration?: boolean;

  @IsOptional()
  @IsBoolean()
  allowPasswordReset?: boolean;
}

export class AccessConfigResponseDto {
  allowRegistration: boolean;
  allowPasswordReset: boolean;
}
