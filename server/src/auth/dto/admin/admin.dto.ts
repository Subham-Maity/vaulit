import { ApiProperty } from '@nestjs/swagger';
import {
  IsEmail,
  IsNotEmpty,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { sanitizeString } from '../../utils/sanitize.util';

/**
 * AdminLoginDto
 *
 * Carries the Firebase ID token that the admin client obtained after calling
 * `signInWithEmailAndPassword` on the frontend.  The backend never receives
 * the raw password – Firebase handles credential verification client-side.
 */
export class AdminLoginDto {
  @ApiProperty({
    description: 'Admin email address',
    example: 'admin@portfolio.dev',
  })
  @IsEmail({}, { message: 'Provide a valid email address' })
  @IsNotEmpty()
  @MaxLength(254)
  @Transform(({ value }: { value: string }) =>
    sanitizeString(value).toLowerCase(),
  )
  email: string;

  /**
   * Short-lived Firebase ID token obtained client-side via
   * `firebase.auth().currentUser.getIdToken()`.
   * Max realistic length is ~2 KB; 4096 guards against oversized payloads.
   */
  @ApiProperty({
    description: 'Firebase ID token from client-side signInWithEmailAndPassword',
  })
  @IsString()
  @IsNotEmpty({ message: 'Firebase ID token is required' })
  @MaxLength(4096, { message: 'Token exceeds maximum allowed length' })
  idToken: string;
}

/**
 * AdminSetupDto
 *
 * One-time payload used by `POST /auth/admin/setup` to create the single admin
 * account.  The endpoint additionally requires the ADMIN_SETUP_SECRET_KEY
 * header so it cannot be called by anyone who stumbles upon the URL.
 */
export class AdminSetupDto {
  @ApiProperty({ example: 'admin@portfolio.dev' })
  @IsEmail({}, { message: 'Provide a valid email address' })
  @IsNotEmpty()
  @MaxLength(254)
  @Transform(({ value }: { value: string }) =>
    sanitizeString(value).toLowerCase(),
  )
  email: string;

  /**
   * Password is only used here to create the Firebase Auth account.
   * It is NEVER stored in the database.
   */
  @ApiProperty({ minLength: 12, description: 'Strong admin password (min 12 chars)' })
  @IsString()
  @IsNotEmpty()
  @MinLength(12, { message: 'Password must be at least 12 characters' })
  @MaxLength(128)
  password: string;
}
