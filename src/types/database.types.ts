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
