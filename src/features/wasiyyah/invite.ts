import * as Crypto from 'expo-crypto';

/** 32 random bytes as base64url, no padding: 43 characters. Matches the server's TOKEN_PATTERN. */
export function generateInviteToken(): string {
  const bytes = Crypto.getRandomBytes(32);
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/** SHA-256 as lowercase hex: the only form of the token the server ever stores. */
export function hashInviteToken(token: string): Promise<string> {
  return Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, token);
}

/**
 * The link the owner sends. The token sits after "#", which browsers never send to a server,
 * so it does not appear in the accept page's access logs.
 */
export function buildInviteLink(baseUrl: string, token: string): string {
  return `${baseUrl.replace(/#.*$/, '').replace(/\/+$/, '')}/#${token}`;
}

const INVITE_DAYS = 7;
export const inviteExpiry = (now = new Date()): string => new Date(now.getTime() + INVITE_DAYS * 864e5).toISOString();

export const isPlausibleEmail = (value: string): boolean => /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(value.trim()) && value.trim().length <= 254;
