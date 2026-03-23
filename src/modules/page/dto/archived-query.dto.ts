import { IsIn, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class ArchivedQueryDto {
  @IsOptional()
  @IsString()
  libraryId?: string;

  @IsOptional()
  @IsIn(['page', 'group', 'all'])
  nodeType?: 'page' | 'group' | 'all' = 'all';

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize?: number = 20;

  @IsOptional()
  @IsIn(['archivedAt', 'updatedAt', 'createdAt', 'title'])
  sortBy?: 'archivedAt' | 'updatedAt' | 'createdAt' | 'title' = 'archivedAt';

  @IsOptional()
  @IsIn(['ASC', 'DESC'])
  sortDirection?: 'ASC' | 'DESC' = 'DESC';
}
