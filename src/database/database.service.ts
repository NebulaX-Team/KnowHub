import { Injectable, OnModuleDestroy } from '@nestjs/common';
import * as Database from 'better-sqlite3';
import * as path from 'path';
import * as fs from 'fs';
import { fileURLToPath } from 'url';

@Injectable()
export class DatabaseService implements OnModuleDestroy {
  private db: Database.Database;
  private dbPath: string;

  constructor() {
    this.dbPath = this.resolveDatabasePath();
    const dbDir = path.dirname(this.dbPath);

    // 确保目录存在
    if (!fs.existsSync(dbDir)) {
      fs.mkdirSync(dbDir, { recursive: true });
    }

    console.log(`Using database at: ${this.dbPath}`);
    this.db = new Database(this.dbPath);
    
    // 启用外键约束
    this.db.pragma('foreign_keys = ON');
    
    // 启用 WAL 模式以提高并发性能
    this.db.pragma('journal_mode = WAL');
  }

  /**
   * 解析数据库路径。
   * 优先级：DB_PATH > 默认 dev.db
   */
  private resolveDatabasePath(): string {
    const dbPath = process.env.DB_PATH;

    console.log('DB_PATH env:', dbPath ?? '(not set)');

    let rawPath = dbPath;

    if (!rawPath) {
      return path.resolve(process.cwd(), 'dev.db');
    }

    rawPath = rawPath.trim();

    // 兼容 file:./dev.db 或 file:///abs/path/db.sqlite 写法
    if (rawPath.startsWith('file://')) {
      try {
        rawPath = fileURLToPath(rawPath);
      } catch {
        // 如果解析失败，继续按普通路径处理
      }
    } else if (rawPath.startsWith('file:')) {
      rawPath = rawPath.slice('file:'.length);
    }

    if (!rawPath) {
      return path.resolve(process.cwd(), 'dev.db');
    }

    return path.isAbsolute(rawPath)
      ? rawPath
      : path.resolve(process.cwd(), rawPath);
  }

  async onModuleDestroy() {
    if (this.db) {
      this.db.close();
      console.log('✅ Database connection closed');
    }
  }

  prepare(sql: string): Database.Statement {
    return this.db.prepare(sql);
  }

  /**
   * 初始化数据库表结构
   */
  initTables(): void {
    // 创建用户表
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS User (
        id TEXT PRIMARY KEY,
        email TEXT UNIQUE NOT NULL,
        passwordHash TEXT NOT NULL,
        displayName TEXT,
        avatar TEXT,
        settings TEXT DEFAULT '{}',
        isAdmin INTEGER DEFAULT 0,
        isBanned INTEGER DEFAULT 0,
        isProfilePublic INTEGER DEFAULT 0,
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Library table removed - merged into Page

    // 创建页面表
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS Page (
        id TEXT PRIMARY KEY,
        type TEXT NOT NULL DEFAULT 'page',
        title TEXT NOT NULL,
        content TEXT NOT NULL,
        description TEXT,
        icon TEXT,
        coverImage TEXT,
        isPublic INTEGER DEFAULT 0,
        publicSlug TEXT UNIQUE,
        sortOrder INTEGER DEFAULT 0,
        metadata TEXT DEFAULT '{}',
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        lastViewedAt DATETIME,
        userId TEXT NOT NULL,
        libraryId TEXT,
        parentId TEXT,
        FOREIGN KEY (userId) REFERENCES User(id) ON DELETE CASCADE,
        FOREIGN KEY (libraryId) REFERENCES Page(id) ON DELETE CASCADE,
        FOREIGN KEY (parentId) REFERENCES Page(id) ON DELETE SET NULL
      )
    `);

    // 创建页面版本表
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS PageVersion (
        id TEXT PRIMARY KEY,
        content TEXT NOT NULL,
        message TEXT,
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        pageId TEXT NOT NULL,
        FOREIGN KEY (pageId) REFERENCES Page(id) ON DELETE CASCADE
      )
    `);

    // 创建页面引用关系表
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS PageReference (
        id TEXT PRIMARY KEY,
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        sourceId TEXT NOT NULL,
        targetId TEXT NOT NULL,
        FOREIGN KEY (sourceId) REFERENCES Page(id) ON DELETE CASCADE,
        FOREIGN KEY (targetId) REFERENCES Page(id) ON DELETE CASCADE,
        UNIQUE(sourceId, targetId)
      )
    `);

    // 创建标签表
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS Tag (
        id TEXT PRIMARY KEY,
        name TEXT UNIQUE NOT NULL,
        color TEXT,
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // 创建页面-标签关联表
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS PageTag (
        pageId TEXT NOT NULL,
        tagId TEXT NOT NULL,
        FOREIGN KEY (pageId) REFERENCES Page(id) ON DELETE CASCADE,
        FOREIGN KEY (tagId) REFERENCES Tag(id) ON DELETE CASCADE,
        PRIMARY KEY (pageId, tagId)
      )
    `);

