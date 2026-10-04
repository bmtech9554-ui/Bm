import Amount from "../components/Amount";
import { useWalletTransactions } from "../hooks/useWalletData";

export default function TransactionsPage() {
  const state = useWalletTransactions();

  if (state.status === "loading") {
    return <section className="card section-card"><p role="status">Loading transactions…</p></section>;
  }

  if (state.status === "error") {
    return <section className="card section-card"><p className="warning" role="alert">{state.message}</p></section>;
  }

  if (state.status === "empty") {
    return <section className="card section-card"><p role="status">No wallet transactions yet.</p></section>;
  }

  return (
    <section className="card list">
      {state.data.map(tx => (
        <div className="list-row transaction" key={tx.id}>
          <div>
            <b>{tx.type[0].toUpperCase() + tx.type.slice(1)}</b>
            <span>{new Date(tx.createdAt).toLocaleString()}</span>
            {tx.reference && <small>{tx.reference}</small>}
          </div>
          <div className="right">
            <Amount value={tx.amountUsdt} compact />
            <span className={"status " + tx.status}>{tx.status}</span>
          </div>
        </div>
      ))}
    </section>
  );
}
