import { IsString, IsOptional, IsObject } from 'class-validator';

export class LocalizedTextDto {
  @IsOptional()
  @IsString()
  'zh-CN'?: string;

  @IsOptional()
  @IsString()
  'en-US'?: string;
}

export class UpdateSiteInfoDto {
  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsObject()
  titleI18n?: LocalizedTextDto;

  @IsOptional()
  @IsObject()
  descriptionI18n?: LocalizedTextDto;
}
