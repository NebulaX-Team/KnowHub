import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { DatabaseService } from '@/database/database.service';
import { CollabService, AccessRole } from '@/modules/collab/collab.service';
import { CreateLibraryDto } from './dto/create-library.dto';
import { UpdateLibraryDto } from './dto/update-library.dto';
import { LibraryResponseDto } from './dto/library-response.dto';

@Injectable()
export class LibraryService {
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

  private async filterLibrariesByAccess<T extends { id: string }>(
    userId: string,
    rows: T[],
    role: AccessRole = 'viewer',
  ): Promise<T[]> {
    const checks = await Promise.all(
      rows.map((row) => this.collabService.hasPageAccess(userId, row.id, role)),
    );

    return rows.filter((_, index) => checks[index]);
  }

  /**
   * Create a new library for the current user
   */
  async create(userId: string, createLibraryDto: CreateLibraryDto): Promise<LibraryResponseDto> {
    const id = this.generateId();
    const now = new Date().toISOString();

    // Check if publicSlug already exists
    if (createLibraryDto.publicSlug) {
      const existing = await this.database.queryOne(
        'SELECT id FROM Page WHERE publicSlug = ?',
        [createLibraryDto.publicSlug],
      );

      if (existing) {
        throw new ConflictException('Public slug already exists');
      }
    }

    // Ensure content is provided, default to empty doc if not
    const content = createLibraryDto.content ?? { type: 'doc', content: [] };
    const contentStr = typeof content === 'string' ? content : JSON.stringify(content);

    await this.database.run(
      `
      INSERT INTO Page (
        id, type, title, content, description, icon, sortOrder, isPublic, publicSlug,
        metadata, createdAt, updatedAt, userId, libraryId, parentId
      ) VALUES (?, 'library', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL)
    `,
      [
        id,
        createLibraryDto.title,
        contentStr,
        createLibraryDto.description || null,
        createLibraryDto.icon || null,
        createLibraryDto.sortOrder || 0,
        createLibraryDto.isPublic ? 1 : 0,
        createLibraryDto.publicSlug || null,
        '{}',
        now,
        now,
        userId,
        id, // libraryId points to self
      ],
    );

    return this.findOne(userId, id);
  }

  /**
   * List all libraries the current user can access
   */
  async findAll(userId: string): Promise<LibraryResponseDto[]> {
    const libraries = await this.database.query(
      `
      SELECT
        l.*,
        (SELECT COUNT(*) FROM Page p WHERE p.libraryId = l.id AND p.type = 'page' AND COALESCE(p.isArchived, 0) = 0) as pageCount
      FROM Page l
      WHERE l.type = 'library' AND COALESCE(l.isArchived, 0) = 0
      ORDER BY l.sortOrder ASC, l.createdAt ASC
    `,
    );

    const accessibleLibraries = await this.filterLibrariesByAccess(userId, libraries, 'viewer');

    const items = await Promise.all(
      accessibleLibraries.map(async (lib) => {
        const tags = await this.database.query(
          `
          SELECT t.* FROM Tag t
          INNER JOIN PageTag pt ON pt.tagId = t.id
          WHERE pt.pageId = ?
        `,
          [lib.id],
        );

        return {
          ...lib,
          isPublic: Boolean(lib.isPublic),
          content: lib.content ? JSON.parse(lib.content) : { type: 'doc', content: [] },
          pageCount: Number(lib.pageCount || 0),
          tags,
        };
      }),
    );

    return items as LibraryResponseDto[];
  }

  /**
   * Get a specific library that user can access
   */
  async findOne(userId: string, id: string): Promise<LibraryResponseDto> {
    await this.collabService.assertPageAccess(userId, id, 'viewer', {
      notFoundMessage: 'Library not found',
    });

    const library = await this.database.queryOne(
      `
      SELECT
        l.*,
        (SELECT COUNT(*) FROM Page p WHERE p.libraryId = l.id AND p.type = 'page' AND COALESCE(p.isArchived, 0) = 0) as pageCount
      FROM Page l
      WHERE l.id = ? AND l.type = 'library' AND COALESCE(l.isArchived, 0) = 0
    `,
      [id],
    );

    if (!library) {
      throw new NotFoundException('Library not found');
    }

    const tags = await this.database.query(
      `
      SELECT t.* FROM Tag t
      INNER JOIN PageTag pt ON pt.tagId = t.id
      WHERE pt.pageId = ?
    `,
      [id],
    );

    return {
      ...library,
      isPublic: Boolean(library.isPublic),
      content: library.content ? JSON.parse(library.content) : { type: 'doc', content: [] },
      pageCount: Number(library.pageCount || 0),
      tags,
    } as LibraryResponseDto;
  }

