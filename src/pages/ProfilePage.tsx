import { Bell, ChevronRight, Landmark, LogOut, Shield, Users } from "lucide-react";
import { useState } from 'react';
import type { User } from '@supabase/supabase-js';
import { supabase } from '../services/supabase';
import { Link } from "react-router-dom";

const links = [
  { to: "/payout-methods", label: "Bank / Payout Methods", icon: Landmark },
  { to: "/referral", label: "Referral", icon: Users },
  { to: "/settings", label: "Settings & Security", icon: Shield },
  { to: "/telegram", label: "Telegram Notifications", icon: Bell },
];

export default function ProfilePage({ user }: { user: User }) {
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  async function onLogout() {
    if (!supabase || busy) return;
    setBusy(true); setError('');
    try {
      const { error } = await supabase.auth.signOut({ scope: 'local' });
      if (error) throw error;
    } catch { setError('Sign out failed. Please try again.'); }
    finally { setBusy(false); }
  }
  return (
    <>
      <section className="card profile-card">
        <div className="avatar">{user.email?.slice(0, 2).toUpperCase()}</div>
        <div><h2>Your account</h2><p className="muted">{user.email}</p></div>
      </section>
      {error && <p className="warning" role="alert">{error}</p>}
      <section className="card list">
        {links.map(({ to, label, icon: Icon }) => (
          <Link className="list-link" to={to} key={to}><Icon size={19}/><span>{label}</span><ChevronRight size={18}/></Link>
        ))}
        <button className="list-link danger" onClick={onLogout} disabled={busy}><LogOut size={19}/><span>Sign out</span><ChevronRight size={18}/></button>
      </section>
    </>
  );
}
