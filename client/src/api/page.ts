import { api } from './http'
import type { Page, PageVersion, ApiResponse, PaginatedResponse } from '@/types'

export interface CreatePageRequest {
  title: string
  libraryId: string
  parentId?: string
  content?: any
  icon?: string | null
  isPublic?: boolean
  type?: 'page' | 'group'
}

export interface UpdatePageRequest {
  title?: string
  content?: any
  icon?: string | null
  isPublic?: boolean
  parentId?: string | null
  libraryId?: string
  sortOrder?: number
}

export interface PageQueryParams {
  libraryId?: string
  parentId?: string
  nodeType?: 'page' | 'group' | 'all'
  page?: number
  pageSize?: number
  sortBy?: 'updatedAt' | 'createdAt' | 'title' | 'sortOrder' | 'lastViewedAt'
  sortDirection?: 'ASC' | 'DESC'
}

export interface ArchivedQueryParams {
  libraryId?: string
  nodeType?: 'page' | 'group' | 'all'
  page?: number
  pageSize?: number
  sortBy?: 'archivedAt' | 'updatedAt' | 'createdAt' | 'title'
  sortDirection?: 'ASC' | 'DESC'
}

export interface MovePageRequest {
  newParentId?: string | null
  newLibraryId?: string
  sortOrder?: number
}

export interface CreateVersionRequest {
  message?: string
}

export interface CleanupVersionsRequest {
  period: 'day' | 'week' | 'month'
}

export interface UpdatePageSettingsRequest {
  versionRetentionLimit?: number
}

export const pageApi = {
  // Get pages with optional filters
  getPages: async (params?: PageQueryParams): Promise<ApiResponse<PaginatedResponse<Page>>> => {
    return api.get('/pages', { params })
  },

  // Get single page by ID
  getPage: async (id: string): Promise<ApiResponse<Page & { library?: any; parent?: any; children?: any[] }>> => {
    return api.get(`/pages/${id}`)
  },

  // Get archived pages/groups
  getArchivedPages: async (params?: ArchivedQueryParams): Promise<ApiResponse<PaginatedResponse<Page>>> => {
    return api.get('/pages/archived', { params })
  },

  // Create new page
  createPage: async (data: CreatePageRequest): Promise<ApiResponse<Page>> => {
    return api.post('/pages', data)
  },

  // Update page
  updatePage: async (id: string, data: UpdatePageRequest): Promise<ApiResponse<Page>> => {
    return api.put(`/pages/${id}`, data)
  },

  // Delete page
  deletePage: async (id: string): Promise<ApiResponse<void>> => {
    return api.delete(`/pages/${id}`)
  },

  // Archive page/group
  archivePage: async (id: string): Promise<ApiResponse<{ success: boolean; message: string }>> => {
    return api.post(`/pages/${id}/archive`)
  },

  // Restore archived page/group
  unarchivePage: async (id: string): Promise<ApiResponse<{ success: boolean; message: string }>> => {
    return api.post(`/pages/${id}/unarchive`)
  },

  // Permanently delete archived page/group
  deletePagePermanent: async (id: string): Promise<ApiResponse<{ success: boolean; message: string }>> => {
    return api.delete(`/pages/${id}/permanent`)
  },

  // Move page (change parent or library)
  movePage: async (id: string, data: MovePageRequest): Promise<ApiResponse<Page>> => {
    return api.post(`/pages/${id}/move`, data)
  },

  // Get page versions
  getVersions: async (pageId: string): Promise<ApiResponse<PageVersion[]>> => {
    return api.get(`/pages/${pageId}/versions`)
  },

  // Create new version
  createVersion: async (pageId: string, data: CreateVersionRequest = {}): Promise<ApiResponse<PageVersion>> => {
    return api.post(`/pages/${pageId}/versions`, data)
  },

  // Restore page to a specific version
  restoreVersion: async (pageId: string, versionId: string): Promise<ApiResponse<Page>> => {
    return api.post(`/pages/${pageId}/versions/${versionId}/restore`)
  },

  // Clean up old versions
  cleanupVersions: async (pageId: string, data: CleanupVersionsRequest): Promise<ApiResponse<{ success: boolean; deletedCount: number; message: string }>> => {
    return api.post(`/pages/${pageId}/versions/cleanup`, data)
  },

  // Delete a specific version
  deleteVersion: async (pageId: string, versionId: string): Promise<ApiResponse<{ success: boolean; message: string }>> => {
    return api.delete(`/pages/${pageId}/versions/${versionId}`)
  },

  // Update page settings
  updatePageSettings: async (pageId: string, data: UpdatePageSettingsRequest): Promise<ApiResponse<{ success: boolean; message: string }>> => {
    return api.put(`/pages/${pageId}/settings`, data)
  },

  // Get page references (incoming and outgoing)
  getReferences: async (pageId: string): Promise<ApiResponse<{ incoming: Page[]; outgoing: Page[] }>> => {
    return api.get(`/pages/${pageId}/references`)
  },

  // Get pages created on this day in previous years
  getOnThisDay: async (): Promise<ApiResponse<Array<{ id: string; title: string; icon: string | null; year: string; createdAt: string; libraryTitle: string | null }>>> => {
    return api.get('/pages/on-this-day')
  },

  // Get pages that haven't been visited for a long time
  getLongUnvisited: async (): Promise<ApiResponse<Array<{ id: string; title: string; icon: string | null; days: number; lastViewedAt: string | null; libraryTitle: string | null }>>> => {
    return api.get('/pages/long-unvisited')
  }
}
