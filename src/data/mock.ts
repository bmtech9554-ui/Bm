import type { PayoutMethod, Transaction } from "../types";

export const wallet = {
  asset: "USDT",
  network: "TRC20",
  balance: 2450.75,
  available: 2380.75,
  depositAddress: "TQ8A3XkN7Vf3DemoAddressOnly9Jw2L",
};

export const transactions: Transaction[] = [
  { id: "tx_001", type: "deposit", amount: 500, status: "completed", createdAt: "2026-09-30T10:40:00Z", reference: "TRC20 • 8f2a...4cd1" },
  { id: "tx_002", type: "withdrawal", amount: 120, status: "pending", createdAt: "2026-09-29T17:15:00Z", reference: "Bank payout • #PW1024" },
];

export const payoutMethods: PayoutMethod[] = [
  { id: "bank_001", bankName: "Demo Bank", accountName: "Wallet User", maskedAccount: "•••• 4821", isDefault: true }
];
