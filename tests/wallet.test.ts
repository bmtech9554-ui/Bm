import test from 'node:test';
import assert from 'node:assert/strict';
import { atomicToUsdt, readWalletSummary, readWalletLedger, ledgerItem, PAGE_SIZE } from '../supabase/functions/wallet-api/wallet-read.ts';
import { withCors } from '../supabase/functions/wallet-api/cors.ts';
import { isWalletSummary, isWalletTransactionsResponse } from '../src/services/wallet-contract.ts';
import { authenticatedJson, validateWalletEndpoint } from '../src/services/wallet-transport.ts';
import { formatUsdt } from '../src/components/Amount.tsx';

const owner = 'owner-user';
const id = (n: number) => '00000000-0000-4000-8000-' + String(n).padStart(12, '0');
const row = { status: 'Active', wallet_id: id(1), currency: 'USDT', total: '9007199254740993', held: '1000001' };
function database(responses: any[][]) {
  const calls: { sql: string; args: unknown[] }[] = [];
  const db: any = {
    query: async (sql: string, args: unknown[] = []) => { calls.push({ sql, args }); assert.ok(responses.length, 'unexpected query'); return { rows: responses.shift()! }; },
    transaction: async (fn: any) => fn(db),
  };
  return { db, calls };
}
const ledgerRow = (n = 1, kind = 'DEPOSIT_CREDIT', amount = '1000001') => ({ id: id(n), kind, amount_atomic: amount, reference: 'verified-reference', created_at: '2026-10-04T00:00:00Z' });

