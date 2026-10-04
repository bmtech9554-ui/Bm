import { useEffect, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { Navigate, Route, Routes } from 'react-router-dom';
import AppShell from './components/AppShell';
import AuthPage from './pages/AuthPage';
import DepositPage from './pages/DepositPage';
import HomePage from './pages/HomePage';
import PayoutMethodsPage from './pages/PayoutMethodsPage';
import ProfilePage from './pages/ProfilePage';
import ReferralPage from './pages/ReferralPage';
import SettingsPage from './pages/SettingsPage';
import TelegramPage from './pages/TelegramPage';
import TransactionsPage from './pages/TransactionsPage';
import WalletPage from './pages/WalletPage';
import { supabase } from './services/supabase';

type AuthState = { loading: boolean; session: Session | null; error: string };
export default function App() {
  const [auth, setAuth] = useState<AuthState>({ loading: true, session: null, error: '' });
  useEffect(() => {
    if (!supabase) { setAuth({ loading: false, session: null, error: '' }); return; }
    let active = true, revision = 0;
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      revision++;
      if (active) setAuth({ loading: false, session, error: '' });
    });
    const startedAt = revision;
    supabase.auth.getSession().then(({ data, error }) => {
      if (active && revision === startedAt) setAuth({ loading: false, session: data.session, error: error ? 'Session could not be loaded. Please reload.' : '' });
    }).catch(() => { if (active && revision === startedAt) setAuth({ loading: false, session: null, error: 'Session could not be loaded. Please reload.' }); });
    return () => { active = false; subscription.unsubscribe(); };
  }, []);
  if (auth.loading) return <div className="auth-wrap"><p role="status">Checking your session…</p></div>;
  if (auth.error) return <div className="auth-wrap"><p role="alert">{auth.error}</p></div>;
  if (!auth.session) return <AuthPage />;
  if (!auth.session.user.email_confirmed_at) return <div className="auth-wrap"><p role="alert">Confirm your email before opening the wallet.</p><button className="ghost" onClick={() => supabase?.auth.signOut({ scope: 'local' })}>Sign out</button></div>;
  // Changing accounts or signing out unmounts all account data and aborts outstanding reads.
  return <Routes key={auth.session.user.id}><Route element={<AppShell />}>
    <Route index element={<HomePage />} /><Route path="wallet" element={<WalletPage />} />
    <Route path="deposit" element={<DepositPage />} /><Route path="transactions" element={<TransactionsPage />} />
    <Route path="profile" element={<ProfilePage user={auth.session.user} />} />
    <Route path="payout-methods" element={<PayoutMethodsPage />} /><Route path="referral" element={<ReferralPage />} />
    <Route path="settings" element={<SettingsPage />} /><Route path="telegram" element={<TelegramPage />} />
    <Route path="*" element={<Navigate to="/" replace />} />
  </Route></Routes>;
}
