import { randomUUID } from 'node:crypto';
import jwt from 'jsonwebtoken';
import type { JwtPayload } from 'jsonwebtoken';

export type TokenKind = 'access' | 'refresh';

export type AccessTokenPayload = {
  userId: string;
  type: 'access';
};

export type RefreshTokenPayload = {
  userId: string;
  type: 'refresh';
};

const ACCESS_TTL_SECONDS = Number(
  process.env.JWT_ACCESS_TTL_SECONDS ?? 15 * 60
);
const REFRESH_TTL_SECONDS = Number(
  process.env.JWT_REFRESH_TTL_SECONDS ?? 7 * 24 * 60 * 60
);

const getSecret = (): string => {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET não está definido');
  }
  return secret;
};

const sign = (
  payload: AccessTokenPayload | RefreshTokenPayload,
  expiresIn: number
): string =>
  jwt.sign(payload, getSecret(), {
    expiresIn,
    issuer: 'instantpay',
    audience: 'instantpay-api',
    jwtid: randomUUID(),
  });

export const signAccessToken = (userId: string): string =>
  sign({ userId, type: 'access' }, ACCESS_TTL_SECONDS);

export const signRefreshToken = (userId: string): string =>
  sign({ userId, type: 'refresh' }, REFRESH_TTL_SECONDS);

const verify = (token: string): JwtPayload | null => {
  try {
    const decoded = jwt.verify(token, getSecret(), {
      issuer: 'instantpay',
      audience: 'instantpay-api',
    });
    return typeof decoded === 'string' ? null : decoded;
  } catch {
    return null;
  }
};

export const verifyAccessToken = (token: string): AccessTokenPayload | null => {
  const payload = verify(token);
  if (!payload || payload.type !== 'access' || typeof payload.userId !== 'string') {
    return null;
  }
  return { userId: payload.userId, type: 'access' };
};

export const verifyRefreshToken = (
  token: string
): RefreshTokenPayload | null => {
  const payload = verify(token);
  if (!payload || payload.type !== 'refresh' || typeof payload.userId !== 'string') {
    return null;
  }
  return { userId: payload.userId, type: 'refresh' };
};

export const accessTokenTtlSeconds = ACCESS_TTL_SECONDS;
export const refreshTokenTtlSeconds = REFRESH_TTL_SECONDS;
