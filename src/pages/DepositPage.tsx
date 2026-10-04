import { useState } from "react";
import { Copy, QrCode } from "lucide-react";
import { useWalletSummary } from "../hooks/useWalletData";

export default function DepositPage() {
  const walletState = useWalletSummary();
  const [copied, setCopied] = useState(false);

  const copyAddress = async (address: string) => {
    try {
      await navigator.clipboard.writeText(address);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      setCopied(false);
    }
  };

  if (walletState.status === "loading") {
    return <section className="card section-card"><p role="status">Loading deposit details…</p></section>;
  }

  if (walletState.status === "error") {
    return <section className="card section-card"><p className="warning" role="alert">{walletState.message}</p></section>;
  }

  if (walletState.status !== "ready") {
    return <section className="card section-card"><p role="status">Deposit details are unavailable.</p></section>;
  }

  const address = walletState.data.depositAddress;

  return (
    <section className="card section-card center">
      <div className="qr-placeholder"><QrCode size={82}/></div>
      <span className="network-pill">USDT • TRC20</span>
      <h2>Deposit address</h2>
      {address ? (
        <>
          <div className="address-box">
            <code>{address}</code>
            <button type="button" aria-label={copied ? "Deposit address copied" : "Copy address"} onClick={() => copyAddress(address)}>
              <Copy size={18}/>
            </button>
          </div>
          {copied && <p className="fine-print" role="status">Deposit address copied.</p>}
        </>
      ) : (
        <p className="warning" role="status">No TRC20 deposit address is available for this account.</p>
      )}
      <div className="warning">
        Send <b>USDT only via TRC20</b>. Do not send any other token or use another blockchain network.
      </div>
      <label className="field">
        Amount (optional)
        <input inputMode="decimal" placeholder="0.00 USDT" />
      </label>
      <p className="fine-print">Deposits are credited only after server-side blockchain verification. This page does not create client-side wallet credits.</p>
    </section>
  );
}
