import {
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Logger,
  Query,
} from '@nestjs/common';
import { ApiOperation, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import { UserNewsService } from '../service';
import { UserNewsQueryDto, UserNewsResponseDto } from '../dto';

/**
 * NewsController
 *
 * Exposes global news search powered by the GDELT DOC 2.0 API.
 * Supports filtering by keyword, country, domain, language, theme, and date range
 * with full pagination and sort control.
 */
@ApiTags('News')
@Controller('news')
export class NewsController {
  private readonly logger = new Logger(NewsController.name);

  constructor(private readonly userNewsService: UserNewsService) {}

  // ─── Search ─────────────────────────────────────────────────────────────────

  @Get('search')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Search global news via GDELT',
    description: `
Fetches articles from the GDELT DOC 2.0 API (100+ languages, 200+ countries).
Supports filtering by keyword, country (FIPS code), domain, language, GKG theme,
and a date range. Results are paginated in-memory from up to 250 GDELT records.

**Note:** GDELT's rolling search window covers the last ~3 months.
    `.trim(),
  })
  @ApiQuery({
    name: 'keyword',
    required: true,
    example: 'stock market india sensex',
  })
  @ApiQuery({
    name: 'countries',
    required: false,
    example: 'IN,US',
    description: 'Comma-separated FIPS country codes',
  })
  @ApiQuery({
    name: 'domains',
    required: false,
    example: 'reuters.com,livemint.com',
    description: 'Comma-separated source domains',
  })
  @ApiQuery({
    name: 'languages',
    required: false,
    example: 'English,Hindi',
    description: 'Comma-separated language names',
  })
  @ApiQuery({
    name: 'theme',
    required: false,
    example: 'ECON_STOCKMARKET',
    description: 'GKG theme filter',
  })
  @ApiQuery({
    name: 'startDate',
    required: false,
    example: '2026-03-25',
    description: 'ISO 8601 start date (GDELT 3-month window applies)',
  })
  @ApiQuery({
    name: 'endDate',
    required: false,
    example: '2026-03-30',
    description: 'ISO 8601 end date',
  })
  @ApiQuery({
    name: 'sort',
    required: false,
    enum: ['DateDesc', 'DateAsc', 'ToneDesc', 'ToneAsc', 'HybridRel'],
    description: 'Sort order',
  })
  @ApiQuery({
    name: 'page',
    required: false,
    example: 1,
    description: 'Page number (1-indexed)',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    example: 25,
    description: 'Articles per page (max 50)',
  })
  @ApiResponse({
    status: 200,
    description: 'Paginated list of matched news articles.',
    type: UserNewsResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Invalid query parameters.' })
  @ApiResponse({ status: 500, description: 'GDELT service unreachable.' })
  async searchNews(
    @Query() dto: UserNewsQueryDto,
  ): Promise<UserNewsResponseDto> {
    this.logger.log(`News search → ${JSON.stringify(dto)}`);
    return this.userNewsService.searchNews(dto);
  }
}
