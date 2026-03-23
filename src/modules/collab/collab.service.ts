import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomUUID } from 'crypto';
import { DatabaseService } from '@/database/database.service';
import { CreateTeamDto } from './dto/team.dto';
import { AddTeamMemberDto, UpdateTeamMemberRoleDto } from './dto/team-member.dto';
import {
  UpdateResourcePermissionRoleDto,
  UpsertResourcePermissionDto,
} from './dto/permission.dto';
import { CreateResourceInviteDto, MyInviteQueryDto } from './dto/invite.dto';

export type AccessRole = 'viewer' | 'editor' | 'manager';
type TeamRole = 'member' | 'admin' | 'owner';

type PageResourceRow = {
  id: string;
  type: 'library' | 'group' | 'page' | string;
  title: string;
  userId: string;
  libraryId: string | null;
  parentId: string | null;
  isPublic: number | boolean;
  isArchived: number | boolean;
};

const ACCESS_ROLE_RANK: Record<AccessRole, number> = {
  viewer: 1,
  editor: 2,
  manager: 3,
};

const TEAM_ROLE_RANK: Record<TeamRole, number> = {
  member: 1,
  admin: 2,
  owner: 3,
};

@Injectable()
export class CollabService {
  constructor(private readonly database: DatabaseService) {}

  private nowIso(): string {
    return new Date().toISOString();
  }

  private placeholders(values: any[]): string {
    return values.map(() => '?').join(',');
  }

  private toBoolean(value: unknown): boolean {
    return value === true || value === 1 || value === '1';
  }

  private normalizeAccessRole(role: string): AccessRole {
    const normalized = (role || '').toLowerCase();
    if (normalized === 'viewer' || normalized === 'editor' || normalized === 'manager') {
      return normalized;
    }
    throw new BadRequestException('Insufficient permission');
  }

  private normalizeTeamRole(role?: string): TeamRole {
    const normalized = (role || '').toLowerCase();
    if (normalized === 'owner' || normalized === 'admin' || normalized === 'member') {
      return normalized;
    }
    return 'member';
  }

  private maxRole(a: AccessRole | null, b: AccessRole): AccessRole {
    if (!a) return b;
    return ACCESS_ROLE_RANK[b] > ACCESS_ROLE_RANK[a] ? b : a;
  }

  private hasRequiredRole(actualRole: AccessRole, requiredRole: AccessRole): boolean {
    return ACCESS_ROLE_RANK[actualRole] >= ACCESS_ROLE_RANK[requiredRole];
  }

  private isInviteExpired(expiresAt: string): boolean {
    return new Date(expiresAt).getTime() <= Date.now();
  }

  private normalizeInviteStatus(rawStatus: string, expiresAt: string): string {
    const status = (rawStatus || 'pending').toLowerCase();
    if (status === 'pending' && this.isInviteExpired(expiresAt)) {
      return 'expired';
    }
    return status;
  }

  private async getResourceById(pageId: string, includeArchived = false): Promise<PageResourceRow | null> {
    const conditions = ['id = ?'];
    const params: any[] = [pageId];

    if (!includeArchived) {
      conditions.push('COALESCE(isArchived, 0) = 0');
    }

    const row = await this.database.queryOne(
      `SELECT id, type, title, userId, libraryId, parentId, isPublic, COALESCE(isArchived, 0) as isArchived
       FROM Page
       WHERE ${conditions.join(' AND ')}`,
      params,
    );

    return row as PageResourceRow | null;
  }

  private async resolveAncestorChain(page: PageResourceRow): Promise<string[]> {
    const ids: string[] = [page.id];
    const visited = new Set<string>(ids);

    let currentParentId = page.parentId;
    let depth = 0;

    while (currentParentId && depth < 64) {
      const parent = await this.database.queryOne(
        'SELECT id, parentId FROM Page WHERE id = ?',
        [currentParentId],
      ) as { id: string; parentId: string | null } | null;

      if (!parent || visited.has(parent.id)) {
        break;
      }

      ids.push(parent.id);
      visited.add(parent.id);
      currentParentId = parent.parentId;
      depth += 1;
    }

    if (page.libraryId && !visited.has(page.libraryId)) {
      ids.push(page.libraryId);
      visited.add(page.libraryId);
    }

    return ids;
  }

