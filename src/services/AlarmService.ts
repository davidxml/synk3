import { SynkBridge } from '../bridge/SynkBridge';
import { formatAlarmTime, parseTimeString, parseISODateString, parseEpochMs } from '../utils/common.validators';
import type { AlarmTime, AlarmConfig } from '../types/alarm.types';
import type { CloudAlarmRecord } from '../types/sync.types';
import type { SetAlarmResult } from '../types/bridge.types';
import type { ISODateString } from '../types/common.types';

/**
 * The system's baseline alarm schedule, used when no override is active.
 * Maintained as a strict internal domain object (integers).
 */
export const DEFAULT_ALARM_TIME: Readonly<AlarmTime> = { hours: 5, minutes: 30 };

/**
 * The initial state configuration for the alarm system.
 */
export const DEFAULT_ALARM_CONFIG: Readonly<AlarmConfig> = {
  defaultTime: DEFAULT_ALARM_TIME,
  overrideTime: null,
  activeDate: null,
  isEnabled: false,
  lastSyncedAt: null,
};

/**
 * Translates a raw cloud DTO into a safe, internal Domain Model.
 * * Architectural Rules Enforced:
 * - DTO-002: Separates external wire format from internal domain models.
 * - SV-003: Acts as an Anti-Corruption Layer (ACL) boundary. All external 
 * primitives are passed through strict validators before being trusted.
 * * @param record - The raw data payload fetched from Firebase.
 * @param current - The current local configuration, used to preserve state the cloud doesn't own (like isEnabled).
 * @returns A strictly validated, immutable AlarmConfig object ready for application state.
 * @throws {TypeError} If any of the cloud data fails strict type boundary validation.
 */
export const mapCloudRecordToConfig = (
  record: Readonly<CloudAlarmRecord>,
  current: Readonly<AlarmConfig>
): Readonly<AlarmConfig> => {
  
  let overrideTime: Readonly<AlarmTime> | null = null;
  
  if (record.override_time !== null) {
    // SV-003: Pass through the ACL validator first to guarantee shape
    const safeTimeStr = parseTimeString(record.override_time);
    const [hStr, mStr] = safeTimeStr.split(':');
    overrideTime = { hours: parseInt(hStr, 10), minutes: parseInt(mStr, 10) };
  }

  let activeDate: ISODateString | null = null;
  if (record.active_date !== null) {
    // SV-003: Enforce calendar validity
    activeDate = parseISODateString(record.active_date); 
  }

  return {
    defaultTime: current.defaultTime, // Maintained from local domain
    overrideTime: overrideTime,
    activeDate: activeDate,
    isEnabled: current.isEnabled, // Cloud does not dictate user toggle state
    lastSyncedAt: parseEpochMs(record.last_updated) // SV-003: Brand the primitive
  };
};

/**
 * Pushes a temporary override schedule to the native Android AlarmManager.
 * * @param time - The internal domain object representing the target time.
 * @param date - The specific calendar date this override applies to.
 * @returns A BridgeResult indicating the success or failure of the native OS transaction.
 */
export const pushOverride = async (
  time: Readonly<AlarmTime>,
  date: ISODateString
): Promise<Readonly<SetAlarmResult>> => {
  // Boundary Translation: Safely serialize domain model to the strict bridge DTO
  const timeString = formatAlarmTime(time); 
  
  return await SynkBridge.setAlarm({
    time: timeString,
    isOverride: true,
    activeDate: date
  });
};

/**
 * Schedules the baseline default alarm with the native Android OS.
 * Used when an override expires or is manually cleared.
 * * @returns A BridgeResult indicating native OS success or failure.
 */
export const scheduleDefaultAlarm = async (): Promise<Readonly<SetAlarmResult>> => {
  const timeString = formatAlarmTime(DEFAULT_ALARM_TIME);
  
  return await SynkBridge.setAlarm({
    time: timeString,
    isOverride: false,
    activeDate: null
  });
};