test('atomic USDT keeps six digits and integers beyond Number precision', () => {
  assert.equal(atomicToUsdt('9007199254740993'), '9007199254.740993');
  assert.equal(atomicToUsdt('1'), '0.000001');
  assert.equal(atomicToUsdt('-1'), '-0.000001');
  assert.equal(atomicToUsdt('0'), '0.000000');
  for (const value of ['1.2','1e6','','01','NaN']) assert.throws(() => atomicToUsdt(value));
  assert.equal(formatUsdt('9007199254.740993'), '9,007,199,254.740993');
});
test('summary is owner-scoped, exact, holds-aware and payment-disabled', async () => {
  const { db, calls } = database([[row]]);
  const value = await readWalletSummary(db, owner);
  assert.equal(value.availableBalanceUsdt, '9007199253.740992');
  assert.equal(value.heldBalanceUsdt, '1.000001');
  assert.equal(value.depositAddress, null);
  assert.equal(value.paymentsEnabled, false);
  assert.ok(isWalletSummary(value));
  assert.deepEqual(calls[0].args, [owner]);
  assert.match(calls[0].sql, /u.id=\$1/);
  assert.match(calls[0].sql, /h.status='ACTIVE'/);
});
test('zero comes from an existing database wallet, not missing data', async () => {
  assert.equal((await readWalletSummary(database([[{ ...row, total: '0', held: '0' }]]).db, owner)).balanceUsdt, '0.000000');
  for (const rows of [[], [{ ...row, wallet_id: null }], [{ ...row, status: 'Suspended' }], [{ ...row, currency: 'OTHER' }], [{ ...row, held: '-1' }], [{ ...row, total: '1', held: '2' }]]) {
    await assert.rejects(readWalletSummary(database([rows]).db, owner));
  }
});
test('client rejects numeric/missing/inconsistent amounts and wrong asset/network', async () => {
  const value = await readWalletSummary(database([[row]]).db, owner);
  for (const patch of [{ balanceUsdt: 1 }, { balanceUsdt: undefined }, { availableBalanceUsdt: '1.000000' }, { heldBalanceUsdt: '-1.000000' }, { asset: 'OTHER' }, { network: 'ERC20' }, { depositAddress: 'T' + 'A'.repeat(33) }]) {
    assert.equal(isWalletSummary({ ...value, ...patch }), false);
  }
});
test('ledger preserves signed adjustments, withdrawals, reversals and referral credits', () => {
  for (const [kind, type, amount] of [['DEPOSIT_CREDIT','deposit','1'],['WITHDRAWAL_DEBIT','withdrawal','-2000001'],['REFERRAL_REWARD','referral','1'],['CREDIT_ADJUSTMENT','adjustment','1'],['DEBIT_ADJUSTMENT','adjustment','-1'],['CORRECTION','adjustment','-1'],['REVERSAL','reversal','-1']]) {
    const item = ledgerItem(ledgerRow(1, kind, amount));
    assert.equal(item.type, type); assert.equal(item.amountUsdt, atomicToUsdt(amount));
    assert.ok(isWalletTransactionsResponse({ transactions: [item], nextCursor: null }));
  }
  for (const [kind, amount] of [['UNKNOWN','1'],['DEPOSIT_CREDIT','-1'],['WITHDRAWAL_DEBIT','1'],['DEPOSIT_CREDIT','0']]) assert.throws(() => ledgerItem(ledgerRow(1, kind, amount)));
});
test('history uses stable keyset pagination and returns only explicit fields', async () => {
  const { db, calls } = database([[row], Array.from({ length: PAGE_SIZE + 1 }, (_, i) => ledgerRow(i + 1))]);
  const page = await readWalletLedger(db, owner, null);
  assert.equal(page.transactions.length, PAGE_SIZE); assert.equal(page.nextCursor, id(PAGE_SIZE));
  assert.ok(isWalletTransactionsResponse(page));
  assert.deepEqual(calls[0].args, [owner]); assert.deepEqual(calls[1].args, [row.wallet_id, null, PAGE_SIZE + 1]);
  assert.match(calls[1].sql, /ORDER BY created_at DESC,id DESC/);
  assert.equal('actor_id' in page.transactions[0], false);
  assert.equal('reason' in page.transactions[0], false);
});
test('unknown or foreign-wallet cursor is rejected', async () => {
  await assert.rejects(readWalletLedger(database([]).db, owner, 'not-a-uuid'));
  const { db, calls } = database([[row], []]);
  await assert.rejects(readWalletLedger(db, owner, id(99)), /Invalid history cursor/);
  assert.deepEqual(calls[1].args, [id(99), row.wallet_id]);
  assert.match(calls[1].sql, /wallet_id=\$2/);
});
test('next page is scoped to the same wallet and empty ledger is valid', async () => {
  const { db, calls } = database([[row], [{ id: id(7) }], [ledgerRow(8)]]);
  const page = await readWalletLedger(db, owner, id(7));
  assert.equal(page.nextCursor, null); assert.deepEqual(calls[2].args, [row.wallet_id, id(7), PAGE_SIZE + 1]);
  assert.deepEqual(await readWalletLedger(database([[row], []]).db, owner, null), { transactions: [], nextCursor: null });
});
test('client rejects duplicate entries, cursor mismatch and wrong ledger identity', () => {
  const item = ledgerItem(ledgerRow());
  for (const value of [{ transactions: [item, item], nextCursor: null }, { transactions: [item], nextCursor: id(9) }, { transactions: [{ ...item, network: 'ERC20' }], nextCursor: null }, { transactions: [{ ...item, amountUsdt: 1 }], nextCursor: null }, { transactions: [{ ...item, amountUsdt: '0.000000' }], nextCursor: null }, { transactions: [{ ...item, status: 'pending' }], nextCursor: null }]) assert.equal(isWalletTransactionsResponse(value), false);
});
test('CORS only allows configured origins and retains authentication failures', async () => {
  let called = 0;
  const handler = withCors(async () => { called++; return Response.json({ error: 'Sign in' }, { status: 401 }); }, ['https://wallet.example']);
  const preflight = await handler(new Request('https://api.example', { method: 'OPTIONS', headers: { Origin: 'https://wallet.example', 'Access-Control-Request-Method': 'GET', 'Access-Control-Request-Headers': 'Authorization, apikey' } }));
  assert.equal(preflight.status, 204); assert.equal(called, 0);
  assert.equal(preflight.headers.get('access-control-allow-origin'), 'https://wallet.example');
  assert.equal(preflight.headers.get('access-control-allow-credentials'), null);
  const auth = await handler(new Request('https://api.example', { headers: { Origin: 'https://wallet.example' } }));
  assert.equal(auth.status, 401); assert.equal(called, 1); assert.equal(auth.headers.get('access-control-allow-origin'), 'https://wallet.example');
  const denied = await handler(new Request('https://api.example', { headers: { Origin: 'https://evil.example' } }));
  assert.equal(denied.status, 403); assert.equal(called, 1); assert.equal(denied.headers.get('access-control-allow-origin'), null);
  for (const headers of [{ Origin: 'https://wallet.example', 'Access-Control-Request-Method': 'DELETE' }, { Origin: 'https://wallet.example', 'Access-Control-Request-Method': 'GET', 'Access-Control-Request-Headers': 'x-secret' }]) assert.equal((await handler(new Request('https://api.example', { method: 'OPTIONS', headers }))).status, 403);
  assert.equal((await handler(new Request('https://api.example'))).status, 401);
});
test('wallet transport refuses token leakage to other hosts, paths or redirects', async () => {
  const base = 'https://project.supabase.co';
  const endpoint = base + '/functions/v1/wallet-api/api/wallet/summary';
  assert.equal(validateWalletEndpoint(endpoint, base, 'summary').href, endpoint);
  for (const bad of [endpoint.replace('project.', 'evil.'), base + '/other', endpoint + '?user_id=other', endpoint + '#fragment', endpoint.replace('https:', 'http:')]) assert.throws(() => validateWalletEndpoint(bad, base, 'summary'));
  await assert.rejects(authenticatedJson(new URL(endpoint), '', 'public-key'), /Sign in/);
  const original = globalThis.fetch;
  try {
    globalThis.fetch = async (_url, options) => {
      assert.equal(options?.credentials, 'omit'); assert.equal(options?.redirect, 'error'); assert.equal(options?.cache, 'no-store');
      assert.equal(new Headers(options?.headers).get('Authorization'), 'Bearer test-token');
      return new Response('{}', { status: 401 });
    };
    await assert.rejects(authenticatedJson(new URL(endpoint), 'test-token', 'public-key'), /401/);
    globalThis.fetch = async () => Response.json({ real: true });
    assert.deepEqual(await authenticatedJson(new URL(endpoint), 'test-token', 'public-key'), { real: true });
  } finally { globalThis.fetch = original; }
});