  private async getUserTeamIds(userId: string): Promise<string[]> {
    const rows = await this.database.query(
      `SELECT DISTINCT t.id
       FROM Team t
       LEFT JOIN TeamMember tm ON tm.teamId = t.id
       WHERE t.ownerId = ? OR tm.userId = ?`,
      [userId, userId],
    );

    return rows.map((row) => row.id as string);
  }

  private async resolvePermissionRole(userId: string, pageIds: string[]): Promise<AccessRole | null> {
    if (pageIds.length === 0) {
      return null;
    }

    const teamIds = await this.getUserTeamIds(userId);
    const pagePlaceholders = this.placeholders(pageIds);
    const conditions: string[] = ["(subjectType = 'user' AND subjectId = ?)"];
    const params: any[] = [...pageIds, userId];

    if (teamIds.length > 0) {
      const teamPlaceholders = this.placeholders(teamIds);
      conditions.push(`(subjectType = 'team' AND subjectId IN (${teamPlaceholders}))`);
      params.push(...teamIds);
    }

    const rows = await this.database.query(
      `SELECT role
       FROM PagePermission
       WHERE pageId IN (${pagePlaceholders})
         AND (${conditions.join(' OR ')})`,
      params,
    );

    let bestRole: AccessRole | null = null;
    for (const row of rows) {
      const role = this.normalizeAccessRole(String(row.role));
      bestRole = this.maxRole(bestRole, role);
    }

    return bestRole;
  }

  async getEffectiveAccess(
    userId: string,
    pageId: string,
    options?: { includeArchived?: boolean },
  ): Promise<{ page: PageResourceRow; role: AccessRole; via: 'owner' | 'permission' | 'public' } | null> {
    const page = await this.getResourceById(pageId, options?.includeArchived ?? false);
    if (!page) {
      return null;
    }

    if (page.userId === userId) {
      return {
        page,
        role: 'manager',
        via: 'owner',
      };
    }

    const chain = await this.resolveAncestorChain(page);
    const permissionRole = await this.resolvePermissionRole(userId, chain);
    if (permissionRole) {
      return {
        page,
        role: permissionRole,
        via: 'permission',
      };
    }

    if (this.toBoolean(page.isPublic)) {
      return {
        page,
        role: 'viewer',
        via: 'public',
      };
    }

    return null;
  }

  async hasPageAccess(
    userId: string,
    pageId: string,
    requiredRole: AccessRole = 'viewer',
    options?: { includeArchived?: boolean },
  ): Promise<boolean> {
    const access = await this.getEffectiveAccess(userId, pageId, options);
    if (!access) {
      return false;
    }

    return this.hasRequiredRole(access.role, requiredRole);
  }

  async assertPageAccess(
    userId: string,
    pageId: string,
    requiredRole: AccessRole = 'viewer',
    options?: { includeArchived?: boolean; notFoundMessage?: string },
  ): Promise<{ page: PageResourceRow; role: AccessRole; via: 'owner' | 'permission' | 'public' }> {
    const page = await this.getResourceById(pageId, options?.includeArchived ?? false);
    if (!page) {
      throw new NotFoundException(options?.notFoundMessage || 'Page not found');
    }

    const access = await this.getEffectiveAccess(userId, pageId, options);
    if (!access) {
      throw new ForbiddenException('Insufficient permission');
    }

    if (!this.hasRequiredRole(access.role, requiredRole)) {
      throw new ForbiddenException('Insufficient permission');
    }

    return access;
  }

  async getResourceAccessSummary(userId: string, pageId: string) {
    const access = await this.getEffectiveAccess(userId, pageId, { includeArchived: true });
    if (!access) {
      return {
        resourceId: pageId,
        canAccess: false,
        role: null,
      };
    }

    return {
      resourceId: pageId,
      canAccess: true,
      role: access.role,
      via: access.via,
      resourceType: access.page.type,
      ownerId: access.page.userId,
      isArchived: this.toBoolean(access.page.isArchived),
    };
  }

  async listAccessibleLibraryIds(userId: string, requiredRole: AccessRole = 'viewer'): Promise<string[]> {
    const libraries = await this.database.query(
      `SELECT id
       FROM Page
       WHERE type = 'library' AND COALESCE(isArchived, 0) = 0
       ORDER BY createdAt ASC`,
    );

    const checks = await Promise.all(
      libraries.map((row) => this.hasPageAccess(userId, row.id, requiredRole)),
    );

    return libraries
      .filter((_, index) => checks[index])
      .map((row) => row.id as string);
  }

