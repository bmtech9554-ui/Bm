import { useEffect, useState } from "react";
import { Copy, Eye, ShieldCheck } from "lucide-react";
import Amount from "../components/Amount";
import {
  fetchWalletSummary,
  WalletConfigurationError,
  type WalletSummary,
} from "../services/wallet";

type WalletState =
  | { status: "loading" }
  | { status: "ready"; wallet: WalletSummary }
  | { status: "empty" }
  | { status: "error"; message: string };

export default function WalletPage() {
  const [state, setState] = useState<WalletState>({ status: "loading" });
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const controller = new AbortController();

    fetchWalletSummary(controller.signal)
      .then((wallet) => setState(wallet ? { status: "ready", wallet } : { status: "empty" }))
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

  const copyAddress = async (address: string) => {
    try {
      await navigator.clipboard.writeText(address);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      setCopied(false);
    }
  };

  if (state.status === "loading") {
    return <section className="card section-card"><p className="muted" role="status">Loading wallet…</p></section>;
  }

  if (state.status === "error") {
    return <section className="card section-card"><p className="warning" role="alert">{state.message}</p></section>;
  }

  if (state.status === "empty") {
    return <section className="card section-card"><p className="muted" role="status">No wallet is available for this account.</p></section>;
  }

  return (
    <>
      <section className="balance-card">
        <div className="row-between"><p>Total wallet balance</p><Eye size={18}/></div>
        <Amount value={state.wallet.balance} />
        <span>Asset: USDT • Network: TRC20</span>
      </section>
      <section className="card section-card">
        <div className="row-between"><div><span className="label">Deposit network</span><h3>TRON (TRC20)</h3></div><ShieldCheck/></div>
        <p className="muted">Only send USDT using the TRC20 network. Unsupported assets or networks may be permanently lost.</p>
        {state.wallet.depositAddress ? (
          <>
            <div className="address-box">
              <code>{state.wallet.depositAddress}</code>
              <button type="button" aria-label={copied ? "Deposit address copied" : "Copy address"} onClick={() => copyAddress(state.wallet.depositAddress!)}>
                <Copy size={18}/>
              </button>
            </div>
            {copied && <p className="fine-print" role="status">Deposit address copied.</p>}
          </>
        ) : (
          <p className="muted" role="status">No deposit address is available for this wallet.</p>
        )}
      </section>
    </>
  );
}