    // 创建任务表
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS Task (
        id TEXT PRIMARY KEY,
        content TEXT NOT NULL,
        isCompleted INTEGER DEFAULT 0,
        dueDate DATETIME,
        sortOrder INTEGER DEFAULT 0,
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        completedAt DATETIME,
        pageId TEXT NOT NULL,
        FOREIGN KEY (pageId) REFERENCES Page(id) ON DELETE CASCADE
      )
    `);

    // 创建模板表
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS Template (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        description TEXT,
        content TEXT NOT NULL,
        category TEXT,
        isBuiltIn INTEGER DEFAULT 0,
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        userId TEXT,
        FOREIGN KEY (userId) REFERENCES User(id) ON DELETE SET NULL
      )
    `);

    // 创建系统配置表
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS SystemConfig (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL,
        updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // 创建上传图片记录表
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS UploadedImage (
        id TEXT PRIMARY KEY,
        filename TEXT NOT NULL,
        originalName TEXT NOT NULL,
        mimeType TEXT NOT NULL,
        size INTEGER NOT NULL,
        url TEXT NOT NULL,
        pageId TEXT,
        libraryId TEXT,
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        userId TEXT NOT NULL,
        FOREIGN KEY (userId) REFERENCES User(id) ON DELETE CASCADE,
        FOREIGN KEY (pageId) REFERENCES Page(id) ON DELETE SET NULL,
        FOREIGN KEY (libraryId) REFERENCES Page(id) ON DELETE SET NULL
      )
    `);

    // 创建索引以提高查询性能
    this.db.exec(`
      CREATE INDEX IF NOT EXISTS idx_page_user ON Page(userId);
      CREATE INDEX IF NOT EXISTS idx_page_library ON Page(libraryId);
      CREATE INDEX IF NOT EXISTS idx_page_parent ON Page(parentId);
      CREATE INDEX IF NOT EXISTS idx_page_type ON Page(type);
      CREATE INDEX IF NOT EXISTS idx_page_public ON Page(isPublic);
      CREATE INDEX IF NOT EXISTS idx_page_last_viewed ON Page(lastViewedAt);
      CREATE INDEX IF NOT EXISTS idx_version_page ON PageVersion(pageId);
      CREATE INDEX IF NOT EXISTS idx_reference_source ON PageReference(sourceId);
      CREATE INDEX IF NOT EXISTS idx_reference_target ON PageReference(targetId);
      CREATE INDEX IF NOT EXISTS idx_task_page ON Task(pageId);
      CREATE INDEX IF NOT EXISTS idx_task_completed ON Task(isCompleted);
      CREATE INDEX IF NOT EXISTS idx_task_due ON Task(dueDate);
      CREATE INDEX IF NOT EXISTS idx_template_user ON Template(userId);
      CREATE INDEX IF NOT EXISTS idx_template_category ON Template(category);
      CREATE INDEX IF NOT EXISTS idx_uploaded_image_user ON UploadedImage(userId);
      CREATE INDEX IF NOT EXISTS idx_uploaded_image_page ON UploadedImage(pageId);
      CREATE INDEX IF NOT EXISTS idx_uploaded_image_library ON UploadedImage(libraryId);
    `);

    // 确保唯一约束存在（为已存在的数据表添加唯一索引）
    this.db.exec(`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_user_email ON User(email);
      CREATE UNIQUE INDEX IF NOT EXISTS idx_page_publicSlug ON Page(publicSlug);
      CREATE UNIQUE INDEX IF NOT EXISTS idx_tag_name ON Tag(name);
    `);
  }

  /**
   * 获取数据库实例
   */
  getDb(): Database.Database {
    return this.db;
  }

  /**
   * 执行查询并返回所有结果
   */
  query(sql: string, params?: any[]): any[] {
    const stmt = this.db.prepare(sql);
    return params ? stmt.all(...params) : stmt.all();
  }

  /**
   * 执行查询并返回所有结果 (别名，与 query 等价)
   */
  queryAll(sql: string, params?: any[]): any[] {
    return this.query(sql, params);
  }

  /**
   * 执行查询并返回单个结果
   */
  queryOne(sql: string, params?: any[]): any {
    const stmt = this.db.prepare(sql);
    return params ? stmt.get(...params) : stmt.get();
  }

  /**
   * 执行插入/更新/删除操作
   */
  run(sql: string, params?: any[]): Database.RunResult {
    const stmt = this.db.prepare(sql);
    return params ? stmt.run(...params) : stmt.run();
  }

  /**
   * 开始事务
   */
  transaction<T>(callback: (db: Database.Database) => T): T {
    const transaction = this.db.transaction(callback);
    return transaction(this.db);
  }

  /**
   * 检查表是否存在
   */
  tableExists(tableName: string): boolean {
    const result = this.db.prepare(
      "SELECT name FROM sqlite_master WHERE type='table' AND name=?"
    ).get(tableName);
    return !!result;
  }

  /**
   * 检查迁移是否已应用
   */
  isMigrationApplied(migrationName: string): boolean {
    const row = this.db.prepare('SELECT id FROM _migrations WHERE name = ?').get(migrationName);
    return !!row;
  }

  /**
   * 记录迁移已应用
   */
  recordMigration(migrationName: string): void {
    this.db.prepare('INSERT INTO _migrations (name) VALUES (?)').run(migrationName);
  }

  /**
   * 获取表的列信息
   */
  getTableColumns(tableName: string): Array<{ name: string; type: string; notnull: number; dflt_value: any; pk: number }> {
    return this.db.pragma(`table_info(${tableName})`) as any;
  }

  /**
   * 检查数据库完整性
   */
  checkIntegrity(): boolean {
    try {
      // 检查关键表是否存在
      const requiredTables = ['User', 'Page', 'PageVersion', 'Tag', 'Task'];
      
      for (const table of requiredTables) {
        if (!this.tableExists(table)) {
          console.error(`Missing required table: ${table}`);
          return false;
        }
      }
      
      // 运行完整性检查
      const result = this.db.prepare('PRAGMA integrity_check').get() as any;
      if (result && result.integrity_check === 'ok') {
        console.log('✓ Database integrity check passed');
        return true;
      } else {
        console.error('✗ Database integrity check failed:', result);
        return false;
      }
    } catch (error) {
      console.error('✗ Error during integrity check:', error);
      return false;
    }
  }

  /**
   * 确保默认系统配置存在
   */
  ensureDefaultConfig(): void {
    try {
      // 检查是否有默认配置
      const versionConfig = this.db.prepare('SELECT value FROM SystemConfig WHERE key = ?').get('version');
      
      if (!versionConfig) {
        console.log('Creating default system config...');
        
        const insertConfig = this.db.prepare(
          'INSERT INTO SystemConfig (key, value, updatedAt) VALUES (?, ?, ?)'
        );
        
        const now = new Date().toISOString();
        
        insertConfig.run('version', '1.0.0', now);
        insertConfig.run('createdAt', now, now);
        
        console.log('✓ Default system config created');
      }

      // 确保网站信息默认配置存在（支持中英文）
      const siteTitleConfig = this.db.prepare('SELECT value FROM SystemConfig WHERE key = ?').get('siteTitle') as { value: string } | undefined;
      const siteDescriptionConfig = this.db.prepare('SELECT value FROM SystemConfig WHERE key = ?').get('siteDescription') as { value: string } | undefined;
      if (!siteTitleConfig || !siteDescriptionConfig) {
        const insertConfig = this.db.prepare(
          'INSERT INTO SystemConfig (key, value, updatedAt) VALUES (?, ?, ?)'
        );
        const now = new Date().toISOString();
        const defaultTitle = JSON.stringify({
          'zh-CN': '知枢',
          'en-US': 'KnowHub',
        });
        const defaultDescription = JSON.stringify({
          'zh-CN': '面向个人的结构化知识管理系统',
          'en-US': 'Personal Knowledge Management System',
        });

        if (!siteTitleConfig) {
          insertConfig.run('siteTitle', defaultTitle, now);
        }

        if (!siteDescriptionConfig) {
          insertConfig.run('siteDescription', defaultDescription, now);
        }

        console.log('✓ Default site info config created');
      }
    } catch (error) {
      console.error('✗ Failed to ensure default config:', error);
      // 不抛出错误，允许服务器启动即使配置创建失败
    }
  }
}
