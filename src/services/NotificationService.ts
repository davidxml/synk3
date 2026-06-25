import { Capacitor } from '@capacitor/core';
import { PushNotifications } from '@capacitor/push-notifications';
import { LocalNotifications } from '@capacitor/local-notifications';
import type { 
  NotificationPermissionResult, 
  NotificationPermissionError 
} from '../types/notification.types';

const createSuccessResult = (): NotificationPermissionResult => ({
  granted: true,
  errorCode: null,
  message: null,
});

const createFailureResult = (
  errorCode: NotificationPermissionError,
  message: string
): NotificationPermissionResult => ({
  granted: false,
  errorCode,
  message,
});

export const NotificationService = {
  async getPermissionStatus(): Promise<NotificationPermissionResult> {
    if (!Capacitor.isNativePlatform()) {
      return createFailureResult('NOT_SUPPORTED', 'Native notifications require Android/iOS.');
    }

    try {
      const localStatus = await LocalNotifications.checkPermissions();
      if (localStatus.display === 'granted') {
        return createSuccessResult();
      }
      return createFailureResult('PERMISSION_DENIED', 'Local notification permission is denied.');
    } catch (error) {
       return createFailureResult('REQUEST_FAILED', 'Failed to check permissions.');
    }
  },

  async requestPermission(): Promise<NotificationPermissionResult> {
    if (!Capacitor.isNativePlatform()) {
       return createFailureResult('NOT_SUPPORTED', 'Native notifications require Android/iOS.');
    }

    try {
      // 1. Request Push Notification permissions (FCM)
      let pushStatus = await PushNotifications.checkPermissions();
      if (pushStatus.receive !== 'granted') {
        pushStatus = await PushNotifications.requestPermissions();
      }

      // 2. Request Local Notification permissions (For background alarms)
      let localStatus = await LocalNotifications.checkPermissions();
      if (localStatus.display !== 'granted') {
        localStatus = await LocalNotifications.requestPermissions();
      }

      if (pushStatus.receive === 'granted' && localStatus.display === 'granted') {
        return createSuccessResult();
      }

      return createFailureResult('PERMISSION_DENIED', 'User denied native OS permissions.');
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Native OS request failed.';
      return createFailureResult('REQUEST_FAILED', message);
    }
  },
};

