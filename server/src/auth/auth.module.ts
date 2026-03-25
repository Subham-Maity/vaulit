import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AuthController } from './controller';
import { AdminAuthRepository } from './repository';
import { AdminAuthService } from './service';
import { FirebaseAuthGuard } from './guard';

/**
 * AuthModule
 *
 * Encapsulates all authentication concerns for the portfolio admin:
 *  - AdminAuthService   – setup / login / logout business logic
 *  - AdminAuthRepository – Prisma data-access layer
 *  - FirebaseAuthGuard  – session-cookie verification guard (exported so other
 *                         modules can apply it with `@UseGuards`)
 *
 * FirebaseAdminModule is @Global() so `FIREBASE_ADMIN` is available here
 * without an explicit import.
 * PrismaModule is expected to be global as well.
 */
@Module({
  imports: [ConfigModule],
  controllers: [AuthController],
  providers: [AdminAuthService, AdminAuthRepository, FirebaseAuthGuard],
  exports: [AdminAuthService, AdminAuthRepository, FirebaseAuthGuard],
})
export class AuthModule {}
