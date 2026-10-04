export const WALLET_ASSET = "USDT" as const;
export const WALLET_NETWORK = "TRC20" as const;

export type WalletTransactionStatus = "completed" | "pending" | "failed";
export type WalletTransactionType = "deposit" | "withdrawal" | "referral";

export interface WalletSummary {
  asset: typeof WALLET_ASSET;
  network: typeof WALLET_NETWORK;
  balance: number;
  availableBalance: number;
  depositAddress: string | null;
}

export interface WalletTransaction {
  id: string;
  asset: typeof WALLET_ASSET;
  network: typeof WALLET_NETWORK;
  type: WalletTransactionType;
  amount: number;
  status: WalletTransactionStatus;
  createdAt: string;
  reference: string | null;
}

interface WalletLedgerResponse {
  transactions: WalletTransaction[];
}

export class WalletConfigurationError extends Error {
  constructor(message = "Wallet service is not configured.") {
    super(message);
    this.name = "WalletConfigurationError";
  }
}

const walletSummaryUrl = import.meta.env.VITE_WALLET_SUMMARY_URL as string | undefined;
const walletLedgerUrl = import.meta.env.VITE_WALLET_LEDGER_URL as string | undefined;

function isNonNegativeFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value >= 0;
}

function isWalletSummary(value: unknown): value is WalletSummary {
  if (!value || typeof value !== "object") return false;

  const wallet = value as Record<string, unknown>;
  return (
    wallet.asset === WALLET_ASSET &&
    wallet.network === WALLET_NETWORK &&
    isNonNegativeFiniteNumber(wallet.balance) &&
    isNonNegativeFiniteNumber(wallet.availableBalance) &&
    (typeof wallet.depositAddress === "string" || wallet.depositAddress === null)
  );
}

function isWalletTransaction(value: unknown): value is WalletTransaction {
  if (!value || typeof value !== "object") return false;

  const transaction = value as Record<string, unknown>;
  return (
    typeof transaction.id === "string" &&
    transaction.id.length > 0 &&
    transaction.asset === WALLET_ASSET &&
    transaction.network === WALLET_NETWORK &&
    (transaction.type === "deposit" ||
      transaction.type === "withdrawal" ||
      transaction.type === "referral") &&
    isNonNegativeFiniteNumber(transaction.amount) &&
    (transaction.status === "completed" ||
      transaction.status === "pending" ||
      transaction.status === "failed") &&
    typeof transaction.createdAt === "string" &&
    !Number.isNaN(Date.parse(transaction.createdAt)) &&
    (typeof transaction.reference === "string" || transaction.reference === null)
  );
}

async function getJson(url: string, signal?: AbortSignal): Promise<Response> {
  return fetch(url, {
    method: "GET",
    credentials: "include",
    cache: "no-store",
    headers: { Accept: "application/json" },
    signal,
  });
}

export async function fetchWalletSummary(signal?: AbortSignal): Promise<WalletSummary | null> {
  if (!walletSummaryUrl) {
    throw new WalletConfigurationError("Wallet summary endpoint is not configured.");
  }

  const response = await getJson(walletSummaryUrl, signal);
  if (response.status === 204) return null;
  if (!response.ok) {
    throw new Error(`Wallet summary request failed with status ${response.status}.`);
  }

  const payload: unknown = await response.json();
  if (payload === null) return null;
  if (!isWalletSummary(payload)) {
    throw new Error("Wallet summary response did not match the expected USDT/TRC20 contract.");
  }

  return payload;
}

export async function fetchWalletTransactions(
  signal?: AbortSignal,
): Promise<WalletTransaction[]> {
  if (!walletLedgerUrl) {
    throw new WalletConfigurationError("Wallet ledger endpoint is not configured.");
  }

  const response = await getJson(walletLedgerUrl, signal);
  if (response.status === 204) return [];
  if (!response.ok) {
    throw new Error(`Wallet ledger request failed with status ${response.status}.`);
  }

  const payload: unknown = await response.json();
  if (!payload || typeof payload !== "object") {
    throw new Error("Wallet ledger response did not match the expected contract.");
  }

  const transactions = (payload as Partial<WalletLedgerResponse>).transactions;
  if (!Array.isArray(transactions) || !transactions.every(isWalletTransaction)) {
    throw new Error("Wallet ledger response did not match the expected USDT/TRC20 contract.");
  }

  return transactions;
}
