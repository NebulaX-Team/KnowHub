import { api } from './http'

export type TeamRole = 'owner' | 'admin' | 'member'

export interface TeamItem {
  id: string
  name: string
  description?: string | null
  ownerId: string
  createdAt: string
  updatedAt: string
  memberCount: number
  myRole: TeamRole
}

export interface TeamDetail {
  id: string
  name: string
  description?: string | null
  ownerId: string
  createdAt: string
  updatedAt: string
}

export interface TeamMember {
  userId: string
  email: string
  displayName?: string | null
  avatar?: string | null
  joinedAt: string
  role: TeamRole
}

export interface CreateTeamDto {
  name: string
  description?: string
}

export interface AddTeamMemberDto {
  email: string
  role?: 'admin' | 'member'
}

export interface UpdateTeamMemberRoleDto {
  role: 'admin' | 'member'
}

export interface ApiEnvelope<T> {
  code: number
  data: T
}

export const collabApi = {
  async listTeams(): Promise<ApiEnvelope<TeamItem[]>> {
    return api.get('/collab/teams')
  },

  async createTeam(data: CreateTeamDto): Promise<ApiEnvelope<{ message: string; team: TeamItem }>> {
    return api.post('/collab/teams', data)
  },

  async listTeamMembers(teamId: string): Promise<ApiEnvelope<{ team: TeamDetail; members: TeamMember[] }>> {
    return api.get(`/collab/teams/${teamId}/members`)
  },

  async addTeamMember(teamId: string, data: AddTeamMemberDto): Promise<ApiEnvelope<{ message: string }>> {
    return api.post(`/collab/teams/${teamId}/members`, data)
  },

  async updateTeamMemberRole(
    teamId: string,
    memberId: string,
    data: UpdateTeamMemberRoleDto,
  ): Promise<ApiEnvelope<{ message: string }>> {
    return api.put(`/collab/teams/${teamId}/members/${memberId}`, data)
  },

  async removeTeamMember(teamId: string, memberId: string): Promise<ApiEnvelope<{ message: string }>> {
    return api.delete(`/collab/teams/${teamId}/members/${memberId}`)
  },

  async transferTeamOwnership(teamId: string, memberId: string): Promise<ApiEnvelope<{ message: string }>> {
    return api.put(`/collab/teams/${teamId}/owner/${memberId}`)
  },
}
