import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { UserNewsQueryDto } from '../../dto';
import { GdeltArticle, GdeltApiResponse, PaginationMeta } from '../../types';
import { GDELT_MAX_RECORDS, DEFAULT_PAGE_SIZE } from '../../constant';
import {
  buildGdeltUrl,
  isoToGdeltDateTime,
} from '../../utils/gdelt-query.util';
import {
  NewsArticleResponseDto,
  PaginationMetaResponseDto,
  UserNewsResponseDto,
} from '../../dto';

/**
 * UserNewsService
 *
 * Fetches global news from the GDELT DOC 2.0 API and returns
 * a paginated, filtered, and sorted result set.
 *
 * No Prisma — all data comes from the external GDELT API.
 */
@Injectable()
export class UserNewsService {
  private readonly logger = new Logger(UserNewsService.name);

  // ─── Search ─────────────────────────────────────────────────────────────────

  /**
   * Fetches news articles from GDELT matching the supplied filters,
   * then applies in-memory pagination and returns a structured response.
   *
   * @param dto - Validated query parameters from the controller
   * @returns Paginated article list with metadata and the resolved GDELT URL
   */
  async searchNews(dto: UserNewsQueryDto): Promise<UserNewsResponseDto> {
    console.log('\n\n[USER NEWS SERVICE] --- Incoming Search Request ---');
    console.log('[USER NEWS SERVICE] Params:', JSON.stringify(dto, null, 2));

    const page = dto.page ?? 1;
    const limit = dto.limit ?? DEFAULT_PAGE_SIZE;

    // ─── Build date filters ────────────────────────────────────────────────────
    let startDateTime: string | undefined;
    let endDateTime: string | undefined;

    try {
      if (dto.startDate) startDateTime = isoToGdeltDateTime(dto.startDate);
      if (dto.endDate) {
        // Push end to 23:59:59 of the supplied day when only a date is given
        const endDate = new Date(dto.endDate);
        endDate.setUTCHours(23, 59, 59);
        startDateTime;
        const padded = (n: number) => String(n).padStart(2, '0');
        endDateTime =
          String(endDate.getUTCFullYear()) +
          padded(endDate.getUTCMonth() + 1) +
          padded(endDate.getUTCDate()) +
          '235959';
      }
    } catch (err) {
      throw new BadRequestException((err as Error).message);
    }

    // ─── Build GDELT URL ───────────────────────────────────────────────────────
    // Fetch the maximum allowed records so we can paginate in-memory.
    let gdeltUrl: string;
    try {
      gdeltUrl = buildGdeltUrl({
        keyword: dto.keyword,
        countries: dto.countries,
        domains: dto.domains,
        languages: dto.languages,
        theme: dto.theme,
        startDateTime,
        endDateTime,
        maxRecords: GDELT_MAX_RECORDS,
        sort: dto.sort ?? 'DateDesc',
      });
    } catch (err) {
      throw new BadRequestException((err as Error).message);
    }

    this.logger.debug(`GDELT query → ${gdeltUrl}`);
    console.log('\n[USER NEWS SERVICE] Final GDELT URL:');
    console.log(gdeltUrl);
    console.log('--------------------------------------------------\n');

    // ─── Fetch from GDELT ──────────────────────────────────────────────────────
    const rawArticles = await this.fetchFromGdelt(gdeltUrl);

    // ─── Paginate ──────────────────────────────────────────────────────────────
    const total = rawArticles.length;
    const totalPages = Math.ceil(total / limit);
    const start = (page - 1) * limit;
    const sliced = rawArticles.slice(start, start + limit);

    const pagination: PaginationMeta = {
      page,
      limit,
      total,
      totalPages,
      hasNextPage: page < totalPages,
      hasPrevPage: page > 1,
    };

    return {
      articles: sliced.map(this.mapArticle),
      pagination: pagination as PaginationMetaResponseDto,
      gdeltQueryUrl: gdeltUrl,
    };
  }

  // ─── Private helpers ────────────────────────────────────────────────────────

  /**
   * Makes the HTTP request to GDELT and returns the raw article array.
   * Returns an empty array when GDELT returns no results.
   *
   * @param url - Fully-formed GDELT API URL
   * @returns Array of raw GDELT articles
   */
  private async fetchFromGdelt(url: string): Promise<GdeltArticle[]> {
    try {
      // ✅ Use Axios to bypass Node native fetch (undici) 10-second TCP timeout bug!
      const { default: axios } = await import('axios');
      const { Agent } = await import('https');
      
      const response = await axios.get<GdeltApiResponse>(url, {
        // Massive 5-minute timeout (300,000 ms) for extremely slow GDELT responses
        timeout: 300000,
        httpsAgent: new Agent({
          timeout: 300000, // Allow TCP socket itself to stay alive for 5 minutes during slow handshakes
          keepAlive: true,
        }),
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36',
          Accept: 'application/json',
        },
      });

      return response.data.articles ?? [];
    } catch (err: any) {
      if (err.code === 'ECONNABORTED' || err.message.includes('timeout')) {
        this.logger.error('GDELT query timed out (5 minutes)', err);
        console.log('[USER NEWS SERVICE] FETCH TIMEOUT ERROR:', err.message);
        throw new InternalServerErrorException(
          'The news search took too long to process. Try simplifying your search (fewer tags/filters).',
        );
      }

      this.logger.error('Network error reaching GDELT', err);
      console.log('[USER NEWS SERVICE] FETCH NETWORK ERROR:', err.message);
      
      if (err.response) {
        throw new InternalServerErrorException(
          `GDELT service error: HTTP ${err.response.status}`,
        );
      }

      throw new InternalServerErrorException(
        'Failed to reach the GDELT news service. Please try again.',
      );
    }
  }

  /**
   * Maps a raw GDELT article to the camelCase response DTO shape.
   *
   * @param article - Raw GDELT article object
   * @returns Formatted NewsArticleResponseDto
   */
  private mapArticle(article: GdeltArticle): NewsArticleResponseDto {
    return {
      url: article.url,
      urlMobile: article.url_mobile ?? '',
      title: article.title,
      seenDate: article.seendate,
      socialImage: article.socialimage ?? '',
      domain: article.domain,
      language: article.language,
      sourceCountry: article.sourcecountry,
    };
  }
}
