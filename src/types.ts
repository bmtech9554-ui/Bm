export type TransactionStatus = "completed" | "pending" | "failed";
export type TransactionType = "deposit" | "withdrawal" | "referral";

export interface Transaction {
  id: string;
  type: TransactionType;
  amount: number;
  status: TransactionStatus;
  createdAt: string;
  reference: string;
}

export interface PayoutMethod {
  id: string;
  bankName: string;
  accountName: string;
  maskedAccount: string;
  isDefault: boolean;
}
