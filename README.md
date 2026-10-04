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

## Production checklist
This is a starter UI with mock wallet data and demo local authentication state. Before production, connect secure server-side authentication; keep balances, transactions, payout approvals and referral rewards server-authoritative; validate TRC20 deposits through trusted blockchain infrastructure; keep secrets server-side; add appropriate KYC/AML, rate limits, audit logs and monitoring; and replace the demo TRC20 address before accepting transfers.

## Asset/network policy
- Asset: **USDT only**
- Network: **TRC20 (TRON) only**
