import {
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as admin from 'firebase-admin';
import { AdminLoginDto, AdminSetupDto } from 'src/auth/dto';
import {
  AdminLoginResponseDto,
  AdminSetupResponseDto,
} from 'src/auth/dto/admin/admin-response.dto';
import { AdminAuthRepository } from 'src/auth/repository';

/**
 * AdminAuthService
 *
 * Handles the two authentication flows:
 *
 * 1. **Setup** (`setupAdmin`): One-time endpoint that creates the single admin
 *    user in Firebase Auth and mirrors the record in the database.  Protected
 *    by a secret key stored in `ADMIN_SETUP_SECRET_KEY`.
 *
 * 2. **Login** (`loginAdmin`): Receives the Firebase ID token the client
 *    obtained via `signInWithEmailAndPassword`, verifies it server-side with
 *    the Admin SDK, checks the DB record, then exchanges the short-lived ID
 *    token for a long-lived Firebase session cookie.
 *
 * 3. **Logout** (`logoutAdmin`): Revokes all Firebase refresh tokens for the
 *    admin, invalidating the session cookie on all devices.
 *
 * Security principles applied:
 *  - Passwords are NEVER stored in the database; Firebase Auth owns them.
 *  - The raw ID token never leaves this layer; only the opaque session cookie
 *    is returned to the controller for `Set-Cookie`.
 *  - Generic error messages are used to prevent user-enumeration.
 */
@Injectable()
export class AdminAuthService {
  private readonly logger = new Logger(AdminAuthService.name);

  constructor(
    private readonly adminRepository: AdminAuthRepository,
    private readonly configService: ConfigService,
    @Inject('FIREBASE_ADMIN') private readonly firebaseApp: admin.app.App,
  ) {}

  // ─── Setup ──────────────────────────────────────────────────────────────────

  /**
   * Creates the one and only admin account.
   * Idempotency: throws `ConflictException` if an admin already exists so this
   * endpoint cannot be called twice even if someone has the setup key.
   *
   * @param setupKey  Value from the `x-setup-key` request header
   * @param dto       Email + password for the new Firebase Auth user
   */
  async setupAdmin(
    setupKey: string,
    dto: AdminSetupDto,
  ): Promise<AdminSetupResponseDto> {
    this.validateSetupKey(setupKey);

    // Enforce single-admin constraint at the DB level
    const exists = await this.adminRepository.adminExists();
    if (exists) {
      throw new ConflictException(
        'Admin account already exists. This endpoint is disabled.',
      );
    }

    // Create the Firebase Auth user first – if this fails nothing is persisted
    let firebaseUser: admin.auth.UserRecord;
    try {
      firebaseUser = await this.firebaseApp.auth().createUser({
        email: dto.email,
        password: dto.password,
        emailVerified: true, // Admin email is pre-verified; no verification email needed
        disabled: false,
      });
    } catch (error) {
      this.logger.error('Firebase user creation failed', error);
      throw new ConflictException(
        'Could not create admin account. Email may already be registered in Firebase.',
      );
    }

    // Persist a matching DB record (password is NOT stored)
    const dbUser = await this.adminRepository.createAdmin({
      firebaseUid: firebaseUser.uid,
      email: dto.email,
    });

    this.logger.log(`Admin account created: ${dbUser.id}`);

    return {
      message: 'Admin account created successfully',
      admin: { id: dbUser.id, email: dbUser.email },
    };
  }

  // ─── Login ──────────────────────────────────────────────────────────────────

  /**
   * Exchanges a Firebase ID token for a server-managed session cookie.
   *
   * Flow:
   *  1. Verify the ID token with the Admin SDK (validates signature, expiry,
   *     audience, and that it belongs to our Firebase project).
   *  2. Reject if the email in the token doesn't match the admin DB record.
   *  3. Ensure the account is active.
   *  4. Create a Firebase session cookie (long-lived, revocable server-side).
   *  5. Stamp lastLoginAt.
   *
   * @returns The session cookie string – the controller sets it as httpOnly.
   */
  async loginAdmin(dto: AdminLoginDto): Promise<{
    sessionCookie: string;
    response: AdminLoginResponseDto;
  }> {
    // Step 1: Verify Firebase ID token
    let decodedToken: admin.auth.DecodedIdToken;
    try {
      // `checkRevoked: true` ensures the token wasn't revoked by a prior logout
      decodedToken = await this.firebaseApp
        .auth()
        .verifyIdToken(dto.idToken, true);
    } catch (error) {
      this.logger.warn('Firebase ID token verification failed', {
        code: error?.code,
      });
      // Generic message to avoid leaking Firebase error codes
      throw new UnauthorizedException('Authentication failed');
    }

    // Step 2: Look up the DB record by Firebase UID – not by email to avoid
    // timing differences that could enable user enumeration
    const dbAdmin = await this.adminRepository.findAdminByFirebaseUid(
      decodedToken.uid,
    );

    if (!dbAdmin || !dbAdmin.isAdmin || !dbAdmin.isActive) {
      this.logger.warn(
        `Login attempt rejected for UID: ${decodedToken.uid} – not an active admin`,
      );
      throw new UnauthorizedException('Authentication failed');
    }

    // Step 3: Create Firebase session cookie
    const maxAge = this.configService.get<number>(
      'FIREBASE_SESSION_COOKIE_MAX_AGE',
      432_000_000, // 5 days default
    );

    let sessionCookie: string;
    try {
      sessionCookie = await this.firebaseApp
        .auth()
        .createSessionCookie(dto.idToken, { expiresIn: maxAge });
    } catch (error) {
      this.logger.error('Session cookie creation failed', error);
      throw new UnauthorizedException('Authentication failed');
    }

    // Step 4: Stamp last login (non-critical – failure is swallowed)
    void this.adminRepository.updateLastLogin(dbAdmin.id);

    this.logger.log(`Admin login successful: ${dbAdmin.id}`);

    return {
      sessionCookie,
      response: {
        message: 'Login successful',
        admin: { id: dbAdmin.id, email: dbAdmin.email },
      },
    };
  }

  // ─── Logout ─────────────────────────────────────────────────────────────────

  /**
   * Revokes all refresh tokens for the Firebase UID, instantly invalidating
   * every session cookie ever issued to this admin – across all devices.
   */
  async logoutAdmin(firebaseUid: string): Promise<{ message: string }> {
    try {
      await this.firebaseApp.auth().revokeRefreshTokens(firebaseUid);
    } catch (error) {
      this.logger.error('Token revocation failed', error);
      // Do not throw – the cookie will still be cleared client-side
    }
    this.logger.log(`Admin logged out, tokens revoked for UID: ${firebaseUid}`);
    return { message: 'Logged out successfully' };
  }

  // ─── Private helpers ────────────────────────────────────────────────────────

  private validateSetupKey(providedKey: string): void {
    const expectedKey = this.configService.get<string>(
      'ADMIN_SETUP_SECRET_KEY',
    );

    if (!expectedKey || !providedKey || providedKey !== expectedKey) {
      // Log as warning – this could be a probe / intrusion attempt
      this.logger.warn('Invalid setup key provided');
      throw new ForbiddenException('Forbidden');
    }
  }
}
