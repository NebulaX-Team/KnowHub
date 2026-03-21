import { DatabaseService } from './database.service';

interface Migration {
  name: string;
  up: (dbService: DatabaseService) => void;
}

/**
 * 迁移定义
 * 添加新迁移到此数组的末尾
 */
const migrations: Migration[] = [
  {
    name: '001_add_user_is_profile_public',
    up: (dbService: DatabaseService) => {
      const columns = dbService.getTableColumns('User');
      if (!columns.some(col => col.name === 'isProfilePublic')) {
        dbService.run("ALTER TABLE User ADD COLUMN isProfilePublic INTEGER DEFAULT 0");
      }
    }
  },
];

/**
 * 运行所有待处理的迁移
 */
export function runMigrations(databaseService: DatabaseService) {
  console.log('Checking for pending migrations...');
  
  // 创建迁移表（如果不存在）
  databaseService.run(`
    CREATE TABLE IF NOT EXISTS _migrations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name VARCHAR(255) UNIQUE NOT NULL,
      applied_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  let appliedCount = 0;

  for (const migration of migrations) {
    // 检查迁移是否已应用
    if (!databaseService.isMigrationApplied(migration.name)) {
      console.log(`Applying migration: ${migration.name}`);
      try {
        // 在事务中运行迁移
        databaseService.transaction(() => {
          migration.up(databaseService);
          databaseService.recordMigration(migration.name);
        });
        
        console.log(`✓ Migration ${migration.name} applied successfully`);
        appliedCount++;
      } catch (error) {
        console.error(`✗ Failed to apply migration ${migration.name}:`, error);
        throw error; // 在错误时停止迁移过程
      }
    }
  }

  if (appliedCount > 0) {
    console.log(`Successfully applied ${appliedCount} migrations`);
  } else {
    console.log('Database structure is up to date');
  }
}

/**
 * 检查数据库完整性
 * @deprecated 使用 DatabaseService.checkIntegrity() 替代
 */
export function checkDatabaseIntegrity(databaseService: DatabaseService): boolean {
  return databaseService.checkIntegrity();
}

/**
 * 确保默认系统配置存在
 * @deprecated 使用 DatabaseService.ensureDefaultConfig() 替代
 */
export function ensureDefaultConfig(databaseService: DatabaseService): void {
  databaseService.ensureDefaultConfig();
}
