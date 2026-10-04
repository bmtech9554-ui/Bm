# BM USDT TRC20 Wallet

Mobile-first starter implementation for a **USDT-only TRC20 wallet & payment app**.

## Included user-facing areas
Authentication, Home, Wallet, USDT Deposit, Transaction History, Profile, Bank/Payout Methods, Referral, Settings/Security, Telegram Notifications, and mobile bottom navigation.

**Product boundary:** no admin interface is exposed in this frontend, and no cryptocurrency other than USDT is shown. The supported network is TRC20 (TRON) only.

## Stack
React 18 + TypeScript + Vite + React Router + Lucide icons + responsive CSS.

## Run
```bash
npm install
npm run dev
```

## Wallet server contract
Wallet balances, deposit address, and ledger activity are server-authoritative. The frontend does not contain fallback balances or demo transactions.

Configure:
- `VITE_WALLET_SUMMARY_URL` — authenticated GET endpoint for the current user's wallet.
- `VITE_WALLET_LEDGER_URL` — authenticated GET endpoint for the current user's transaction history.

Expected wallet summary JSON:
```json
{
  "asset": "USDT",
  "network": "TRC20",
  "balance": 0,
  "availableBalance": 0,
  "depositAddress": null
}
```

Expected ledger JSON:
```json
{
  "transactions": [
    {
      "id": "server-generated-id",
      "asset": "USDT",
      "network": "TRC20",
      "type": "deposit",
      "amount": 0,
      "status": "pending",
      "createdAt": "2026-10-04T00:00:00Z",
      "reference": null
    }
  ]
}
```

The examples above describe shape only. They are not used as runtime data. Responses with another asset or network are rejected by the frontend adapter.

## Production checklist
Authentication is still a demo local state and payout methods still use starter mock data. Before production, connect secure server-side authentication; keep balances, transactions, payout approvals and referral rewards server-authoritative; validate TRC20 deposits through trusted blockchain infrastructure; keep secrets server-side; add appropriate KYC/AML, rate limits, audit logs and monitoring.

## Asset/network policy
- Asset: **USDT only**
- Network: **TRC20 (TRON) only**
