import {
  Body,
  Controller,
  Headers,
  HttpCode,
  HttpStatus,
  Logger,
  Post,
  Res,
  UseGuards,
} from '@nestjs/common';
import { Response } from 'express';
import {
  ApiCookieAuth,
  ApiHeader,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { AdminAuthService } from '../service';
import {
  AdminLoginResponseDto,
  AdminSetupResponseDto,
} from '../dto/admin/admin-response.dto';
import { AdminLoginDto, AdminSetupDto } from '../dto';
import { SESSION_COOKIE_NAME } from '../constant';
import { GetAdmin } from '../decorator';
import { FirebaseAuthGuard } from '../guard';

/**
 * AuthController
 *
 * Three endpoints only:
 *
 * | Method | Path                  | Auth             | Purpose                        |
 * |--------|-----------------------|------------------|--------------------------------|
 * | POST   | /auth/admin/setup     | x-setup-key      | One-time admin account creation|
 * | POST   | /auth/admin/login     | Firebase ID token| Exchange token for session     |
 * | POST   | /auth/admin/logout    | Session cookie   | Revoke tokens, clear cookie    |
 */
@ApiTags('Auth')
@Controller('auth/admin')
export class AuthController {
  private readonly logger = new Logger(AuthController.name);

  constructor(private readonly adminAuthService: AdminAuthService) {}

  // ─── Setup ──────────────────────────────────────────────────────────────────

  @Post('setup')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'One-time admin account creation',
    description:
      'Creates the single admin user in Firebase Auth and the database. ' +
      'Requires the `x-setup-key` header. Throws 409 if an admin already exists.',
  })
  @ApiHeader({
    name: 'x-setup-key',
    description: 'Secret key from ADMIN_SETUP_SECRET_KEY env var',
    required: true,
  })
  @ApiResponse({ status: 201, type: AdminSetupResponseDto })
  @ApiResponse({ status: 403, description: 'Invalid or missing setup key' })
  @ApiResponse({ status: 409, description: 'Admin already exists' })
  async setup(
    @Headers('x-setup-key') setupKey: string,
    @Body() dto: AdminSetupDto,
  ): Promise<AdminSetupResponseDto> {
    return this.adminAuthService.setupAdmin(setupKey, dto);
  }

  // ─── Login ──────────────────────────────────────────────────────────────────

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Admin login – exchange Firebase ID token for session cookie',
    description:
      'The client signs in with email/password via the Firebase JS SDK, ' +
      'retrieves the ID token via `getIdToken()`, and sends it here. ' +
      'On success a `admin_session` httpOnly cookie is set.',
  })
  @ApiResponse({ status: 200, type: AdminLoginResponseDto })
  @ApiResponse({ status: 401, description: 'Authentication failed' })
  async login(
    @Body() dto: AdminLoginDto,
    @Res({ passthrough: true }) response: Response,
  ): Promise<AdminLoginResponseDto> {
    const { sessionCookie, response: body } =
      await this.adminAuthService.loginAdmin(dto);

    // Set an httpOnly, Secure, SameSite=Strict cookie.
    // The browser never exposes this to JavaScript – XSS cannot steal it.
    const maxAgeMs = Number(
      process.env.FIREBASE_SESSION_COOKIE_MAX_AGE ?? 432_000_000,
    );

    response.cookie(SESSION_COOKIE_NAME, sessionCookie, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: maxAgeMs,
      path: '/',
    });

    return body;
  }

  // ─── Logout ─────────────────────────────────────────────────────────────────

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @UseGuards(FirebaseAuthGuard)
  @ApiCookieAuth(SESSION_COOKIE_NAME)
  @ApiOperation({
    summary: 'Admin logout – revoke tokens and clear session cookie',
    description:
      'Revokes all Firebase refresh tokens for the admin (invalidates all ' +
      'sessions across devices), then clears the browser cookie.',
  })
  @ApiResponse({ status: 200, description: 'Logged out successfully' })
  @ApiResponse({ status: 401, description: 'No active session' })
  async logout(
    @GetAdmin('uid') uid: string,
    @Res({ passthrough: true }) response: Response,
  ): Promise<{ message: string }> {
    const result = await this.adminAuthService.logoutAdmin(uid);

    response.clearCookie(SESSION_COOKIE_NAME, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/',
    });

    return result;
  }
}
