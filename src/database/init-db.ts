import { DatabaseService } from './database.service';

/**
 * 数据库初始化脚本
 * 
 * 保留此独立脚本的意义：
 * 
 * 1. 手动初始化：可以在不启动整个 NestJS 应用的情况下初始化数据库
 *    - 首次安装/部署时单独执行
 *    - CI/CD 流程中使用
 *    - 数据库重置或问题排查
 * 
 * 2. 与 database.module.ts 的区别：
 *    - module.ts：应用运行时自动初始化（集成在框架生命周期中）
 *    - init-db.ts：手动独立运行（用于初始化任务）
 * 
 * 使用方式：
 *   # 独立初始化（推荐用于首次设置）
 *   npx ts-node src/database/init-db.ts
 * 
 *   # 或通过 package.json 脚本
 *   pnpm db:init
 * 
 *   # 正常启动应用（会自动通过 module 初始化）
 *   pnpm dev
 * 
 * 注意：功能上与 database.module.ts 保持一致，避免重复逻辑
 */
async function initializeDatabase() {
  console.log('🚀 Starting database initialization...');
  
  try {
    // 创建数据库服务实例
    const databaseService = new DatabaseService();
    
    // 1. 初始化表结构
    console.log('\n📋 Initializing tables...');
    await databaseService.initTables();

    // 2. 确保默认配置
    console.log('\n⚙️ Ensuring default configuration...');
    await databaseService.ensureDefaultConfig();

    // 3. 检查完整性
    console.log('\n🔍 Checking database integrity...');
    const isIntegrityOk = await databaseService.checkIntegrity();
    if (!isIntegrityOk) {
      console.warn('⚠️ Database integrity check reported issues');
    }
    
    // 清理
    await databaseService.onModuleDestroy();
    
    console.log('\n🎉 Database initialization completed successfully!');
    console.log('   You can now start the server with: pnpm dev');
    
  } catch (error) {
    console.error('\n❌ Database initialization failed:', error);
    process.exit(1);
  }
}

// 如果直接运行此文件
if (require.main === module) {
  initializeDatabase();
}

export { initializeDatabase };
