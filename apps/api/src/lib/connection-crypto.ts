import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from 'node:crypto';

const SCRYPT_SALT = 'umetrica-connections-v1';

function getEncryptionKey(): Buffer {
  const secret = process.env.CONNECTIONS_ENCRYPTION_KEY ?? process.env.BETTER_AUTH_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error('CONNECTIONS_ENCRYPTION_KEY or BETTER_AUTH_SECRET (32+ chars) is required');
  }
  return scryptSync(secret, SCRYPT_SALT, 32);
}

export function encryptCredentials(data: Record<string, unknown>): string {
  const key = getEncryptionKey();
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', key, iv);
  const plaintext = Buffer.from(JSON.stringify(data), 'utf8');
  const encrypted = Buffer.concat([cipher.update(plaintext), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, encrypted]).toString('base64');
}

export function decryptCredentials<T extends Record<string, unknown>>(payload: string): T {
  const buffer = Buffer.from(payload, 'base64');
  const iv = buffer.subarray(0, 12);
  const tag = buffer.subarray(12, 28);
  const encrypted = buffer.subarray(28);
  const key = getEncryptionKey();
  const decipher = createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(tag);
  const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);
  return JSON.parse(decrypted.toString('utf8')) as T;
}
