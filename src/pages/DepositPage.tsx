import { useEffect, useState } from "react";
import { Copy, QrCode } from "lucide-react";
import {
  fetchWalletSummary,
  WalletConfigurationError,
  type WalletSummary,
} from "../services/wallet";

type DepositState =
  | { status: "loading" }
  | { status: "ready"; wallet: WalletSummary }
  | { status: "empty" }
  | { status: "error"; message: string };

export default function DepositPage() {
  const [state, setState] = useState<DepositState>({ status: "loading" });
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
              ? "Deposit wallet is not connected yet."
              : "Deposit wallet could not be loaded. Please try again later.",
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

  return (
    <section className="card section-card center">
      <div className="qr-placeholder"><QrCode size={82}/></div>
      <span className="network-pill">USDT • TRC20</span>
      <h2>Deposit address</h2>

      {state.status === "loading" && <p className="muted" role="status">Loading deposit wallet…</p>}
      {state.status === "error" && <p className="warning" role="alert">{state.message}</p>}
      {state.status === "empty" && <p className="muted" role="status">No deposit wallet is available for this account.</p>}
      {state.status === "ready" && !state.wallet.depositAddress && (
        <p className="muted" role="status">No deposit address is available for this wallet.</p>
      )}
      {state.status === "ready" && state.wallet.depositAddress && (
        <>
          <div className="address-box">
            <code>{state.wallet.depositAddress}</code>
            <button type="button" aria-label={copied ? "Deposit address copied" : "Copy address"} onClick={() => copyAddress(state.wallet.depositAddress!)}>
              <Copy size={18}/>
            </button>
          </div>
          {copied && <p className="fine-print" role="status">Deposit address copied.</p>}
        </>
      )}

      <div className="warning">
        Send <b>USDT only via TRC20</b>. Do not send any other token or use another blockchain network.
      </div>
      <label className="field">
        Amount (optional)
        <input inputMode="decimal" placeholder="0.00 USDT" />
      </label>
      <button className="primary" disabled={state.status !== "ready" || !state.wallet.depositAddress}>I have sent the transfer</button>
    </section>
  );
}
