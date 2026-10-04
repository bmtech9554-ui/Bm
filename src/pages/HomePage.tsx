import { useEffect, useState } from "react";
import { ArrowDownToLine, Bell, Landmark, ShieldCheck, Users } from "lucide-react";
import { Link } from "react-router-dom";
import Amount from "../components/Amount";
import {
  fetchWalletSummary,
  fetchWalletTransactions,
  WalletConfigurationError,
  type WalletSummary,
  type WalletTransaction,
} from "../services/wallet";

type HomeState =
  | { status: "loading" }
  | { status: "ready"; wallet: WalletSummary; transactions: WalletTransaction[] }
  | { status: "empty" }
  | { status: "error"; message: string };

export default function HomePage() {
  const [state, setState] = useState<HomeState>({ status: "loading" });

  useEffect(() => {
    const controller = new AbortController();

    Promise.all([
      fetchWalletSummary(controller.signal),
      fetchWalletTransactions(controller.signal),
    ])
      .then(([wallet, transactions]) => {
        setState(wallet ? { status: "ready", wallet, transactions } : { status: "empty" });
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;

        setState({
          status: "error",
          message:
            error instanceof WalletConfigurationError
              ? "Wallet data is not connected yet."
              : "Wallet data could not be loaded. Please try again later.",
        });
      });

    return () => controller.abort();
  }, []);

  return (
    <>
      <section className="balance-card">
        <p>Available balance</p>
        {state.status === "loading" && <p className="muted" role="status">Loading wallet…</p>}
        {state.status === "error" && <p className="warning" role="alert">{state.message}</p>}
        {state.status === "empty" && <p className="muted" role="status">No wallet is available for this account.</p>}
        {state.status === "ready" && <Amount value={state.wallet.availableBalance} />}
        <span>USDT on TRC20 only</span>
        <div className="action-row">
          <Link className="action-button" to="/deposit"><ArrowDownToLine size={18}/>Deposit</Link>
          <Link className="action-button" to="/payout-methods"><Landmark size={18}/>Payout</Link>
        </div>
      </section>

      <section className="grid-2">
        <Link className="card menu-card" to="/referral"><Users/><div><b>Referral</b><span>Invite & earn USDT</span></div></Link>
        <Link className="card menu-card" to="/telegram"><Bell/><div><b>Telegram</b><span>Notification settings</span></div></Link>
        <Link className="card menu-card" to="/settings"><ShieldCheck/><div><b>Security</b><span>PIN, password & sessions</span></div></Link>
      </section>

      <section className="section">
        <div className="section-title"><h2>Recent activity</h2><Link to="/transactions">View all</Link></div>
        <div className="card list">
          {state.status === "loading" && <div className="list-row"><span className="muted" role="status">Loading activity…</span></div>}
          {state.status === "error" && <div className="list-row"><span className="muted">Activity unavailable.</span></div>}
          {state.status === "empty" && <div className="list-row"><span className="muted">No wallet activity is available.</span></div>}
          {state.status === "ready" && state.transactions.length === 0 && (
            <div className="list-row"><span className="muted" role="status">No transactions yet.</span></div>
          )}
          {state.status === "ready" && state.transactions.slice(0, 3).map((tx) => (
            <div className="list-row" key={tx.id}>
              <div><b>{tx.type[0].toUpperCase() + tx.type.slice(1)}</b><span>{new Date(tx.createdAt).toLocaleDateString()}</span></div>
              <div className="right"><Amount value={tx.amount} compact/><span className={"status " + tx.status}>{tx.status}</span></div>
            </div>
          ))}
        </div>
      </section>
    </>
  );
}
