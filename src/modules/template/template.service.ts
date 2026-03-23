import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { DatabaseService } from '@/database/database.service';
import { CreateTemplateDto } from './dto/create-template.dto';
import { UpdateTemplateDto } from './dto/update-template.dto';
import { TemplateQueryDto } from './dto/template-query.dto';
import { TemplateResponseDto } from './dto/template-response.dto';

type TemplateRow = {
  id: string;
  title: string;
  description?: string | null;
  content?: string | null;
  category?: string | null;
  isBuiltIn?: number | boolean;
  createdAt: string;
  updatedAt: string;
  userId?: string | null;
};

const EMPTY_DOC = {
  type: 'doc',
  content: [],
};

@Injectable()
export class TemplateService {
  constructor(private readonly database: DatabaseService) {}

  async findAll(userId: string, query: TemplateQueryDto): Promise<TemplateResponseDto[]> {
    const conditions = ['(userId = ? OR isBuiltIn = 1)'];
    const params: any[] = [userId];

    const category = query.category?.trim();
    if (category) {
      conditions.push('category = ?');
      params.push(category);
    }

    const keyword = query.keyword?.trim();
    if (keyword) {
      const likeKeyword = `%${keyword}%`;
      conditions.push('(LOWER(title) LIKE LOWER(?) OR LOWER(COALESCE(description, \'\')) LIKE LOWER(?))');
      params.push(likeKeyword, likeKeyword);
    }

    const templates = await this.database.query(
      `SELECT *
       FROM Template
       WHERE ${conditions.join(' AND ')}
       ORDER BY isBuiltIn DESC, updatedAt DESC`,
      params
    );

    return templates.map((template) => this.normalizeTemplate(template));
  }

  async findOne(userId: string, id: string): Promise<TemplateResponseDto> {
    const template = await this.database.queryOne(
      'SELECT * FROM Template WHERE id = ? AND (userId = ? OR isBuiltIn = 1)',
      [id, userId]
    ) as TemplateRow | null;

    if (!template) {
      throw new NotFoundException('Template not found');
    }

    return this.normalizeTemplate(template);
  }

