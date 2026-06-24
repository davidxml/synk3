import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { AuthState, TOTPPayload, UserRole } from '../types/auth.types';
import type { EpochMs } from '../types/common.types';
import { AuthService } from '../services/AuthService';
import { OfflineLeaseService } from '../services/OfflineLeaseService';
import { SynkBridge } from '../bridge/SynkBridge';
import { storageUtils, AUTH_STORAGE_KEY } from '../utils/storageUtils';

export interface AuthStoreState extends AuthState {
  readonly isLoading: boolean;
  readonly error: string | null;

  readonly loginAsCoordinator: (payload: TOTPPayload) => Promise<void>;
  readonly logout: () => void;
  readonly hydrateFromStorage: () => Promise<void>;
  readonly refreshLeaseAnchor: () => Promise<void>;
}

const INITIAL_STATE: AuthState = {
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

      loginAsCoordinator: async (payload: TOTPPayload) => {
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
          set({ 
            error: err instanceof Error ? err.message : 'Unknown authentication error', 
            isLoading: false 
          });
        }
      },

      logout: () => {
        set({ ...INITIAL_STATE, error: null });
      },

      hydrateFromStorage: async () => {
        try {
          const storedAuth = await storageUtils.readAuthState();
          
          if (!storedAuth) {
            set({ ...INITIAL_STATE });
            return;
          }

          const isValid = await OfflineLeaseService.validateLease(storedAuth);
          
          if (isValid) {
            set({ ...storedAuth, isAuthenticated: storedAuth.role === 'COORDINATOR' });
          } else {
            set({ ...INITIAL_STATE });
          }
        } catch (err) {
          // Rule: Never throw. Fallback to safest state.
          set({ ...INITIAL_STATE, error: 'Failed to hydrate from storage' });
        }
      },

      refreshLeaseAnchor: async () => {
        try {
          const result = await SynkBridge.getElapsedRealtime();
          if (result.success && result.data) {
            set({ leaseAnchorElapsed: result.data.elapsedMs });
            // Used for countdown display only.
            // Authorization decisions are handled by OfflineLeaseService.
          } else {
            set({ error: result.error || 'Failed to fetch elapsed time' });
          }
        } catch (err) {
          set({ error: err instanceof Error ? err.message : 'Failed to refresh anchor' });
        }
      },
    }),
    {
      name: AUTH_STORAGE_KEY,
      // Rule: Persist role, leaseExpiresAt only.
      partialize: (state) => ({
        role: state.role,
        leaseExpiresAt: state.leaseExpiresAt,
      }),
      // Bypassing default auto-hydration to strictly follow the hydrateFromStorage flow
      skipHydration: true, 
    }
  )
);
