import type {
  TimeString,
  ISODateString,
  EpochMs,
} from './common.types'

import type {
  AlarmStatus
} from './alarm.types'

/**
 * Generic result wrapper returned by native bridge operations.
 */
export type BridgeResult<T> = {
  readonly success: boolean;
  readonly data: T | null;
  readonly error: string | null;
};

/**
 * Payload used to schedule or update an alarm.
 */
export interface SetAlarmPayload {
  /**
   * Alarm time represented as a string.
   * Enforced format: HH:mm.
   */
  readonly time: TimeString;

  /**
   * Indicates whether this alarm is an override.
   */
  readonly isOverride: boolean;

  /**
   * Date the alarm applies to.
   * Enforced format: YYYY-MM-DD. Null when not date-specific.
   */
  readonly activeDate: ISODateString | null;
}

/**
 * Result returned after scheduling an alarm.
 */
export type SetAlarmResult = BridgeResult<{
  readonly scheduledEpoch: EpochMs;
}>;

/**
 * Payload used for lease validation.
 */
export interface ValidateLeasePayload {
  /**
   * Hashed PIN value used for validation.
   */
  readonly pinHash: string;

  /**
   * Elapsed-time anchor in milliseconds used for offline checks.
   */
  readonly elapsedAnchor: EpochMs;
}

/**
 * Result returned from lease validation.
 */
export type ValidateLeaseResult = BridgeResult<{
  readonly remainingMs: EpochMs;
}>;

/**
 * Result returned after alarm cancellation.
 */
export type CancelAlarmResult = BridgeResult<null>;

/**
 * Result returned when querying alarm status.
 */
export type GetAlarmStatusResult = BridgeResult<{
  readonly status: AlarmStatus;
  readonly scheduledEpoch: EpochMs | null;
}>;

/**
 * Result returned after scheduling a background sync.
 */
export type ScheduleBackgroundSyncResult = BridgeResult<null>;

/**
 * Result returned when querying the hardware-anchored elapsed realtime.
 */
export type GetElapsedRealtimeResult = BridgeResult<{
  readonly elapsedMs: EpochMs;
}>;