import { useEffect, useState } from "react";
import { Copy, Gift } from "lucide-react";
import {
  fetchReferralSummary,
  ReferralConfigurationError,
  type ReferralSummary,
} from "../services/referrals";

type LoadState =
  | { status: "loading" }
  | { status: "ready"; summary: ReferralSummary }
  | { status: "empty" }
  | { status: "error"; message: string };

export default function ReferralPage() {
  const [state, setState] = useState<LoadState>({ status: "loading" });
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const controller = new AbortController();

    fetchReferralSummary(controller.signal)
      .then((summary) => {
        setState(summary.referralCode ? { status: "ready", summary } : { status: "empty" });
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;

        setState({
          status: "error",
          message:
            error instanceof ReferralConfigurationError
              ? "Referral data is not connected yet."
              : "Referral data could not be loaded. Please try again later.",
        });
      });

    return () => controller.abort();
  }, []);

  const copyReferralCode = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      setCopied(false);
    }
  };

  return (
    <section className="card section-card center">
      <div className="brand-mark"><Gift /></div>
      <h2>Invite friends</h2>
      <p className="muted">Share your referral code and earn eligible rewards in USDT.</p>

      {state.status === "loading" && (
        <p className="muted" role="status">Loading referral details…</p>
      )}

      {state.status === "error" && (
        <p className="warning" role="alert">{state.message}</p>
      )}

      {state.status === "empty" && (
        <p className="muted" role="status">No referral details are available for this account.</p>
      )}

      {state.status === "ready" && (
        <>
          <div className="referral-code">
            <code>{state.summary.referralCode}</code>
            <button
              type="button"
              aria-label={copied ? "Referral code copied" : "Copy referral code"}
              onClick={() => copyReferralCode(state.summary.referralCode!)}
            >
              <Copy size={18} />
            </button>
          </div>
          {copied && <p className="fine-print" role="status">Referral code copied.</p>}
          <div className="grid-2 stats">
            <div><b>{state.summary.invitedCount}</b><span>Invited</span></div>
            <div><b>{state.summary.totalRewardsUsdt} USDT</b><span>Rewards</span></div>
          </div>
        </>
      )}
    </section>
  );
}
