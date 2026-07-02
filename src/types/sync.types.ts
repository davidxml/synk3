import type {
  TimeString,
  ISODateString,
  EpochMs,
} from './common.types'

/**
 * Alarm record stored in the cloud synchronization layer.
 */
export interface CloudAlarmRecord {
  /**
   * Override alarm time as a string.
   * Enforced format: HH:mm. Null when no override exists.
   */
  readonly override_time: TimeString | null;

  /**
   * Date associated with the override.
   * Enforced format: YYYY-MM-DD. Null when not date-specific.
   */
  readonly active_date: ISODateString | null;

  /**
   * Last update timestamp in epoch milliseconds.
   */
  readonly last_updated: EpochMs;
}

/**
 * Synchronization state status.
 */
export type SyncStatus =
  | "SYNCED"
  | "PENDING"
  | "FAILED"
  | "OFFLINE";

/**
 * Current synchronization state.
 */
export interface SyncState {
  /**
   * Current synchronization status.
   */
  readonly status: SyncStatus;

  /**
   * Most recent synchronization attempt timestamp in epoch milliseconds.
   * Null when no attempt has been made.
   */
  readonly lastAttempt: EpochMs | null;

  /**
   * Most recent successful synchronization timestamp in epoch milliseconds.
   * Null when no successful sync has occurred.
   */
  readonly lastSuccess: EpochMs | null;

  /**
   * Human-readable synchronization error message.
   * Null when no error exists.
   */
  readonly error: string | null;
}

