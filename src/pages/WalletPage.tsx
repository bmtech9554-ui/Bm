import { Copy, Eye, ShieldCheck } from "lucide-react";
import Amount from "../components/Amount";
import { wallet } from "../data/mock";

export default function WalletPage() {
  return (
    <>
      <section className="balance-card">
        <div className="row-between"><p>Total wallet balance</p><Eye size={18}/></div>
        <Amount value={wallet.balance} />
        <span>Asset: USDT • Network: TRC20</span>
      </section>
      <section className="card section-card">
        <div className="row-between"><div><span className="label">Deposit network</span><h3>TRON (TRC20)</h3></div><ShieldCheck/></div>
        <p className="muted">Only send USDT using the TRC20 network. Unsupported assets or networks may be permanently lost.</p>
        <div className="address-box"><code>{wallet.depositAddress}</code><button aria-label="Copy address"><Copy size={18}/></button></div>
      </section>
    </>
  );
}
