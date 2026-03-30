import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * NewsArticleResponseDto
 *
 * Represents a single news article in the API response.
 */
export class NewsArticleResponseDto {
  @ApiProperty({ description: 'Full article URL.', example: 'https://reuters.com/...' })
  url: string;

  @ApiPropertyOptional({ description: 'Mobile article URL (may be empty).', example: '' })
  urlMobile: string;

  @ApiProperty({ description: 'Article headline.', example: 'Sensex jumps 700 points' })
  title: string;

  @ApiProperty({
    description: 'ISO timestamp when GDELT indexed this article.',
    example: '2026-03-27T07:00:00Z',
  })
  seenDate: string;

  @ApiPropertyOptional({
    description: 'Social / og:image URL.',
    example: 'https://...',
  })
  socialImage: string;

  @ApiProperty({ description: 'Source domain.', example: 'reuters.com' })
  domain: string;

  @ApiProperty({ description: 'Article language.', example: 'English' })
  language: string;

  @ApiProperty({
    description: 'FIPS 2-letter country code of source.',
    example: 'IN',
  })
  sourceCountry: string;
}

/**
 * PaginationMetaResponseDto
 *
 * Pagination metadata returned alongside paginated article lists.
 */
export class PaginationMetaResponseDto {
  @ApiProperty({ example: 1 })
  page: number;

  @ApiProperty({ example: 25 })
  limit: number;

  @ApiProperty({ example: 120 })
  total: number;

  @ApiProperty({ example: 5 })
  totalPages: number;

  @ApiProperty({ example: true })
  hasNextPage: boolean;

  @ApiProperty({ example: false })
  hasPrevPage: boolean;
}

/**
 * UserNewsResponseDto
 *
 * Top-level envelope for GET /news/search.
 */
export class UserNewsResponseDto {
  @ApiProperty({ type: [NewsArticleResponseDto] })
  articles: NewsArticleResponseDto[];

  @ApiProperty({ type: PaginationMetaResponseDto })
  pagination: PaginationMetaResponseDto;

  @ApiProperty({
    description: 'The resolved GDELT query URL (useful for debugging).',
    example: 'https://api.gdeltproject.org/api/v2/doc/doc?query=...',
  })
  gdeltQueryUrl: string;
}
