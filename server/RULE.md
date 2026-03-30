# Server File Structure Rules

Rules for adding any new feature/module in `server/src/`. Follow exactly — no exceptions.

---

## Module Folder Structure

Every feature lives in its own folder under `src/`:

```
src/
└── <feature>/
    ├── <feature>.module.ts
    ├── index.ts                        ← barrel: exports only the module
    ├── controller/
    │   ├── <feature>.controller.ts
    │   └── index.ts
    ├── service/
    │   ├── <role>/
    │   │   └── <role>-<feature>.service.ts
    │   └── index.ts
    ├── repository/
    │   ├── <role>/
    │   │   └── <role>-<feature>.repository.ts
    │   └── index.ts
    ├── dto/
    │   ├── <role>/
    │   │   ├── <role>.dto.ts
    │   │   └── <role>-response.dto.ts
    │   └── index.ts
    ├── guard/
    │   ├── <name>.guard.ts
    │   └── index.ts
    ├── types/
    │   ├── <feature>.types.ts
    │   └── index.ts
    ├── decorator/                      ← optional
    │   ├── <name>.decorator.ts
    │   └── index.ts
    ├── constant/                       ← optional
    │   ├── <feature>.constant.ts
    │   └── index.ts
    └── utils/                          ← optional
        └── <name>.util.ts
```

**Real example** (`auth`):

```
src/auth/
├── auth.module.ts
├── index.ts
├── controller/
│   ├── auth.controller.ts
│   └── index.ts
├── service/
│   ├── admin/
│   │   └── admin-auth.service.ts
│   └── index.ts
├── repository/
│   ├── admin/
│   │   └── admin-auth.repository.ts
│   └── index.ts
├── dto/
│   ├── admin/
│   │   ├── admin.dto.ts
│   │   └── admin-response.dto.ts
│   └── index.ts
├── guard/
│   ├── firebase-auth.guard.ts
│   └── index.ts
├── types/
│   ├── firebase-admin.types.ts
│   └── index.ts
├── decorator/
│   ├── get-admin.decorator.ts
│   └── index.ts
└── constant/
    ├── auth.constant.ts
    └── index.ts
```

---

## Naming Rules

| Layer      | File name pattern                      | Class name pattern        |
|------------|----------------------------------------|---------------------------|
| Module     | `<feature>.module.ts`                  | `FeatureModule`           |
| Controller | `<feature>.controller.ts`              | `FeatureController`       |
| Service    | `<role>-<feature>.service.ts`          | `RoleFeatureService`      |
| Repository | `<role>-<feature>.repository.ts`       | `RoleFeatureRepository`   |
| DTO        | `<role>.dto.ts` / `<role>-response.dto.ts` | `RoleActionDto`       |
| Guard      | `<name>.guard.ts`                      | `NameGuard`               |
| Types      | `<feature>.types.ts`                   | (interfaces/types)        |
| Decorator  | `<name>.decorator.ts`                  | —                         |
| Constant   | `<feature>.constant.ts`                | —                         |

Use **kebab-case** for all file and folder names.

---

## Barrel Exports (`index.ts`)

Every layer folder **must** have an `index.ts` that re-exports everything from it.

```ts
// service/index.ts
export * from './admin/admin-auth.service';

// repository/index.ts
export * from './admin/admin-auth.repository';

// dto/index.ts
export * from './admin/admin.dto';
export * from './admin/admin-response.dto';

// guard/index.ts
export * from './firebase-auth.guard';

// types/index.ts
export * from './firebase-admin.types';

// decorator/index.ts
export * from './get-admin.decorator';

// constant/index.ts
export * from './auth.constant';
```

The **root** `index.ts` exports only the module:

```ts
// src/auth/index.ts
export * from './auth.module';
```

---

## Import Rules

Always import from the layer's barrel (`index.ts`), never from the raw file path.

```ts
// ✅ Correct
import { AdminAuthService } from '../service';
import { AdminAuthRepository } from '../repository';
import { FirebaseAuthGuard } from '../guard';
import { AdminLoginDto } from '../dto';
import { RequestWithAdmin } from '../types';
import { SESSION_COOKIE_NAME } from '../constant';

// ❌ Wrong — never import from the raw file
import { AdminAuthService } from '../service/admin/admin-auth.service';
```

Cross-module imports use the `src/` alias:

```ts
// ✅ Correct (from service importing its own module's things)
import { AdminLoginDto } from 'src/auth/dto';
import { AdminAuthRepository } from 'src/auth/repository';
```

---

## Repository Layer

