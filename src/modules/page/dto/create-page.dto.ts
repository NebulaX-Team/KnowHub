import { IsString, IsOptional, IsBoolean, IsObject, IsIn } from 'class-validator';

export class CreatePageDto {
  @IsString()
  title: string;

  @IsString()
  libraryId: string;

  @IsOptional()
  @IsString()
  parentId?: string;

  @IsOptional()
  @IsObject()
  content?: Record<string, unknown>;

  @IsOptional()
  @IsString()
  icon?: string | null;

  @IsOptional()
  @IsBoolean()
  isPublic?: boolean;

  @IsOptional()
  @IsIn(['page', 'group'])
  type?: 'page' | 'group';
}
