import { create } from 'zustand';
import { Capacitor } from '@capacitor/core';
import { SynkBridge } from '../bridge/SynkBridge';
import { NotificationService } from '../services/NotificationService';

export interface AppStoreState {
  readonly isNativePlatform: boolean;
  readonly appVersion: string;
  readonly hasNotificationPermission: boolean;
  readonly error: string | null;

  readonly initialize: () => Promise<void>;
  readonly requestNotificationPermission: () => Promise<void>;
}

export const useAppStore = create<AppStoreState>((set) => ({
  isNativePlatform: false,
  appVersion: '1.0.0', // Could be injected via build env
  hasNotificationPermission: false,
  error: null,

  initialize: async () => {
    try {
      const isNative = Capacitor.isNativePlatform();
      set({ isNativePlatform: isNative, error: null });

      if (isNative) {
        const syncResult = await SynkBridge.scheduleBackgroundSync();
        if (!syncResult.success) {
          set({ error: syncResult.error });
        }
      }
    } catch (err) {
      set({ error: err instanceof Error ? err.message : 'Failed to initialize app' });
    }
  },

  requestNotificationPermission: async () => {
    try {
      const result = await NotificationService.requestPermission();
      set({ 
        hasNotificationPermission: result.granted, 
        error: result.message // Maps your rich error message to state
      });
    } catch (err) {
      set({ error: 'Failed to request notification permission' });
    }
  },
}));