- **Only** the repository talks to Prisma. Services **never** import `PrismaService`.
- Only select the columns you actually need — use `select: { ... }`.
- Return `null` (not throw) when a record is not found; let the service throw the HTTP exception.

```ts
// repository/admin/admin-auth.repository.ts
import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { User } from '@prisma/client';

/**
 * AdminAuthRepository
 *
 * Thin data-access layer. All Prisma calls live here.
 * Services never import PrismaService directly.
 */
@Injectable()
export class AdminAuthRepository {
  private readonly logger = new Logger(AdminAuthRepository.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Returns null when no matching row exists.
   * Callers throw the appropriate HTTP exception.
   */
  async findByFirebaseUid(
    firebaseUid: string,
  ): Promise<Pick<User, 'id' | 'email' | 'isAdmin' | 'isActive'> | null> {
    return this.prisma.user.findUnique({
      where: { firebaseUid },
      select: { id: true, email: true, isAdmin: true, isActive: true },
    });
  }
}
```

**Prisma schema** is the single source of truth for DB types. Import generated types from `@prisma/client`:

```ts
import { User } from '@prisma/client';
// Use Pick<User, 'id' | 'email'> — never define your own DB types
```

---

## Service Layer

- Inject the repository (never `PrismaService`).
- Throw NestJS HTTP exceptions here (`UnauthorizedException`, `ConflictException`, etc.).
- Divide methods with section comments: `// ─── Setup ───`.

```ts
// service/admin/admin-auth.service.ts
import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { AdminAuthRepository } from 'src/auth/repository';
import { AdminLoginDto } from 'src/auth/dto';

/**
 * AdminAuthService
 *
 * Business logic for authentication flows.
 * Never imports PrismaService — delegates all DB access to AdminAuthRepository.
 */
@Injectable()
export class AdminAuthService {
  private readonly logger = new Logger(AdminAuthService.name);

  constructor(private readonly adminRepository: AdminAuthRepository) {}

  // ─── Login ──────────────────────────────────────────────────────────────────

  /**
   * Verifies credentials and returns a session token.
   *
   * @param dto - Login payload from the controller
   */
  async loginAdmin(dto: AdminLoginDto): Promise<{ message: string }> {
    const admin = await this.adminRepository.findByFirebaseUid(dto.idToken);
    if (!admin) throw new UnauthorizedException('Authentication failed');
    return { message: 'Login successful' };
  }
}
```

---

## Controller Layer

- Inject services only — never repositories.
- Every endpoint needs `@ApiOperation`, `@ApiResponse` decorators (Swagger).
- Use section comments to separate endpoints.

```ts
// controller/auth.controller.ts
import { Controller, Post, Body, HttpCode, HttpStatus, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { AdminAuthService } from '../service';
import { AdminLoginDto } from '../dto';
import { FirebaseAuthGuard } from '../guard';

/**
 * AuthController
 *
 * Exposes authentication endpoints. Delegates all logic to AdminAuthService.
 */
@ApiTags('Auth')
@Controller('auth/admin')
export class AuthController {
  private readonly logger = new Logger(AuthController.name);

  constructor(private readonly adminAuthService: AdminAuthService) {}

  // ─── Login ──────────────────────────────────────────────────────────────────

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Exchange Firebase ID token for session cookie' })
  @ApiResponse({ status: 200, description: 'Login successful' })
  @ApiResponse({ status: 401, description: 'Authentication failed' })
  async login(@Body() dto: AdminLoginDto) {
    return this.adminAuthService.loginAdmin(dto);
  }

  // ─── Protected route example ─────────────────────────────────────────────────

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @UseGuards(FirebaseAuthGuard)   // ← apply guard here, not globally
  @ApiOperation({ summary: 'Revoke tokens and clear session cookie' })
  @ApiResponse({ status: 200, description: 'Logged out' })
  async logout() {
    return { message: 'Logged out successfully' };
  }
}
```

---

## Guard

- File: `guard/<name>.guard.ts`
- Class name: `PascalCase` + `Guard` suffix, e.g. `FirebaseAuthGuard`
- Implements `CanActivate`
- Attaches verified payload to `request.<entity>` for use in decorators/controllers

```ts
// guard/firebase-auth.guard.ts
import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { AdminAuthRepository } from '../repository';
import { REQUEST_COOKIE_NAME } from '../constant';
import { RequestWithAdmin } from '../types';

/**
 * FirebaseAuthGuard
 *
 * Verifies the session cookie on every protected route.
 * On success, attaches `request.admin` for downstream use.
 * On failure, clears the cookie and throws 401.
 */
@Injectable()
export class FirebaseAuthGuard implements CanActivate {
  constructor(private readonly adminRepository: AdminAuthRepository) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<RequestWithAdmin>();
    // ... verification logic
    return true;
  }
}
```

