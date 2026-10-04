import { supabase, supabaseUrl, publishableKey } from './supabase';
import { isWalletSummary, isWalletTransactionsResponse, type WalletSummary, type WalletTransactionsResponse } from './wallet-contract';
import { authenticatedJson, validateWalletEndpoint, WalletConfigurationError } from './wallet-transport';
export * from './wallet-contract';
export { WalletConfigurationError } from './wallet-transport';

async function request(path: 'summary' | 'ledger', signal?: AbortSignal, before?: string): Promise<unknown> {
  if (!supabase || !supabaseUrl || !publishableKey) throw new WalletConfigurationError();
  const configured = path === 'summary' ? import.meta.env.VITE_WALLET_SUMMARY_URL :
    import.meta.env.VITE_WALLET_LEDGER_URL || import.meta.env.VITE_WALLET_TRANSACTIONS_URL;
  const url = validateWalletEndpoint(configured || supabaseUrl + '/functions/v1/wallet-api/api/wallet/' + path, supabaseUrl, path);
  if (before) url.searchParams.set('before', before);
  const { data, error } = await supabase.auth.getSession();
  if (error || !data.session) throw new Error('Sign in to load your wallet.');
  signal?.throwIfAborted();
  // A client session supplies transport only. The Edge Function verifies JWT, user and session.
  return authenticatedJson(url, data.session.access_token, publishableKey, signal);
}
export async function fetchWalletSummary(signal?: AbortSignal): Promise<WalletSummary> {
  const payload = await request('summary', signal);
  if (!isWalletSummary(payload)) throw new Error('Wallet summary did not match the exact USDT/TRC20 contract.');
  return payload;
}
export async function fetchWalletTransactionPage(signal?: AbortSignal, before?: string): Promise<WalletTransactionsResponse> {
  const payload = await request('ledger', signal, before);
  if (!isWalletTransactionsResponse(payload)) throw new Error('Wallet ledger did not match the exact USDT/TRC20 contract.');
  return payload;
}
export async function fetchWalletTransactions(signal?: AbortSignal) {
  return (await fetchWalletTransactionPage(signal)).transactions;
}
