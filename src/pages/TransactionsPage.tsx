import Amount from "../components/Amount";
import { transactions } from "../data/mock";

export default function TransactionsPage() {
  return (
    <section className="card list">
      {transactions.map(tx => (
        <div className="list-row transaction" key={tx.id}>
          <div>
            <b>{tx.type[0].toUpperCase() + tx.type.slice(1)}</b>
            <span>{new Date(tx.createdAt).toLocaleString()}</span>
            <small>{tx.reference}</small>
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
