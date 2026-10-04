import type { Store } from './database.ts';
import { DomainError } from './security.ts';

export async function requireLiveSession(db: Store, sessionId: string, userId: string) {
  const result = await db.transaction(async q => {
    await q.query("SELECT set_config('wallet.auth_session_id',$1,true),set_config('request.jwt.claim.sub',$2,true)", [sessionId, userId]);
    return q.query('SELECT private.wallet_session_valid($1::uuid,$2::uuid) valid', [sessionId, userId]);
  });
  if (result.rows[0]?.valid !== true) throw new DomainError('Session expired. Sign in again.', 401);
}
