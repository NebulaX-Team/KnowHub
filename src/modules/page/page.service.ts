import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { DatabaseService } from '@/database/database.service';
import { CreatePageDto } from './dto/create-page.dto';
import { UpdatePageDto } from './dto/update-page.dto';
import { MovePageDto } from './dto/move-page.dto';
import { PageQueryDto } from './dto/page-query.dto';
import { PageResponseDto } from './dto/page-response.dto';
import { CreateVersionDto, CleanupVersionsDto, UpdatePageSettingsDto } from './dto/version-history.dto';
import { ArchivedQueryDto } from './dto/archived-query.dto';
import { randomUUID } from 'crypto';
import { AccessRole, CollabService } from '@/modules/collab/collab.service';

@Injectable()
export class PageService {
  constructor(
    private readonly database: DatabaseService,
    private readonly collabService: CollabService,
  ) {}

  /**
   * Generate a unique ID
   */
  private generateId(): string {
    return randomUUID();
  }

  private async filterAccessibleRows<T extends { id: string }>(
    userId: string,
    rows: T[],
    role: AccessRole = 'viewer',
    options?: { includeArchived?: boolean },
  ): Promise<T[]> {
    const checks = await Promise.all(
      rows.map((row) => this.collabService.hasPageAccess(userId, row.id, role, options)),
    );

    return rows.filter((_, index) => checks[index]);
  }

