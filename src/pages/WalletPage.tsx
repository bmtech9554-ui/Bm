import { useState } from "react";
import { Copy, Eye, ShieldCheck } from "lucide-react";
import Amount from "../components/Amount";
import { useWalletSummary } from "../hooks/useWalletData";

export default function WalletPage() {
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
    return <section className="card section-card"><p role="status">Loading wallet…</p></section>;
  }

  if (walletState.status === "error") {
    return <section className="card section-card"><p className="warning" role="alert">{walletState.message}</p></section>;
  }

  if (walletState.status !== "ready") {
    return <section className="card section-card"><p role="status">Wallet data is unavailable.</p></section>;
  }

  const wallet = walletState.data;

  return (
    <>
      <section className="balance-card">
        <div className="row-between"><p>Total wallet balance</p><Eye size={18}/></div>
        <Amount value={wallet.balanceUsdt} />
        <span>Asset: {wallet.asset} • Network: {wallet.network}</span>
      </section>
      <section className="card section-card">
        <div className="row-between"><div><span className="label">Deposit network</span><h3>TRON (TRC20)</h3></div><ShieldCheck/></div>
        <p className="muted">Only send USDT using the TRC20 network. Unsupported assets or networks may be permanently lost.</p>
        {wallet.depositAddress ? (
          <>
            <div className="address-box">
              <code>{wallet.depositAddress}</code>
              <button type="button" aria-label={copied ? "Deposit address copied" : "Copy address"} onClick={() => copyAddress(wallet.depositAddress!)}>
                <Copy size={18}/>
              </button>
            </div>
            {copied && <p className="fine-print" role="status">Deposit address copied.</p>}
          </>
        ) : (
          <p className="warning" role="status">No TRC20 deposit address is available for this account.</p>
        )}
      </section>
    </>
  );
}
