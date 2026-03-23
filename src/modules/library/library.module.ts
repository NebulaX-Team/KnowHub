import { Module } from '@nestjs/common';
import { LibraryService } from './library.service';
import { LibraryController } from './library.controller';
import { DatabaseModule } from '@/database/database.module';
import { CollabModule } from '@/modules/collab/collab.module';

@Module({
  imports: [DatabaseModule, CollabModule],
  controllers: [LibraryController],
  providers: [LibraryService],
  exports: [LibraryService],
})
export class LibraryModule {}
