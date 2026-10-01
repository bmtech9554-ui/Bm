export default function TelegramPage() {
  return (
    <section className="card section-card">
      <h2>Telegram notifications</h2>
      <p className="muted">Connect a Telegram chat to receive account activity notifications.</p>
      <label>Telegram username<input placeholder="@username" /></label>
      <button className="primary full">Connect Telegram</button>
      <div className="setting-row"><div><b>Deposit alerts</b><span>Completed USDT deposits</span></div><input type="checkbox" defaultChecked /></div>
      <div className="setting-row"><div><b>Payout alerts</b><span>Status changes for payouts</span></div><input type="checkbox" defaultChecked /></div>
      <div className="setting-row"><div><b>Security alerts</b><span>New login and security events</span></div><input type="checkbox" defaultChecked /></div>
    </section>
  );
}
