import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { User } from '@prisma/client';

/**
 * AdminAuthRepository
 *
 * Thin data-access layer for admin authentication.  All Prisma calls live here;
 * services never import PrismaService directly.
 *
 * Security notes:
 *  - `findAdminByFirebaseUid` is the hot-path lookup on every guarded request.
 *    It selects only the columns actually needed to avoid leaking fields.
 *  - `findAdminByEmail` is used during setup only; it is never called in the
 *    login critical path to avoid timing-based user enumeration via email.
 */
@Injectable()
export class AdminAuthRepository {
  private readonly logger = new Logger(AdminAuthRepository.name);

  constructor(private readonly prisma: PrismaService) {}

  // ─── Read ───────────────────────────────────────────────────────────────────

  /**
   * Look up an admin by their Firebase UID.
   * Returns `null` when no matching row exists so callers can throw the
   * appropriate HTTP exception.
   */
  async findAdminByFirebaseUid(
    firebaseUid: string,
  ): Promise<Pick<User, 'id' | 'email' | 'isAdmin' | 'isActive'> | null> {
    return this.prisma.user.findUnique({
      where: { firebaseUid },
      select: { id: true, email: true, isAdmin: true, isActive: true },
    });
  }

  /**
   * Used only during the one-time setup to prevent duplicate admin accounts.
   */
  async findAdminByEmail(
    email: string,
  ): Promise<Pick<User, 'id' | 'email'> | null> {
    return this.prisma.user.findUnique({
      where: { email },
      select: { id: true, email: true },
    });
  }

  /**
   * Returns `true` if at least one admin row already exists in the database.
   * Used by the setup endpoint to enforce the single-admin constraint.
   */
  async adminExists(): Promise<boolean> {
    const count = await this.prisma.user.count({
      where: { isAdmin: true },
    });
    return count > 0;
  }

  // ─── Write ──────────────────────────────────────────────────────────────────

  /**
   * Persist a new admin record that mirrors the Firebase Auth user that was
   * just created.  The password is NEVER stored here.
   */
  async createAdmin(params: {
    firebaseUid: string;
    email: string;
  }): Promise<Pick<User, 'id' | 'email'>> {
    return this.prisma.user.create({
      data: {
        firebaseUid: params.firebaseUid,
        email: params.email,
        isAdmin: true,
        isActive: true,
      },
      select: { id: true, email: true },
    });
  }

  /**
   * Stamp the last-login timestamp for audit purposes.
   * Failures here are logged but never propagate to the caller.
   */
  async updateLastLogin(id: string): Promise<void> {
    try {
      await this.prisma.user.update({
        where: { id },
        data: { lastLoginAt: new Date() },
      });
    } catch (error) {
      this.logger.warn(`Failed to update lastLoginAt for user ${id}`, error);
    }
  }
}
