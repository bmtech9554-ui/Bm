import { Home, WalletCards, PlusCircle, ReceiptText, UserRound } from "lucide-react";
import { NavLink } from "react-router-dom";

const items = [
  { to: "/", label: "Home", icon: Home },
  { to: "/wallet", label: "Wallet", icon: WalletCards },
  { to: "/deposit", label: "Deposit", icon: PlusCircle },
  { to: "/transactions", label: "History", icon: ReceiptText },
  { to: "/profile", label: "Profile", icon: UserRound }
];

export default function BottomNav() {
  return (
    <nav className="bottom-nav" aria-label="Primary">
      {items.map(({ to, label, icon: Icon }) => (
        <NavLink key={to} to={to} end={to === "/"}>
          <Icon size={20} />
          <span>{label}</span>
        </NavLink>
      ))}
    </nav>
  );
}
