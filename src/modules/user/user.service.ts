import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '@/database/database.service';
import { User } from '@/types/database.types';
import * as bcrypt from 'bcrypt';

export interface UserListQuery {
  page?: number;
  pageSize?: number;
  email?: string;
}

export interface UserListResponse {
  items: User[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}

@Injectable()
export class UserService {
  constructor(private readonly database: DatabaseService) {}

  async findByEmail(email: string): Promise<User | null> {
    const normalizedEmail = email.trim().toLowerCase();
    const sql = `
      SELECT id, email, passwordHash, displayName, avatar, settings, isAdmin, isBanned, isProfilePublic, createdAt, updatedAt
      FROM User
      WHERE LOWER(email) = LOWER(?)
    `;
    return await this.database.queryOne(sql, [normalizedEmail]) as User | null;
  }

  async findById(id: string): Promise<User | null> {
    const sql = `
      SELECT id, email, passwordHash, displayName, avatar, settings, isAdmin, isBanned, isProfilePublic, createdAt, updatedAt
      FROM User
      WHERE id = ?
    `;
    return await this.database.queryOne(sql, [id]) as User | null;
  }

  async list(query: UserListQuery): Promise<UserListResponse> {
    const page = query.page || 1;
    const pageSize = query.pageSize || 10;
    const offset = (page - 1) * pageSize;

    let whereClause = '';
    const params: any[] = [];

    if (query.email) {
      whereClause = 'WHERE email LIKE ?';
      params.push(`%${query.email}%`);
    }

    // Get total count
    const countSql = `SELECT COUNT(*) as count FROM User ${whereClause}`;
    const countResult = await this.database.queryOne(countSql, params);
    const total = countResult?.count || 0;

    // Get users
    const sql = `
      SELECT id, email, passwordHash, displayName, avatar, settings, isAdmin, isBanned, isProfilePublic, createdAt, updatedAt
      FROM User
      ${whereClause}
      ORDER BY createdAt DESC
      LIMIT ? OFFSET ?
    `;
    const items = await this.database.queryAll(sql, [...params, pageSize, offset]) as User[];

    return {
      items,
      total,
      page,
      pageSize,
      hasMore: offset + items.length < total
    };
  }

  async toggleBan(id: string, isBanned: boolean): Promise<User> {
    const user = await this.findById(id);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const now = new Date().toISOString();
    const sql = `UPDATE User SET isBanned = ?, updatedAt = ? WHERE id = ?`;
    await this.database.run(sql, [isBanned ? 1 : 0, now, id]);

    return (await this.findById(id)) as User;
  }

  async delete(id: string): Promise<void> {
    const user = await this.findById(id);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const sql = `DELETE FROM User WHERE id = ?`;
    await this.database.run(sql, [id]);
  }

  async create(data: {
    email: string;
    password: string;
    displayName?: string;
  }): Promise<User> {
    const normalizedEmail = data.email.trim().toLowerCase();

    // 检查邮箱是否已存在
    const existingUser = await this.findByEmail(normalizedEmail);
    if (existingUser) {
      throw new ConflictException('Email already exists');
    }

    // 检查是否是第一个用户（系统中没有其他用户）
    const userCount = await this.database.queryOne('SELECT COUNT(*) as count FROM User');
    const isFirstUser = !userCount || userCount.count === 0;

    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(data.password, saltRounds);
    const id = this.generateId();
    const now = new Date().toISOString();

    const sql = `
      INSERT INTO User (id, email, passwordHash, displayName, isAdmin, isBanned, createdAt, updatedAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `;

    await this.database.run(sql, [
      id,
      normalizedEmail,
      passwordHash,
      data.displayName || null,
      isFirstUser ? 1 : 0,
      0,
      now,
      now,
    ]);

    return {
      id,
      email: normalizedEmail,
      passwordHash,
      displayName: data.displayName,
      isAdmin: isFirstUser,
      isBanned: false,
      isProfilePublic: false,
      createdAt: now,
      updatedAt: now,
    };
  }

  async validatePassword(userId: string, password: string): Promise<boolean> {
    const user = await this.findById(userId);
    if (!user) return false;

    return bcrypt.compare(password, user.passwordHash);
  }

  async update(id: string, data: { displayName?: string; avatar?: string; isProfilePublic?: boolean }): Promise<User> {
    const user = await this.findById(id);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const updates: string[] = [];
    const params: any[] = [];

    if (data.displayName !== undefined) {
      updates.push('displayName = ?');
      params.push(data.displayName);
    }

    if (data.avatar !== undefined) {
      updates.push('avatar = ?');
      params.push(data.avatar);
    }

    if (data.isProfilePublic !== undefined) {
      updates.push('isProfilePublic = ?');
      params.push(data.isProfilePublic ? 1 : 0);
    }

    if (updates.length === 0) {
      return user;
    }

    const now = new Date().toISOString();
    updates.push('updatedAt = ?');
    params.push(now);
    params.push(id);

    const sql = `UPDATE User SET ${updates.join(', ')} WHERE id = ?`;
    await this.database.run(sql, params);

    return (await this.findById(id)) as User;
  }

  async updatePassword(id: string, newPassword: string): Promise<User> {
    const user = await this.findById(id);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(newPassword, saltRounds);
    const now = new Date().toISOString();

    const sql = `UPDATE User SET passwordHash = ?, updatedAt = ? WHERE id = ?`;
    await this.database.run(sql, [passwordHash, now, id]);

    return (await this.findById(id)) as User;
  }

  async checkIsAdmin(userId: string): Promise<boolean> {
    const user = await this.findById(userId);
    return user?.isAdmin || false;
  }

  private generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }
}
