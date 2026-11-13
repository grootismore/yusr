import * as Crypto from 'expo-crypto';

const toBase64Url = (bytes: Uint8Array): string => {
  let bin = '';
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
};

/** A fresh invite token: 32 random bytes, base64url (43 characters), and its SHA-256 hex. Only the hash is stored. */
export async function newInviteToken(): Promise<{ token: string; hash: string }> {
  const token = toBase64Url(await Crypto.getRandomBytesAsync(32));
  const hash = await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, token);
  return { token, hash };
}

export const TOKEN_PATTERN = /^[A-Za-z0-9_-]{43}$/;
export const inviteLink = (base: string, token: string): string => `${base.replace(/\/$/, '')}/accept?token=${token}`;
