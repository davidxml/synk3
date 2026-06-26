/**
 * Central export point for all type definitions.
 * Simplifies imports across the application.
 */

export type { AlarmTime, AlarmConfig, AlarmStatus } from './alarm.types';
export type {
  UserRole,
  AuthState,
  TOTPPayload,
  LeaseValidationResult,
} from './auth.types';
export type {
  BridgeResult,
  SetAlarmPayload,
  SetAlarmResult,
  ValidateLeasePayload,
  ValidateLeaseResult,
  CancelAlarmResult,
  GetAlarmStatusResult,
  ScheduleBackgroundSyncResult,
  GetElapsedRealtimeResult,
} from './bridge.types';
export type {
  CloudAlarmRecord,
  SyncStatus,
  SyncState,
} from './sync.types';
export type {
  EpochMs,
  Time24String,
  ISODateString,
  TOTPVerificationResult,
} from './common.types';
export type {
  NotificationPermissionError,
  NotificationPermissionResult,
} from './notification.types';
