import type { EpochMs } from "./common.types";

/**
 * Supported authenticated user roles.
 */
export type UserRole = "STUDENT" | "COORDINATOR";

/**
 * Authentication and lease state.
 */
export interface AuthState {
  /**
   * Current authenticated user's role.
   */
  readonly role: UserRole;

  /**
   * Indicates whether the user is authenticated.
   */
  readonly isAuthenticated: boolean;

  /**
   * Lease expiration timestamp in epoch milliseconds.
   * Null when no active lease exists.
   */
  readonly leaseExpiresAt: EpochMs | null;

  /**
   * Monotonic elapsed-time anchor in milliseconds used for
   * offline lease validation.
   * Null when unavailable.
   */
  readonly leaseAnchorElapsed: EpochMs | null;
}

/**
 * Payload used for TOTP validation.
 */
export interface TOTPPayload {
  /**
   * One-time PIN code entered by the user.
   */
  readonly pin: string;

  /**
   * Timestamp associated with the PIN generation or validation
   * in epoch milliseconds.
   */
  readonly timestamp: EpochMs;
}

/**
 * Result of lease validation.
 */
