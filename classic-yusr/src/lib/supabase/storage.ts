import * as SecureStore from 'expo-secure-store';

// SecureStore warns above ~2KB per value, and a Supabase session is larger.
// Split the value across numbered keys: `${key}.n` holds the chunk count.
const CHUNK_SIZE = 1800;

export function splitIntoChunks(value: string, size = CHUNK_SIZE): string[] {
  const chunks: string[] = [];
  for (let i = 0; i < value.length; i += size) chunks.push(value.slice(i, i + size));
  return chunks.length > 0 ? chunks : [''];
}

async function removeChunks(key: string): Promise<void> {
  const count = Number(await SecureStore.getItemAsync(`${key}.n`));
  if (Number.isInteger(count) && count > 0) {
    await Promise.all(Array.from({ length: count }, (_, i) => SecureStore.deleteItemAsync(`${key}.${i}`)));
  }
  await SecureStore.deleteItemAsync(`${key}.n`);
}

/** Supabase auth `storage` adapter backed by the iOS Keychain / Android Keystore. */
export const secureStorage = {
  async getItem(key: string): Promise<string | null> {
    const count = Number(await SecureStore.getItemAsync(`${key}.n`));
    if (!Number.isInteger(count) || count <= 0) return null;
    const parts = await Promise.all(
      Array.from({ length: count }, (_, i) => SecureStore.getItemAsync(`${key}.${i}`)),
    );
    return parts.some((part) => part === null) ? null : parts.join('');
  },
  async setItem(key: string, value: string): Promise<void> {
    await removeChunks(key);
    const chunks = splitIntoChunks(value);
    await Promise.all(chunks.map((chunk, i) => SecureStore.setItemAsync(`${key}.${i}`, chunk)));
    await SecureStore.setItemAsync(`${key}.n`, String(chunks.length));
  },
  async removeItem(key: string): Promise<void> {
    await removeChunks(key);
  },
};
