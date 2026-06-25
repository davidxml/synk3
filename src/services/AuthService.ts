import { SynkBridge } from '../bridge/SynkBridge';
import type { 
  TOTPPayload, 
  LeaseValidationResult 
} from '../types';
import type { EpochMs } from '../types';

/**
 * Hashes a PIN using PBKDF2, HmacSHA256, 100,000 iterations.
 * * SECURITY RATIONALE FOR STATIC SALT:
 * A static salt is acceptable in this specific threat model because this is an 
 * offline, single-device authorization gate, not a centralized credential database. 
 * The objective is strictly to invoke artificial delay (stretching) against brute-force 
 * attacks on the physical device, rather than preventing cross-user rainbow table attacks.
 */
export const hashPin = async (pin: string): Promise<string> => {
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    enc.encode(pin),
    { name: 'PBKDF2' },
    false,
    ['deriveBits']
  );

  const salt = enc.encode('synk3_static_hardware_salt');
  
  const buffer = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt,
      iterations: 100000,
      hash: 'SHA-256'
    },
    keyMaterial,
    256
  );

  return Array.from(new Uint8Array(buffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
};

/**
 * Verifies a TOTP payload against the native bridge, establishing the hardware lease.
 */
export const verifyTOTP = async (
  payload: Readonly<TOTPPayload>
): Promise<Readonly<LeaseValidationResult>> => {
  const result = await SynkBridge.validateLease(payload);

  if (!result.success || !result.data) {
    return {
      isValid: false,
      reason: "UNAUTHORIZED",
      error: result.error || "Native lease validation failed",
      data: null
    };
  }

  const remainingMs = result.data.remainingMs as EpochMs;

  return {
    isValid: true,
    reason: "VALID",
    error: null,
    data: {
      role: 'COORDINATOR',
      remainingMs,
      leaseExpiresAt: computeLeaseExpiry(remainingMs),
      leaseAnchorElapsed: null // Will be populated by store's refresh mechanism
    }
  };
};

/**
 * Calculates absolute epoch expiry from relative remaining time.
 */
export const computeLeaseExpiry = (remainingMs: EpochMs): EpochMs => {
  return (Date.now() + remainingMs) as EpochMs;
};
