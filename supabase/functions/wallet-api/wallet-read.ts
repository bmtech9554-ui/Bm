import type { Store } from './database.ts';
import { DomainError } from './security.ts';

const SCALE = 1000000n;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const PAGE_SIZE = 50;

export function atomicToUsdt(value: string): string {
  if (typeof value !== 'string' || !/^-?(0|[1-9][0-9]*)$/.test(value)) throw new DomainError('Invalid ledger amount.', 503);
  const amount = BigInt(value);
  const absolute = amount < 0n ? -amount : amount;
  return (amount < 0n ? '-' : '') + String(absolute / SCALE) + '.' + String(absolute % SCALE).padStart(6, '0');
}

export const summarySql = `SELECT u.status, w.id AS wallet_id, w.currency,
  COALESCE((SELECT sum(l.amount_atomic) FROM public.wallet_ledger l WHERE l.wallet_id=w.id),0)::text AS total,
  COALESCE((SELECT sum(h.amount_atomic) FROM public.wallet_holds h WHERE h.wallet_id=w.id AND h.status='ACTIVE'),0)::text AS held
  FROM public.users u LEFT JOIN public.wallets w ON w.user_id=u.id WHERE u.id=$1`;

function checkWallet(row: Record<string, unknown> | undefined) {
  if (!row || row.status !== 'Active') throw new DomainError('Account access is unavailable.', 403);
  if (!row.wallet_id) throw new DomainError('Wallet is not provisioned yet.', 409);
  if (row.currency !== 'USDT') throw new DomainError('Unsupported wallet asset.', 503);
}

export async function readWalletSummary(db: Store, userId: string) {
  // Both sums come from one statement snapshot; only ACTIVE holds reduce available funds.
  const row = (await db.query(summarySql, [userId])).rows[0];
  checkWallet(row);
  const balanceUsdt = atomicToUsdt(row.total);
  const heldBalanceUsdt = atomicToUsdt(row.held);
  const total = BigInt(row.total), held = BigInt(row.held);
  if (total < 0n || held < 0n || held > total) throw new DomainError('Wallet balance needs review.', 503);
  return {
    asset: 'USDT', network: 'TRC20', balanceUsdt, heldBalanceUsdt,
    availableBalanceUsdt: atomicToUsdt(String(total - held)),
    // The deployed payment provider is blocked. Do not publish an address for funding.
    depositAddress: null, paymentsEnabled: false,
  };
}

export function ledgerItem(row: Record<string, any>) {
  const kinds: Record<string, string> = {
    DEPOSIT_CREDIT: 'deposit', WITHDRAWAL_DEBIT: 'withdrawal', REFERRAL_REWARD: 'referral',
    CREDIT_ADJUSTMENT: 'adjustment', DEBIT_ADJUSTMENT: 'adjustment', CORRECTION: 'adjustment', REVERSAL: 'reversal',
  };
  const type = kinds[row.kind];
  if (!type) throw new DomainError('Unsupported ledger entry.', 503);
  const amountUsdt = atomicToUsdt(row.amount_atomic);
  if (BigInt(row.amount_atomic) === 0n) throw new DomainError('Invalid ledger entry.', 503);
  if ((['DEPOSIT_CREDIT','REFERRAL_REWARD','CREDIT_ADJUSTMENT'].includes(row.kind) && BigInt(row.amount_atomic) < 0n) ||
      (['WITHDRAWAL_DEBIT','DEBIT_ADJUSTMENT'].includes(row.kind) && BigInt(row.amount_atomic) > 0n)) {
    throw new DomainError('Ledger direction needs review.', 503);
  }
  const createdAt = new Date(row.created_at).toISOString();
  return { id: row.id, asset: 'USDT', network: 'TRC20', type, amountUsdt,
    status: 'completed', createdAt, reference: row.reference };
}

export async function readWalletLedger(db: Store, userId: string, before: string | null) {
  if (before !== null && !UUID.test(before)) throw new DomainError('Invalid history cursor.', 400);
  return db.transaction(async q => {
    // Immutable posted entries, with keyset pagination. Pending requests are not ledger entries.
    const wallet = (await q.query('SELECT u.status,w.id AS wallet_id,w.currency FROM public.users u LEFT JOIN public.wallets w ON w.user_id=u.id WHERE u.id=$1', [userId])).rows[0];
    checkWallet(wallet);
    if (before && !(await q.query('SELECT id FROM public.wallet_ledger WHERE id=$1 AND wallet_id=$2', [before, wallet.wallet_id])).rows.length) {
      throw new DomainError('Invalid history cursor.', 400);
    }
    const rows = (await q.query(`SELECT id,amount_atomic::text,kind,reference,created_at FROM public.wallet_ledger
      WHERE wallet_id=$1 AND ($2::uuid IS NULL OR (created_at,id) <
        (SELECT created_at,id FROM public.wallet_ledger WHERE id=$2::uuid AND wallet_id=$1))
      ORDER BY created_at DESC,id DESC LIMIT $3`, [wallet.wallet_id, before, PAGE_SIZE + 1])).rows;
    const page = rows.slice(0, PAGE_SIZE);
    return { transactions: page.map(ledgerItem), nextCursor: rows.length > PAGE_SIZE ? page[page.length - 1].id : null };
  });
}
