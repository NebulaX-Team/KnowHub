import { Injectable, OnModuleDestroy } from '@nestjs/common';
import * as Database from 'better-sqlite3';
import * as path from 'path';
import * as fs from 'fs';
import { fileURLToPath } from 'url';

type PgSslConfig = {
  rejectUnauthorized?: boolean;
};

type PgPoolConfig = {
  connectionString?: string;
  host?: string;
  port?: number;
  user?: string;
  password?: string;
  database?: string;
  ssl?: PgSslConfig;
};

type PgQueryResult = {
  rows: any[];
  rowCount: number | null;
};

type PgClientLike = {
  query: (text: string, values?: any[]) => Promise<PgQueryResult>;
  release?: () => void;
};

type PgPoolLike = PgClientLike & {
  connect: () => Promise<PgClientLike>;
  end: () => Promise<void>;
};

export type SupportedDatabaseType = 'sqlite' | 'postgres';

export interface DatabaseRunResult {
  changes: number;
  lastInsertRowid?: number | string | bigint;
}

@Injectable()
export class DatabaseService implements OnModuleDestroy {
  private sqliteDb: Database.Database | null = null;
  private pgPool: PgPoolLike | null = null;
  private pgTxClient: PgClientLike | null = null;
  private readonly dbType: SupportedDatabaseType;
  private dbPath: string | null = null;

  private readonly pgFieldNameMap: Record<string, string> = {
    passwordhash: 'passwordHash',
    displayname: 'displayName',
    isadmin: 'isAdmin',
    isbanned: 'isBanned',
    isprofilepublic: 'isProfilePublic',
    coverimage: 'coverImage',
    ispublic: 'isPublic',
    publicslug: 'publicSlug',
    sortorder: 'sortOrder',
    lastviewedat: 'lastViewedAt',
    userid: 'userId',
    libraryid: 'libraryId',
    parentid: 'parentId',
    pageid: 'pageId',
    tagid: 'tagId',
    sourceid: 'sourceId',
    targetid: 'targetId',
    duedate: 'dueDate',
    iscompleted: 'isCompleted',
    completedat: 'completedAt',
    isbuiltin: 'isBuiltIn',
    originalname: 'originalName',
    mimetype: 'mimeType',
    updatedat: 'updatedAt',
    createdat: 'createdAt',
    librarytitle: 'libraryTitle',
    parenttitle: 'parentTitle',
    parentcontent: 'parentContent',
    grandparentid: 'grandparentId',
    pagecount: 'pageCount',
    maxsort: 'maxSort',
    pagetitle: 'pageTitle',
    pagetype: 'pageType',
    appliedat: 'appliedAt',
  };

  private readonly pgNumericFields = new Set<string>([
    'count',
    'total',
    'pageCount',
    'maxSort',
    'sortOrder',
    'size',
    'isPublic',
    'isAdmin',
    'isBanned',
    'isProfilePublic',
    'isCompleted',
  ]);

  constructor() {
    this.dbType = this.resolveDatabaseType();

    if (this.dbType === 'postgres') {
      const poolConfig = this.resolvePgPoolConfig();
      // Keep PostgreSQL as an optional runtime dependency when DB_TYPE=sqlite.
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const { Pool } = require('pg') as { Pool: new (config?: PgPoolConfig) => PgPoolLike };
      this.pgPool = new Pool(poolConfig);

      const displayTarget = poolConfig.connectionString
        ? poolConfig.connectionString
        : `${poolConfig.host}:${poolConfig.port}/${poolConfig.database}`;
      console.log(`Using PostgreSQL at: ${displayTarget}`);
    } else {
      this.dbPath = this.resolveDatabasePath();
      const dbDir = path.dirname(this.dbPath);

      // 确保目录存在
      if (!fs.existsSync(dbDir)) {
        fs.mkdirSync(dbDir, { recursive: true });
      }

      console.log(`Using SQLite database at: ${this.dbPath}`);
      this.sqliteDb = new Database(this.dbPath);

      // 启用外键约束
      this.sqliteDb.pragma('foreign_keys = ON');

      // 启用 WAL 模式以提高并发性能
      this.sqliteDb.pragma('journal_mode = WAL');
    }
  }

  getDatabaseType(): SupportedDatabaseType {
    return this.dbType;
  }

