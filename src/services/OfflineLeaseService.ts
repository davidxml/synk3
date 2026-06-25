import type { AuthState } from '../types';
import type { EpochMs } from '../types';

export interface LeaseCheckResult {
  readonly isValid: boolean;
  readonly reason: 'VALID' | 'NO_LEASE' | 'LEASE_EXPIRED' | 'CLOCK_TAMPER_SUSPECTED';
}

/**
 * Pure function to evaluate lease validity based entirely on offline state.
 * * JSDOC REQUIRED: Display countdown only — authorization is determined 
 * solely by LeaseManager.kt in the native Android layer.
 */
export const validateLease = (auth: Readonly<AuthState>): Readonly<LeaseCheckResult> => {
  if (!auth.leaseExpiresAt || !auth.leaseAnchorElapsed) {
    return { isValid: false, reason: 'NO_LEASE' };
  }

  const currentAbsolute = Date.now();
  
  if (currentAbsolute > auth.leaseExpiresAt) {
    return { isValid: false, reason: 'LEASE_EXPIRED' };
  }

  // Basic sanity check: If current time is significantly before the known expiration,
  // but somehow the anchor elapsed logic implies a massive shift, flag tampering.
  // (Full tamper prevention remains the responsibility of Native OS elapsed real-time).
  const expectedRemaining = auth.leaseExpiresAt - currentAbsolute;
  if (expectedRemaining > 7 * 24 * 60 * 60 * 1000) { // e.g., > 7 days is impossible in this system
    return { isValid: false, reason: 'CLOCK_TAMPER_SUSPECTED' };
  }

  return { isValid: true, reason: 'VALID' };
};

/**
 * Returns the absolute remaining milliseconds until lease expiration,
 * clamping to 0 if expired or invalid.
 */
export const getRemainingMs = (auth: Readonly<AuthState>): EpochMs => {
  const validation = validateLease(auth);
  
  if (!validation.isValid || !auth.leaseExpiresAt) {
    return 0 as EpochMs;
  }

  const remaining = auth.leaseExpiresAt - Date.now();
  return Math.max(0, remaining) as EpochMs;
};
