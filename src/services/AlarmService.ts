import { SynkBridge } from '../bridge/SynkBridge';
import type { 
  AlarmTime, 
  AlarmConfig, 
  SetAlarmResult, 
  CloudAlarmRecord 
} from '../types';
import type { 
  Time24String, 
  ISODateString, 
  EpochMs 
} from '../types';

export const DEFAULT_ALARM_TIME: Readonly<AlarmTime> = { hours: 5, minutes: 30 };

/**
 * Validates and formats an AlarmTime object into a zero-padded "HH:MM" string.
 */
export const formatAlarmTimeString = (time: Readonly<AlarmTime>): Time24String => {
  if (time.hours < 0 || time.hours > 23 || time.minutes < 0 || time.minutes > 59) {
    throw new TypeError(`Invalid alarm time bounds: ${time.hours}:${time.minutes}`);
  }
  const h = time.hours.toString().padStart(2, '0');
  const m = time.minutes.toString().padStart(2, '0');
  return `${h}:${m}` as Time24String;
};

/**
 * Parses a "HH:MM" string into a strictly typed AlarmTime object.
 */
export const parseAlarmTimeString = (raw: Time24String): Readonly<AlarmTime> => {
  if (!/^\d{2}:\d{2}$/.test(raw)) {
    throw new TypeError(`Invalid Time24String format: ${raw}`);
  }
  
  const [hStr, mStr] = raw.split(':');
  const hours = parseInt(hStr, 10);
  const minutes = parseInt(mStr, 10);

  if (hours > 23 || minutes > 59) {
    throw new TypeError(`Time bounds exceeded in string: ${raw}`);
  }

  return { hours, minutes };
};

/**
 * DTO-002: Maps a Cloud DTO (wire format) to the Domain Model.
 * SV-003: Validates external data before applying it to the domain.
 */
export const mapCloudRecordToConfig = (
  record: Readonly<CloudAlarmRecord>,
  current: Readonly<AlarmConfig>
): Readonly<AlarmConfig> => {
  
  let overrideTime: Readonly<AlarmTime> | null = null;
  
  // Validation boundary
  if (record.override_time !== null) {
    overrideTime = parseAlarmTimeString(record.override_time);
  }

  if (record.active_date !== null && !/^\d{4}-\d{2}-\d{2}$/.test(record.active_date)) {
    throw new TypeError(`Invalid ISODateString format in CloudRecord: ${record.active_date}`);
  }

  return {
    defaultTime: current.defaultTime, // Maintained from domain
    overrideTime: overrideTime,
    activeDate: record.active_date as ISODateString | null,
    isEnabled: current.isEnabled, // Cloud does not own this field
    lastSyncedAt: record.last_updated as EpochMs
  };
};

/**
 * Pushes an override schedule to the native Android AlarmManager.
 */
export const pushOverride = async (
  time: Readonly<AlarmTime>,
  date: ISODateString
): Promise<Readonly<SetAlarmResult>> => {
  const timeString = formatAlarmTimeString(time);
  
  return await SynkBridge.setAlarm({
    time: timeString,
    isOverride: true,
    activeDate: date
  });
};

/**
 * Schedules the default baseline alarm with the native Android AlarmManager.
 */
export const scheduleDefaultAlarm = async (): Promise<Readonly<SetAlarmResult>> => {
  const timeString = formatAlarmTimeString(DEFAULT_ALARM_TIME);
  
  return await SynkBridge.setAlarm({
    time: timeString,
    isOverride: false,
    activeDate: null
  });
};