  isPostgres(): boolean {
    return this.dbType === 'postgres';
  }

  /**
   * 解析数据库类型。
   * 优先级：DB_TYPE > DATABASE_URL 自动推断 > sqlite
   */
  private resolveDatabaseType(): SupportedDatabaseType {
    const dbType = (process.env.DB_TYPE || '').trim().toLowerCase();

    if (['postgres', 'postgresql', 'pg', 'pgsql'].includes(dbType)) {
      return 'postgres';
    }

    if (['sqlite', 'sqlite3'].includes(dbType)) {
      return 'sqlite';
    }

    const databaseUrl = process.env.DATABASE_URL || '';
    if (databaseUrl.startsWith('postgres://') || databaseUrl.startsWith('postgresql://')) {
      return 'postgres';
    }

    return 'sqlite';
  }

  private resolvePgPoolConfig(): PgPoolConfig {
    const connectionString = process.env.DATABASE_URL;
    if (connectionString) {
      return {
        connectionString,
        ssl: this.resolvePgSslConfig(),
      };
    }

    const port = Number(process.env.PGPORT || 5432);
    return {
      host: process.env.PGHOST || '127.0.0.1',
      port: Number.isFinite(port) ? port : 5432,
      user: process.env.PGUSER || 'postgres',
      password: process.env.PGPASSWORD || '',
      database: process.env.PGDATABASE || 'knowhub',
      ssl: this.resolvePgSslConfig(),
    };
  }

  private resolvePgSslConfig(): PgPoolConfig['ssl'] {
    const pgSsl = (process.env.PGSSL || '').trim().toLowerCase();
    if (pgSsl === 'true' || pgSsl === '1') {
      const rejectUnauthorized = (process.env.PGSSL_REJECT_UNAUTHORIZED || 'false').trim().toLowerCase();
      return { rejectUnauthorized: rejectUnauthorized === 'true' || rejectUnauthorized === '1' };
    }

    return undefined;
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
    if (this.sqliteDb) {
      this.sqliteDb.close();
      console.log('✅ SQLite connection closed');
    }

    if (this.pgPool) {
      await this.pgPool.end();
      console.log('✅ PostgreSQL pool closed');
    }
  }

  /**
   * 获取底层 SQLite 实例（仅 sqlite 模式可用）
   */
  getDb(): Database.Database | null {
    return this.sqliteDb;
  }

