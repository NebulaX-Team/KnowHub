import { Module } from '@nestjs/common';
import { SearchController } from './search.controller';
import { SearchService } from './search.service';
import { CollabModule } from '@/modules/collab/collab.module';

@Module({
  imports: [CollabModule],
  controllers: [SearchController],
  providers: [SearchService],
})
export class SearchModule {}
