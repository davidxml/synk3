import type {
  BridgeResult,
  CancelAlarmResult,
  GetAlarmStatusResult,
  SetAlarmPayload,
  SetAlarmResult,
  ValidateLeasePayload,
  ValidateLeaseResult,
} from '../types/bridge.types';

import type { AlarmStatus } from '../types/alarm.types';
import type { SynkEnginePlugin } from './SynkBridge';

const DELAY_MS = 200;

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
    return success<{ readonly scheduledEpoch: number }>({
      scheduledEpoch:
        Date.now() + 24 * 60 * 60 * 1000,
    });
  },

  async cancelAlarm(): Promise<CancelAlarmResult> {
    return success<null>(null);
  },

  async getAlarmStatus(): Promise<GetAlarmStatusResult> {
    const status: AlarmStatus = 'SCHEDULED';

    return success<{
      readonly status: AlarmStatus;
      readonly scheduledEpoch: number | null;
    }>({
      status,
      scheduledEpoch:
        Date.now() + 24 * 60 * 60 * 1000,
    });
  },

  async validateLease(
    _payload: ValidateLeasePayload
  ): Promise<ValidateLeaseResult> {
    return success<{ readonly remainingMs: number }>({
      remainingMs:
        7 * 24 * 60 * 60 * 1000,
    });
  },

  async scheduleBackgroundSync(): Promise<
    BridgeResult<null>
  > {
    return success<null>(null);
  },
};