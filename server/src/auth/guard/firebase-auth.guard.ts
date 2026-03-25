import {
  CanActivate,
  ExecutionContext,
  Inject,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { Request, Response } from 'express';
import * as admin from 'firebase-admin';
import { AdminAuthRepository } from '../repository';
import { SESSION_COOKIE_NAME } from '../constant';
import { RequestWithAdmin } from '../types';

/**
 * FirebaseAuthGuard
 *
 * The single access-control gate for every protected route.
 *
 * Verification sequence:
 *  1. Read the `admin_session` httpOnly cookie from the request.
 *  2. Verify it with Firebase Admin SDK (`verifySessionCookie` with
 *     `checkRevoked: true` so server-side logouts take effect immediately).
 *  3. Look up the matching DB record by Firebase UID.
 *  4. Assert the record exists, `isAdmin === true`, and `isActive === true`.
 *  5. Attach the resolved admin to `request.admin` for downstream use.
 *
 * The guard clears the cookie on any failure so stale/invalid cookies don't
 * linger in the browser after expiry or revocation.
 *
 * All errors surface as generic 401s to prevent leaking internal state.
 */
@Injectable()
export class FirebaseAuthGuard implements CanActivate {
  private readonly logger = new Logger(FirebaseAuthGuard.name);

  constructor(
    @Inject('FIREBASE_ADMIN') private readonly firebaseApp: admin.app.App,
    private readonly adminRepository: AdminAuthRepository,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<RequestWithAdmin>();
    const response = context.switchToHttp().getResponse<Response>();

    const sessionCookie: string | undefined =
      request.cookies?.[SESSION_COOKIE_NAME];

    if (!sessionCookie) {
      throw new UnauthorizedException('No active session');
    }

    // Step 1: Verify session cookie with Firebase Admin SDK.
    // `checkRevoked: true` means a server-side logout takes effect instantly.
    let decodedClaims: admin.auth.DecodedIdToken;
    try {
      decodedClaims = await this.firebaseApp
        .auth()
        .verifySessionCookie(sessionCookie, true);
    } catch (error) {
      this.logger.warn('Session cookie verification failed', {
        code: error?.code,
      });
      this.clearSessionCookie(response);
      throw new UnauthorizedException('Session expired or invalid');
    }

    // Step 2: Confirm this Firebase UID belongs to an active admin in our DB.
    const dbAdmin = await this.adminRepository.findAdminByFirebaseUid(
      decodedClaims.uid,
    );

    if (!dbAdmin || !dbAdmin.isAdmin || !dbAdmin.isActive) {
      this.logger.warn(
        `Access denied for Firebase UID: ${decodedClaims.uid} – not an active admin`,
      );
      this.clearSessionCookie(response);
      throw new UnauthorizedException('Access denied');
    }

    // Step 3: Attach resolved admin to request for use in controllers/decorators
    request.admin = {
      uid: decodedClaims.uid,
      email: decodedClaims.email ?? '',
      emailVerified: decodedClaims.email_verified ?? false,
      iat: decodedClaims.iat,
      exp: decodedClaims.exp,
      id: dbAdmin.id,
    };

    this.logger.log(
      `Authenticated admin: ${dbAdmin.id} | IP: ${request.ip} | ${request.method} ${request.url}`,
    );

    return true;
  }

  // ─── Private helpers ────────────────────────────────────────────────────────

  /** Clear the session cookie so invalid cookies don't persist in the browser. */
  private clearSessionCookie(response: Response): void {
    response.clearCookie(SESSION_COOKIE_NAME, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/',
    });
  }
}
