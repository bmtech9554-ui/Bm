import { ArrowDownToLine, Bell, Landmark, ShieldCheck, Users } from "lucide-react";
import { Link } from "react-router-dom";
import Amount from "../components/Amount";
import { transactions, wallet } from "../data/mock";

export default function HomePage() {
  return (
    <>
      <section className="balance-card">
        <p>Available balance</p>
        <Amount value={wallet.available} />
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
          {transactions.slice(0, 3).map(tx => (
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