  async create(userId: string, createTemplateDto: CreateTemplateDto): Promise<TemplateResponseDto> {
    const id = randomUUID();
    const now = new Date().toISOString();

    await this.database.run(
      `INSERT INTO Template (
         id, title, description, content, category, isBuiltIn, createdAt, updatedAt, userId
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        createTemplateDto.title.trim(),
        createTemplateDto.description?.trim() || null,
        this.serializeContent(createTemplateDto.content),
        createTemplateDto.category?.trim() || null,
        0,
        now,
        now,
        userId,
      ]
    );

    return this.findOne(userId, id);
  }

  async update(userId: string, id: string, updateTemplateDto: UpdateTemplateDto): Promise<TemplateResponseDto> {
    const template = await this.database.queryOne(
      'SELECT id, userId, isBuiltIn FROM Template WHERE id = ?',
      [id]
    ) as Pick<TemplateRow, 'id' | 'userId' | 'isBuiltIn'> | null;

    if (!template) {
      throw new NotFoundException('Template not found');
    }

    if (this.toBoolean(template.isBuiltIn)) {
      throw new BadRequestException('Cannot modify built-in template');
    }

    if (template.userId !== userId) {
      throw new NotFoundException('Template not found');
    }

    const updates: string[] = [];
    const params: any[] = [];

    if (updateTemplateDto.title !== undefined) {
      updates.push('title = ?');
      params.push(updateTemplateDto.title.trim());
    }

    if (updateTemplateDto.description !== undefined) {
      updates.push('description = ?');
      params.push(updateTemplateDto.description?.trim() || null);
    }

    if (updateTemplateDto.category !== undefined) {
      updates.push('category = ?');
      params.push(updateTemplateDto.category?.trim() || null);
    }

    if (updateTemplateDto.content !== undefined) {
      updates.push('content = ?');
      params.push(this.serializeContent(updateTemplateDto.content));
    }

    if (updates.length === 0) {
      return this.findOne(userId, id);
    }

    updates.push('updatedAt = ?');
    params.push(new Date().toISOString(), id, userId);

    await this.database.run(
      `UPDATE Template
       SET ${updates.join(', ')}
       WHERE id = ? AND userId = ?`,
      params
    );

    return this.findOne(userId, id);
  }

  async remove(userId: string, id: string): Promise<{ success: boolean; message: string }> {
    const template = await this.database.queryOne(
      'SELECT id, userId, isBuiltIn FROM Template WHERE id = ?',
      [id]
    ) as Pick<TemplateRow, 'id' | 'userId' | 'isBuiltIn'> | null;

    if (!template) {
      throw new NotFoundException('Template not found');
    }

    if (this.toBoolean(template.isBuiltIn)) {
      throw new BadRequestException('Cannot delete built-in template');
    }

    if (template.userId !== userId) {
      throw new NotFoundException('Template not found');
    }

    await this.database.run(
      'DELETE FROM Template WHERE id = ? AND userId = ?',
      [id, userId]
    );

    return {
      success: true,
      message: 'Template deleted successfully',
    };
  }

  async duplicate(userId: string, id: string): Promise<TemplateResponseDto> {
    const sourceTemplate = await this.database.queryOne(
      'SELECT * FROM Template WHERE id = ? AND (userId = ? OR isBuiltIn = 1)',
      [id, userId]
    ) as TemplateRow | null;

    if (!sourceTemplate) {
      throw new NotFoundException('Template not found');
    }

    const duplicateId = randomUUID();
    const now = new Date().toISOString();
    const duplicateTitle = await this.generateDuplicateTitle(userId, sourceTemplate.title);

    await this.database.run(
      `INSERT INTO Template (
         id, title, description, content, category, isBuiltIn, createdAt, updatedAt, userId
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        duplicateId,
        duplicateTitle,
        sourceTemplate.description || null,
        sourceTemplate.content || this.serializeContent(EMPTY_DOC),
        sourceTemplate.category || null,
        0,
        now,
        now,
        userId,
      ]
    );

    return this.findOne(userId, duplicateId);
  }

  private normalizeTemplate(template: TemplateRow): TemplateResponseDto {
    return {
      id: template.id,
      title: template.title,
      description: template.description || null,
      content: this.parseContent(template.content),
      category: template.category || null,
      isBuiltIn: this.toBoolean(template.isBuiltIn),
      createdAt: template.createdAt,
      updatedAt: template.updatedAt,
      userId: template.userId || null,
    };
  }

  private parseContent(content: unknown): Record<string, unknown> {
    if (typeof content === 'string' && content.trim()) {
      try {
        const parsed = JSON.parse(content);
        if (parsed && typeof parsed === 'object') {
          return parsed as Record<string, unknown>;
        }
      } catch {
        return { ...EMPTY_DOC };
      }
    }

    if (content && typeof content === 'object') {
      return content as Record<string, unknown>;
    }

    return { ...EMPTY_DOC };
  }

  private serializeContent(content: unknown): string {
    const parsed = this.parseContent(content);
    return JSON.stringify(parsed);
  }

  private toBoolean(value: unknown): boolean {
    return value === true || value === 1 || value === '1';
  }

  private async generateDuplicateTitle(userId: string, sourceTitle: string): Promise<string> {
    const baseTitle = `${sourceTitle} (Copy)`;
    let candidate = baseTitle;
    for (let index = 2; index < 10000; index += 1) {
      const existing = await this.database.queryOne(
        'SELECT id FROM Template WHERE userId = ? AND title = ?',
        [userId, candidate]
      );
      if (!existing) {
        return candidate;
      }
      candidate = `${baseTitle} ${index}`;
    }

    throw new BadRequestException('Template title generation failed');
  }
}
