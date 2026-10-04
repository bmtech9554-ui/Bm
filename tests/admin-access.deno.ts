import assert from 'node:assert/strict';
import { WalletDomain, type Actor } from '../supabase/functions/wallet-api/domain.ts';
import type { Store } from '../supabase/functions/wallet-api/database.ts';
const actor: Actor = { id: 'test-actor', email: 'test@example.invalid', name: 'Test', role: 'AUDITOR', permissions: [], requireMfa: false, aal: 'aal1' };
const blocked = async (): Promise<never> => { throw new Error('No provider in authorization tests'); };
function makeDomain() {
 const calls: string[] = [];
 const db = { query: async (sql: string) => {
  calls.push(sql);
  if (sql === 'SELECT * FROM system_settings WHERE id=1') return { rows: [{ value: {}, revision: 1 }] };
  throw new Error('Unexpected query: ' + sql);
 } } as unknown as Store;
 const domain = new WalletDomain(db, { encrypt: () => '', decrypt: () => ({}) }, { verify: blocked, payout: blocked, receipt: blocked }, 'provider');
 return { domain, calls };
}
Deno.test('administrator requires AAL2 even when require_mfa is false', async () => {
 const { domain, calls } = makeDomain(); domain.actor = async () => actor;
 await assert.rejects(domain.administrator(actor), /MFA-verified/);
 domain.actor = async () => ({ ...actor, aal: 'aal2' });
 assert.equal((await domain.administrator(actor)).aal, 'aal2');
 assert.deepEqual(calls, []);
});
Deno.test('snapshot denies AAL1 before database reads', async () => {
 const { domain, calls } = makeDomain();
 await assert.rejects(domain.snapshot(actor, true), /Administrator access required/);
 assert.deepEqual(calls, []);
});
Deno.test('admin without users.read never queries the user directory', async () => {
 const { domain, calls } = makeDomain();
 const snapshot = await domain.snapshot({ ...actor, aal: 'aal2' }, true);
 assert.deepEqual(snapshot.users, []);
 assert.deepEqual(calls, ['SELECT * FROM system_settings WHERE id=1']);
});