Export from `guard/index.ts`:

```ts
export * from './firebase-auth.guard';
```

Apply per-route: `@UseGuards(FirebaseAuthGuard)` — never register globally unless intentional.

---

## Types

- File: `types/<feature>.types.ts`
- Use `interface` for object shapes, `type` for unions/intersections.
- Every field must have a JSDoc comment.

```ts
// types/firebase-admin.types.ts
import { Request } from 'express';

/** Decoded claims attached to request after guard verification. */
export interface FirebaseDecodedAdmin {
  /** Firebase UID — matches User.firebaseUid in the database. */
  uid: string;
  /** Email verified by Firebase. */
  email: string;
  /** Token issued-at (Unix seconds). */
  iat: number;
  /** Token expiry (Unix seconds). */
  exp: number;
}

/** Type-safe Express Request with admin context. */
export type RequestWithAdmin = Request & {
  admin: FirebaseDecodedAdmin & {
    /** Database primary key resolved after DB lookup. */
    id: string;
  };
};
```

---

## DTO

- Use `class-validator` decorators for validation.
- Use `@ApiProperty` on every field for Swagger.
- Response DTOs live in `<role>-response.dto.ts`, not in the same file as request DTOs.

```ts
// dto/admin/admin.dto.ts
import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsString, MaxLength } from 'class-validator';

/**
 * AdminLoginDto
 *
 * Payload for POST /auth/admin/login.
 */
export class AdminLoginDto {
  @ApiProperty({ example: 'admin@example.com' })
  @IsEmail({}, { message: 'Provide a valid email address' })
  @IsNotEmpty()
  @MaxLength(254)
  email: string;

  /** Firebase ID token from client-side signInWithEmailAndPassword. */
  @ApiProperty({ description: 'Firebase ID token' })
  @IsString()
  @IsNotEmpty({ message: 'Firebase ID token is required' })
  @MaxLength(4096)
  idToken: string;
}
```

---

## Module Registration

Register every provider in `<feature>.module.ts`. Export anything other modules need:

```ts
// auth.module.ts
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AuthController } from './controller';
import { AdminAuthRepository } from './repository';
import { AdminAuthService } from './service';
import { FirebaseAuthGuard } from './guard';

/**
 * AuthModule
 *
 * Encapsulates all auth concerns.
 * Exports FirebaseAuthGuard so other modules can apply it with @UseGuards.
 */
@Module({
  imports: [ConfigModule],
  controllers: [AuthController],
  providers: [AdminAuthService, AdminAuthRepository, FirebaseAuthGuard],
  exports: [AdminAuthService, AdminAuthRepository, FirebaseAuthGuard],
})
export class AuthModule {}
```

Register the module in `app.module.ts`:

```ts
import { AuthModule } from './auth';  // ← import from the root barrel
```

---

## JSDoc Rules

Every class and every public method must have a JSDoc block.

```ts
/**
 * ClassName
 *
 * One sentence what it does.
 * Optional: security notes, flows, constraints.
 */

/**
 * Short description of what the method does.
 *
 * @param paramName - What it represents
 * @returns What it returns
 */
```

Use section dividers inside long files:

```ts
// ─── Read ───────────────────────────────────────────────────────────────────
// ─── Write ──────────────────────────────────────────────────────────────────
// ─── Private helpers ────────────────────────────────────────────────────────
```

---

## Quick Checklist (new feature)

- [ ] Create `src/<feature>/` folder
- [ ] Add `<feature>.module.ts` with providers, controllers, exports
- [ ] Add root `index.ts` → `export * from './<feature>.module'`
- [ ] Add `controller/`, `service/<role>/`, `repository/<role>/`, `dto/<role>/`, `types/`, `guard/`
- [ ] Add `index.ts` barrel in every layer folder
- [ ] Repository: only Prisma, `select` only needed columns, return `null` not throw
- [ ] Service: inject repository, throw HTTP exceptions, JSDoc on every method
- [ ] Controller: inject service only, add `@ApiOperation` + `@ApiResponse` on every endpoint
- [ ] Guard: implements `CanActivate`, attaches payload to `request.<entity>`
- [ ] Types: JSDoc on every field
- [ ] DTOs: `@ApiProperty` + `class-validator` on every field
- [ ] Import from barrel (`'../service'` not `'../service/admin/admin-auth.service'`)
- [ ] Register `<Feature>Module` in `app.module.ts`
