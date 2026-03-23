import { Injectable } from '@nestjs/common';
import { DatabaseService } from '@/database/database.service';
import { CollabService } from '@/modules/collab/collab.service';

@Injectable()
export class SearchService {
  constructor(
    private readonly db: DatabaseService,
    private readonly collabService: CollabService,
  ) {}

  private async filterAccessibleRows<T extends { id: string }>(userId: string, rows: T[]): Promise<T[]> {
    const checks = await Promise.all(
      rows.map((row) => this.collabService.hasPageAccess(userId, row.id, 'viewer')),
    );

    return rows.filter((_, index) => checks[index]);
  }

  async searchSuggestions(userId: string, query: string) {
    if (!query) {
      // Return recent pages user can access when query is empty
      const sql = `
        SELECT id, title, icon, publicSlug, isPublic, type
        FROM Page
        WHERE type = 'page' AND COALESCE(isArchived, 0) = 0
        ORDER BY updatedAt DESC
        LIMIT 100
      `;

      const rows = await this.db.queryAll(sql);
      const accessible = await this.filterAccessibleRows(userId, rows);
      return accessible.slice(0, 10);
    }

    const sql = `
      SELECT id, title, icon, publicSlug, isPublic, type
      FROM Page
      WHERE type = 'page' AND COALESCE(isArchived, 0) = 0 AND title LIKE ?
      ORDER BY updatedAt DESC
      LIMIT 200
    `;

    const rows = await this.db.queryAll(sql, [`%${query}%`]);
    const accessible = await this.filterAccessibleRows(userId, rows);
    return accessible.slice(0, 10);
  }
}