  /**
   * 初始化数据库表结构
   */
  async initTables(): Promise<void> {
    // 创建用户表
    await this.exec(`
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
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Library table removed - merged into Page

    // 创建页面表
    await this.exec(`
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
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        lastViewedAt TIMESTAMP,
        userId TEXT NOT NULL,
        libraryId TEXT,
        parentId TEXT,
        FOREIGN KEY (userId) REFERENCES User(id) ON DELETE CASCADE,
        FOREIGN KEY (libraryId) REFERENCES Page(id) ON DELETE CASCADE,
        FOREIGN KEY (parentId) REFERENCES Page(id) ON DELETE SET NULL
      )
    `);

    // 创建页面版本表
    await this.exec(`
      CREATE TABLE IF NOT EXISTS PageVersion (
        id TEXT PRIMARY KEY,
        content TEXT NOT NULL,
        message TEXT,
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        pageId TEXT NOT NULL,
        FOREIGN KEY (pageId) REFERENCES Page(id) ON DELETE CASCADE
      )
    `);

    // 创建页面引用关系表
    await this.exec(`
      CREATE TABLE IF NOT EXISTS PageReference (
        id TEXT PRIMARY KEY,
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        sourceId TEXT NOT NULL,
        targetId TEXT NOT NULL,
        FOREIGN KEY (sourceId) REFERENCES Page(id) ON DELETE CASCADE,
        FOREIGN KEY (targetId) REFERENCES Page(id) ON DELETE CASCADE,
        UNIQUE(sourceId, targetId)
      )
    `);

    // 创建标签表
    await this.exec(`
      CREATE TABLE IF NOT EXISTS Tag (
        id TEXT PRIMARY KEY,
        name TEXT UNIQUE NOT NULL,
        color TEXT,
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // 创建页面-标签关联表
    await this.exec(`
      CREATE TABLE IF NOT EXISTS PageTag (
        pageId TEXT NOT NULL,
        tagId TEXT NOT NULL,
        FOREIGN KEY (pageId) REFERENCES Page(id) ON DELETE CASCADE,
        FOREIGN KEY (tagId) REFERENCES Tag(id) ON DELETE CASCADE,
        PRIMARY KEY (pageId, tagId)
      )
    `);

    // 创建任务表
    await this.exec(`
      CREATE TABLE IF NOT EXISTS Task (
        id TEXT PRIMARY KEY,
        content TEXT NOT NULL,
        isCompleted INTEGER DEFAULT 0,
        dueDate TIMESTAMP,
        sortOrder INTEGER DEFAULT 0,
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        completedAt TIMESTAMP,
        pageId TEXT NOT NULL,
        FOREIGN KEY (pageId) REFERENCES Page(id) ON DELETE CASCADE
      )
    `);

    // 创建模板表
    await this.exec(`
      CREATE TABLE IF NOT EXISTS Template (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        description TEXT,
        content TEXT NOT NULL,
        category TEXT,
        isBuiltIn INTEGER DEFAULT 0,
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        userId TEXT,
        FOREIGN KEY (userId) REFERENCES User(id) ON DELETE SET NULL
      )
    `);

    // 创建系统配置表
    await this.exec(`
      CREATE TABLE IF NOT EXISTS SystemConfig (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL,
        updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // 创建上传图片记录表
    await this.exec(`
      CREATE TABLE IF NOT EXISTS UploadedImage (
        id TEXT PRIMARY KEY,
        filename TEXT NOT NULL,
        originalName TEXT NOT NULL,
        mimeType TEXT NOT NULL,
        size INTEGER NOT NULL,
        url TEXT NOT NULL,
        pageId TEXT,
        libraryId TEXT,
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        userId TEXT NOT NULL,
        FOREIGN KEY (userId) REFERENCES User(id) ON DELETE CASCADE,
        FOREIGN KEY (pageId) REFERENCES Page(id) ON DELETE SET NULL,
        FOREIGN KEY (libraryId) REFERENCES Page(id) ON DELETE SET NULL
      )
    `);

    // 创建索引以提高查询性能
    await this.exec(`
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
    await this.exec(`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_user_email ON User(email);
      CREATE UNIQUE INDEX IF NOT EXISTS idx_page_publicSlug ON Page(publicSlug);
      CREATE UNIQUE INDEX IF NOT EXISTS idx_tag_name ON Tag(name);
    `);
  }

  /**
   * 执行查询并返回所有结果
   */
  async query(sql: string, params: any[] = []): Promise<any[]> {
    if (this.dbType === 'postgres') {
      const result = await this.executePg(sql, params);
      return result.rows.map(row => this.normalizePgRow(row));
    }

    const stmt = this.sqliteDb!.prepare(sql);
    return params.length > 0 ? stmt.all(...params) : stmt.all();
  }

  /**
   * 执行查询并返回所有结果 (别名，与 query 等价)
   */
  async queryAll(sql: string, params: any[] = []): Promise<any[]> {
    return this.query(sql, params);
  }

  /**
   * 执行查询并返回单个结果
   */
  async queryOne(sql: string, params: any[] = []): Promise<any> {
    if (this.dbType === 'postgres') {
      const result = await this.executePg(sql, params);
      const row = result.rows[0];
      return row ? this.normalizePgRow(row) : null;
    }

    const stmt = this.sqliteDb!.prepare(sql);
    return params.length > 0 ? stmt.get(...params) : stmt.get();
  }

  /**
   * 执行插入/更新/删除操作
   */
  async run(sql: string, params: any[] = []): Promise<DatabaseRunResult> {
    if (this.dbType === 'postgres') {
      const result = await this.executePg(sql, params);
      return {
        changes: result.rowCount ?? 0,
      };
    }

    const stmt = this.sqliteDb!.prepare(sql);
    const runResult = params.length > 0 ? stmt.run(...params) : stmt.run();

    return {
      changes: runResult.changes,
      lastInsertRowid: runResult.lastInsertRowid,
    };
  }

  /**
   * 开始事务
   */
  async transaction<T>(callback: () => Promise<T> | T): Promise<T> {
    if (this.dbType === 'postgres') {
      const client = await this.pgPool!.connect();
      const previousClient = this.pgTxClient;
      this.pgTxClient = client;

      try {
        await client.query('BEGIN');
        const result = await callback();
        await client.query('COMMIT');
        return result;
      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      } finally {
        this.pgTxClient = previousClient;
        client.release();
      }
    }

    this.sqliteDb!.exec('BEGIN');
    try {
      const result = await callback();
      this.sqliteDb!.exec('COMMIT');
      return result;
    } catch (error) {
      this.sqliteDb!.exec('ROLLBACK');
      throw error;
    }
  }

  /**
   * 检查表是否存在
   */
  async tableExists(tableName: string): Promise<boolean> {
    if (this.dbType === 'postgres') {
      const result = await this.queryOne(
        `SELECT EXISTS (
           SELECT 1
           FROM information_schema.tables
           WHERE table_schema = current_schema() AND table_name = ?
         ) as exists`,
        [tableName]
      );
      return !!result?.exists;
    }

    const result = this.sqliteDb!.prepare(
      "SELECT name FROM sqlite_master WHERE type='table' AND name=?"
    ).get(tableName);
    return !!result;
  }

  /**
   * 检查迁移是否已应用
   */
  async isMigrationApplied(migrationName: string): Promise<boolean> {
    const row = await this.queryOne('SELECT id FROM _migrations WHERE name = ?', [migrationName]);
    return !!row;
  }

  /**
   * 记录迁移已应用
   */
  async recordMigration(migrationName: string): Promise<void> {
    await this.run('INSERT INTO _migrations (name) VALUES (?)', [migrationName]);
  }

  /**
   * 获取表的列信息
   */
  async getTableColumns(tableName: string): Promise<Array<{ name: string; type: string; notnull: number; dflt_value: any; pk: number }>> {
    if (this.dbType === 'postgres') {
      const rows = await this.query(`
        SELECT
          c.column_name as name,
          c.data_type as type,
          CASE WHEN c.is_nullable = 'NO' THEN 1 ELSE 0 END as notnull,
          c.column_default as dflt_value,
          CASE WHEN tc.constraint_type = 'PRIMARY KEY' THEN 1 ELSE 0 END as pk
        FROM information_schema.columns c
        LEFT JOIN information_schema.key_column_usage kcu
          ON c.table_schema = kcu.table_schema
          AND c.table_name = kcu.table_name
          AND c.column_name = kcu.column_name
        LEFT JOIN information_schema.table_constraints tc
          ON kcu.constraint_name = tc.constraint_name
          AND kcu.table_schema = tc.table_schema
        WHERE c.table_schema = current_schema() AND c.table_name = ?
        ORDER BY c.ordinal_position
      `, [tableName]);

      return rows.map(row => ({
        name: this.pgFieldNameMap[String(row.name).toLowerCase()] || row.name,
        type: row.type,
        notnull: Number(row.notnull || 0),
        dflt_value: row.dflt_value,
        pk: Number(row.pk || 0),
      }));
    }

    return this.sqliteDb!.pragma(`table_info(${tableName})`) as any;
  }

  /**
   * 检查数据库完整性
   */
  async checkIntegrity(): Promise<boolean> {
    try {
      // 检查关键表是否存在
      const requiredTables = ['User', 'Page', 'PageVersion', 'Tag', 'Task'];

      for (const table of requiredTables) {
        const exists = await this.tableExists(table);
        if (!exists) {
          console.error(`Missing required table: ${table}`);
          return false;
        }
      }

      if (this.dbType === 'postgres') {
        // PostgreSQL 没有与 SQLite PRAGMA integrity_check 完全一致的接口
        // 这里以基础健康检查替代
        await this.queryOne('SELECT 1 as ok');
        console.log('✓ PostgreSQL integrity check passed');
        return true;
      }

      // SQLite 完整性检查
      const result = this.sqliteDb!.prepare('PRAGMA integrity_check').get() as any;
      if (result && result.integrity_check === 'ok') {
        console.log('✓ Database integrity check passed');
        return true;
      }

      console.error('✗ Database integrity check failed:', result);
      return false;
    } catch (error) {
      console.error('✗ Error during integrity check:', error);
      return false;
    }
  }

  /**
   * 确保默认系统配置存在
   */
  async ensureDefaultConfig(): Promise<void> {
    try {
      // 检查是否有默认配置
      const versionConfig = await this.queryOne('SELECT value FROM SystemConfig WHERE key = ?', ['version']);

      if (!versionConfig) {
        console.log('Creating default system config...');

        const now = new Date().toISOString();

        await this.run('INSERT INTO SystemConfig (key, value, updatedAt) VALUES (?, ?, ?)', ['version', '1.0.0', now]);
        await this.run('INSERT INTO SystemConfig (key, value, updatedAt) VALUES (?, ?, ?)', ['createdAt', now, now]);

        console.log('✓ Default system config created');
      }

      // 确保网站信息默认配置存在（支持中英文）
      const siteTitleConfig = await this.queryOne('SELECT value FROM SystemConfig WHERE key = ?', ['siteTitle']) as { value: string } | null;
      const siteDescriptionConfig = await this.queryOne('SELECT value FROM SystemConfig WHERE key = ?', ['siteDescription']) as { value: string } | null;

      if (!siteTitleConfig || !siteDescriptionConfig) {
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
          await this.run('INSERT INTO SystemConfig (key, value, updatedAt) VALUES (?, ?, ?)', ['siteTitle', defaultTitle, now]);
        }

        if (!siteDescriptionConfig) {
          await this.run('INSERT INTO SystemConfig (key, value, updatedAt) VALUES (?, ?, ?)', ['siteDescription', defaultDescription, now]);
        }

        console.log('✓ Default site info config created');
      }
    } catch (error) {
      console.error('✗ Failed to ensure default config:', error);
      // 不抛出错误，允许服务器启动即使配置创建失败
    }
  }

  private async exec(sql: string): Promise<void> {
    if (this.dbType === 'postgres') {
      await this.executePg(sql);
      return;
    }

    this.sqliteDb!.exec(sql);
  }

  private async executePg(sql: string, params: any[] = []) {
    if (!this.pgPool && !this.pgTxClient) {
      throw new Error('PostgreSQL client is not initialized');
    }

    const text = this.normalizeSqlForPg(sql);
    const client = this.pgTxClient ?? this.pgPool!;
    return client.query(text, params);
  }

  private normalizeSqlForPg(sql: string): string {
    const withQuotedTables = this.quotePgTableNames(sql);
    return this.replaceQuestionMarkPlaceholders(withQuotedTables);
  }

  private quotePgTableNames(sql: string): string {
    // 仅替换明确的数据表名，避免误伤普通标识符
    return sql.replace(
      /\b(User|PageVersion|PageReference|PageTag|Page|Tag|Task|Template|SystemConfig|UploadedImage|_migrations)\b/g,
      '"$1"'
    );
  }

  private replaceQuestionMarkPlaceholders(sql: string): string {
    let index = 0;
    let inSingleQuote = false;
    let inDoubleQuote = false;
    let result = '';

    for (let i = 0; i < sql.length; i++) {
      const current = sql[i];
      const next = sql[i + 1];

      if (current === "'" && !inDoubleQuote) {
        result += current;

        // 转义单引号: ''
        if (inSingleQuote && next === "'") {
          result += next;
          i++;
          continue;
        }

        inSingleQuote = !inSingleQuote;
        continue;
      }

      if (current === '"' && !inSingleQuote) {
        inDoubleQuote = !inDoubleQuote;
        result += current;
        continue;
      }

      if (current === '?' && !inSingleQuote && !inDoubleQuote) {
        index++;
        result += `$${index}`;
        continue;
      }

      result += current;
    }

    return result;
  }

  private normalizePgRow<T extends Record<string, any>>(row: T): T {
    const normalized: Record<string, any> = {};

    for (const [key, value] of Object.entries(row)) {
      const mappedKey = this.pgFieldNameMap[key.toLowerCase()] || key;
      let mappedValue = value;

      if (mappedValue instanceof Date) {
        mappedValue = mappedValue.toISOString();
      }

      if (
        typeof mappedValue === 'string' &&
        /^-?\d+$/.test(mappedValue) &&
        this.pgNumericFields.has(mappedKey)
      ) {
        mappedValue = Number(mappedValue);
      }

      normalized[mappedKey] = mappedValue;
    }

    return normalized as T;
  }
}
