import type {
  BridgeResult,
  CancelAlarmResult,
  GetAlarmStatusResult,
  GetElapsedRealtimeResult,
  SetAlarmPayload,
  SetAlarmResult,
  ValidateLeasePayload,
  ValidateLeaseResult,
} from '../types/bridge.types';

import type { AlarmStatus } from '../types/alarm.types';
import type { SynkEnginePlugin } from './SynkBridge';
import type { EpochMs } from '../types/common.types';

const DELAY_MS = 200;

const toEpochMs = (value: number): EpochMs => value as EpochMs;

const delay = (): Promise<void> =>
  new Promise((resolve) => {
    setTimeout(resolve, DELAY_MS);
  });

const success = async <T>(
  data: T
): Promise<BridgeResult<T>> => {
  await delay();

  return {
    success: true,
    data,
    error: null,
  };
};

export const SynkBridgeMock: SynkEnginePlugin = {
  async setAlarm(
    _payload: SetAlarmPayload
  ): Promise<SetAlarmResult> {
    return success<{ readonly scheduledEpoch: EpochMs }>({
      scheduledEpoch:
        toEpochMs(Date.now() + 24 * 60 * 60 * 1000),
    });
  },

  async cancelAlarm(): Promise<CancelAlarmResult> {
    return success<null>(null);
  },

  async getAlarmStatus(): Promise<GetAlarmStatusResult> {
    const status: AlarmStatus = 'SCHEDULED';

    return success<{
      readonly status: AlarmStatus;
      readonly scheduledEpoch: EpochMs | null;
    }>({
      status,
      scheduledEpoch:
        toEpochMs(Date.now() + 24 * 60 * 60 * 1000),
    });
  },

  async validateLease(
    _payload: ValidateLeasePayload
  ): Promise<ValidateLeaseResult> {
    return success<{ readonly remainingMs: EpochMs }>({
      remainingMs:
        toEpochMs(7 * 24 * 60 * 60 * 1000), // 7 days in milliseconds
    });
  },

  async scheduleBackgroundSync(): Promise<
    BridgeResult<null>
  > {
    return success<null>(null);
  },

  async getElapsedRealtime():
  Promise<GetElapsedRealtimeResult> {
    return success<{ readonly elapsedMs: EpochMs }>({
      elapsedMs: Date.now() as EpochMs,
    });
  }
};