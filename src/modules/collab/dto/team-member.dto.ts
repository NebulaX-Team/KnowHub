import { IsEmail, IsIn, IsOptional, IsString } from 'class-validator';

export class AddTeamMemberDto {
  @IsEmail()
  email: string;

  @IsOptional()
  @IsIn(['member', 'admin'])
  role?: 'member' | 'admin';
}

export class UpdateTeamMemberRoleDto {
  @IsString()
  @IsIn(['member', 'admin'])
  role: 'member' | 'admin';
}
