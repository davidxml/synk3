import { create } from 'zustand';
import { Capacitor } from '@capacitor/core';
import { SynkBridge } from '../bridge/SynkBridge';
import { NotificationService } from '../services/NotificationService';
import type { NotificationPermissionError } from '../types/notification.types';

export interface AppStoreState {
  readonly isNativePlatform: boolean;
  readonly isInitialized: boolean;
  readonly appVersion: string;
  
  readonly hasNotificationPermission: boolean;
  readonly hasExactAlarmPermission: boolean;
  readonly permissionErrorCode: NotificationPermissionError | 'PERMANENTLY_DENIED' | null;
  
  readonly globalError: string | null;

  /** Silently mounts the application and schedules background workers. */
  readonly initialize: () => Promise<void>;
  /** Triggers the native OS permission negotiation flow. */
  readonly requestPermissions: () => Promise<void>;
}

/**
 * Global lifecycle orchestrator for the application environment.
 * * Architectural Rules Enforced:
 * - ST-001: Orchestrates state. Delegates OS querying to NotificationService.
 */
export const useAppStore = create<AppStoreState>((set, get) => ({
  isNativePlatform: false,
  isInitialized: false,
  appVersion: '1.0.0', 
  
  hasNotificationPermission: false,
  hasExactAlarmPermission: false,
  permissionErrorCode: null,
  
  globalError: null,

  initialize: async () => {
    if (get().isInitialized) return;

    try {
      const isNative = Capacitor.isNativePlatform();
      set({ isNativePlatform: isNative, globalError: null });

      if (isNative) {
        // Silent Boot Check: Prevent "State Amnesia" without annoying the user
        const permStatus = await NotificationService.checkPermissions();
        set({
          hasNotificationPermission: permStatus.notificationsGranted,
          hasExactAlarmPermission: permStatus.exactAlarmGranted,
          permissionErrorCode: permStatus.errorCode,
        });

        // Register the background worker with Android WorkManager
        const syncResult = await SynkBridge.scheduleBackgroundSync();
        if (!syncResult.success) {
          set({ globalError: syncResult.error });
        }
      }

      set({ isInitialized: true });
    } catch (err) {
      set({ globalError: err instanceof Error ? err.message : 'Failed to initialize app context' });
    }
  },

  requestPermissions: async () => {
    // If Android has blocked our prompts, do not execute the native bridge request.
    // The React UI should observe this state and render a "Go to OS Settings" button instead.
    if (get().permissionErrorCode === 'PERMANENTLY_DENIED') {
        return; 
    }

    try {
      const result = await NotificationService.requestPermissions();
      
      set({ 
        hasNotificationPermission: result.notificationsGranted,
        hasExactAlarmPermission: result.exactAlarmGranted,
        permissionErrorCode: result.errorCode 
      });
    } catch (err) {
      set({ globalError: 'Failed to execute native permission request' });
    }
  },
}));
