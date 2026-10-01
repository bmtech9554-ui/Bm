import { FormEvent } from "react";
import { ShieldCheck } from "lucide-react";

export default function AuthPage({ onAuthenticated }: { onAuthenticated: () => void }) {
  function submit(e: FormEvent) {
    e.preventDefault();
    onAuthenticated();
  }

  return (
    <div className="auth-wrap">
      <form className="card auth-card" onSubmit={submit}>
        <div className="brand-mark"><ShieldCheck /></div>
        <p className="eyebrow">TRC20 Wallet</p>
        <h1>Welcome back</h1>
        <p className="muted">Access your USDT wallet securely.</p>
        <label>Email<input required type="email" placeholder="you@example.com" /></label>
        <label>Password<input required type="password" placeholder="••••••••" minLength={6} /></label>
        <button className="primary" type="submit">Sign in</button>
        <button className="ghost" type="button">Create account</button>
        <p className="fine-print">Starter auth is UI-only. Connect this form to your real authentication backend before production.</p>
      </form>
    </div>
  );
}
