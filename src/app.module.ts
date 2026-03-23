import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { HealthModule } from './modules/health/health.module';
import { DatabaseModule } from './database/database.module';
import { AuthModule } from './modules/auth/auth.module';
import { UserModule } from './modules/user/user.module';
import { LibraryModule } from './modules/library/library.module';
import { PageModule } from './modules/page/page.module';
import { TagModule } from './modules/tag/tag.module';
import { SearchModule } from './modules/search/search.module';
import { PublicModule } from './modules/public/public.module';
import { UploadModule } from './modules/upload/upload.module';
import { SystemModule } from './modules/system/system.module';
import { TemplateModule } from './modules/template/template.module';
import { CollabModule } from './modules/collab/collab.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true, // 使配置在所有模块中可用
      envFilePath: ['.env', '../../.env', '../../../.env'], // 尝试多个路径
    }),
    DatabaseModule,
    HealthModule,
    UserModule,
    AuthModule,
    LibraryModule,
    PageModule,
    TagModule,
    SearchModule,
    PublicModule,
    UploadModule,
    SystemModule,
    TemplateModule,
    CollabModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
