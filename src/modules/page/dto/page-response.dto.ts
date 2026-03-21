export class PageResponseDto {
  id: string | null;
  type?: string | null;
  title: string;
  content: string | null;
  description?: string | null;
  icon?: string | null;
  coverImage?: string | null;
  isPublic: boolean | null;
  publicSlug?: string | null;
  sortOrder: number | null;
  metadata?: string | null;
  createdAt: string | null;
  updatedAt: string | null;
  lastViewedAt?: string | null;
  userId: string | null;
  libraryId?: string | null;
  libraryTitle?: string | null;
  parentId?: string | null;
  parentTitle?: string | null;
  // Additional fields for tree structure
  parent?: PageResponseDto | null;
  children?: PageResponseDto[] | null;
  // Tags associated with the page
  tags?: Array<{
    id: string;
    name: string;
    color?: string | null;
    createdAt: string;
  }> | null;
}
