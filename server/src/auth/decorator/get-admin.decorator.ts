import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { RequestWithAdmin } from '../types';

/**
 * @GetAdmin()
 *
 * Parameter decorator that returns the authenticated admin object (or a
 * specific field from it) that `FirebaseAuthGuard` attached to the request.
 *
 * Usage:
 * ```ts
 * // Return the full admin object
 * @Get('me')
 * @UseGuards(FirebaseAuthGuard)
 * getMe(@GetAdmin() admin: RequestWithAdmin['admin']) { ... }
 *
 * // Return only the id
 * @Delete()
 * @UseGuards(FirebaseAuthGuard)
 * delete(@GetAdmin('id') adminId: string) { ... }
 * ```
 *
 * Must only be used on routes protected by `FirebaseAuthGuard` – the decorator
 * does not verify the session itself.
 */
export const GetAdmin = createParamDecorator(
  (field: keyof RequestWithAdmin['admin'] | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest<RequestWithAdmin>();
    const admin = request.admin;

    if (field) {
      return admin?.[field];
    }

    return admin;
  },
);
