import { useEffect, useRef, useState } from 'react';
import Amount from '../components/Amount';
import { fetchWalletTransactionPage, type WalletTransaction } from '../services/wallet';

export default function TransactionsPage() {
  const [items, setItems] = useState<WalletTransaction[]>([]);
  const [next, setNext] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const controller = useRef<AbortController | null>(null);
  async function load(before?: string) {
    controller.current?.abort();
    const request = new AbortController(); controller.current = request;
    setLoading(true); setError('');
    try {
      const page = await fetchWalletTransactionPage(request.signal, before);
      if (request.signal.aborted) return;
      if (page.nextCursor && page.nextCursor === before) throw new Error('History did not advance.');
      setItems(previous => before ? [...previous, ...page.transactions.filter(item => !previous.some(p => p.id === item.id))] : page.transactions);
      setNext(page.nextCursor);
    } catch {
      if (!request.signal.aborted) setError('Transaction history could not be loaded. Please try again.');
    } finally { if (!request.signal.aborted) setLoading(false); }
  }
  useEffect(() => { void load(); return () => controller.current?.abort(); }, []);
  return <section className="card list">
    <p className="fine-print section-card">Posted wallet ledger entries. Withdrawal debits include fees. Pending requests are not posted transactions.</p>
    {items.map(tx => <div className="list-row transaction" key={tx.id}>
      <div><b>{tx.type[0].toUpperCase() + tx.type.slice(1)}</b><span>{new Date(tx.createdAt).toLocaleString()}</span>{tx.reference && <small>{tx.reference}</small>}</div>
      <div className="right"><Amount value={tx.amountUsdt} compact /><span className={'status ' + tx.status}>{tx.status}</span></div>
    </div>)}
    {loading && <p className="section-card" role="status">Loading transactions…</p>}
    {!loading && !error && items.length === 0 && <p className="section-card" role="status">No wallet transactions yet.</p>}
    {error && <p className="warning" role="alert">{error}</p>}
    {(next || error) && <button className="ghost full" disabled={loading} onClick={() => void load(next || undefined)}>{error ? 'Try again' : 'Load older transactions'}</button>}
  </section>;
}
