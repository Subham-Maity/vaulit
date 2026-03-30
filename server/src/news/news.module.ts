import { Module } from '@nestjs/common';
import { NewsController } from '././controller';
import { UserNewsService } from '././service';

/**
 * NewsModule
 *
 * Provides global news search powered by GDELT DOC 2.0.
 * No database dependency — all data is fetched from the external GDELT API.
 * Uses Node's native `fetch` (available in Node 18+).
 */
@Module({
  controllers: [NewsController],
  providers: [UserNewsService],
  exports: [UserNewsService],
})
export class NewsModule {}
