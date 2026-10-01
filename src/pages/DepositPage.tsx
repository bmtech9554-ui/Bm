import { Copy, QrCode } from "lucide-react";
import { wallet } from "../data/mock";

export default function DepositPage() {
  return (
    <section className="card section-card center">
      <div className="qr-placeholder"><QrCode size={82}/></div>
      <span className="network-pill">USDT • TRC20</span>
      <h2>Deposit address</h2>
      <div className="address-box"><code>{wallet.depositAddress}</code><button aria-label="Copy address"><Copy size={18}/></button></div>
      <div className="warning">
        Send <b>USDT only via TRC20</b>. Do not send any other token or use another blockchain network.
      </div>
      <label className="field">
        Amount (optional)
        <input inputMode="decimal" placeholder="0.00 USDT" />
      </label>
      <button className="primary">I have sent the transfer</button>
    </section>
  );
}
