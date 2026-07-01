import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { AlarmConfig, AlarmTime } from '../types/alarm.types';
import type { SyncState } from '../types/sync.types';
import type { ISODateString } from '../types/common.types';
import { AlarmService, DEFAULT_ALARM_CONFIG } from '../services/AlarmService';
import { CloudSyncService } from '../services/CloudSyncService';
import { SynkBridge } from '../bridge/SynkBridge';
import { storageUtils, ALARM_STORAGE_KEY } from '../utils/storageUtils';
import { parseEpochMs, formatAlarmTime } from '../utils/common.validators';

export interface AlarmStoreState {
  /** The current operating configuration of the alarm system. */
  readonly config: AlarmConfig;
  /** Tracks the status and timestamps of background/foreground cloud synchronization. */
  readonly syncState: SyncState;
  /** Global loading flag for async store operations. */
  readonly isLoading: boolean;

  /** Hydrates the store from local SQLite/SharedPreferences cache on boot. */
  readonly loadFromCache: () => Promise<void>;
  /** Safely sets an override time, optimistically updating the UI and syncing to native. */
  readonly setOverrideTime: (time: Readonly<AlarmTime>, date: ISODateString) => Promise<void>;
  /** Toggles the local device alarm on or off via the Capacitor bridge. */
  readonly toggleAlarm: (enabled: boolean) => Promise<void>;
  /** Forces a pull from the cloud authority to update the local override schedule. */
  readonly syncFromCloud: () => Promise<void>;
}

const INITIAL_SYNC_STATE: Readonly<SyncState> = {
  status: 'OFFLINE',
  lastAttempt: null,
  lastSuccess: null,
  error: null,
};

/**
 * Global state orchestrator for the Alarm domain.
 * * Architectural Rules Enforced:
 * - ST-001: Orchestrates state and calls services; contains no raw business/parsing logic.
 * - ST-003: Persists only stable configuration data, ignoring volatile loading flags.
 */
export const useAlarmStore = create<AlarmStoreState>()(
  persist(
    (set, get) => ({
      config: DEFAULT_ALARM_CONFIG,
      syncState: INITIAL_SYNC_STATE,
      isLoading: false,

      loadFromCache: async () => {
        set({ isLoading: true });
        try {
          // Relies on storageUtils implementing the Anti-Corruption Layer internally
          const cachedConfig = await storageUtils.readAlarmConfig();
          set({ 
            config: cachedConfig || DEFAULT_ALARM_CONFIG, 
            isLoading: false 
          });
        } catch (err) {
          set({ config: DEFAULT_ALARM_CONFIG, isLoading: false });
        }
      },

      setOverrideTime: async (time: Readonly<AlarmTime>, date: ISODateString) => {
        const previousConfig = get().config;
        
        // Optimistic UI Update: Assume the bridge will succeed
        set({
          config: { ...previousConfig, overrideTime: time, activeDate: date },
        });

        try {
          const result = await AlarmService.pushOverride(time, date);
          
          if (!result.success) {
            // Rollback on native OS failure
            set({ config: previousConfig }); 
          }
          
          set({ syncState: { ...get().syncState, error: result.error } });
        } catch (err) {
          set({
            config: previousConfig, // Rollback on hard exception
            syncState: {
              ...get().syncState,
              status: 'FAILED',
              error: err instanceof Error ? err.message : 'Failed to push override',
            },
          });
        }
      },

      toggleAlarm: async (enabled: boolean) => {
        set({ isLoading: true });
        try {
          // Boundary translation: Domain logic -> Native Bridge DTO
          const targetTimeObj = get().config.overrideTime || get().config.defaultTime;
          const bridgeFormattedTime = formatAlarmTime(targetTimeObj);

          const result = enabled 
            ? await SynkBridge.setAlarm({ 
                time: bridgeFormattedTime, 
                isOverride: get().config.overrideTime !== null, 
                activeDate: get().config.activeDate 
              })
            : await SynkBridge.cancelAlarm();

          if (result.success) {
            set({ config: { ...get().config, isEnabled: enabled } });
          } else {
            set({ syncState: { ...get().syncState, error: result.error } });
          }
        } catch (err) {
          set({ syncState: { ...get().syncState, error: err instanceof Error ? err.message : 'Bridge failure' } });
        } finally {
          set({ isLoading: false });
        }
      },

      syncFromCloud: async () => {
        set({ isLoading: true });
        try {
          const cloudRecord = await CloudSyncService.fetchLatest();
          
          if (!cloudRecord) {
            set({
              syncState: {
                ...get().syncState,
                status: 'OFFLINE',
                lastAttempt: parseEpochMs(Date.now()), // ACL Enforced primitive
                error: 'No cloud record available',
              }
            });
          } else {
            // Hand off raw DTO to Domain Service for mapping
            const mappedConfig = AlarmService.mapCloudRecordToConfig(cloudRecord, get().config);

            set({ 
              config: mappedConfig,
              syncState: {
                status: 'SYNCED',
                lastAttempt: parseEpochMs(Date.now()), // ACL Enforced
                lastSuccess: parseEpochMs(Date.now()), // ACL Enforced
                error: null,
              }
            });
          }
        } catch (err) {
          set({
            syncState: {
              ...get().syncState,
              status: 'FAILED',
              lastAttempt: parseEpochMs(Date.now()), // ACL Enforced
              error: err instanceof Error ? err.message : 'Cloud sync failed',
            }
          });
        } finally {
          set({ isLoading: false });
        }
      },
    }),
    {
      name: ALARM_STORAGE_KEY,
      // Rule ST-003: Never persist volatile state like sync status or loading flags
      partialize: (state) => ({ config: state.config }),
      skipHydration: true, 
    }
  )
);
