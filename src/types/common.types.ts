import type { UserRole } from './auth.types';

/**
 * Brand-new type for epoch millisecond timestamps.
 * Ensures type safety when working with Date.now() and similar time values.
 */
export type EpochMs = number & { readonly brand: 'EpochMs' };

/**
 * Strict typing for 24-hour time format (HH:mm).
 * Prevents accidental parsing errors in Android alarm scheduling.
 */
export type TimeString = `${number}:${number}`;

/**
 * Strict typing for ISO 8601 Date format (YYYY-MM-DD).
 * Prevents bridge parsing errors from cloud payloads.
 */
export type ISODateString = `${number}-${number}-${number}`;

/**
 * Result of TOTP verification from AuthService.verifyTOTP.
 * Includes authenticated role and lease metadata needed for store hydration.
 */
export interface TOTPVerificationResult {
  readonly success: boolean;
  readonly data: {
    readonly role: UserRole;
    readonly leaseExpiresAt: EpochMs;
    readonly leaseAnchorElapsed: EpochMs | null;
  } | null;
  readonly error: string | null;
}
