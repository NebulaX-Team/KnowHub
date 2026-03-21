import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../../database/database.service';

@Injectable()
export class SearchService {
  constructor(private readonly db: DatabaseService) {}

  async searchSuggestions(userId: string, query: string) {
    if (!query) {
      // Return recent pages when query is empty
      const sql = `
        SELECT id, title, icon, publicSlug, isPublic, type
        FROM Page 
        WHERE userId = ? AND type = 'page'
        ORDER BY updatedAt DESC 
        LIMIT 10
      `;
      return this.db.queryAll(sql, [userId]);
    }
    
    const sql = `
      SELECT id, title, icon, publicSlug, isPublic, type
      FROM Page 
      WHERE userId = ? AND type = 'page' AND title LIKE ? 
      ORDER BY updatedAt DESC 
      LIMIT 10
    `;
    
    return this.db.queryAll(sql, [userId, `%${query}%`]);
  }
}
