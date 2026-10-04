import { useEffect, useState } from "react";
import Amount from "../components/Amount";
import {
  fetchWalletTransactions,
  WalletConfigurationError,
  type WalletTransaction,
} from "../services/wallet";

type TransactionState =
  | { status: "loading" }
  | { status: "ready"; transactions: WalletTransaction[] }
  | { status: "empty" }
  | { status: "error"; message: string };

export default function TransactionsPage() {
  const [state, setState] = useState<TransactionState>({ status: "loading" });

  useEffect(() => {
    const controller = new AbortController();

    fetchWalletTransactions(controller.signal)
      .then((transactions) => {
        setState(transactions.length ? { status: "ready", transactions } : { status: "empty" });
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;

        setState({
          status: "error",
          message:
            error instanceof WalletConfigurationError
              ? "Transaction history is not connected yet."
              : "Transaction history could not be loaded. Please try again later.",
        });
      });

    return () => controller.abort();
  }, []);

  return (
    <section className="card list">
      {state.status === "loading" && <div className="list-row"><span className="muted" role="status">Loading transactions…</span></div>}
      {state.status === "error" && <div className="list-row"><p className="warning" role="alert">{state.message}</p></div>}
      {state.status === "empty" && <div className="list-row"><span className="muted" role="status">No transactions yet.</span></div>}
      {state.status === "ready" && state.transactions.map((tx) => (
        <div className="list-row transaction" key={tx.id}>
          <div>
            <b>{tx.type[0].toUpperCase() + tx.type.slice(1)}</b>
            <span>{new Date(tx.createdAt).toLocaleString()}</span>
            {tx.reference && <small>{tx.reference}</small>}
          </div>
          <div className="right">
            <Amount value={tx.amount} compact />
            <span className={"status " + tx.status}>{tx.status}</span>
          </div>
        </div>
      ))}
    </section>
  );
}
