/**
 * Shape of the decoded Firebase session-cookie / ID-token claims that
 * the Auth guard attaches to `request.admin` after successful verification.
 */
export interface FirebaseDecodedAdmin {
  /** Firebase UID – matches `User.firebaseUid` in the database. */
  uid: string;

  /** Email address verified by Firebase. */
  email: string;

  /** Whether Firebase considers this email verified. */
  emailVerified: boolean;

  /** Unix timestamp (seconds) when the token was issued. */
  iat: number;

  /** Unix timestamp (seconds) when the token expires. */
  exp: number;
}

/**
 * Type-safe extension of the Express `Request` interface so TypeScript
 * understands `req.admin` throughout the codebase.
 */
import { Request } from 'express';

export type RequestWithAdmin = Request & {
  admin: FirebaseDecodedAdmin & {
    /** Database primary key resolved after DB lookup. */
    id: string;
  };
};
