import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';

const KEY_PREFIX = 'ipk_';
const KEY_BYTES = 32;

export const generateApiKey = (): string =>
  `${KEY_PREFIX}${randomBytes(KEY_BYTES).toString('base64url')}`;

export const hashApiKey = (rawKey: string): string =>
  createHash('sha256').update(rawKey, 'utf8').digest('hex');

export const apiKeyPrefix = (rawKey: string): string => rawKey.slice(0, 16);

export const safeEqual = (left: string, right: string): boolean => {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);

  if (leftBuffer.length !== rightBuffer.length) return false;
  return timingSafeEqual(leftBuffer, rightBuffer);
};
