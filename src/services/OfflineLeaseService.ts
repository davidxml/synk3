import { SynkBridge } from '../bridge/SynkBridge';
import type { AuthState } from '../types/auth.types';

/**
 * Result of the offline lease validation check.
 */
export interface LeaseCheckResult {
  readonly isValid: boolean;
  readonly reason: 'VALID' | 'NO_LEASE' | 'LEASE_EXPIRED' | 'CLOCK_TAMPER_SUSPECTED' | 'NATIVE_BRIDGE_FAILED';
}

/**
 * Validates the current offline lease against the un-tamperable hardware clock.
 * * ARCHITECTURAL NOTE: This is a primary authorization gate. It determines
 * if the user maintains their session without needing network access. It relies 
 * strictly on the delta between current device uptime and the stored anchor.
 * * @param auth - The persisted authentication state.
 * @returns A promise resolving to the validation result.
 */
export const validateLease = async (auth: Readonly<AuthState>): Promise<Readonly<LeaseCheckResult>> => {
  if (!auth.leaseExpiresAt || !auth.leaseAnchorElapsed) {
    return { isValid: false, reason: 'NO_LEASE' };
  }

  // Fetch true device uptime to prevent wall-clock tampering
  const bridgeResult = await SynkBridge.getElapsedRealtime();
  if (!bridgeResult.success || bridgeResult.data === null) {
    return { isValid: false, reason: 'NATIVE_BRIDGE_FAILED' };
  }

  const currentUptime = bridgeResult.data.elapsedMs;
  const elapsedSinceLease = currentUptime - auth.leaseAnchorElapsed;

  if (elapsedSinceLease < 0) {
    // Uptime is less than when the lease was granted. Device rebooted.
    // Fallback required or force re-auth based on your threat model.
    return { isValid: false, reason: 'CLOCK_TAMPER_SUSPECTED' }; 
  }

  const absoluteCalculatedCurrentTime = auth.leaseExpiresAt - elapsedSinceLease;
  
  if (absoluteCalculatedCurrentTime <= 0) {
    return { isValid: false, reason: 'LEASE_EXPIRED' };
  }

  return { isValid: true, reason: 'VALID' };
};
