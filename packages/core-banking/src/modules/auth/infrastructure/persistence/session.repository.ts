import type { DbExecutor } from '../../../../shared/db/transaction.js';
import type {
  CreateSessionRecord,
  ISessionRepository,
  SessionRecord,
} from '../../application/ports/auth.port.js';

type SessionRow = {
  id: string;
  user_id: string;
  token: string;
  refresh_token: string;
  user_agent: string | null;
  ip_address: string | null;
  is_active: boolean;
  expires_at: Date;
  created_at: Date;
};

const toResponse = (row: SessionRow): SessionRecord => ({
  id: row.id,
  userId: row.user_id,
  token: row.token,
  refreshToken: row.refresh_token,
  userAgent: row.user_agent,
  ipAddress: row.ip_address,
  isActive: row.is_active,
  expiresAt: row.expires_at,
  createdAt: row.created_at,
});

export const createSessionRepository = (
  db: DbExecutor
): ISessionRepository => ({
  async create(data: CreateSessionRecord): Promise<SessionRecord> {
    const result = await db.query<SessionRow>(
      `INSERT INTO user_sessions
        (user_id, token, refresh_token, user_agent, ip_address, expires_at)
       VALUES ($1::uuid, $2, $3, $4, $5, $6)
       RETURNING *`,
      [
        data.userId,
        data.token,
        data.refreshToken,
        data.userAgent ?? null,
        data.ipAddress ?? null,
        data.expiresAt,
      ]
    );
    return toResponse(result.rows[0]);
  },

  async findByToken(token: string): Promise<SessionRecord | null> {
    const result = await db.query<SessionRow>(
      'SELECT * FROM user_sessions WHERE token = $1 LIMIT 1',
      [token]
    );
    return result.rows[0] ? toResponse(result.rows[0]) : null;
  },

  async findByRefreshToken(refreshToken: string): Promise<SessionRecord | null> {
    const result = await db.query<SessionRow>(
      'SELECT * FROM user_sessions WHERE refresh_token = $1 LIMIT 1',
      [refreshToken]
    );
    return result.rows[0] ? toResponse(result.rows[0]) : null;
  },

  async revoke(sessionId: string): Promise<void> {
    await db.query(
      'UPDATE user_sessions SET is_active = FALSE WHERE id = $1::uuid',
      [sessionId]
    );
  },

  async revokeByToken(token: string): Promise<void> {
    await db.query(
      'UPDATE user_sessions SET is_active = FALSE WHERE token = $1',
      [token]
    );
  },

  async revokeAllByUser(userId: string): Promise<void> {
    await db.query(
      'UPDATE user_sessions SET is_active = FALSE WHERE user_id = $1::uuid',
      [userId]
    );
  },
});
