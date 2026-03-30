import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  IsArray,
  IsDateString,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';
import { GdeltSortOrder } from '../../types';

const SORT_OPTIONS: GdeltSortOrder[] = [
  'DateDesc',
  'DateAsc',
  'ToneDesc',
  'ToneAsc',
  'HybridRel',
];

/**
 * UserNewsQueryDto
 *
 * Query parameters for GET /news/search.
 * All filters are optional except `keyword`.
 */
export class UserNewsQueryDto {
  // ─── Core search ────────────────────────────────────────────────────────────

  @ApiProperty({
    description: 'Keywords to search for in article titles and content.',
    example: 'stock market india sensex',
  })
  @IsString()
  @IsNotEmpty()
  keyword: string;

  // ─── Filters ─────────────────────────────────────────────────────────────────

  @ApiPropertyOptional({
    description:
      'FIPS 2-letter country codes to filter by source country. Comma-separated or array.',
    example: ['IN', 'US'],
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @Transform(({ value }) =>
    typeof value === 'string' ? value.split(',').map((v) => v.trim()) : value,
  )
  countries?: string[];

  @ApiPropertyOptional({
    description:
      'Source domains to restrict results to. Comma-separated or array.',
    example: ['reuters.com', 'economictimes.indiatimes.com'],
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @Transform(({ value }) =>
    typeof value === 'string' ? value.split(',').map((v) => v.trim()) : value,
  )
  domains?: string[];

  @ApiPropertyOptional({
    description: 'Languages to filter by. Comma-separated or array.',
    example: ['English', 'Hindi'],
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @Transform(({ value }) =>
    typeof value === 'string' ? value.split(',').map((v) => v.trim()) : value,
  )
  languages?: string[];

  @ApiPropertyOptional({
    description: 'GKG theme to filter by.',
    example: 'ECON_STOCKMARKET',
    enum: [
      'ECON_STOCKMARKET',
      'ECON_TRADE',
      'ECON_CURRENCY',
      'ECON_INFLATION',
      'ECON_BANKRUPTCY',
      'ECONOMY_HISTORIC',
    ],
  })
  @IsOptional()
  @IsString()
  theme?: string;

  // ─── Date range ───────────────────────────────────────────────────────────────

  @ApiPropertyOptional({
    description:
      'Start of date range (ISO 8601). GDELT has a rolling 3-month window.',
    example: '2026-03-25',
  })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({
    description: 'End of date range (ISO 8601).',
    example: '2026-03-30',
  })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  // ─── Sorting ──────────────────────────────────────────────────────────────────

  @ApiPropertyOptional({
    description: 'Sort order for results.',
    enum: SORT_OPTIONS,
    default: 'DateDesc',
  })
  @IsOptional()
  @IsIn(SORT_OPTIONS)
  sort?: GdeltSortOrder = 'DateDesc';

  // ─── Pagination ───────────────────────────────────────────────────────────────

  @ApiPropertyOptional({
    description: 'Page number (1-indexed).',
    example: 1,
    default: 1,
    minimum: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({
    description: 'Number of articles per page (1–50).',
    example: 25,
    default: 25,
    minimum: 1,
    maximum: 50,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  limit?: number = 25;
}
