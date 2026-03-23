import { IsEmail, IsIn, IsOptional, IsString } from 'class-validator';

export class UpsertResourcePermissionDto {
  @IsString()
  @IsIn(['user', 'team'])
  subjectType: 'user' | 'team';

  @IsOptional()
  @IsString()
  subjectId?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsString()
  @IsIn(['viewer', 'editor', 'manager'])
  role: 'viewer' | 'editor' | 'manager';
}

export class UpdateResourcePermissionRoleDto {
  @IsString()
  @IsIn(['viewer', 'editor', 'manager'])
  role: 'viewer' | 'editor' | 'manager';
}
