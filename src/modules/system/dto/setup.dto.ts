import { Type } from 'class-transformer';
import {
  IsEmail,
  IsObject,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
  ValidateNested,
} from 'class-validator';

export class SetupStatusResponseDto {
  needsSetup: boolean;
  userCount: number;
}

export class SetupTitleLocalizedTextDto {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  'zh-CN'?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  'en-US'?: string;
}

export class SetupDescriptionLocalizedTextDto {
  @IsOptional()
  @IsString()
  @MaxLength(500)
  'zh-CN'?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  'en-US'?: string;
}

export class InitializeSystemDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  siteTitle?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  siteDescription?: string;

  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => SetupTitleLocalizedTextDto)
  siteTitleI18n?: SetupTitleLocalizedTextDto;

  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => SetupDescriptionLocalizedTextDto)
  siteDescriptionI18n?: SetupDescriptionLocalizedTextDto;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  siteTimezone?: string;

  @IsEmail()
  adminEmail: string;

  @IsString()
  @MinLength(6)
  @MaxLength(128)
  adminPassword: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  adminDisplayName?: string;
}

export class InitializeSystemResponseDto {
  initialized: boolean;
  userId: string;
  email: string;
}