  /**
   * Update a library
   */
  async update(userId: string, id: string, updateLibraryDto: UpdateLibraryDto): Promise<LibraryResponseDto> {
    await this.collabService.assertPageAccess(userId, id, 'manager', {
      notFoundMessage: 'Library not found',
    });

    const library = await this.database.queryOne(
      'SELECT * FROM Page WHERE id = ? AND type = \'library\' AND COALESCE(isArchived, 0) = 0',
      [id],
    );

    if (!library) {
      throw new NotFoundException('Library not found');
    }

    // Check publicSlug uniqueness if being updated
    if (updateLibraryDto.publicSlug) {
      const existing = await this.database.queryOne(
        'SELECT id FROM Page WHERE publicSlug = ? AND id != ?',
        [updateLibraryDto.publicSlug, id],
      );

      if (existing) {
        throw new ConflictException('Public slug already exists');
      }
    }

    const updates: string[] = [];
    const params: any[] = [];

    if (updateLibraryDto.title !== undefined) {
      updates.push('title = ?');
      params.push(updateLibraryDto.title);
    }

    if (updateLibraryDto.content !== undefined) {
      updates.push('content = ?');
      const content = updateLibraryDto.content;
      const contentStr = typeof content === 'string' ? content : JSON.stringify(content);
      params.push(contentStr);
    }

    if (updateLibraryDto.description !== undefined) {
      updates.push('description = ?');
      params.push(updateLibraryDto.description || null);
    }

    if (updateLibraryDto.icon !== undefined) {
      updates.push('icon = ?');
      params.push(updateLibraryDto.icon || null);
    }

    if (updateLibraryDto.isPublic !== undefined) {
      updates.push('isPublic = ?');
      const isPublicVal =
        updateLibraryDto.isPublic === true || String(updateLibraryDto.isPublic) === 'true' ? 1 : 0;
      params.push(isPublicVal);

      if (isPublicVal === 1 && !library.publicSlug) {
        const newSlug =
          Math.random().toString(36).substring(2, 10) + Math.random().toString(36).substring(2, 10);
        updates.push('publicSlug = ?');
        params.push(newSlug);
      }
    }

    if (updateLibraryDto.publicSlug !== undefined) {
      updates.push('publicSlug = ?');
      params.push(updateLibraryDto.publicSlug || null);
    }

    if (updateLibraryDto.sortOrder !== undefined) {
      updates.push('sortOrder = ?');
      params.push(updateLibraryDto.sortOrder);
    }

    if (updates.length === 0) {
      return this.findOne(userId, id);
    }

    updates.push('updatedAt = ?');
    params.push(new Date().toISOString());
    params.push(id);

    const sql = `UPDATE Page SET ${updates.join(', ')} WHERE id = ?`;
    await this.database.run(sql, params);

    // Cascade update isPublic to all pages in the library if it was changed
    if (updateLibraryDto.isPublic !== undefined) {
      const isPublicVal =
        updateLibraryDto.isPublic === true || String(updateLibraryDto.isPublic) === 'true' ? 1 : 0;

      const pages = await this.database.query(
        "SELECT id, publicSlug FROM Page WHERE libraryId = ? AND type IN ('page', 'group') AND COALESCE(isArchived, 0) = 0",
        [id],
      );

      for (const page of pages) {
        let slug = page.publicSlug;
        if (isPublicVal && !slug) {
          slug =
            Math.random().toString(36).substring(2, 10) +
            Math.random().toString(36).substring(2, 10);
        }
        await this.database.run('UPDATE Page SET isPublic = ?, publicSlug = ? WHERE id = ?', [
          isPublicVal,
          slug,
          page.id,
        ]);
      }
    }

    return this.findOne(userId, id);
  }

  /**
   * Delete a library
   */
  async remove(userId: string, id: string): Promise<{ success: boolean; message: string }> {
    await this.collabService.assertPageAccess(userId, id, 'manager', {
      notFoundMessage: 'Library not found',
    });

    const library = await this.database.queryOne(
      "SELECT id FROM Page WHERE id = ? AND type = 'library'",
      [id],
    );

    if (!library) {
      throw new NotFoundException('Library not found');
    }

    await this.database.run('DELETE FROM Page WHERE id = ?', [id]);

    return { success: true, message: 'Library deleted successfully' };
  }
}