  /**
   * Create a new page
   */
  async create(userId: string, createPageDto: CreatePageDto): Promise<PageResponseDto> {
    const id = this.generateId();
    const now = new Date().toISOString();
    const nodeType = createPageDto.type === 'group' ? 'group' : 'page';
    let isPublic = createPageDto.isPublic;

    await this.collabService.assertPageAccess(userId, createPageDto.libraryId, 'editor', {
      notFoundMessage: 'Library not found',
    });

    const library = await this.database.queryOne(
      "SELECT id, type, isPublic FROM Page WHERE id = ? AND COALESCE(isArchived, 0) = 0",
      [createPageDto.libraryId],
    );

    if (!library || library.type !== 'library') {
      throw new NotFoundException('Library not found');
    }

    // Validate parent page exists if provided
    if (createPageDto.parentId) {
      await this.collabService.assertPageAccess(userId, createPageDto.parentId, 'editor', {
        notFoundMessage: 'Parent page not found',
      });

      const parent = await this.database.queryOne(
        "SELECT id, libraryId, isPublic FROM Page WHERE id = ? AND type IN ('page', 'group') AND COALESCE(isArchived, 0) = 0",
        [createPageDto.parentId],
      );

      if (!parent) {
        throw new NotFoundException('Parent page not found');
      }

      // Ensure parent belongs to same library
      if (parent.libraryId !== createPageDto.libraryId) {
        throw new ConflictException('Parent page must belong to the same library');
      }

      if (isPublic === undefined) {
        isPublic = !!parent.isPublic;
      }
    } else if (isPublic === undefined) {
      isPublic = !!library.isPublic;
    }

    // Default content to empty doc
    const content = createPageDto.content ?? { type: 'doc', content: [] };
    const contentStr = JSON.stringify(content);

    // Get max sortOrder for pages with same parent
    const maxSortResult = await this.database.queryOne(
      `SELECT COALESCE(MAX(sortOrder), 0) as maxSort 
       FROM Page 
       WHERE libraryId = ? AND COALESCE(isArchived, 0) = 0 AND parentId ${createPageDto.parentId ? '= ?' : 'IS NULL'}`,
      createPageDto.parentId ? [createPageDto.libraryId, createPageDto.parentId] : [createPageDto.libraryId],
    );
    const sortOrder = (maxSortResult.maxSort || 0) + 1;

    await this.database.run(
      `
      INSERT INTO Page (
        id, type, title, content, icon, isPublic, sortOrder, metadata, 
        createdAt, updatedAt, userId, libraryId, parentId, coverImage
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
      [
        id,
        nodeType,
        createPageDto.title,
        contentStr,
        createPageDto.icon || null,
        isPublic ? 1 : 0,
        sortOrder,
        null,
        now,
        now,
        userId,
        createPageDto.libraryId,
        createPageDto.parentId || null,
        null,
      ],
    );

    return this.findOne(userId, id);
  }

  /**
   * Find all pages with optional filtering and pagination
   */
  async findAll(userId: string, query: PageQueryDto): Promise<{ items: PageResponseDto[]; total: number; page: number; pageSize: number; hasMore: boolean }> {
    const {
      libraryId,
      parentId,
      page = 1,
      pageSize = 20,
      sortBy = 'sortOrder',
      sortDirection = 'ASC',
      nodeType = 'all',
    } = query;
    const offset = (page - 1) * pageSize;

    // Build conditions
    const conditions = ['COALESCE(p.isArchived, 0) = 0'];
    const params: any[] = [];

    if (nodeType === 'page') {
      conditions.push("p.type = 'page'");
    } else if (nodeType === 'group') {
      conditions.push("p.type = 'group'");
    } else {
      conditions.push("p.type IN ('page', 'group')");
    }

    if (libraryId) {
      conditions.push('p.libraryId = ?');
      params.push(libraryId);
    }

    if (parentId !== undefined) {
      if (parentId === null) {
        conditions.push('p.parentId IS NULL');
      } else {
        conditions.push('p.parentId = ?');
        params.push(parentId);
      }
    }

    const whereClause = conditions.join(' AND ');

    // Validate sortBy
    const allowedSortFields = ['updatedAt', 'createdAt', 'title', 'sortOrder', 'lastViewedAt'];
    const safeSortBy = allowedSortFields.includes(sortBy) ? sortBy : 'sortOrder';
    const safeSortDirection = sortDirection === 'DESC' ? 'DESC' : 'ASC';

    // Fetch candidates, then apply ACL and pagination in memory
    const candidates = await this.database.query(`
      SELECT p.*, 
             l.title as libraryTitle,
             parent.title as parentTitle
      FROM Page p
      LEFT JOIN Page l ON p.libraryId = l.id
      LEFT JOIN Page parent ON p.parentId = parent.id
      WHERE ${whereClause}
      ORDER BY p.${safeSortBy} ${safeSortDirection}
    `, params);

    const accessibleItems = await this.filterAccessibleRows(userId, candidates, 'viewer');
    const total = accessibleItems.length;
    const items = accessibleItems.slice(offset, offset + pageSize);

    const pageResponseItems = items.map(item => ({
      id: item.id,
      type: item.type,
      title: item.title,
      content: item.content ? JSON.parse(item.content) : { type: 'doc', content: [] },
      description: item.description,
      icon: item.icon,
      coverImage: item.coverImage,
      isPublic: !!item.isPublic,
      publicSlug: item.publicSlug,
      sortOrder: item.sortOrder,
      metadata: item.metadata ? JSON.parse(item.metadata) : {},
      isArchived: !!item.isArchived,
      archivedAt: item.archivedAt || null,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
      lastViewedAt: item.lastViewedAt,
      userId: item.userId,
      libraryId: item.libraryId,
      libraryTitle: item.libraryTitle,
      parentId: item.parentId,
      parentTitle: item.parentTitle,
      parent: item.parentId ? { 
        id: item.parentId, 
        title: item.parentTitle,
        content: null,
        isPublic: false,
        sortOrder: 0,
        isArchived: false,
        archivedAt: null,
        createdAt: null,
        updatedAt: null,
        userId: item.userId,
        libraryId: item.libraryId,
        children: []
      } : null,
      children: [] // Empty for list view
    }));

    return {
      items: pageResponseItems,
      total,
      page,
      pageSize,
      hasMore: page * pageSize < total
    };
  }

  /**
   * Find a single page with parent and children
   */
  async findOne(userId: string, id: string): Promise<PageResponseDto> {
    await this.collabService.assertPageAccess(userId, id, 'viewer');

    const page = await this.database.queryOne(`
      SELECT p.*, 
             l.title as libraryTitle,
             parent.title as parentTitle,
             parent.content as parentContent,
             parent.parentId as grandparentId
      FROM Page p
      LEFT JOIN Page l ON p.libraryId = l.id
      LEFT JOIN Page parent ON p.parentId = parent.id
      WHERE p.id = ? AND COALESCE(p.isArchived, 0) = 0
    `, [id]);

    if (!page) {
      throw new NotFoundException('Page not found');
    }

    // Get immediate children
    const childCandidates = await this.database.query(`
      SELECT * FROM Page 
      WHERE parentId = ? AND type IN ('page', 'group') AND COALESCE(isArchived, 0) = 0
      ORDER BY sortOrder ASC
    `, [id]);

    const children = await this.filterAccessibleRows(userId, childCandidates, 'viewer');

    // Get tags
    const tags = await this.database.query(`
      SELECT t.id, t.name, t.color, t.createdAt
      FROM Tag t
      INNER JOIN PageTag pt ON t.id = pt.tagId
      WHERE pt.pageId = ?
      ORDER BY t.createdAt DESC
    `, [id]);

    return {
      id: page.id,
      type: page.type,
      title: page.title,
      content: page.content ? JSON.parse(page.content) : { type: 'doc', content: [] },
      description: page.description,
      icon: page.icon,
      coverImage: page.coverImage,
      isPublic: !!page.isPublic,
      publicSlug: page.publicSlug,
      sortOrder: page.sortOrder,
      metadata: page.metadata ? JSON.parse(page.metadata) : {},
      isArchived: !!page.isArchived,
      archivedAt: page.archivedAt || null,
      createdAt: page.createdAt,
      updatedAt: page.updatedAt,
      lastViewedAt: page.lastViewedAt,
      userId: page.userId,
      libraryId: page.libraryId,
      parentTitle: page.parentTitle,
      parentId: page.parentId,
      parent: page.parentId ? {
        id: page.parentId,
        title: page.parentTitle,
        content: page.parentContent ? JSON.parse(page.parentContent) : null,
        parentId: page.grandparentId,
        isPublic: false,
        sortOrder: 0,
        isArchived: false,
        archivedAt: null,
        createdAt: '',
        updatedAt: '',
        userId: page.userId,
        libraryId: page.libraryId,
        children: []
      } : null,
      children: children.map(child => ({
        id: child.id,
        type: child.type,
        title: child.title,
        content: child.content ? JSON.parse(child.content) : { type: 'doc', content: [] },
        description: child.description,
        icon: child.icon,
        coverImage: child.coverImage,
        isPublic: !!child.isPublic,
        publicSlug: child.publicSlug,
        sortOrder: child.sortOrder,
        metadata: child.metadata ? JSON.parse(child.metadata) : {},
        isArchived: !!child.isArchived,
        archivedAt: child.archivedAt || null,
        createdAt: child.createdAt,
        updatedAt: child.updatedAt,
        lastViewedAt: child.lastViewedAt,
        userId: child.userId,
        libraryId: child.libraryId,
        parentId: child.parentId,
        children: [] // Only immediate children
      })),
      tags: tags.map(tag => ({
        id: tag.id,
        name: tag.name,
        color: tag.color,
        createdAt: tag.createdAt
      }))
    };
  }

  /**
   * Get tree structure for a library
   */
  async getTree(userId: string, libraryId: string): Promise<PageResponseDto[]> {
    await this.collabService.assertPageAccess(userId, libraryId, 'viewer', {
      notFoundMessage: 'Library not found',
    });

    const library = await this.database.queryOne(
      "SELECT id, type FROM Page WHERE id = ? AND COALESCE(isArchived, 0) = 0",
      [libraryId],
    );

    if (!library || library.type !== 'library') {
      throw new NotFoundException('Library not found');
    }

    // Get all pages for the library
    const pageCandidates = await this.database.query(`
      SELECT * FROM Page 
      WHERE libraryId = ? AND type IN ('page', 'group') AND COALESCE(isArchived, 0) = 0
      ORDER BY sortOrder ASC
    `, [libraryId]);

    const pages = await this.filterAccessibleRows(userId, pageCandidates, 'viewer');
    const visibleIds = new Set(pages.map((page) => page.id));

    // Build tree recursively
    const buildTree = (parentId: string | null): PageResponseDto[] => {
      return pages
        .filter(p => p.parentId === parentId)
        .map(page => ({
          id: page.id,
          type: page.type,
          title: page.title,
          content: page.content ? JSON.parse(page.content) : { type: 'doc', content: [] },
          icon: page.icon,
          coverImage: page.coverImage,
          isPublic: !!page.isPublic,
          publicSlug: page.publicSlug,
          sortOrder: page.sortOrder,
          metadata: page.metadata ? JSON.parse(page.metadata) : {},
          isArchived: !!page.isArchived,
          archivedAt: page.archivedAt || null,
          createdAt: page.createdAt,
          updatedAt: page.updatedAt,
          lastViewedAt: page.lastViewedAt,
          userId: page.userId,
          libraryId: page.libraryId,
          parentId: page.parentId,
          children: buildTree(page.id)
        }));
    };

    const roots = pages.filter((page) => !page.parentId || !visibleIds.has(page.parentId));
    return roots.map((root) => ({
      id: root.id,
      type: root.type,
      title: root.title,
      content: root.content ? JSON.parse(root.content) : { type: 'doc', content: [] },
      icon: root.icon,
      coverImage: root.coverImage,
      isPublic: !!root.isPublic,
      publicSlug: root.publicSlug,
      sortOrder: root.sortOrder,
      metadata: root.metadata ? JSON.parse(root.metadata) : {},
      isArchived: !!root.isArchived,
      archivedAt: root.archivedAt || null,
      createdAt: root.createdAt,
      updatedAt: root.updatedAt,
      lastViewedAt: root.lastViewedAt,
      userId: root.userId,
      libraryId: root.libraryId,
      parentId: root.parentId,
      children: buildTree(root.id),
    }));
  }

  /**
   * Update a page
   */
  async update(userId: string, id: string, updatePageDto: UpdatePageDto): Promise<PageResponseDto> {
    await this.collabService.assertPageAccess(userId, id, 'editor');

    const page = await this.database.queryOne(
      'SELECT * FROM Page WHERE id = ? AND COALESCE(isArchived, 0) = 0',
      [id],
    );

    if (!page) {
      throw new NotFoundException('Page not found');
    }

    // Validate library exists if changing
    if (updatePageDto.libraryId && updatePageDto.libraryId !== page.libraryId) {
      await this.collabService.assertPageAccess(userId, updatePageDto.libraryId, 'editor', {
        notFoundMessage: 'Library not found',
      });

      const library = await this.database.queryOne(
        "SELECT id FROM Page WHERE id = ? AND type = 'library' AND COALESCE(isArchived, 0) = 0",
        [updatePageDto.libraryId],
      );

      if (!library) {
        throw new NotFoundException('Library not found');
      }
    }

    // Validate parent page if provided
    if (updatePageDto.parentId !== undefined) {
      if (updatePageDto.parentId && updatePageDto.parentId !== page.parentId) {
        await this.collabService.assertPageAccess(userId, updatePageDto.parentId, 'editor', {
          notFoundMessage: 'Parent page not found',
        });

        const parent = await this.database.queryOne(
          "SELECT id, libraryId FROM Page WHERE id = ? AND type IN ('page', 'group') AND COALESCE(isArchived, 0) = 0",
          [updatePageDto.parentId],
        );

        if (!parent) {
          throw new NotFoundException('Parent page not found');
        }

        // Check for circular reference
        if (await this.hasCircularReference(id, updatePageDto.parentId)) {
          throw new ConflictException('Circular reference detected');
        }

        // Ensure parent belongs to same library
        const targetLibraryId = updatePageDto.libraryId || page.libraryId;
        if (parent.libraryId !== targetLibraryId) {
          throw new ConflictException('Parent page must belong to the same library');
        }
      }

      // If setting to null, it becomes a root page
      if (updatePageDto.parentId === null) {
        updatePageDto.parentId = undefined; // Will be handled in query
      }
    }

    const updates: string[] = [];
    const params: any[] = [];

    if (updatePageDto.title !== undefined) {
      updates.push('title = ?');
      params.push(updatePageDto.title);
    }

    if (updatePageDto.content !== undefined) {
      updates.push('content = ?');
      params.push(JSON.stringify(updatePageDto.content));
    }

    if (updatePageDto.description !== undefined) {
      updates.push('description = ?');
      params.push(updatePageDto.description);
    }

    if (updatePageDto.libraryId !== undefined) {
      updates.push('libraryId = ?');
      params.push(updatePageDto.libraryId);
    }

    if (updatePageDto.parentId !== undefined) {
      updates.push('parentId = ?');
      params.push(updatePageDto.parentId || null);
    }

    if (updatePageDto.icon !== undefined) {
      updates.push('icon = ?');
      params.push(updatePageDto.icon || null);
    }

    if (updatePageDto.isPublic !== undefined) {
      updates.push('isPublic = ?');
      params.push(updatePageDto.isPublic ? 1 : 0);
      
      if (updatePageDto.isPublic && !page.publicSlug) {
        // Generate simple random slug if not present
        const slug = Math.random().toString(36).substring(2, 10) + Math.random().toString(36).substring(2, 10);
        updates.push('publicSlug = ?');
        params.push(slug);
      }
    }

    if (updates.length === 0) {
      return this.findOne(userId, id);
    }

    updates.push('updatedAt = ?');
    params.push(new Date().toISOString());

    params.push(id);

    await this.database.run(
      `UPDATE Page SET ${updates.join(', ')} WHERE id = ?`,
      params,
    );

    // Create automatic version if content was updated
    if (updatePageDto.content !== undefined) {
      await this.createAutomaticVersionIfApplicable(userId, id);
    }

    // Cascade update isPublic to all descendants if it was changed
    if (updatePageDto.isPublic !== undefined) {
      const isPublicVal = updatePageDto.isPublic ? 1 : 0;
      
      // Get all descendants
      const descendants = await this.database.query(`
        WITH RECURSIVE descendants(id) AS (
          SELECT id FROM Page WHERE parentId = ?
          UNION ALL
          SELECT p.id FROM Page p JOIN descendants d ON p.parentId = d.id
        )
        SELECT id, publicSlug FROM Page WHERE id IN (SELECT id FROM descendants)
      `, [id]);

      for (const descendant of descendants) {
        let slug = descendant.publicSlug;
        // If enabling public access and no slug exists, generate one
        if (isPublicVal && !slug) {
             slug = Math.random().toString(36).substring(2, 10) + Math.random().toString(36).substring(2, 10);
        }
        
        await this.database.run(
            'UPDATE Page SET isPublic = ?, publicSlug = ? WHERE id = ?',
            [isPublicVal, slug, descendant.id]
        );
      }
    }

    return this.findOne(userId, id);
  }

  /**
   * Move page to another parent or library
   */
  async move(userId: string, id: string, movePageDto: MovePageDto): Promise<PageResponseDto> {
    await this.collabService.assertPageAccess(userId, id, 'editor');

    const page = await this.database.queryOne(
      'SELECT * FROM Page WHERE id = ? AND COALESCE(isArchived, 0) = 0',
      [id],
    );

    if (!page) {
      throw new NotFoundException('Page not found');
    }

    const updates: string[] = [];
    const params: any[] = [];
    const now = new Date().toISOString();

    // Handle parent change
    if (movePageDto.newParentId !== undefined) {
      if (movePageDto.newParentId === null) {
        // Moving to root
        updates.push('parentId = NULL');
      } else {
        // Moving to another page
        if (movePageDto.newParentId === id) {
          throw new ConflictException('Cannot move page under itself');
        }

        await this.collabService.assertPageAccess(userId, movePageDto.newParentId, 'editor', {
          notFoundMessage: 'Target parent page not found',
        });

        const parent = await this.database.queryOne(
          "SELECT id, libraryId, parentId FROM Page WHERE id = ? AND type IN ('page', 'group') AND COALESCE(isArchived, 0) = 0",
          [movePageDto.newParentId],
        );

        if (!parent) {
          throw new NotFoundException('Target parent page not found');
        }

        // Check for circular dependency
        let current = parent;
        let depth = 0;
        while (current && current.parentId && depth < 100) {
            if (current.parentId === id) {
                throw new ConflictException('Cannot move page under its own descendant');
            }
            const nextParent = await this.database.queryOne(
                'SELECT id, parentId FROM Page WHERE id = ?',
                [current.parentId]
            );
            current = nextParent;
            depth++;
        }

        updates.push('parentId = ?');
        params.push(movePageDto.newParentId);

        // If moving to a parent, we must also move to that parent's library
        if (page.libraryId !== parent.libraryId) {
          updates.push('libraryId = ?');
          params.push(parent.libraryId);
        }
      }
    }

    // Handle library change
    if (movePageDto.newLibraryId && movePageDto.newLibraryId !== page.libraryId) {
       if (movePageDto.newParentId === undefined) {
           await this.collabService.assertPageAccess(userId, movePageDto.newLibraryId, 'editor', {
             notFoundMessage: 'Target library not found',
           });

           const library = await this.database.queryOne(
               "SELECT id FROM Page WHERE id = ? AND type = 'library' AND COALESCE(isArchived, 0) = 0",
               [movePageDto.newLibraryId]
           );
           if (!library) {
               throw new NotFoundException('Target library not found');
           }
           
           updates.push('libraryId = ?');
           params.push(movePageDto.newLibraryId);
           
           if (page.parentId) {
               const parent = await this.database.queryOne(
                   'SELECT libraryId FROM Page WHERE id = ?',
                   [page.parentId]
               );
               if (parent && parent.libraryId !== movePageDto.newLibraryId) {
                   updates.push('parentId = NULL');
               }
           }
       }
    }

    // If parent changed but sortOrder not provided, append to end
    if (movePageDto.newParentId !== undefined && movePageDto.sortOrder === undefined) {
        const targetParentId = movePageDto.newParentId;
        let maxSortQuery = 'SELECT COALESCE(MAX(sortOrder), 0) as maxSort FROM Page WHERE parentId = ?';
        let maxSortParams: any[] = [targetParentId];
        
        if (targetParentId === null) {
             // If moving to root, we need to know which library
             let libId = page.libraryId;
             if (movePageDto.newLibraryId) libId = movePageDto.newLibraryId;
             else if (movePageDto.newParentId !== undefined && movePageDto.newParentId !== null) {
                 // If moving to a parent, library is parent's library. 
                 // But here targetParentId is null, so we are at root.
                 // If we are changing parent to NULL, we stay in same library unless newLibraryId is set.
             }
             
             maxSortQuery = 'SELECT COALESCE(MAX(sortOrder), 0) as maxSort FROM Page WHERE parentId IS NULL AND libraryId = ?';
             maxSortParams = [libId];
        }
        
        const maxSortResult = await this.database.queryOne(maxSortQuery, maxSortParams);
        const newSortOrder = (maxSortResult.maxSort || 0) + 1;
        
        updates.push('sortOrder = ?');
        params.push(newSortOrder);
    }

    if (movePageDto.sortOrder !== undefined) {
      // Determine target parent ID
      let targetParentId = page.parentId;
      if (movePageDto.newParentId !== undefined) {
          targetParentId = movePageDto.newParentId;
      }

      // Shift existing items to make room
      const shiftParams: any[] = [movePageDto.sortOrder, id];
      let parentClause = 'parentId IS NULL';
      
      if (targetParentId !== null) {
          parentClause = 'parentId = ?';
          shiftParams.unshift(targetParentId);
      }
      
      // Also filter by libraryId to be safe, though parentId should be unique enough (except for root)
      // For root pages, we MUST filter by libraryId
      if (targetParentId === null) {
          // If moving to root, we need to know the target library
          let targetLibraryId = page.libraryId;
          if (movePageDto.newLibraryId) {
              targetLibraryId = movePageDto.newLibraryId;
          } else if (movePageDto.newParentId !== undefined && movePageDto.newParentId !== null) {
             // If moving to a parent, library is parent's library (handled above in parent check)
             // But here targetParentId is null, so we are at root.
             // If we are changing parent to NULL, we stay in same library unless newLibraryId is set.
          }
          
          parentClause += ' AND libraryId = ?';
          shiftParams.splice(shiftParams.length - 2, 0, targetLibraryId);
      }

      await this.database.run(
          `UPDATE Page SET sortOrder = sortOrder + 1 WHERE ${parentClause} AND sortOrder >= ? AND id != ?`,
          shiftParams
      );

      updates.push('sortOrder = ?');
      params.push(movePageDto.sortOrder);
    }

    if (updates.length > 0) {
      updates.push('updatedAt = ?');
      params.push(now);
      
      params.push(id);

      await this.database.run(
        `UPDATE Page SET ${updates.join(', ')} WHERE id = ?`,
        params,
      );
    }

    return this.findOne(userId, id);
  }

  /**
   * Delete a page and its children
   */
  async remove(userId: string, id: string): Promise<{ success: boolean; message: string }> {
    await this.collabService.assertPageAccess(userId, id, 'manager');

    // Recursive delete function
    const deleteRecursive = async (pageId: string): Promise<void> => {
      // Find children
      const children = await this.database.query(
        'SELECT id FROM Page WHERE parentId = ?',
        [pageId],
      );

      // Delete children recursively
      for (const child of children) {
        await deleteRecursive(child.id);
      }

      // Delete the page itself
      await this.database.run('DELETE FROM Page WHERE id = ?', [pageId]);
    };

    await deleteRecursive(id);

    return { success: true, message: 'Page deleted successfully' };
  }

  /**
   * List archived pages/groups
   */
  async getArchived(
    userId: string,
    query: ArchivedQueryDto,
  ): Promise<{ items: PageResponseDto[]; total: number; page: number; pageSize: number; hasMore: boolean }> {
    const {
      libraryId,
      page = 1,
      pageSize = 20,
      sortBy = 'archivedAt',
      sortDirection = 'DESC',
      nodeType = 'all',
    } = query;
    const offset = (page - 1) * pageSize;

    const conditions = ['COALESCE(p.isArchived, 0) = 1'];
    const params: any[] = [];

    if (nodeType === 'page') {
      conditions.push("p.type = 'page'");
    } else if (nodeType === 'group') {
      conditions.push("p.type = 'group'");
    } else {
      conditions.push("p.type IN ('page', 'group')");
    }

    if (libraryId) {
      conditions.push('p.libraryId = ?');
      params.push(libraryId);
    }

    const whereClause = conditions.join(' AND ');

    const allowedSortFields = ['archivedAt', 'updatedAt', 'createdAt', 'title'];
    const safeSortBy = allowedSortFields.includes(sortBy) ? sortBy : 'archivedAt';
    const safeSortDirection = sortDirection === 'ASC' ? 'ASC' : 'DESC';

    const candidates = await this.database.query(
      `SELECT p.*,
              l.title as libraryTitle,
              parent.title as parentTitle
       FROM Page p
       LEFT JOIN Page l ON p.libraryId = l.id
       LEFT JOIN Page parent ON p.parentId = parent.id
       WHERE ${whereClause}
       ORDER BY p.${safeSortBy} ${safeSortDirection}`,
      params,
    );

    const accessibleItems = await this.filterAccessibleRows(userId, candidates, 'viewer', {
      includeArchived: true,
    });
    const total = accessibleItems.length;
    const items = accessibleItems.slice(offset, offset + pageSize);

    return {
      items: items.map((item) => ({
        id: item.id,
        type: item.type,
        title: item.title,
        content: item.content ? JSON.parse(item.content) : { type: 'doc', content: [] },
        description: item.description,
        icon: item.icon,
        coverImage: item.coverImage,
        isPublic: !!item.isPublic,
        publicSlug: item.publicSlug,
        sortOrder: item.sortOrder,
        metadata: item.metadata ? JSON.parse(item.metadata) : {},
        isArchived: !!item.isArchived,
        archivedAt: item.archivedAt || null,
        createdAt: item.createdAt,
        updatedAt: item.updatedAt,
        lastViewedAt: item.lastViewedAt,
        userId: item.userId,
        libraryId: item.libraryId,
        libraryTitle: item.libraryTitle,
        parentId: item.parentId,
        parentTitle: item.parentTitle,
        children: [],
      })),
      total,
      page,
      pageSize,
      hasMore: page * pageSize < total,
    };
  }

  /**
   * Archive page/group and descendants
   */
  async archive(userId: string, id: string): Promise<{ success: boolean; message: string }> {
    await this.collabService.assertPageAccess(userId, id, 'manager');

    const page = await this.database.queryOne(
      "SELECT id, type FROM Page WHERE id = ? AND type IN ('page', 'group') AND COALESCE(isArchived, 0) = 0",
      [id],
    );

    if (!page) {
      throw new NotFoundException('Page not found');
    }

    const targetIds = await this.getRecursivePageIds(id);
    const now = new Date().toISOString();

    const placeholders = targetIds.map(() => '?').join(',');
    await this.database.run(
      `UPDATE Page
       SET isArchived = 1,
           archivedAt = ?,
           isPublic = 0,
           updatedAt = ?
       WHERE id IN (${placeholders})`,
      [now, now, ...targetIds],
    );

    return { success: true, message: 'Page archived successfully' };
  }

  /**
   * Restore archived page/group and descendants
   */
  async unarchive(userId: string, id: string): Promise<{ success: boolean; message: string }> {
    await this.collabService.assertPageAccess(userId, id, 'manager', {
      includeArchived: true,
    });

    const page = await this.database.queryOne(
      "SELECT id, parentId, libraryId FROM Page WHERE id = ? AND type IN ('page', 'group') AND COALESCE(isArchived, 0) = 1",
      [id],
    );

    if (!page) {
      throw new NotFoundException('Page not found');
    }

    const library = await this.database.queryOne(
      "SELECT id FROM Page WHERE id = ? AND type = 'library' AND COALESCE(isArchived, 0) = 0",
      [page.libraryId]
    );
    if (!library) {
      throw new NotFoundException('Library not found');
    }

    await this.collabService.assertPageAccess(userId, page.libraryId, 'manager');

    if (page.parentId) {
      const parent = await this.database.queryOne(
        'SELECT id, isArchived FROM Page WHERE id = ?',
        [page.parentId],
      );

      if (!parent || !!parent.isArchived) {
        throw new ConflictException('Cannot restore page while parent is archived');
      }
    }

    const targetIds = await this.getRecursivePageIds(id);
    const now = new Date().toISOString();
    const placeholders = targetIds.map(() => '?').join(',');

    await this.database.run(
      `UPDATE Page
       SET isArchived = 0,
           archivedAt = NULL,
           updatedAt = ?
       WHERE id IN (${placeholders})`,
      [now, ...targetIds],
    );

    return { success: true, message: 'Page restored successfully' };
  }

  /**
   * Permanently delete an archived page/group and descendants
   */
  async removePermanently(userId: string, id: string): Promise<{ success: boolean; message: string }> {
    await this.collabService.assertPageAccess(userId, id, 'manager', {
      includeArchived: true,
    });

    const page = await this.database.queryOne(
      "SELECT id FROM Page WHERE id = ? AND type IN ('page', 'group') AND COALESCE(isArchived, 0) = 1",
      [id]
    );

    if (!page) {
      throw new NotFoundException('Page not found');
    }

    const deleteRecursive = async (pageId: string): Promise<void> => {
      const children = await this.database.query(
        'SELECT id FROM Page WHERE parentId = ?',
        [pageId],
      );

      for (const child of children) {
        await deleteRecursive(child.id);
      }

      await this.database.run('DELETE FROM Page WHERE id = ?', [pageId]);
    };

    await deleteRecursive(id);
    return { success: true, message: 'Page permanently deleted successfully' };
  }

  private async getRecursivePageIds(rootId: string): Promise<string[]> {
    const rows = await this.database.query(
      `WITH RECURSIVE page_tree(id) AS (
         SELECT id FROM Page WHERE id = ?
         UNION ALL
         SELECT p.id
         FROM Page p
         INNER JOIN page_tree t ON p.parentId = t.id
       )
       SELECT id FROM page_tree`,
      [rootId],
    );

    return rows.map((row) => row.id);
  }

  /**
   * Check for circular references
   */
  private async hasCircularReference(pageId: string, newParentId: string): Promise<boolean> {
    if (pageId === newParentId) {
      return true;
    }

    let current = newParentId;
    const visited = new Set<string>();

    while (current) {
      if (visited.has(current)) {
        return true;
      }
      visited.add(current);

      const parent = await this.database.queryOne('SELECT parentId FROM Page WHERE id = ?', [current]);
      if (!parent || !parent.parentId) {
        break;
      }
      current = parent.parentId;

      if (current === pageId) {
        return true;
      }
    }

    return false;
  }

  /**
   * Attach a tag to a page
   */
  async attachTag(userId: string, pageId: string, tagId: string): Promise<{ success: boolean; message: string }> {
    await this.collabService.assertPageAccess(userId, pageId, 'editor');

    // Verify tag exists
    const tag = await this.database.queryOne('SELECT id FROM Tag WHERE id = ?', [tagId]);
    if (!tag) {
      throw new NotFoundException('Tag not found');
    }

    // Check if already attached
    const existing = await this.database.queryOne(
      'SELECT pageId FROM PageTag WHERE pageId = ? AND tagId = ?',
      [pageId, tagId]
    );
    
    if (existing) {
      throw new ConflictException('Tag is already attached to this page');
    }

    await this.database.run(
      'INSERT INTO PageTag (pageId, tagId) VALUES (?, ?)',
      [pageId, tagId]
    );

    return { success: true, message: 'Tag attached successfully' };
  }

  /**
   * Detach a tag from a page
   */
  async detachTag(userId: string, pageId: string, tagId: string): Promise<{ success: boolean; message: string }> {
    await this.collabService.assertPageAccess(userId, pageId, 'editor');

    // Verify the association exists
    const existing = await this.database.queryOne(
      'SELECT pageId FROM PageTag WHERE pageId = ? AND tagId = ?',
      [pageId, tagId]
    );
    
    if (!existing) {
      throw new NotFoundException('Tag is not attached to this page');
    }

    await this.database.run(
      'DELETE FROM PageTag WHERE pageId = ? AND tagId = ?',
      [pageId, tagId]
    );

    return { success: true, message: 'Tag detached successfully' };
  }

  /**
   * Update page tags (replace all tags)
   */
  async updateTags(userId: string, pageId: string, tagIds: string[]): Promise<{ success: boolean; message: string }> {
    await this.collabService.assertPageAccess(userId, pageId, 'editor');

    // Verify all tags exist
    for (const tagId of tagIds) {
      const tag = await this.database.queryOne('SELECT id FROM Tag WHERE id = ?', [tagId]);
      if (!tag) {
        throw new NotFoundException(`Tag not found: ${tagId}`);
      }
    }

    // Remove existing tags
    await this.database.run('DELETE FROM PageTag WHERE pageId = ?', [pageId]);

    // Add new tags
    for (const tagId of tagIds) {
      await this.database.run(
        'INSERT INTO PageTag (pageId, tagId) VALUES (?, ?)',
        [pageId, tagId]
      );
    }

    return { success: true, message: 'Tags updated successfully' };
  }

  /**
   * Get tags for a page
   */
  async getTags(userId: string, pageId: string): Promise<Array<{ id: string; name: string; color?: string; createdAt: string }>> {
    await this.collabService.assertPageAccess(userId, pageId, 'viewer');

    const tags = await this.database.query(`
      SELECT t.id, t.name, t.color, t.createdAt
      FROM Tag t
      INNER JOIN PageTag pt ON t.id = pt.tagId
      WHERE pt.pageId = ?
      ORDER BY t.createdAt DESC
    `, [pageId]);

    return tags.map(tag => ({
      id: tag.id,
      name: tag.name,
      color: tag.color,
      createdAt: tag.createdAt
    }));
  }

  /**
   * Get all versions for a page
   */
  async getVersions(userId: string, pageId: string): Promise<Array<{ id: string; content: any; message?: string; createdAt: string; pageId: string }>> {
    await this.collabService.assertPageAccess(userId, pageId, 'viewer');

    const versions = await this.database.query(`
      SELECT id, content, message, createdAt, pageId
      FROM PageVersion
      WHERE pageId = ?
      ORDER BY createdAt DESC
    `, [pageId]);

    return versions.map(version => ({
      id: version.id,
      content: version.content ? JSON.parse(version.content) : { type: 'doc', content: [] },
      message: version.message,
      createdAt: version.createdAt,
      pageId: version.pageId
    }));
  }

  /**
   * Create a new version for a page
   */
  async createVersion(userId: string, pageId: string, createVersionDto: CreateVersionDto): Promise<{ id: string; content: any; message?: string; createdAt: string; pageId: string }> {
    await this.collabService.assertPageAccess(userId, pageId, 'editor');

    const page = await this.database.queryOne(
      'SELECT id, content FROM Page WHERE id = ? AND COALESCE(isArchived, 0) = 0',
      [pageId]
    );

    if (!page) {
      throw new NotFoundException('Page not found');
    }

    const contentObj = page.content ? JSON.parse(page.content) : { type: 'doc', content: [] };

    const id = this.generateId();
    const now = new Date().toISOString();
    const contentStr = JSON.stringify(contentObj);
    await this.database.run(`
      INSERT INTO PageVersion (id, content, message, createdAt, pageId)
      VALUES (?, ?, ?, ?, ?)
    `, [id, contentStr, createVersionDto.message || null, now, pageId]);

    // Get retention limit from page metadata
    const retentionLimit = await this.getVersionRetentionLimit(pageId);
    if (retentionLimit > 0) {
      await this.enforceRetentionLimit(pageId, retentionLimit);
    }

    return {
      id,
      content: page.content,
      message: createVersionDto.message,
      createdAt: now,
      pageId
    };
  }

  /**
   * Restore page to a specific version
   */
  async restoreVersion(userId: string, pageId: string, versionId: string): Promise<PageResponseDto> {
    await this.collabService.assertPageAccess(userId, pageId, 'editor');

    // Verify version exists and belongs to the page
    const version = await this.database.queryOne(`
      SELECT id, content, message, createdAt
      FROM PageVersion
      WHERE id = ? AND pageId = ?
    `, [versionId, pageId]);

    if (!version) {
      throw new NotFoundException('Version not found');
    }

    // Restore the content
    const now = new Date().toISOString();
    await this.database.run(`
      UPDATE Page
      SET content = ?, updatedAt = ?
      WHERE id = ?
    `, [version.content, now, pageId]);

    // Create a new version for the restored state (optional, but good practice)
    // We can add a message indicating this was a restore
    const restoreVersionId = this.generateId();
    const userTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const localTime = new Date(version.createdAt).toLocaleString('en-US', { timeZone: userTimezone });
    await this.database.run(`
      INSERT INTO PageVersion (id, content, message, createdAt, pageId)
      VALUES (?, ?, ?, ?, ?)
    `, [restoreVersionId, version.content, `Restored from version ${localTime}`, now, pageId]);


    return this.findOne(userId, pageId);
  }

  /**
   * Clean up old versions for a page
   */
  async cleanupVersions(userId: string, pageId: string, cleanupDto: CleanupVersionsDto): Promise<{ success: boolean; deletedCount: number; message: string }> {
    await this.collabService.assertPageAccess(userId, pageId, 'manager');

    // Calculate cutoff date based on period
    const cutoffDate = new Date();
    switch (cleanupDto.period) {
      case 'day':
        cutoffDate.setDate(cutoffDate.getDate() - 1);
        break;
      case 'week':
        cutoffDate.setDate(cutoffDate.getDate() - 7);
        break;
      case 'month':
        cutoffDate.setMonth(cutoffDate.getMonth() - 1);
        break;
    }

    const cutoffDateStr = cutoffDate.toISOString();

    // Get count of versions to delete
    const countResult = await this.database.queryOne(`
      SELECT COUNT(*) as count
      FROM PageVersion
      WHERE pageId = ? AND createdAt < ?
    `, [pageId, cutoffDateStr]);

    const deletedCount = countResult.count;

    // Delete old versions
    if (deletedCount > 0) {
      await this.database.run(`
        DELETE FROM PageVersion
        WHERE pageId = ? AND createdAt < ?
      `, [pageId, cutoffDateStr]);
    }

    return {
      success: true,
      deletedCount,
      message: `Deleted ${deletedCount} version(s) older than ${cleanupDto.period}`
    };
  }

  /**
   * Delete a specific version for a page
   */
  async deleteVersion(userId: string, pageId: string, versionId: string): Promise<{ success: boolean; message: string }> {
    await this.collabService.assertPageAccess(userId, pageId, 'manager');

    // Verify version exists and belongs to the page
    const version = await this.database.queryOne(
      'SELECT id FROM PageVersion WHERE id = ? AND pageId = ?',
      [versionId, pageId]
    );

    if (!version) {
      throw new NotFoundException('Version not found');
    }

    // Delete the version
    await this.database.run(
      'DELETE FROM PageVersion WHERE id = ?',
      [versionId]
    );

    return {
      success: true,
      message: 'Version deleted successfully'
    };
  }

  /**
   * Update page settings (including version retention limit)
   */
  async updatePageSettings(userId: string, pageId: string, updateSettingsDto: UpdatePageSettingsDto): Promise<{ success: boolean; message: string }> {
    await this.collabService.assertPageAccess(userId, pageId, 'manager');

    const page = await this.database.queryOne(
      'SELECT id, metadata FROM Page WHERE id = ? AND COALESCE(isArchived, 0) = 0',
      [pageId]
    );

    if (!page) {
      throw new NotFoundException('Page not found');
    }

    // Parse existing metadata
    let metadata: any = {};
    try {
      if (page.metadata) {
        metadata = JSON.parse(page.metadata);
      }
    } catch (e) {
      metadata = {};
    }

    // Update version retention limit
    if (updateSettingsDto.versionRetentionLimit !== undefined) {
      if (updateSettingsDto.versionRetentionLimit < 0) {
        throw new BadRequestException('Version retention limit must be non-negative');
      }
      metadata.versionRetentionLimit = updateSettingsDto.versionRetentionLimit;
    }

    // Save updated metadata
    const metadataStr = JSON.stringify(metadata);
    await this.database.run(`
      UPDATE Page
      SET metadata = ?
      WHERE id = ?
    `, [metadataStr, pageId]);

    // If retention limit was reduced, enforce it
    if (updateSettingsDto.versionRetentionLimit !== undefined && updateSettingsDto.versionRetentionLimit > 0) {
      await this.enforceRetentionLimit(pageId, updateSettingsDto.versionRetentionLimit);
    }

    return {
      success: true,
      message: 'Page settings updated successfully'
    };
  }

  /**
   * Get version retention limit for a page
   */
  private async getVersionRetentionLimit(pageId: string): Promise<number> {
    const page = await this.database.queryOne(
      'SELECT metadata FROM Page WHERE id = ? AND COALESCE(isArchived, 0) = 0',
      [pageId]
    );

    if (!page || !page.metadata) {
      return 99; // Default retention limit
    }

    try {
      const metadata = JSON.parse(page.metadata);
      return metadata.versionRetentionLimit ?? 99;
    } catch (e) {
      return 99;
    }
  }

  /**
   * Enforce retention limit by deleting oldest versions
   */
  private async enforceRetentionLimit(pageId: string, limit: number): Promise<void> {
    // Get all version IDs sorted by creation date (oldest first)
    const versions = await this.database.query(`
      SELECT id
      FROM PageVersion
      WHERE pageId = ?
      ORDER BY createdAt ASC
    `, [pageId]);

    // If we have more versions than the limit, delete the oldest ones
    if (versions.length > limit) {
      const versionsToDelete = versions.slice(0, versions.length - limit);
      const versionIds = versionsToDelete.map(v => v.id);

      if (versionIds.length > 0) {
        const placeholders = versionIds.map(() => '?').join(',');
        await this.database.run(`
          DELETE FROM PageVersion
          WHERE id IN (${placeholders})
        `, versionIds);
      }
    }
  }

  /**
   * Check if we should create an automatic version (based on time since last version)
   */
  private async shouldCreateAutomaticVersion(pageId: string, _userId: string): Promise<boolean> {
    // Get the most recent version
    const lastVersion = await this.database.queryOne(`
      SELECT createdAt
      FROM PageVersion
      WHERE pageId = ?
      ORDER BY createdAt DESC
      LIMIT 1
    `, [pageId]);

    if (!lastVersion) {
      // No versions exist, create one
      return true;
    }

    // Check if at least 2 minutes have passed since the last version
    const lastVersionDate = new Date(lastVersion.createdAt);
    const now = new Date();
    const timeDiff = now.getTime() - lastVersionDate.getTime();
    const twoMinutesInMs = 2 * 60 * 1000;

    return timeDiff >= twoMinutesInMs;
  }

  /**
   * Create automatic version if conditions are met
   */
  async createAutomaticVersionIfApplicable(userId: string, pageId: string): Promise<void> {
    // Check if we should create a version
    if (!(await this.shouldCreateAutomaticVersion(pageId, userId))) {
      return;
    }

    // Create the version
    await this.createVersion(userId, pageId, { message: 'Auto-saved' });
  }

  /**
   * Get pages created on this day in previous years
   */
  async getOnThisDay(userId: string, limit = 10): Promise<Array<{ id: string; title: string; icon: string | null; year: string; createdAt: string; libraryTitle: string | null }>> {
    const now = new Date();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const currentYear = now.getFullYear();
    const onThisDayCondition = this.database.isPostgres()
      ? `TO_CHAR(p.createdAt, 'MM-DD') = ? AND EXTRACT(YEAR FROM p.createdAt) < ?`
      : `strftime('%m-%d', p.createdAt) = ? AND CAST(strftime('%Y', p.createdAt) AS INTEGER) < ?`;

    const candidateLimit = Math.max(limit * 20, 200);
    const candidates = await this.database.query(`
      SELECT p.id, p.title, p.icon, p.createdAt, l.title as libraryTitle
      FROM Page p
      LEFT JOIN Page l ON p.libraryId = l.id
      WHERE p.type = 'page'
        AND COALESCE(p.isArchived, 0) = 0
        AND ${onThisDayCondition}
      ORDER BY p.createdAt DESC
      LIMIT ?
    `, [`${month}-${day}`, currentYear, candidateLimit]);

    const accessibleItems = await this.filterAccessibleRows(userId, candidates, 'viewer');
    const items = accessibleItems.slice(0, limit);

    return items.map(item => ({
      id: item.id,
      title: item.title,
      icon: item.icon || null,
      year: new Date(item.createdAt).getFullYear().toString(),
      createdAt: item.createdAt,
      libraryTitle: item.libraryTitle || null,
    }));
  }

  /**
   * Get pages that haven't been visited for a long time
   */
  async getLongUnvisited(userId: string, limit = 10): Promise<Array<{ id: string; title: string; icon: string | null; days: number; lastViewedAt: string | null; libraryTitle: string | null }>> {
    const candidateLimit = Math.max(limit * 20, 200);
    const candidates = await this.database.query(`
      SELECT p.id, p.title, p.icon, p.lastViewedAt, p.createdAt, l.title as libraryTitle
      FROM Page p
      LEFT JOIN Page l ON p.libraryId = l.id
      WHERE p.type = 'page'
        AND COALESCE(p.isArchived, 0) = 0
      ORDER BY COALESCE(p.lastViewedAt, p.createdAt) ASC
      LIMIT ?
    `, [candidateLimit]);

    const accessibleItems = await this.filterAccessibleRows(userId, candidates, 'viewer');
    const items = accessibleItems.slice(0, limit);

    const now = new Date();
    return items.map(item => {
      const refDate = new Date(item.lastViewedAt || item.createdAt);
      const days = Math.floor((now.getTime() - refDate.getTime()) / (1000 * 60 * 60 * 24));
      return {
        id: item.id,
        title: item.title,
        icon: item.icon || null,
        days,
        lastViewedAt: item.lastViewedAt || null,
        libraryTitle: item.libraryTitle || null,
      };
    });
  }
}
