import { Module } from '@nestjs/common';
import { DatabaseModule } from '@/database/database.module';
import { PageController } from './page.controller';
import { PageService } from './page.service';
import { CollabModule } from '@/modules/collab/collab.module';

@Module({
  imports: [DatabaseModule, CollabModule],
  controllers: [PageController],
  providers: [PageService],
  exports: [PageService],
})
export class PageModule {}
