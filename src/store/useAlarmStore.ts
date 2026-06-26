import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { AlarmConfig, AlarmTime } from '../types/alarm.types';
import type { SyncState } from '../types/sync.types';
import type { ISODateString } from '../types/common.types';
import { AlarmService, DEFAULT_ALARM_CONFIG } from '../services/AlarmService';
import { CloudSyncService } from '../services/CloudSyncService';
import { SynkBridge } from '../bridge/SynkBridge';
import { storageUtils, ALARM_STORAGE_KEY } from '../utils/storageUtils';

export interface AlarmStoreState {
  readonly config: AlarmConfig;
  readonly syncState: SyncState;
  readonly isLoading: boolean;

  readonly loadFromCache: () => Promise<void>;
  readonly setOverrideTime: (time: AlarmTime, date: ISODateString) => Promise<void>;
  readonly toggleAlarm: (enabled: boolean) => Promise<void>;
  readonly syncFromCloud: () => Promise<void>;
}

const INITIAL_SYNC_STATE: SyncState = {
  status: 'OFFLINE',
  lastAttempt: null,
  lastSuccess: null,
  error: null,
};

export const useAlarmStore = create<AlarmStoreState>()(
  persist(
    (set, get) => ({
      config: DEFAULT_ALARM_CONFIG,
      syncState: INITIAL_SYNC_STATE,
      isLoading: false,

      loadFromCache: async () => {
        set({ isLoading: true });
        try {
          const cachedConfig = await storageUtils.readAlarmConfig();
          set({ 
            config: cachedConfig || DEFAULT_ALARM_CONFIG, 
            isLoading: false 
          });
        } catch (err) {
          set({ config: DEFAULT_ALARM_CONFIG, isLoading: false });
        }
      },

      setOverrideTime: async (time: AlarmTime, date: ISODateString) => {
        const previousConfig = get().config;
        
        // Optimistic UI Update
        set({
          config: { ...previousConfig, overrideTime: time, activeDate: date },
        });

        try {
          const result = await AlarmService.pushOverride(time, date);
          
          if (!result.success) {
            // Rollback on failure
            set({ config: previousConfig });
          }
          
          set({ syncState: result.syncState });
        } catch (err) {
          // Rollback on hard error
          set({
            config: previousConfig,
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
          const result = enabled 
            ? await SynkBridge.setAlarm({ 
                time: get().config.overrideTime || get().config.defaultTime, 
                isOverride: get().config.overrideTime !== null, 
                activeDate: get().config.activeDate 
              })
            : await SynkBridge.cancelAlarm();

          if (result.success) {
            set({ config: { ...get().config, isEnabled: enabled } });
          } else {
            // We use the sync state error purely for global error visibility
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
            // No data available from cloud — mark offline and preserve existing config
            set({
              syncState: {
                ...get().syncState,
                status: 'OFFLINE',
                lastAttempt: Date.now(),
                error: 'No cloud record available',
              }
            });
          } else {
            const mappedConfig = AlarmService.mapCloudRecordToConfig(cloudRecord, get().config);

            set({ 
              config: mappedConfig,
              syncState: {
                status: 'SYNCED',
                lastAttempt: Date.now(),
                lastSuccess: Date.now(),
                error: null,
              }
            });
          }
        } catch (err) {
          set({
            syncState: {
              ...get().syncState,
              status: 'FAILED',
              lastAttempt: Date.now(),
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
      // Rule: Persist only AlarmConfig. Never persist SyncState or isLoading.
      partialize: (state) => ({ config: state.config }),
      skipHydration: true, 
    }
  )
);