  private async getTeamById(teamId: string) {
    return this.database.queryOne(
      `SELECT id, name, description, ownerId, createdAt, updatedAt
       FROM Team
       WHERE id = ?`,
      [teamId],
    ) as Promise<{
      id: string;
      name: string;
      description: string | null;
      ownerId: string;
      createdAt: string;
      updatedAt: string;
    } | null>;
  }

  private async getTeamRoleForUser(teamId: string, userId: string): Promise<TeamRole | null> {
    const team = await this.getTeamById(teamId);
    if (!team) {
      throw new NotFoundException('Team not found');
    }

    if (team.ownerId === userId) {
      return 'owner';
    }

    const member = await this.database.queryOne(
      'SELECT role FROM TeamMember WHERE teamId = ? AND userId = ?',
      [teamId, userId],
    ) as { role: string } | null;

    if (!member) {
      return null;
    }

    return this.normalizeTeamRole(member.role);
  }

  private async assertTeamPermission(teamId: string, userId: string, requiredRole: TeamRole): Promise<TeamRole> {
    const actualRole = await this.getTeamRoleForUser(teamId, userId);
    if (!actualRole) {
      throw new ForbiddenException('Insufficient team permission');
    }

    if (TEAM_ROLE_RANK[actualRole] < TEAM_ROLE_RANK[requiredRole]) {
      throw new ForbiddenException('Insufficient team permission');
    }

    return actualRole;
  }

