import { SynkBridge } from '../bridge/SynkBridge';
import type { 
  TOTPPayload,
} from '../types/auth.types';
import type { 
  EpochMs,
  TOTPVerificationResult,
} from '../types/common.types';

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
): Promise<Readonly<TOTPVerificationResult>> => {
  const result = await SynkBridge.validateLease({
    pinHash: await hashPin(payload.pin),
    elapsedAnchor: payload.timestamp
  });

  if (!result.success || !result.data) {
    return {
      success: false,
      data: null,
      error: result.error || "Native lease validation failed",
    };
  }

  const remainingMs = result.data.remainingMs;

  return {
    success: true,
    data: {
      role: 'COORDINATOR',
      leaseExpiresAt: computeLeaseExpiry(remainingMs) as EpochMs,
      leaseAnchorElapsed: null // Will be populated by store's refresh mechanism
    },
    error: null,
  };
};

/**
 * Calculates absolute epoch expiry from relative remaining time.
 */
export const computeLeaseExpiry = (remainingMs: number): EpochMs => {
  return (Date.now() + remainingMs) as EpochMs;
};
