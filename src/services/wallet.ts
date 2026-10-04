export const WALLET_ASSET = "USDT" as const;
export const WALLET_NETWORK = "TRC20" as const;

export type WalletTransactionType = "deposit" | "withdrawal" | "referral";
export type WalletTransactionStatus = "completed" | "pending" | "failed";

export interface WalletSummary {
  asset: typeof WALLET_ASSET;
  network: typeof WALLET_NETWORK;
  balanceUsdt: number;
  availableBalanceUsdt: number;
  depositAddress: string | null;
}

export interface WalletTransaction {
  id: string;
  asset: typeof WALLET_ASSET;
  network: typeof WALLET_NETWORK;
  type: WalletTransactionType;
  amountUsdt: number;
  status: WalletTransactionStatus;
  createdAt: string;
  reference: string | null;
}

export interface WalletTransactionsResponse {
  transactions: WalletTransaction[];
}

export class WalletConfigurationError extends Error {
  constructor(message = "Wallet service is not configured.") {
    super(message);
    this.name = "WalletConfigurationError";
  }
}

const walletSummaryUrl = import.meta.env.VITE_WALLET_SUMMARY_URL as string | undefined;
const walletTransactionsUrl = import.meta.env.VITE_WALLET_TRANSACTIONS_URL as string | undefined;

function isNonNegativeFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value >= 0;
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function isTrc20Address(value: unknown): value is string {
  return (
    typeof value === "string" &&
    /^T[1-9A-HJ-NP-Za-km-z]{33}$/.test(value)
  );
}

function isWalletSummary(value: unknown): value is WalletSummary {
  if (!value || typeof value !== "object") return false;

  const summary = value as Record<string, unknown>;
  return (
    summary.asset === WALLET_ASSET &&
    summary.network === WALLET_NETWORK &&
    isNonNegativeFiniteNumber(summary.balanceUsdt) &&
    isNonNegativeFiniteNumber(summary.availableBalanceUsdt) &&
    (summary.depositAddress === null || isTrc20Address(summary.depositAddress))
  );
}

function isWalletTransaction(value: unknown): value is WalletTransaction {
  if (!value || typeof value !== "object") return false;

  const transaction = value as Record<string, unknown>;
  return (
    isNonEmptyString(transaction.id) &&
    transaction.asset === WALLET_ASSET &&
    transaction.network === WALLET_NETWORK &&
    (transaction.type === "deposit" ||
      transaction.type === "withdrawal" ||
      transaction.type === "referral") &&
    isNonNegativeFiniteNumber(transaction.amountUsdt) &&
    transaction.amountUsdt > 0 &&
    (transaction.status === "completed" ||
      transaction.status === "pending" ||
      transaction.status === "failed") &&
    isNonEmptyString(transaction.createdAt) &&
    !Number.isNaN(Date.parse(transaction.createdAt)) &&
    (transaction.reference === null || typeof transaction.reference === "string")
  );
}

function isWalletTransactionsResponse(value: unknown): value is WalletTransactionsResponse {
  if (!value || typeof value !== "object") return false;

  const response = value as Record<string, unknown>;
  return (
    Array.isArray(response.transactions) &&
    response.transactions.every(isWalletTransaction)
  );
}

async function fetchJson(url: string, signal?: AbortSignal): Promise<unknown> {
  const response = await fetch(url, {
    method: "GET",
    credentials: "include",
    headers: { Accept: "application/json" },
    signal,
  });

  if (!response.ok) {
    throw new Error(`Wallet request failed with status ${response.status}.`);
  }

  return response.json();
}

export async function fetchWalletSummary(signal?: AbortSignal): Promise<WalletSummary> {
  if (!walletSummaryUrl) {
    throw new WalletConfigurationError("Wallet summary endpoint is not configured.");
  }

  const payload = await fetchJson(walletSummaryUrl, signal);
  if (!isWalletSummary(payload)) {
    throw new Error("Wallet summary response did not match the USDT/TRC20 contract.");
  }

  return payload;
}

export async function fetchWalletTransactions(
  signal?: AbortSignal,
): Promise<WalletTransaction[]> {
  if (!walletTransactionsUrl) {
    throw new WalletConfigurationError("Wallet transactions endpoint is not configured.");
  }

  const payload = await fetchJson(walletTransactionsUrl, signal);
  if (!isWalletTransactionsResponse(payload)) {
    throw new Error("Wallet transactions response did not match the USDT/TRC20 contract.");
  }

  return payload.transactions;
}
