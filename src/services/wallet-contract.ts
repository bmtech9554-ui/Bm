export const WALLET_ASSET = 'USDT' as const;
export const WALLET_NETWORK = 'TRC20' as const;
export type WalletTransactionType = 'deposit' | 'withdrawal' | 'referral' | 'adjustment' | 'reversal';
export interface WalletSummary {
  asset: 'USDT'; network: 'TRC20'; balanceUsdt: string; heldBalanceUsdt: string;
  availableBalanceUsdt: string; depositAddress: string | null; paymentsEnabled: boolean;
}
export interface WalletTransaction {
  id: string; asset: 'USDT'; network: 'TRC20'; type: WalletTransactionType;
  amountUsdt: string; status: 'completed'; createdAt: string; reference: string | null;
}
export interface WalletTransactionsResponse { transactions: WalletTransaction[]; nextCursor: string | null }
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const amount = (value: unknown): value is string => typeof value === 'string' && /^-?(0|[1-9][0-9]{0,39})\.[0-9]{6}$/.test(value);
const atomic = (value: string) => BigInt(value.replace('.', ''));
const record = (value: unknown): value is Record<string, unknown> => !!value && typeof value === 'object';
export function isWalletSummary(value: unknown): value is WalletSummary {
  if (!record(value) || value.asset !== WALLET_ASSET || value.network !== WALLET_NETWORK ||
      !amount(value.balanceUsdt) || !amount(value.heldBalanceUsdt) || !amount(value.availableBalanceUsdt) ||
      typeof value.paymentsEnabled !== 'boolean') return false;
  if (!(value.depositAddress === null || (typeof value.depositAddress === 'string' && /^T[1-9A-HJ-NP-Za-km-z]{33}$/.test(value.depositAddress)))) return false;
  if (!value.paymentsEnabled && value.depositAddress !== null) return false;
  const total = atomic(value.balanceUsdt), held = atomic(value.heldBalanceUsdt), available = atomic(value.availableBalanceUsdt);
  return total >= 0n && held >= 0n && available >= 0n && total - held === available;
}
export function isWalletTransaction(value: unknown): value is WalletTransaction {
  if (!record(value) || typeof value.id !== 'string' || !UUID.test(value.id) || value.asset !== WALLET_ASSET || value.network !== WALLET_NETWORK ||
      !['deposit','withdrawal','referral','adjustment','reversal'].includes(String(value.type)) || !amount(value.amountUsdt) ||
      value.status !== 'completed' || typeof value.createdAt !== 'string' || Number.isNaN(Date.parse(value.createdAt)) ||
      !(value.reference === null || typeof value.reference === 'string')) return false;
  const n = atomic(value.amountUsdt);
  return n !== 0n && (value.type !== 'withdrawal' || n < 0n) && (!['deposit','referral'].includes(String(value.type)) || n > 0n);
}
export function isWalletTransactionsResponse(value: unknown): value is WalletTransactionsResponse {
  return record(value) && Array.isArray(value.transactions) && value.transactions.length <= 50 &&
    value.transactions.every(isWalletTransaction) && new Set(value.transactions.map(t => t.id)).size === value.transactions.length &&
    (value.nextCursor === null || (typeof value.nextCursor === 'string' && UUID.test(value.nextCursor) && value.transactions.length > 0 &&
      value.nextCursor === value.transactions[value.transactions.length - 1].id));
}
