import { SynkBridge } from '../bridge/SynkBridge';
import { parseEpochMs } from '../utils/common.validators';
import type { TOTPPayload, UserRole } from '../types/auth.types';
import type { EpochMs, TOTPVerificationResult } from '../types/common.types';

/**
 * Cryptographically stretches a PIN to defend against local brute-force attacks.
 * Utilizes a static salt as the objective is artificial delay, not rainbow-table prevention.
 * * @param pin - The raw user input PIN.
 * @returns A promise resolving to the hex-encoded hash string.
 * @throws {Error} If the Web Crypto API is unavailable in the execution context.
 */
export const hashPin = async (pin: string): Promise<string> => {
  const enc = new TextEncoder();
  // Safe fallback if crypto.subtle is unavailable in current WebView context
  if (!crypto || !crypto.subtle) {
    throw new Error('Web Crypto API is unavailable in this context.');
  }

  const keyMaterial = await crypto.subtle.importKey(
    'raw', enc.encode(pin), { name: 'PBKDF2' }, false, ['deriveBits']
  );
  
  const salt = enc.encode('synk3_static_hardware_salt');
  const buffer = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt, iterations: 100000, hash: 'SHA-256' },
    keyMaterial,
    256
  );

  return Array.from(new Uint8Array(buffer)).map(b => b.toString(16).padStart(2, '0')).join('');
};

/**
 * Negotiates lease validation across the native bridge.
 * Hashes the PIN locally and maps the elapsed hardware anchor returned by the OS
 * into a structured domain result for the state store.
 * * @param payload - The PIN and elapsed timestamp payload.
 * @returns A promise resolving to the structured verification result.
 */
export const verifyTOTP = async (
  payload: Readonly<TOTPPayload>
): Promise<Readonly<TOTPVerificationResult>> => {
  try {
    const pinHash = await hashPin(payload.pin);
    
    // Using payload.timestamp as the bridge elapsedAnchor per variable naming conventions
    const result = await SynkBridge.validateLease({
      pinHash,
      elapsedAnchor: payload.timestamp 
    });

    if (result.success && result.data) {
      // Validate bridge values before hydrating domain
      const remainingMs = result.data.remainingMs;
      const computedExpiry = parseEpochMs(Date.now() + remainingMs);
      
      return {
        success: true,
        data: {
          role: 'COORDINATOR' as UserRole, // Explicit cast based on domain logic
          leaseExpiresAt: computedExpiry,
          leaseAnchorElapsed: parseEpochMs(payload.timestamp),
        },
        error: null,
      };
    }

    return {
      success: false,
      data: null,
      error: result.error || 'Native lease validation failed',
    };
  } catch (error) {
    return {
      success: false,
      data: null,
      error: error instanceof Error ? error.message : 'Unknown hashing error',
    };
  }
};
