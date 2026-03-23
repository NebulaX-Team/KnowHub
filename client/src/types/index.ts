// Shared TypeScript interfaces for the KnowHub application

export interface ApiResponse<T = any> {
  code: number
  data: T
  message?: string
}

export interface PaginatedResponse<T> {
  items: T[]
  total: number
  page: number
  pageSize: number
  hasMore: boolean
}

export interface User {
  id: string
  email: string
  displayName?: string
  avatar?: string
  isProfilePublic?: boolean
  createdAt?: string
  updatedAt?: string
}

export interface Page {
  id: string
  type: 'library' | 'page' | 'group'
  title: string
  content: any
  description?: string
  icon?: string | null
  coverImage?: string
  isPublic: boolean
  publicSlug?: string
  sortOrder: number
  isArchived?: boolean
  archivedAt?: string | null
  parentId?: string
  parentTitle?: string | null
  libraryId?: string
  libraryTitle?: string
  createdAt: string
  updatedAt: string
  lastViewedAt?: string
  metadata?: any
  userId?: string
}

export interface Library extends Page {
  pageCount?: number
  tags?: Tag[]
}

export interface PageVersion {
  id: string
  content: any
  message?: string
  createdAt: string
  pageId: string
}

export interface Tag {
  id: string
  name: string
  color?: string
  createdAt: string
}

export interface Task {
  id: string
  content: string
  isCompleted: boolean
  dueDate?: string
  sortOrder: number
  pageId: string
  createdAt: string
  updatedAt: string
  completedAt?: string
}

export interface Template {
  id: string
  title: string
  description?: string | null
  content: any
  category?: string | null
  isBuiltIn: boolean
  createdAt: string
  updatedAt: string
  userId?: string | null
}

export interface SearchParams {
  query: string
  libraryId?: string
  tagId?: string
  page?: number
  pageSize?: number
}

export interface AuthCredentials {
  email: string
  password: string
}

export interface RegisterData extends AuthCredentials {
  displayName?: string
}
