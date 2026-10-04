import { useState, type FormEvent } from 'react';
import { ShieldCheck } from 'lucide-react';
import { supabase } from '../services/supabase';

export default function AuthPage() {
  const [register, setRegister] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!supabase || busy) return;
    const form = new FormData(event.currentTarget);
    setBusy(true); setError(''); setMessage('');
    try {
      const email = String(form.get('email')).trim();
      const password = String(form.get('password'));
      if (register) {
        const { data, error } = await supabase.auth.signUp({ email, password, options: { emailRedirectTo: window.location.origin } });
        if (error) throw error;
        if (!data.session) setMessage('Check your email to confirm your account, then sign in.');
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Authentication failed. Please try again.');
    } finally { setBusy(false); }
  }
  return <div className="auth-wrap"><form className="card auth-card" onSubmit={submit}>
    <div className="brand-mark"><ShieldCheck /></div><p className="eyebrow">TRC20 Wallet</p>
    <h1>{register ? 'Create account' : 'Welcome back'}</h1>
    <p className="muted">Access your USDT wallet securely.</p>
    {!supabase && <p className="warning" role="alert">Sign-in is not configured. Contact the wallet operator.</p>}
    {error && <p className="warning" role="alert">{error}</p>}
    {message && <p role="status">{message}</p>}
    <label>Email<input required name="email" type="email" autoComplete="email" placeholder="you@example.com" disabled={busy} /></label>
    <label>Password<input required name="password" type="password" autoComplete={register ? 'new-password' : 'current-password'} minLength={register ? 8 : 1} disabled={busy} /></label>
    <button className="primary" type="submit" disabled={busy || !supabase}>{busy ? 'Please wait…' : register ? 'Create account' : 'Sign in'}</button>
    <button className="ghost" type="button" disabled={busy} onClick={() => { setRegister(!register); setError(''); setMessage(''); }}>{register ? 'Back to sign in' : 'Create account'}</button>
  </form></div>;
}
