import { initializeApp, getApps } from 'firebase/app';
import { getFirestore, doc, getDoc, setDoc, enableIndexedDbPersistence, type Firestore } from 'firebase/firestore';
import { parseTimeString, parseISODateString, parseEpochMs } from '../utils/common.validators';
import type { CloudAlarmRecord, SyncStatus } from '../types/sync.types';
import type { EpochMs } from '../types/common.types';

class ConfigurationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ConfigurationError';
  }
}

/**
 * Lazy-loaded database instance to prevent global scope bombs on module import.
 */
let dbInstance: Firestore | null = null;

/**
 * Initializes Firebase and configures offline IndexedDB persistence.
 * * Architectural Rules Enforced:
 * - AR-004 (Offline First): Enables local Firestore caching so pushes survive network partitions.
 */
const getDb = async (): Promise<Firestore> => {
  if (dbInstance) return dbInstance;

  const apiKey = import.meta.env.VITE_FIREBASE_API_KEY;
  if (!apiKey) throw new ConfigurationError("VITE_FIREBASE_API_KEY is missing.");

  const app = getApps().length === 0 ? initializeApp({
    apiKey,
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
    appId: import.meta.env.VITE_FIREBASE_APP_ID,
  }) : getApps()[0];

  dbInstance = getFirestore(app);
  
  try {
    await enableIndexedDbPersistence(dbInstance);
  } catch (err) {
    console.warn("Firestore offline persistence failed to enable:", err);
    // Non-fatal, app can continue with purely live network access
  }

  return dbInstance;
};

/**
 * Result wrapper for fetching cloud data to prevent 'Null Swallowing' of distinct error states.
 */
export interface CloudFetchResult {
  readonly success: boolean;
  readonly data: Readonly<CloudAlarmRecord> | null;
  readonly error: string | null;
}

/**
 * Fetches the latest schedule from the cloud.
 * * Architectural Rules Enforced:
 * - CL-001: Firebase SDK types (like DocumentSnapshot) never leak out of this function.
 * - SV-003: Deep shape validation of incoming network payload via the Anti-Corruption Layer.
 */
export const fetchLatest = async (): Promise<Readonly<CloudFetchResult>> => {
  try {
    const db = await getDb();
    // Multi-tenant note: In a production scale-up, 'current' should be scoped to a specific coordinator ID.
    const docRef = doc(db, 'alarmSchedule', 'current');
    const snap = await getDoc(docRef);

    if (!snap.exists()) {
      return { success: true, data: null, error: null }; // Valid empty state
    }

    const data = snap.data();

    // SV-003: Pass primitives through the ACL validators before trusting them
    let validatedOverrideTime = null;
    if (data.override_time) validatedOverrideTime = parseTimeString(data.override_time);
    
    let validatedActiveDate = null;
    if (data.active_date) validatedActiveDate = parseISODateString(data.active_date);

    const validatedLastUpdated = parseEpochMs(data.last_updated);

    return {
      success: true,
      data: {
        override_time: validatedOverrideTime,
        active_date: validatedActiveDate,
        last_updated: validatedLastUpdated
      },
      error: null
    };
  } catch (err) {
    // Preserve observability: we return the network failure rather than just 'null'
    return { 
      success: false, 
      data: null, 
      error: err instanceof Error ? err.message : 'Network fetch failed' 
    };
  }
};

/**
 * Pushes a new override schedule to the cloud.
 * * Architectural Rules Enforced:
 * - CL-002: Timestamp-based synchronization. Overwrites timestamp at the moment of network push.
 */
export const pushOverride = async (
  record: Readonly<CloudAlarmRecord>
): Promise<Readonly<SyncStatus>> => {
  try {
    const db = await getDb();
    const docRef = doc(db, 'alarmSchedule', 'current');
    
    // Boundary Validation: Ensure the timestamp is branded before it leaves the app
    const currentEpoch = parseEpochMs(Date.now());

    await setDoc(docRef, {
      ...record,
      last_updated: currentEpoch
    });

    return 'SYNCED';
  } catch (err) {
    return 'FAILED';
  }
};
