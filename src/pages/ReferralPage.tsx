import { Copy, Gift } from "lucide-react";

export default function ReferralPage() {
  return (
    <section className="card section-card center">
      <div className="brand-mark"><Gift/></div>
      <h2>Invite friends</h2>
      <p className="muted">Share your referral code and earn eligible rewards in USDT.</p>
      <div className="referral-code"><code>BMUSDT26</code><button><Copy size={18}/></button></div>
      <div className="grid-2 stats">
        <div><b>8</b><span>Invited</span></div>
        <div><b>42.50 USDT</b><span>Rewards</span></div>
      </div>
    </section>
  );
}
