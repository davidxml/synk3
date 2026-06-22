import { WebPlugin, registerPlugin } from '@capacitor/core';

import type { AlarmStatus } from '../types/alarm.types';
import type {
  BridgeResult,
  CancelAlarmResult,
  GetAlarmStatusResult,
  SetAlarmPayload,
  SetAlarmResult,
  ValidateLeasePayload,
  ValidateLeaseResult,
  ScheduleBackgroundSyncResult,
  GetElapsedRealtimeResult,
} from '../types/bridge.types';

export interface SynkEnginePlugin {
  readonly setAlarm: (
    payload: SetAlarmPayload
  ) => Promise<SetAlarmResult>;

  readonly cancelAlarm: () => Promise<CancelAlarmResult>;

  readonly getAlarmStatus: () => Promise<GetAlarmStatusResult>;

  readonly validateLease: (
    payload: ValidateLeasePayload
  ) => Promise<ValidateLeaseResult>;

  readonly scheduleBackgroundSync: () => Promise<ScheduleBackgroundSyncResult>;

  readonly getElapsedRealtime: () => Promise<GetElapsedRealtimeResult>;
}

const WEB_ERROR = 'Native plugin not available on web';

const createWebErrorResult = <T>(): BridgeResult<T> => ({
  success: false,
  data: null,
  error: WEB_ERROR,
});

class WebSynkEngine extends WebPlugin implements SynkEnginePlugin {
  async setAlarm(
    _payload: SetAlarmPayload
  ): Promise<SetAlarmResult> {
    return createWebErrorResult<{
      readonly scheduledEpoch: number;
    }>();
  }

  async cancelAlarm(): Promise<CancelAlarmResult> {
    return createWebErrorResult<null>();
  }

  async getAlarmStatus(): Promise<GetAlarmStatusResult> {
    return createWebErrorResult<{
      readonly status: AlarmStatus;
      readonly scheduledEpoch: number | null;
    }>();
  }

  async validateLease(
    _payload: ValidateLeasePayload
  ): Promise<ValidateLeaseResult> {
    return createWebErrorResult<{
      readonly remainingMs: number;
    }>();
  }

  async scheduleBackgroundSync(): Promise<
    BridgeResult<null>
  > {
    return createWebErrorResult<null>();
  }

  async getElapsedRealtime(): Promise<GetElapsedRealtimeResult> {
    return createWebErrorResult<{
      readonly elapsedMs: number;
    }>();
  }
}

export const SynkBridge = registerPlugin<SynkEnginePlugin>(
  'SynkEngine',
  {
    web: new WebSynkEngine(),
  }
);