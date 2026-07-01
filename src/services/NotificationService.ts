import { Capacitor } from '@capacitor/core';
import { PushNotifications } from '@capacitor/push-notifications';
import { LocalNotifications } from '@capacitor/local-notifications';
import { SynkBridge } from '../bridge/SynkBridge';
import type { NotificationPermissionError } from '../types/notification.types';

export interface AppPermissionStatus {
  readonly notificationsGranted: boolean;
  readonly exactAlarmGranted: boolean;
  readonly errorCode: NotificationPermissionError | 'PERMANENTLY_DENIED' | null;
}

/**
 * OS Permission Orchestrator.
 * * Architectural Rules Enforced:
 * - SV-001: Orchestrates native system checks without mutating Zustand stores.
 * - BR-001: Delegates Exact Alarm checks purely to the custom SynkBridge.
 */
export const NotificationService = {
  
  /**
   * Silently checks OS permissions without triggering user-facing dialogue boxes.
   * Crucial for the app boot sequence to prevent "State Amnesia".
   */
  async checkPermissions(): Promise<Readonly<AppPermissionStatus>> {
    if (!Capacitor.isNativePlatform()) {
      return { notificationsGranted: false, exactAlarmGranted: false, errorCode: 'NOT_SUPPORTED' };
    }

    try {
      const localStatus = await LocalNotifications.checkPermissions();
      // BR-001: Leverage custom bridge for API 31+ exact alarm rights
      const exactAlarmResult = await SynkBridge.checkExactAlarmPermission();
      
      const notificationsGranted = localStatus.display === 'granted';
      const exactAlarmGranted = exactAlarmResult.success && exactAlarmResult.data ? exactAlarmResult.data.granted : false;

      return {
        notificationsGranted,
        exactAlarmGranted,
        errorCode: (notificationsGranted && exactAlarmGranted) ? null : 'PERMISSION_DENIED'
      };
    } catch (error) {
       return { notificationsGranted: false, exactAlarmGranted: false, errorCode: 'REQUEST_FAILED' };
    }
  },

  /**
   * Actively interrupts the user to request missing OS permissions.
   * Decouples Push (FCM) from Local to prevent total system failure if Google Play Services are missing.
   */
  async requestPermissions(): Promise<Readonly<AppPermissionStatus>> {
    if (!Capacitor.isNativePlatform()) {
       return { notificationsGranted: false, exactAlarmGranted: false, errorCode: 'NOT_SUPPORTED' };
    }

    try {
      // 1. Opportunistically request Push (FCM). If it fails, we ignore it to maintain graceful degradation.
      let pushStatus = await PushNotifications.checkPermissions();
      if (pushStatus.receive !== 'granted') {
        try { await PushNotifications.requestPermissions(); } catch(e) { /* Ignore push failure */ }
      }

      // 2. Request Local Notification permissions (Mission Critical)
      let localStatus = await LocalNotifications.checkPermissions();
      if (localStatus.display !== 'granted') {
        localStatus = await LocalNotifications.requestPermissions();
      }

      // 3. Request Exact Alarm permissions (Mission Critical for API 31+)
      const exactAlarmResult = await SynkBridge.requestExactAlarmPermission();
      const exactAlarmGranted = exactAlarmResult.success && exactAlarmResult.data ? exactAlarmResult.data.granted : false;

      // Handle the "Permanently Denied" UX trap
      if (localStatus.display === 'denied') {
        return { notificationsGranted: false, exactAlarmGranted, errorCode: 'PERMANENTLY_DENIED' };
      }

      const notificationsGranted = localStatus.display === 'granted';

      return {
        notificationsGranted,
        exactAlarmGranted,
        errorCode: (notificationsGranted && exactAlarmGranted) ? null : 'PERMISSION_DENIED'
      };
    } catch (error) {
      return { notificationsGranted: false, exactAlarmGranted: false, errorCode: 'REQUEST_FAILED' };
    }
  },
};
