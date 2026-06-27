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
 * Strict typing for ISO 8601 Date (YYYY-MM-DD) to prevent bridge parsing errors.
 */
type ISODateString = `${number}-${number}-${number}`;

/**
 * Strict typing for time strings (HH:mm) and ISO Dates (YYYY-MM-DD)
 * to prevent native Android parsing exceptions.
 */

type TimeString = `${number}:${number}`;

/**
 * Alarm configuration persisted by the application.
 */
export interface AlarmConfig {
  /**
   * Default alarm time used when no override is active.
   */
  readonly defaultTime: AlarmTime;

  /**
   * Temporary alarm time override.
   * Null when no override exists.
   */
  readonly overrideTime: AlarmTime | null;

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
  readonly lastSyncedAt: number | null;
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