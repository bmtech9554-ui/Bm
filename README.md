# Nila Wallet — USDT/TRC20

Mobile-first React/TypeScript/Vite user app connected to the existing Nila Wallet Supabase project (`argixeahlvizszwzuhhi`). Admin UI remains separate and is not linked from user pages.

## Run

Use Node 24 and npm. Copy `.env.example` to `.env.local`, then:

```sh
npm ci
npm run dev
```

Sign in using an email-confirmed account in that Supabase project. The app uses Supabase Auth sessions, including token refresh and sign-out; a local demo flag cannot authenticate. Registration requires email confirmation. Add the exact frontend origin to Supabase Auth's redirect allowlist and configure the Site URL before testing email confirmation links. No emails are sent by tests.

Only the project URL and **publishable** key are browser configuration. Never put service-role keys, database credentials or payment/email secrets in `VITE_*` variables. The public key in the example identifies the selected project; it is not an administrator credential.

## Wallet endpoints

| Variable | Default route under the configured Supabase URL |
| --- | --- |
| `VITE_WALLET_SUMMARY_URL` | `/functions/v1/wallet-api/api/wallet/summary` |
| `VITE_WALLET_LEDGER_URL` | `/functions/v1/wallet-api/api/wallet/ledger` |

`VITE_WALLET_TRANSACTIONS_URL` remains a legacy alias when `VITE_WALLET_LEDGER_URL` is absent. Explicit endpoint URLs must have the same origin as `VITE_SUPABASE_URL` and match these paths. Redirects are rejected to avoid forwarding a session token elsewhere.

Requests use `Authorization: Bearer <current Supabase access token>` and the publishable `apikey`, with cookies omitted and caching disabled. The existing Edge handler verifies the JWT signature/issuer/audience, confirmed Auth user and active session, then binds queries to that verified user's ID. User IDs cannot be supplied by query parameters. Suspended users are denied by the new read endpoints. Missing/unprovisioned wallets return errors; they are not shown as zero.

The backend provisions new account/profile/wallet rows through its existing authenticated actor flow. A real wallet with no posted ledger entries has a database-derived zero balance.

### Exact summary contract

Amounts are **decimal strings with six fractional digits**, never JavaScript numbers. This updates the old numeric adapter contract and avoids the legacy snapshot's hundredths-style convenience fields.

```json
{
  "asset": "USDT",
  "network": "TRC20",
  "balanceUsdt": "0.000000",
  "heldBalanceUsdt": "0.000000",
  "availableBalanceUsdt": "0.000000",
  "depositAddress": null,
  "paymentsEnabled": false
}
```

This is a shape example, not a fallback. The backend sums immutable `wallet_ledger.amount_atomic` and ACTIVE `wallet_holds.amount_atomic` in one SQL statement snapshot. Available = total − held. Impossible balances, malformed responses and other assets/networks are rejected. Formatting preserves all six digits without converting amounts through `Number`.

### Ledger contract

```json
{ "transactions": [], "nextCursor": null }
```

Each posted entry has `id`, `asset: "USDT"`, `network: "TRC20"`, `type`, signed `amountUsdt`, `status: "completed"`, ISO `createdAt` and `reference`. Types: `deposit`, `withdrawal`, `referral`, `adjustment`, `reversal`. Withdrawal ledger debits include fees. Internal review reasons, actor IDs and other users' records are not returned.

Pages contain up to 50 entries, ordered by `(created_at DESC, id DESC)`. Use `?before=<nextCursor>` for older entries. The cursor must belong to the current wallet. Transaction History includes a Load older transactions button; Home shows recent entries. Pending/rejected requests are not immutable ledger entries and are not presented as posted transactions.

## Edge deployment

`supabase/functions/wallet-api/` starts from deployed version 4 exported on 2026-10-04. The additions are the summary/ledger routes and `wallet-read.ts`, explicit CORS handling, and two type-check fixes to existing code. Version 4 had regressed the version 3 mandatory-MFA and users.read-before-directory-query checks; those checks are restored while preserving version 4's INR quote blocking, Bank/UPI method support and INR snapshot fields. The exported backend retains its existing session, permission, mandatory admin AAL2, audit and payment-blocking behavior. It reuses the existing tables and `nila_app` database role; **no schema migration is required by this change**.

The project already has `SUPABASE_DB_URL` and Auth configuration. Keep all existing secrets. Use the existing `wallet-api` function name and `index.ts` entrypoint. Preserve `verify_jwt = false`: the handler performs explicit JWT, Auth-user and session verification itself, including for both new routes. Do not remove those checks.

Set `ALLOWED_ORIGINS` in the Edge Function secrets to a comma-separated list of exact approved frontend origins (no wildcard or trailing slash). If unset, only `https://dtexchange.bm-techi-1295.chatgpt.site` is allowed for browser calls. Non-browser server calls with no Origin still require authentication. Add a localhost origin only for deliberate development access. A different GitHub frontend hosting origin must be configured before its browser can call the API.

Deploy backend routes before publishing this frontend. Review the current remote function version before deployment to avoid overwriting another operator's changes. Existing `/api/wallet` and `/api/admin/snapshot` consumers continue to use their original response contract.

## Validation

```sh
npm test
npm run build
# Deno 2.9.6, using the npm dependencies installed by npm ci:
npm run check:edge
npm run test:edge
```

The GitHub Actions workflow runs these four checks. The root `deno.check.json` pins Node type resolution for local/CI checking; deploy the function's own `deno.json`, not the root development configuration.

The 11 Node tests and 3 Deno authorization regression tests cover exact amounts, active holds, zero versus missing wallets, ownership-bound queries/cursors, ledger kinds/signs, pagination, response rejection, CORS and authenticated transport. Database read queries were also executed with the existing `nila_app` role. Fixtures stay in tests and never credit a real account. Browser QA was attempted but not completed: local Playwright had no installed Chromium executable, and the cloud browser refused localhost with ERR_BLOCKED_BY_CLIENT. Real-account login, responsive rendering and logout interactions remain unverified.

## Remaining work

- Deposits and INR payouts remain blocked pending real provider verification, quotes/fees, reconciliation and custody integration. The new read contract deliberately returns no deposit address while funding is disabled.
- The GitHub user app still has starter payout-method/settings/Telegram UI. Referral integration is separate and remains unconfigured. Do not treat these screens as completed financial or security workflows.
- The separate deployed Sites app is a different frontend; a GitHub PR does not automatically replace it. No user-facing admin link is added here.
- A real-account login, email delivery, MFA and authenticated production wallet read require end-to-end verification. No test password or administrator credential is embedded in this repository.
