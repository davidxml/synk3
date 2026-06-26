import { initializeApp } from 'firebase/app';
import { getFirestore, doc, getDoc, setDoc } from 'firebase/firestore';
import type { CloudAlarmRecord, SyncStatus } from '../types/sync.types';
import type { EpochMs } from '../types/common.types';

class ConfigurationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ConfigurationError';
  }
}

const apiKey = import.meta.env.VITE_FIREBASE_API_KEY;
if (!apiKey) {
  throw new ConfigurationError("VITE_FIREBASE_API_KEY is missing from environment.");
}

const app = initializeApp({
  apiKey,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
});

const db = getFirestore(app);

/**
 * Fetches the latest schedule from the cloud.
 * CL-001: Firebase SDK types never leak out of this function.
 * SV-003: Deep shape validation of incoming network payload.
 */
export const fetchLatest = async (): Promise<Readonly<CloudAlarmRecord> | null> => {
  try {
    const docRef = doc(db, 'alarmSchedule', 'current');
    const snap = await getDoc(docRef);

    if (!snap.exists()) {
      return null;
    }

    const data = snap.data();

    // SV-003: Validate Network Types strictly before trusting the object
    if (typeof data.last_updated !== 'number') {
      return null; 
    }
    if (data.override_time !== null && !/^\d{2}:\d{2}$/.test(data.override_time)) {
      return null;
    }
    if (data.active_date !== null && !/^\d{4}-\d{2}-\d{2}$/.test(data.active_date)) {
      return null;
    }

    return {
      override_time: data.override_time,
      active_date: data.active_date,
      last_updated: data.last_updated as EpochMs
    };
  } catch (err) {
    // Return null on network failure, never throw to caller.
    return null;
  }
};

/**
 * Pushes a new override schedule to the cloud.
 */
export const pushOverride = async (
  record: Readonly<CloudAlarmRecord>
): Promise<Readonly<SyncStatus>> => {
  try {
    const docRef = doc(db, 'alarmSchedule', 'current');
    
    // CL-002: Overwrite timestamp at the moment of network push
    await setDoc(docRef, {
      ...record,
      last_updated: Date.now() as EpochMs
    });

    return 'SYNCED';
  } catch (err) {
    return 'FAILED';
  }
};
