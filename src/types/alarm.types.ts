import type { TimeString, ISODateString, EpochMs } from './common.types';

/**
 * Internal domain representation of a 24-hour time.
 * Strictly uses integers to allow for safe mathematical operations.
 */
export interface AlarmTime {
  /** Hour of day in 24-hour format (0-23). */
  readonly hours: number;
  /** Minute of hour (0-59). */
  readonly minutes: number;
}

/**
 * The core configuration for local alarm behavior.
 * Represents the finalized state mapped from remote cloud records.
 */
export interface AlarmConfig {
  /** The baseline alarm time applied when no override exists. */
  readonly defaultTime: Readonly<AlarmTime>;
  /** Temporary date-specific alarm time that overrides the default. */
  readonly overrideTime: Readonly<AlarmTime> | null;
  /** The specific calendar date the override applies to. */
  readonly activeDate: ISODateString | null;
  /** Whether the alarm system is currently toggled on. */
  readonly isEnabled: boolean;
  /** The last successful sync timestamp, used for conflict resolution. */
  readonly lastSyncedAt: EpochMs | null;
}

/**
 * The lifecycle state of a scheduled alarm.
 */
export type AlarmStatus = 
|"SCHEDULED" 
| "FIRING" 
| "DISMISSED" 
| "DISABLED" 
| "ERROR";
