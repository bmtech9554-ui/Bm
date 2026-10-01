import { Bell, ChevronRight, Landmark, LogOut, Shield, Users } from "lucide-react";
import { Link } from "react-router-dom";

const links = [
  { to: "/payout-methods", label: "Bank / Payout Methods", icon: Landmark },
  { to: "/referral", label: "Referral", icon: Users },
  { to: "/settings", label: "Settings & Security", icon: Shield },
  { to: "/telegram", label: "Telegram Notifications", icon: Bell },
];

export default function ProfilePage({ onLogout }: { onLogout: () => void }) {
  return (
    <>
      <section className="card profile-card">
        <div className="avatar">WU</div>
        <div><h2>Wallet User</h2><p className="muted">user@example.com</p></div>
      </section>
      <section className="card list">
        {links.map(({ to, label, icon: Icon }) => (
          <Link className="list-link" to={to} key={to}><Icon size={19}/><span>{label}</span><ChevronRight size={18}/></Link>
        ))}
        <button className="list-link danger" onClick={onLogout}><LogOut size={19}/><span>Sign out</span><ChevronRight size={18}/></button>
      </section>
    </>
  );
}
