import Storage from 'expo-sqlite/kv-store';

const KEY = 'yusr.lock-notice-seen';

/** Has the person been told (once, on this phone) that the app lock is optional and where it lives? */
export function lockNoticeSeen(): boolean {
  try {
    return Storage.getItemSync(KEY) === '1';
  } catch {
    return true; // if it cannot be remembered, never nag
  }
}

export function markLockNoticeSeen(): void {
  try {
    Storage.setItemSync(KEY, '1');
  } catch {
    // Not persisted; at worst it is shown once more.
  }
}
