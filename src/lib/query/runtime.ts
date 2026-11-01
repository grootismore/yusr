import NetInfo from '@react-native-community/netinfo';
import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister';
import { focusManager, onlineManager } from '@tanstack/react-query';
import Storage from 'expo-sqlite/kv-store';
import { AppState } from 'react-native';
import { supabaseApi } from './api';
import { createQueryClient } from './client';

export const queryClient = createQueryClient(supabaseApi);

// The cache and any queued offline writes live in a local SQLite key-value table.
// ponytail: stored unencrypted on the device (OS sandbox only); revisit with SQLCipher before launch.
export const persister = createAsyncStoragePersister({
  storage: Storage,
  key: 'yusr.query-cache',
  throttleTime: 1000,
});

// Online = connected and not known to be unreachable (isInternetReachable is null until probed).
onlineManager.setEventListener((setOnline) =>
  NetInfo.addEventListener((state) => setOnline(state.isConnected !== false && state.isInternetReachable !== false)),
);

focusManager.setEventListener((handleFocus) => {
  const subscription = AppState.addEventListener('change', (state) => handleFocus(state === 'active'));
  return () => subscription.remove();
});

// When connectivity returns: send queued writes first, then refetch server truth.
onlineManager.subscribe(async (online) => {
  if (!online) return;
  await queryClient.resumePausedMutations();
  await queryClient.invalidateQueries();
});

/** Number of writes made but not yet confirmed by the server. */
export const pendingChangeCount = (): number => queryClient.isMutating();

/** Wipe the in-memory and on-disk cache (sign-out). */
export async function clearLocalData(): Promise<void> {
  queryClient.clear();
  await persister.removeClient();
}
