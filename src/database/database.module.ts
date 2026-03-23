import { Global, Module, OnModuleInit } from '@nestjs/common';
import { DatabaseService } from './database.service';

@Global()
@Module({
  providers: [DatabaseService],
  exports: [DatabaseService],
})
export class DatabaseModule implements OnModuleInit {
  constructor(private readonly databaseService: DatabaseService) {}

  async onModuleInit() {
    console.log('🔄 Initializing database module...');
    
    // 1. 初始化表结构
    try {
      await this.databaseService.initTables();
      console.log('✅ Database tables initialized');
    } catch (error) {
      console.error('❌ Table initialization failed:', error);
      throw error;
    }

    // 2. 确保默认配置存在
    try {
      await this.databaseService.ensureDefaultConfig();
    } catch (error) {
      console.error('❌ Default config creation failed:', error);
      // 不抛出错误，允许服务器继续启动
    }

    // 3. 检查数据库完整性
    try {
      const isIntegrityOk = await this.databaseService.checkIntegrity();
      if (!isIntegrityOk) {
        console.warn('⚠️ Database integrity check reported issues');
      }
    } catch (error) {
      console.error('❌ Integrity check failed:', error);
    }

    console.log('✅ Database module initialized');
  }
}
