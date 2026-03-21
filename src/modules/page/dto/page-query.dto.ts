import { IsOptional, IsNumber, Min, IsString } from 'class-validator';
import { Type } from 'class-transformer';

export class PageQueryDto {
  @IsOptional()
  @IsString()
  libraryId?: string;

  @IsOptional()
  @IsString()
  parentId?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  pageSize?: number = 20;

  @IsOptional()
  @IsString()
  sortBy?: 'updatedAt' | 'createdAt' | 'title' | 'sortOrder' | 'lastViewedAt';

  @IsOptional()
  @IsString()
  sortDirection?: 'ASC' | 'DESC';

  @IsOptional()
  @IsString()
  nodeType?: 'page' | 'group' | 'all';
}
