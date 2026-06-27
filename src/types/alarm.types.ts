import type {
  TimeString,
  ISODateString,
  EpochMs,
} from './common.types'

/**
 * Represents a 24-hour clock time.
 */
export interface AlarmTime {
  /**
   * Hour of day in 24-hour format.
   * Valid range: 0-23.
   */
  readonly hours: TimeString;

  /**
   * Minute of hour.
   * Valid range: 0-59.
   */
  readonly minutes: number;
}

/**
 * Alarm configuration persisted by the application.
 */
export interface AlarmConfig {
  /**
   * Default alarm time used when no override is active.
   */
  readonly defaultTime: TimeString;

  /**
   * Temporary alarm time override.
   * Null when no override exists.
   */
  readonly overrideTime: TimeString | null;

  /**
   * Active date for the override alarm. 
   * Enforced format: YYYY-MM-DD. Null when not date-specific.
   */
  readonly activeDate: ISODateString | null;

  /**
   * Indicates whether the alarm is enabled.
   */
  readonly isEnabled: boolean;

  /**
   * Last successful synchronization timestamp in epoch milliseconds.
   * Null when never synchronized.
   */
  readonly lastSyncedAt: EpochMs | null;
}

/**
 * Current alarm lifecycle status.
 */
export type AlarmStatus =
  | "SCHEDULED"
  | "FIRING"
  | "DISMISSED"
  | "DISABLED"
  | "ERROR";
