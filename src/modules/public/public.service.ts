import { Injectable, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '@/database/database.service';
import { PageResponseDto } from '../page/dto/page-response.dto';
import { LibraryResponseDto } from '../library/dto/library-response.dto';

export interface PublicUserProfile {
  id: string;
  displayName: string;
  avatar?: string;
  createdAt: string;
  libraries: LibraryResponseDto[];
}

@Injectable()
export class PublicService {
  constructor(private readonly database: DatabaseService) {}

  async findPageBySlug(slug: string): Promise<PageResponseDto & { author?: any }> {
    console.debug(`Finding public page by slug: ${slug}`);
    // Try to find by publicSlug first
    let page = await this.database.queryOne(`
      SELECT p.*, 
             l.title as libraryTitle,
             parent.title as parentTitle
      FROM Page p
      LEFT JOIN Page l ON p.libraryId = l.id
      LEFT JOIN Page parent ON p.parentId = parent.id
      WHERE p.publicSlug = ? AND p.isPublic = 1 AND p.type = 'page'
    `, [slug]);

    // If not found, try by ID (if slug looks like UUID or just fallback)
    if (!page) {
       console.debug(`Page not found by slug, trying ID: ${slug}`);
       page = await this.database.queryOne(`
        SELECT p.*, 
               l.title as libraryTitle,
               parent.title as parentTitle
        FROM Page p
        LEFT JOIN Page l ON p.libraryId = l.id
        LEFT JOIN Page parent ON p.parentId = parent.id
        WHERE p.id = ? AND p.isPublic = 1 AND p.type = 'page'
      `, [slug]);
    }

    if (!page) {
      console.debug(`Page not found or not public: ${slug}`);
      throw new NotFoundException('Page not found or not public');
    }

    // Fetch tags
    const tags = await this.database.query(`
      SELECT t.* FROM Tag t
      INNER JOIN PageTag pt ON pt.tagId = t.id
      WHERE pt.pageId = ?
    `, [page.id]);

    // Fetch author
    const author = await this.database.queryOne(`
      SELECT id, displayName, email, avatar FROM User WHERE id = ?
    `, [page.userId]);

    return {
      id: page.id,
      title: page.title,
      content: page.content ? JSON.parse(page.content) : { type: 'doc', content: [] },
      description: page.description,
      icon: page.icon,
      coverImage: page.coverImage,
      isPublic: true,
      publicSlug: page.publicSlug,
      sortOrder: page.sortOrder,
      metadata: page.metadata ? JSON.parse(page.metadata) : {},
      createdAt: page.createdAt,
      updatedAt: page.updatedAt,
      lastViewedAt: page.lastViewedAt,
      userId: page.userId,
      libraryId: page.libraryId,
      parentId: page.parentId,
      children: [],
      tags: tags || [],
      author: author || { displayName: 'Unknown' }
    };
  }

  async findLibraryBySlug(slug: string): Promise<LibraryResponseDto> {
    console.debug(`Finding public library by slug: ${slug}`);
    
    // Debug query to see if it exists at all
    const debugLib = await this.database.queryOne(
        "SELECT id, title, isPublic, publicSlug, type FROM Page WHERE publicSlug = ? OR id = ?", 
        [slug, slug]
    );
    console.debug('Debug library lookup:', debugLib);

    let library = await this.database.queryOne(`
      SELECT 
        l.*,
        (SELECT COUNT(*) FROM Page p WHERE p.libraryId = l.id AND p.type = 'page' AND p.isPublic = 1) as pageCount
      FROM Page l
      WHERE l.publicSlug = ? AND l.isPublic = 1 AND l.type = 'library'
    `, [slug]);

    if (!library) {
       console.debug(`Not found by slug, trying ID: ${slug}`);
       library = await this.database.queryOne(`
        SELECT 
          l.*,
          (SELECT COUNT(*) FROM Page p WHERE p.libraryId = l.id AND p.type = 'page' AND p.isPublic = 1) as pageCount
        FROM Page l
        WHERE l.id = ? AND l.isPublic = 1 AND l.type = 'library'
      `, [slug]);
    }

    if (!library) {
      console.debug(`Library not found or not public: ${slug}`);
      throw new NotFoundException('Library not found or not public');
    }

    const tags = await this.database.query(`
      SELECT t.* FROM Tag t
      INNER JOIN PageTag pt ON pt.tagId = t.id
      WHERE pt.pageId = ?
    `, [library.id]);

    return {
      ...library,
      isPublic: true,
      content: library.content ? JSON.parse(library.content) : { type: 'doc', content: [] },
      pageCount: library.pageCount,
      tags: tags
    } as LibraryResponseDto;
  }

  async getPublicTree(libraryId: string): Promise<PageResponseDto[]> {
    const library = await this.database.queryOne(
      "SELECT id FROM Page WHERE id = ? AND type = 'library' AND isPublic = 1",
      [libraryId]
    );

    if (!library) {
      throw new NotFoundException('Library not found or not public');
    }

    const pages = await this.database.query(`
      SELECT * FROM Page 
      WHERE libraryId = ?
        AND (
          (type = 'page' AND isPublic = 1)
          OR type = 'group'
        )
      ORDER BY sortOrder ASC
    `, [libraryId]);

    const publicIds = new Set(pages.map(p => p.id));
    
    // Effective roots are pages with no parent OR parent is not in the public set
    const effectiveRoots = pages.filter(p => {
        if (!p.parentId) return true;
        return !publicIds.has(p.parentId);
    });
    
    const buildTreeFromNode = (node: any): PageResponseDto => {
        return {
          id: node.id,
          type: node.type,
          title: node.title,
          content: null,
          icon: node.icon,
          coverImage: node.coverImage,
          isPublic: true,
          publicSlug: node.publicSlug,
          sortOrder: node.sortOrder,
          metadata: node.metadata ? JSON.parse(node.metadata) : {},
          createdAt: node.createdAt,
          updatedAt: node.updatedAt,
          lastViewedAt: node.lastViewedAt,
          userId: node.userId,
          libraryId: node.libraryId,
          parentId: node.parentId,
          children: pages
            .filter(p => p.parentId === node.id)
            .map(child => buildTreeFromNode(child))
        };
    };

    return effectiveRoots.map(root => buildTreeFromNode(root));
  }

  async getUserProfile(name: string): Promise<PublicUserProfile> {
    // Try to find by displayName first, then fallback to id
    let user = await this.database.queryOne(`
      SELECT id, displayName, avatar, isProfilePublic, createdAt
      FROM User
      WHERE displayName = ? AND isProfilePublic = 1
    `, [name]);

    if (!user) {
      user = await this.database.queryOne(`
        SELECT id, displayName, avatar, isProfilePublic, createdAt
        FROM User
        WHERE id = ? AND isProfilePublic = 1
      `, [name]);
    }

    if (!user) {
      throw new NotFoundException('User not found or profile is not public');
    }

    // Get user's public libraries
    const libraries = await this.database.query(`
      SELECT 
        l.*,
        (SELECT COUNT(*) FROM Page p WHERE p.libraryId = l.id AND p.type = 'page' AND p.isPublic = 1) as pageCount
      FROM Page l
      WHERE l.userId = ? AND l.isPublic = 1 AND l.type = 'library'
      ORDER BY l.updatedAt DESC
    `, [user.id]);

    const libraryList = libraries.map(lib => ({
      ...lib,
      content: lib.content ? JSON.parse(lib.content) : { type: 'doc', content: [] },
      pageCount: lib.pageCount,
      tags: [],
    })) as LibraryResponseDto[];

    return {
      id: user.id,
      displayName: user.displayName || 'Anonymous',
      avatar: user.avatar,
      createdAt: user.createdAt,
      libraries: libraryList,
    };
  }

  async searchPublic(query: string): Promise<PageResponseDto[]> {
    return await this.database.query(`
      SELECT * FROM Page 
      WHERE (title LIKE ? OR content LIKE ?) 
      AND isPublic = 1 
      AND type = 'page'
      LIMIT 20
    `, [`%${query}%`, `%${query}%`]) as PageResponseDto[];
  }
}
