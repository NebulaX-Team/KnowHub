import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '@/modules/auth/jwt-auth.guard';
import { CurrentUser, CurrentUser as CurrentUserType } from '@/common/decorators/current-user.decorator';
import { CollabService } from './collab.service';
import { CreateTeamDto } from './dto/team.dto';
import { AddTeamMemberDto, UpdateTeamMemberRoleDto } from './dto/team-member.dto';
import {
  UpdateResourcePermissionRoleDto,
  UpsertResourcePermissionDto,
} from './dto/permission.dto';
import { CreateResourceInviteDto, MyInviteQueryDto } from './dto/invite.dto';

@Controller('collab')
@UseGuards(JwtAuthGuard)
export class CollabController {
  constructor(private readonly collabService: CollabService) {}

  @Post('teams')
  async createTeam(
    @CurrentUser() user: CurrentUserType,
    @Body() dto: CreateTeamDto,
  ) {
    return this.collabService.createTeam(user.id, dto);
  }

  @Get('teams')
  async listTeams(@CurrentUser() user: CurrentUserType) {
    return this.collabService.listTeams(user.id);
  }

  @Get('teams/:teamId/members')
  async listTeamMembers(
    @CurrentUser() user: CurrentUserType,
    @Param('teamId') teamId: string,
  ) {
    return this.collabService.listTeamMembers(user.id, teamId);
  }

  @Post('teams/:teamId/members')
  async addTeamMember(
    @CurrentUser() user: CurrentUserType,
    @Param('teamId') teamId: string,
    @Body() dto: AddTeamMemberDto,
  ) {
    return this.collabService.addTeamMember(user.id, teamId, dto);
  }

  @Put('teams/:teamId/members/:memberId')
  async updateTeamMemberRole(
    @CurrentUser() user: CurrentUserType,
    @Param('teamId') teamId: string,
    @Param('memberId') memberId: string,
    @Body() dto: UpdateTeamMemberRoleDto,
  ) {
    return this.collabService.updateTeamMemberRole(user.id, teamId, memberId, dto);
  }

  @Delete('teams/:teamId/members/:memberId')
  async removeTeamMember(
    @CurrentUser() user: CurrentUserType,
    @Param('teamId') teamId: string,
    @Param('memberId') memberId: string,
  ) {
    return this.collabService.removeTeamMember(user.id, teamId, memberId);
  }

  @Put('teams/:teamId/owner/:memberId')
  async transferTeamOwnership(
    @CurrentUser() user: CurrentUserType,
    @Param('teamId') teamId: string,
    @Param('memberId') memberId: string,
  ) {
    return this.collabService.transferTeamOwnership(user.id, teamId, memberId);
  }

  @Get('resources/:pageId/access')
  async getResourceAccess(
    @CurrentUser() user: CurrentUserType,
    @Param('pageId') pageId: string,
  ) {
    return this.collabService.getResourceAccessSummary(user.id, pageId);
  }

  @Get('resources/:pageId/permissions')
  async listPermissions(
    @CurrentUser() user: CurrentUserType,
    @Param('pageId') pageId: string,
  ) {
    return this.collabService.listResourcePermissions(user.id, pageId);
  }

  @Post('resources/:pageId/permissions')
  async upsertPermission(
    @CurrentUser() user: CurrentUserType,
    @Param('pageId') pageId: string,
    @Body() dto: UpsertResourcePermissionDto,
  ) {
    return this.collabService.upsertResourcePermission(user.id, pageId, dto);
  }

  @Put('resources/:pageId/permissions/:permissionId')
  async updatePermissionRole(
    @CurrentUser() user: CurrentUserType,
    @Param('pageId') pageId: string,
    @Param('permissionId') permissionId: string,
    @Body() dto: UpdateResourcePermissionRoleDto,
  ) {
    return this.collabService.updateResourcePermissionRole(user.id, pageId, permissionId, dto);
  }

  @Delete('resources/:pageId/permissions/:permissionId')
  async removePermission(
    @CurrentUser() user: CurrentUserType,
    @Param('pageId') pageId: string,
    @Param('permissionId') permissionId: string,
  ) {
    return this.collabService.removeResourcePermission(user.id, pageId, permissionId);
  }

  @Get('resources/:pageId/invites')
  async listResourceInvites(
    @CurrentUser() user: CurrentUserType,
    @Param('pageId') pageId: string,
  ) {
    return this.collabService.listResourceInvites(user.id, pageId);
  }

  @Post('resources/:pageId/invites')
  async createResourceInvite(
    @CurrentUser() user: CurrentUserType,
    @Param('pageId') pageId: string,
    @Body() dto: CreateResourceInviteDto,
  ) {
    return this.collabService.createInvite(user.id, pageId, dto);
  }

  @Delete('invites/:inviteId')
  async cancelInvite(
    @CurrentUser() user: CurrentUserType,
    @Param('inviteId') inviteId: string,
  ) {
    return this.collabService.cancelInvite(user.id, inviteId);
  }

  @Get('invites/me')
  async listMyInvites(
    @CurrentUser() user: CurrentUserType,
    @Query() query: MyInviteQueryDto,
  ) {
    return this.collabService.listMyInvites(user.id, user.email, query);
  }

  @Post('invites/:token/accept')
  async acceptInvite(
    @CurrentUser() user: CurrentUserType,
    @Param('token') token: string,
  ) {
    return this.collabService.acceptInvite(user.id, user.email, token);
  }

  @Post('invites/:token/decline')
  async declineInvite(
    @CurrentUser() user: CurrentUserType,
    @Param('token') token: string,
  ) {
    return this.collabService.declineInvite(user.id, user.email, token);
  }
}
