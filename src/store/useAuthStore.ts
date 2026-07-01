import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { AuthState, TOTPPayload } from '../types/auth.types';
import { AuthService } from '../services/AuthService';
import { OfflineLeaseService } from '../services/OfflineLeaseService';
import { SynkBridge } from '../bridge/SynkBridge';
import { storageUtils, AUTH_STORAGE_KEY } from '../utils/storageUtils';
import { parseEpochMs } from '../utils/common.validators';

/**
 * Global state container for authentication and offline lease data.
 */
export interface AuthStoreState extends AuthState {
  /** Indicates if an authentication request is currently in flight. */
  readonly isLoading: boolean;
  /** Human-readable error message for UI consumption. */
  readonly error: string | null;

  /** Initiates the TOTP verification flow and hydrates state on success. */
  readonly loginAsCoordinator: (payload: TOTPPayload) => Promise<void>;
  /** Clears the current session and resets state. */
  readonly logout: () => void;
  /** Pulls saved state from disk and evaluates lease validity before applying. */
  readonly hydrateFromStorage: () => Promise<void>;
  /** Fetches the latest hardware uptime from the OS to update the lease anchor. */
  readonly refreshLeaseAnchor: () => Promise<void>;
}

const INITIAL_STATE: Readonly<AuthState> = {
  role: 'STUDENT',
  isAuthenticated: false,
  leaseExpiresAt: null,
  leaseAnchorElapsed: null,
};

export const useAuthStore = create<AuthStoreState>()(
  persist(
    (set, get) => ({
      ...INITIAL_STATE,
      isLoading: false,
      error: null,

      loginAsCoordinator: async (payload: Readonly<TOTPPayload>) => {
        set({ isLoading: true, error: null });
        try {
          const result = await AuthService.verifyTOTP(payload);
          
          if (result.success && result.data) {
            set({
              role: result.data.role,
              isAuthenticated: true,
              leaseExpiresAt: result.data.leaseExpiresAt,
              leaseAnchorElapsed: result.data.leaseAnchorElapsed,
              isLoading: false,
            });
          } else {
            set({ error: result.error || 'Authentication failed', isLoading: false });
          }
        } catch (err) {
          set({ error: err instanceof Error ? err.message : 'Unknown auth error', isLoading: false });
        }
      },

      logout: () => set({ ...INITIAL_STATE, error: null }),

      hydrateFromStorage: async () => {
        try {
          const storedAuth = await storageUtils.readAuthState();
          if (!storedAuth) return set({ ...INITIAL_STATE });

          const check = await OfflineLeaseService.validateLease(storedAuth);
          
          if (check.isValid) {
            set({ ...storedAuth, isAuthenticated: storedAuth.role === 'COORDINATOR' });
          } else {
            set({ ...INITIAL_STATE, error: `Session invalid: ${check.reason}` });
          }
        } catch (err) {
          set({ ...INITIAL_STATE, error: 'Failed to hydrate' });
        }
      },

      refreshLeaseAnchor: async () => {
        try {
          const result = await SynkBridge.getElapsedRealtime();
          if (result.success && result.data) {
            // Apply ACL validation to primitive native response
            set({ leaseAnchorElapsed: parseEpochMs(result.data.elapsedMs) });
          } else {
            set({ error: result.error || 'Failed to fetch elapsed time' });
          }
        } catch (err) {
          set({ error: err instanceof Error ? err.message : 'Anchor refresh failed' });
        }
      },
    }),
    {
      name: AUTH_STORAGE_KEY,
      // Persist only stable authentication data. leaseAnchorElapsed is critical 
      // here to ensure the offline check survives an application cold start.
      partialize: (state) => ({
        role: state.role,
        leaseExpiresAt: state.leaseExpiresAt,
        leaseAnchorElapsed: state.leaseAnchorElapsed,
      }),
      skipHydration: true, 
    }
  )
);
