import { Outlet, useLocation } from "react-router-dom";
import BottomNav from "./BottomNav";

const titles: Record<string, string> = {
  "/": "Home",
  "/wallet": "Wallet",
  "/deposit": "Deposit USDT",
  "/transactions": "Transaction History",
  "/profile": "Profile",
  "/payout-methods": "Bank / Payout Methods",
  "/referral": "Referral",
  "/settings": "Settings & Security",
  "/telegram": "Telegram Notifications"
};

export default function AppShell() {
  const location = useLocation();
  return (
    <div className="app-shell">
      <header className="topbar">
        <div>
          <div className="eyebrow">USDT • TRC20</div>
          <h1>{titles[location.pathname] ?? "USDT Wallet"}</h1>
        </div>
        <div className="network-pill">TRON</div>
      </header>
      <main className="content"><Outlet /></main>
      <BottomNav />
    </div>
  );
}
