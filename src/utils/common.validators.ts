import type { EpochMs, TimeString, ISODateString } from '../types/common.types';
import type { AlarmTime } from '../types/alarm.types';

/**
 * Validates and brands a raw number as an EpochMs timestamp.
 * Acts as the Anti-Corruption Layer for time data entering the domain.
 * * @param value - The raw number to validate.
 * @returns The branded EpochMs.
 * @throws {TypeError} If the value is not a safe, positive integer.
 */
export const parseEpochMs = (value: number): EpochMs => {
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new TypeError(`Invalid EpochMs: ${value}`);
  }
  return value as EpochMs;
};

/**
 * Validates and brands a raw string as a TimeString (HH:mm).
 * Ensures the string represents a mathematically possible 24-hour time.
 * * @param value - The raw string to validate.
 * @returns The branded TimeString.
 * @throws {TypeError} If the string does not strictly match HH:mm format.
 */
export const parseTimeString = (value: string): TimeString => {
  if (!/^([01]\d|2[0-3]):([0-5]\d)$/.test(value)) {
    throw new TypeError(`Invalid TimeString: ${value}`);
  }
  return value as TimeString;
};

/**
 * Validates and brands a raw string as an ISODateString (YYYY-MM-DD).
 * Validates both the regex shape and actual calendar validity (e.g., rejects Feb 31).
 * * @param value - The raw string to validate.
 * @returns The branded ISODateString.
 * @throws {TypeError} If the string is misformatted or represents an impossible date.
 */
export const parseISODateString = (value: string): ISODateString => {
  if (!/^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/.test(value)) {
    throw new TypeError(`Invalid ISODateString: ${value}`);
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new TypeError(`Invalid Date logic: ${value}`);
  }
  return value as ISODateString;
};

/**
 * Serializes the internal AlarmTime domain object into a strict TimeString DTO.
 * Guarantees single digits are zero-padded (e.g., { hours: 8, minutes: 5 } -> "08:05")
 * before crossing the Capacitor bridge.
 * * @param time - The internal AlarmTime object.
 * @returns The strictly formatted TimeString.
 */
export const formatAlarmTime = (time: Readonly<AlarmTime>): TimeString => {
  const hh = time.hours.toString().padStart(2, '0');
  const mm = time.minutes.toString().padStart(2, '0');
  return `${hh}:${mm}` as TimeString;
};
