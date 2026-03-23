// 数据库实体类型定义，替代 Prisma 生成的类型

export interface User {
  id: string;
  email: string;
  passwordHash: string;
  displayName?: string;
  avatar?: string;
  settings?: string;
  isAdmin: boolean;
  isBanned: boolean;
  isProfilePublic: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Page {
  id: string;
  type: 'library' | 'group' | 'page';
  title: string;
  content: string;
  description?: string;
  icon?: string;
  coverImage?: string;
  isPublic: boolean;
  publicSlug?: string;
  sortOrder: number;
  metadata?: string;
  isArchived: boolean;
  archivedAt?: string;
  createdAt: string;
  updatedAt: string;
  lastViewedAt?: string;
  userId: string;
  libraryId?: string;
  parentId?: string;
}

export type Library = Page;

export interface PageVersion {
  id: string;
  content: string;
  message?: string;
  createdAt: string;
  pageId: string;
}

export interface PageReference {
  id: string;
  createdAt: string;
  sourceId: string;
  targetId: string;
}

export interface Tag {
  id: string;
  name: string;
  color?: string;
  createdAt: string;
}

export interface PageTag {
  pageId: string;
  tagId: string;
}

export interface Task {
  id: string;
  content: string;
  isCompleted: boolean;
  dueDate?: string;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
  pageId: string;
}

export interface Template {
  id: string;
  title: string;
  description?: string;
  content: string;
  category?: string;
  isBuiltIn: boolean;
  createdAt: string;
  updatedAt: string;
  userId?: string;
}

export interface SystemConfig {
  key: string;
  value: string;
  updatedAt: string;
}

export interface Team {
  id: string;
  name: string;
  description?: string;
  ownerId: string;
  createdAt: string;
  updatedAt: string;
}

export interface TeamMember {
  teamId: string;
  userId: string;
  role: 'member' | 'admin';
  joinedAt: string;
}

export interface PagePermission {
  id: string;
  pageId: string;
  subjectType: 'user' | 'team';
  subjectId: string;
  role: 'viewer' | 'editor' | 'manager';
  createdAt: string;
  updatedAt: string;
}

export interface PageInvite {
  id: string;
  pageId: string;
  email: string;
  role: 'viewer' | 'editor' | 'manager';
  token: string;
  invitedBy: string;
  status: 'pending' | 'accepted' | 'declined' | 'canceled' | 'expired';
  expiresAt: string;
  acceptedAt?: string;
  createdAt: string;
  updatedAt: string;
}