  async createTeam(userId: string, dto: CreateTeamDto) {
    const id = randomUUID();
    const now = this.nowIso();

    await this.database.transaction(async () => {
      await this.database.run(
        `INSERT INTO Team (id, name, description, ownerId, createdAt, updatedAt)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [id, dto.name, dto.description || null, userId, now, now],
      );

      await this.database.run(
        `INSERT INTO TeamMember (teamId, userId, role, joinedAt)
         VALUES (?, ?, ?, ?)`,
        [id, userId, 'admin', now],
      );
    });

    const team = await this.getTeamById(id);

    return {
      message: 'Team created successfully',
      team: {
        ...team,
        myRole: 'owner',
      },
    };
  }

  async listTeams(userId: string) {
    const rows = await this.database.query(
      `SELECT t.id, t.name, t.description, t.ownerId, t.createdAt, t.updatedAt,
              tm.role as memberRole,
              (SELECT COUNT(*) FROM TeamMember m WHERE m.teamId = t.id) as memberCount
       FROM Team t
       LEFT JOIN TeamMember tm
         ON tm.teamId = t.id AND tm.userId = ?
       WHERE t.ownerId = ? OR tm.userId = ?
       ORDER BY t.updatedAt DESC`,
      [userId, userId, userId],
    );

    return rows.map((row) => ({
      id: row.id,
      name: row.name,
      description: row.description,
      ownerId: row.ownerId,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      memberCount: Number(row.memberCount || 0),
      myRole: row.ownerId === userId ? 'owner' : this.normalizeTeamRole(row.memberRole),
    }));
  }

  async listTeamMembers(userId: string, teamId: string) {
    await this.assertTeamPermission(teamId, userId, 'member');

    const team = await this.getTeamById(teamId);
    if (!team) {
      throw new NotFoundException('Team not found');
    }

    const memberRows = await this.database.query(
      `SELECT tm.userId, tm.role as memberRole, tm.joinedAt,
              u.email, u.displayName, u.avatar
       FROM TeamMember tm
       INNER JOIN User u ON u.id = tm.userId
       WHERE tm.teamId = ?
       ORDER BY tm.joinedAt ASC`,
      [teamId],
    );

    const members = memberRows.map((row) => ({
      userId: row.userId,
      email: row.email,
      displayName: row.displayName,
      avatar: row.avatar,
      joinedAt: row.joinedAt,
      role: row.userId === team.ownerId ? 'owner' : this.normalizeTeamRole(row.memberRole),
    }));

    if (!members.some((member) => member.userId === team.ownerId)) {
      const owner = await this.database.queryOne(
        'SELECT id, email, displayName, avatar FROM User WHERE id = ?',
        [team.ownerId],
      );

      if (owner) {
        members.unshift({
          userId: owner.id,
          email: owner.email,
          displayName: owner.displayName,
          avatar: owner.avatar,
          joinedAt: team.createdAt,
          role: 'owner',
        });
      }
    }

    return {
      team,
      members,
    };
  }

  async addTeamMember(userId: string, teamId: string, dto: AddTeamMemberDto) {
    await this.assertTeamPermission(teamId, userId, 'admin');

    const team = await this.getTeamById(teamId);
    if (!team) {
      throw new NotFoundException('Team not found');
    }

    const targetUser = await this.database.queryOne(
      'SELECT id, email, displayName, avatar FROM User WHERE LOWER(email) = LOWER(?)',
      [dto.email.trim()],
    ) as { id: string; email: string; displayName: string | null; avatar: string | null } | null;

    if (!targetUser) {
      throw new NotFoundException('User not found');
    }

    if (targetUser.id === team.ownerId) {
      throw new ConflictException('User is already a team member');
    }

    const existing = await this.database.queryOne(
      'SELECT teamId FROM TeamMember WHERE teamId = ? AND userId = ?',
      [teamId, targetUser.id],
    );

    if (existing) {
      throw new ConflictException('User is already a team member');
    }

    const role = dto.role || 'member';
    await this.database.run(
      `INSERT INTO TeamMember (teamId, userId, role, joinedAt)
       VALUES (?, ?, ?, ?)`,
      [teamId, targetUser.id, role, this.nowIso()],
    );

    return {
      message: 'Team member added successfully',
      member: {
        userId: targetUser.id,
        email: targetUser.email,
        displayName: targetUser.displayName,
        avatar: targetUser.avatar,
        role,
      },
    };
  }

  async updateTeamMemberRole(userId: string, teamId: string, memberId: string, dto: UpdateTeamMemberRoleDto) {
    await this.assertTeamPermission(teamId, userId, 'admin');

    const team = await this.getTeamById(teamId);
    if (!team) {
      throw new NotFoundException('Team not found');
    }

    if (memberId === team.ownerId) {
      throw new BadRequestException('Cannot modify team owner role');
    }

    const member = await this.database.queryOne(
      'SELECT teamId FROM TeamMember WHERE teamId = ? AND userId = ?',
      [teamId, memberId],
    );

    if (!member) {
      throw new NotFoundException('Team member not found');
    }

    await this.database.run(
      'UPDATE TeamMember SET role = ? WHERE teamId = ? AND userId = ?',
      [dto.role, teamId, memberId],
    );

    return {
      message: 'Team member updated successfully',
    };
  }

  async removeTeamMember(userId: string, teamId: string, memberId: string) {
    await this.assertTeamPermission(teamId, userId, 'admin');

    const team = await this.getTeamById(teamId);
    if (!team) {
      throw new NotFoundException('Team not found');
    }

    if (memberId === team.ownerId) {
      throw new BadRequestException('Cannot remove team owner');
    }

    const member = await this.database.queryOne(
      'SELECT teamId FROM TeamMember WHERE teamId = ? AND userId = ?',
      [teamId, memberId],
    );

    if (!member) {
      throw new NotFoundException('Team member not found');
    }

    await this.database.run(
      'DELETE FROM TeamMember WHERE teamId = ? AND userId = ?',
      [teamId, memberId],
    );

    return {
      message: 'Team member removed successfully',
    };
  }

  async transferTeamOwnership(userId: string, teamId: string, memberId: string) {
    const team = await this.getTeamById(teamId);
    if (!team) {
      throw new NotFoundException('Team not found');
    }

    if (team.ownerId !== userId) {
      throw new ForbiddenException('Only team owner can transfer ownership');
    }

    if (memberId === team.ownerId) {
      throw new BadRequestException('Target user is already the team owner');
    }

    const targetMember = await this.database.queryOne(
      'SELECT userId FROM TeamMember WHERE teamId = ? AND userId = ?',
      [teamId, memberId],
    );

    if (!targetMember) {
      throw new NotFoundException('Team member not found');
    }

    const now = this.nowIso();
    await this.database.transaction(async () => {
      const currentOwnerMember = await this.database.queryOne(
        'SELECT userId FROM TeamMember WHERE teamId = ? AND userId = ?',
        [teamId, team.ownerId],
      );

      if (!currentOwnerMember) {
        await this.database.run(
          `INSERT INTO TeamMember (teamId, userId, role, joinedAt)
           VALUES (?, ?, ?, ?)`,
          [teamId, team.ownerId, 'admin', now],
        );
      } else {
        await this.database.run(
          'UPDATE TeamMember SET role = ? WHERE teamId = ? AND userId = ?',
          ['admin', teamId, team.ownerId],
        );
      }

      await this.database.run(
        'UPDATE Team SET ownerId = ?, updatedAt = ? WHERE id = ?',
        [memberId, now, teamId],
      );

      await this.database.run(
        'UPDATE TeamMember SET role = ? WHERE teamId = ? AND userId = ?',
        ['admin', teamId, memberId],
      );
    });

    return {
      message: 'Team ownership transferred successfully',
    };
  }

  private async resolvePermissionSubject(
    ownerId: string,
    dto: UpsertResourcePermissionDto,
  ): Promise<{
    subjectType: 'user' | 'team';
    subjectId: string;
    subjectDisplay?: string;
  }> {
    if (dto.subjectType === 'user') {
      let user: { id: string; email: string; displayName: string | null } | null = null;

      if (dto.subjectId) {
        user = await this.database.queryOne(
          'SELECT id, email, displayName FROM User WHERE id = ?',
          [dto.subjectId],
        ) as { id: string; email: string; displayName: string | null } | null;
      } else if (dto.email) {
        user = await this.database.queryOne(
          'SELECT id, email, displayName FROM User WHERE LOWER(email) = LOWER(?)',
          [dto.email.trim()],
        ) as { id: string; email: string; displayName: string | null } | null;
      } else {
        throw new BadRequestException('User not found');
      }

      if (!user) {
        throw new NotFoundException('User not found');
      }

      if (user.id === ownerId) {
        throw new BadRequestException('Cannot grant permission to the owner');
      }

      return {
        subjectType: 'user',
        subjectId: user.id,
        subjectDisplay: user.displayName || user.email,
      };
    }

    if (!dto.subjectId) {
      throw new BadRequestException('Team not found');
    }

    const team = await this.getTeamById(dto.subjectId);
    if (!team) {
      throw new NotFoundException('Team not found');
    }

    return {
      subjectType: 'team',
      subjectId: team.id,
      subjectDisplay: team.name,
    };
  }

  private async getPermissionDetail(permissionId: string) {
    return this.database.queryOne(
      `SELECT pp.id, pp.pageId, pp.subjectType, pp.subjectId, pp.role, pp.createdAt, pp.updatedAt,
              u.email as subjectEmail,
              u.displayName as subjectDisplayName,
              t.name as teamName
       FROM PagePermission pp
       LEFT JOIN User u ON pp.subjectType = 'user' AND pp.subjectId = u.id
       LEFT JOIN Team t ON pp.subjectType = 'team' AND pp.subjectId = t.id
       WHERE pp.id = ?`,
      [permissionId],
    );
  }

  async listResourcePermissions(userId: string, pageId: string) {
    const access = await this.assertPageAccess(userId, pageId, 'manager');

    const owner = await this.database.queryOne(
      'SELECT id, email, displayName FROM User WHERE id = ?',
      [access.page.userId],
    );

    const permissions = await this.database.query(
      `SELECT pp.id, pp.pageId, pp.subjectType, pp.subjectId, pp.role, pp.createdAt, pp.updatedAt,
              u.email as subjectEmail,
              u.displayName as subjectDisplayName,
              t.name as teamName
       FROM PagePermission pp
       LEFT JOIN User u ON pp.subjectType = 'user' AND pp.subjectId = u.id
       LEFT JOIN Team t ON pp.subjectType = 'team' AND pp.subjectId = t.id
       WHERE pp.pageId = ?
       ORDER BY pp.createdAt DESC`,
      [pageId],
    );

    return {
      resource: {
        id: access.page.id,
        type: access.page.type,
        title: access.page.title,
      },
      owner,
      permissions,
    };
  }

  async upsertResourcePermission(userId: string, pageId: string, dto: UpsertResourcePermissionDto) {
    const access = await this.assertPageAccess(userId, pageId, 'manager');
    const role = this.normalizeAccessRole(dto.role);
    const subject = await this.resolvePermissionSubject(access.page.userId, dto);
    const now = this.nowIso();

    const existing = await this.database.queryOne(
      `SELECT id
       FROM PagePermission
       WHERE pageId = ? AND subjectType = ? AND subjectId = ?`,
      [pageId, subject.subjectType, subject.subjectId],
    ) as { id: string } | null;

    let permissionId: string;

    if (existing) {
      permissionId = existing.id;
      await this.database.run(
        `UPDATE PagePermission
         SET role = ?, updatedAt = ?
         WHERE id = ?`,
        [role, now, permissionId],
      );
    } else {
      permissionId = randomUUID();
      await this.database.run(
        `INSERT INTO PagePermission (id, pageId, subjectType, subjectId, role, createdAt, updatedAt)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [permissionId, pageId, subject.subjectType, subject.subjectId, role, now, now],
      );
    }

    const permission = await this.getPermissionDetail(permissionId);

    return {
      message: 'Permission updated successfully',
      permission,
    };
  }

  async updateResourcePermissionRole(
    userId: string,
    pageId: string,
    permissionId: string,
    dto: UpdateResourcePermissionRoleDto,
  ) {
    await this.assertPageAccess(userId, pageId, 'manager');

    const permission = await this.database.queryOne(
      `SELECT id
       FROM PagePermission
       WHERE id = ? AND pageId = ?`,
      [permissionId, pageId],
    ) as { id: string } | null;

    if (!permission) {
      throw new NotFoundException('Permission not found');
    }

    await this.database.run(
      `UPDATE PagePermission
       SET role = ?, updatedAt = ?
       WHERE id = ?`,
      [this.normalizeAccessRole(dto.role), this.nowIso(), permissionId],
    );

    return {
      message: 'Permission updated successfully',
      permission: await this.getPermissionDetail(permissionId),
    };
  }

  async removeResourcePermission(userId: string, pageId: string, permissionId: string) {
    await this.assertPageAccess(userId, pageId, 'manager');

    const permission = await this.database.queryOne(
      `SELECT id
       FROM PagePermission
       WHERE id = ? AND pageId = ?`,
      [permissionId, pageId],
    ) as { id: string } | null;

    if (!permission) {
      throw new NotFoundException('Permission not found');
    }

    await this.database.run('DELETE FROM PagePermission WHERE id = ?', [permissionId]);

    return {
      message: 'Permission removed successfully',
    };
  }

  async createInvite(userId: string, pageId: string, dto: CreateResourceInviteDto) {
    await this.assertPageAccess(userId, pageId, 'manager');

    const normalizedEmail = dto.email.trim().toLowerCase();
    const role = this.normalizeAccessRole(dto.role);
    const now = this.nowIso();
    const expiresInDays = dto.expiresInDays ?? 7;
    const expiresAt = new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000).toISOString();
    const id = randomUUID();
    const token = randomUUID();

    await this.database.run(
      `INSERT INTO PageInvite (id, pageId, email, role, token, invitedBy, status, expiresAt, createdAt, updatedAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, pageId, normalizedEmail, role, token, userId, 'pending', expiresAt, now, now],
    );

    return {
      message: 'Invite created successfully',
      invite: {
        id,
        pageId,
        email: normalizedEmail,
        role,
        token,
        status: 'pending',
        expiresAt,
        createdAt: now,
      },
    };
  }

  async listResourceInvites(userId: string, pageId: string) {
    await this.assertPageAccess(userId, pageId, 'manager');

    const invites = await this.database.query(
      `SELECT i.id, i.pageId, i.email, i.role, i.token, i.invitedBy, i.status, i.expiresAt,
              i.acceptedAt, i.createdAt, i.updatedAt,
              inviter.displayName as inviterName
       FROM PageInvite i
       LEFT JOIN User inviter ON inviter.id = i.invitedBy
       WHERE i.pageId = ?
       ORDER BY i.createdAt DESC`,
      [pageId],
    );

    return invites.map((invite) => ({
      ...invite,
      status: this.normalizeInviteStatus(invite.status, invite.expiresAt),
    }));
  }

  async cancelInvite(userId: string, inviteId: string) {
    const invite = await this.database.queryOne(
      'SELECT id, pageId, status, expiresAt FROM PageInvite WHERE id = ?',
      [inviteId],
    ) as { id: string; pageId: string; status: string; expiresAt: string } | null;

    if (!invite) {
      throw new NotFoundException('Invite not found');
    }

    await this.assertPageAccess(userId, invite.pageId, 'manager');

    const status = this.normalizeInviteStatus(invite.status, invite.expiresAt);
    if (status === 'accepted' || status === 'declined' || status === 'expired') {
      throw new BadRequestException('Invite has already been processed');
    }

    await this.database.run(
      'UPDATE PageInvite SET status = ?, updatedAt = ? WHERE id = ?',
      ['canceled', this.nowIso(), inviteId],
    );

    return {
      message: 'Invite canceled successfully',
    };
  }

  async listMyInvites(_userId: string, email: string, query: MyInviteQueryDto) {
    const invites = await this.database.query(
      `SELECT i.id, i.pageId, i.email, i.role, i.token, i.invitedBy, i.status, i.expiresAt,
              i.acceptedAt, i.createdAt, i.updatedAt,
              p.title as pageTitle,
              p.type as pageType,
              inviter.displayName as inviterName,
              inviter.email as inviterEmail
       FROM PageInvite i
       INNER JOIN Page p ON p.id = i.pageId
       LEFT JOIN User inviter ON inviter.id = i.invitedBy
       WHERE LOWER(i.email) = LOWER(?)
       ORDER BY i.createdAt DESC`,
      [email],
    );

    const normalized = invites.map((invite) => ({
      ...invite,
      status: this.normalizeInviteStatus(invite.status, invite.expiresAt),
    }));

    if (query.status) {
      return normalized.filter((invite) => invite.status === query.status);
    }

    return normalized;
  }

  private async upsertPermissionForUser(pageId: string, userId: string, role: AccessRole) {
    const now = this.nowIso();
    const existing = await this.database.queryOne(
      `SELECT id
       FROM PagePermission
       WHERE pageId = ? AND subjectType = 'user' AND subjectId = ?`,
      [pageId, userId],
    ) as { id: string } | null;

    if (existing) {
      await this.database.run(
        'UPDATE PagePermission SET role = ?, updatedAt = ? WHERE id = ?',
        [role, now, existing.id],
      );
      return existing.id;
    }

    const id = randomUUID();
    await this.database.run(
      `INSERT INTO PagePermission (id, pageId, subjectType, subjectId, role, createdAt, updatedAt)
       VALUES (?, ?, 'user', ?, ?, ?, ?)`,
      [id, pageId, userId, role, now, now],
    );

    return id;
  }

  private async respondInviteByToken(
    userId: string,
    email: string,
    token: string,
    targetStatus: 'accepted' | 'declined',
  ) {
    const invite = await this.database.queryOne(
      `SELECT id, pageId, email, role, status, expiresAt
       FROM PageInvite
       WHERE token = ?`,
      [token],
    ) as {
      id: string;
      pageId: string;
      email: string;
      role: string;
      status: string;
      expiresAt: string;
    } | null;

    if (!invite) {
      throw new NotFoundException('Invite not found');
    }

    if (invite.email.toLowerCase() !== email.toLowerCase()) {
      throw new ForbiddenException('Invite email does not match current account');
    }

    const status = this.normalizeInviteStatus(invite.status, invite.expiresAt);

    if (status === 'expired') {
      if (invite.status !== 'expired') {
        await this.database.run(
          'UPDATE PageInvite SET status = ?, updatedAt = ? WHERE id = ?',
          ['expired', this.nowIso(), invite.id],
        );
      }
      throw new BadRequestException('Invite has expired');
    }

    if (status !== 'pending') {
      throw new BadRequestException('Invite has already been processed');
    }

    const now = this.nowIso();

    if (targetStatus === 'declined') {
      await this.database.run(
        `UPDATE PageInvite
         SET status = ?, updatedAt = ?
         WHERE id = ?`,
        ['declined', now, invite.id],
      );

      return {
        message: 'Invite declined successfully',
      };
    }

    await this.database.transaction(async () => {
      await this.upsertPermissionForUser(
        invite.pageId,
        userId,
        this.normalizeAccessRole(invite.role),
      );

      await this.database.run(
        `UPDATE PageInvite
         SET status = ?, acceptedAt = ?, updatedAt = ?
         WHERE id = ?`,
        ['accepted', now, now, invite.id],
      );
    });

    return {
      message: 'Invite accepted successfully',
    };
  }

  async acceptInvite(userId: string, email: string, token: string) {
    return this.respondInviteByToken(userId, email, token, 'accepted');
  }

  async declineInvite(userId: string, email: string, token: string) {
    return this.respondInviteByToken(userId, email, token, 'declined');
  }
}
