import type { UserRole } from './auth.types';

/**
 * Branded type for epoch millisecond timestamps.
 */
export type EpochMs = number & { readonly __brand: 'EpochMs' };

/**
 * Strict typing for 24-hour time format (HH:mm).
 */
export type TimeString = string & { readonly __brand: 'TimeString' };

/**
 * Strict typing for ISO 8601 Date format (YYYY-MM-DD).
 */
export type ISODateString = string & { readonly __brand: 'ISODateString' };

export interface TOTPVerificationResult {
  readonly success: boolean;
  readonly data: {
    readonly role: UserRole;
    readonly leaseExpiresAt: EpochMs;
    readonly leaseAnchorElapsed: EpochMs | null;
  } | null;
  readonly error: string | null;
}
