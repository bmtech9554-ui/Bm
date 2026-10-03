export interface ReferralSummary {
  referralCode: string | null;
  invitedCount: number;
  totalRewardsUsdt: string;
}

export class ReferralConfigurationError extends Error {
  constructor(message = "Referral service is not configured.") {
    super(message);
    this.name = "ReferralConfigurationError";
  }
}

const referralSummaryUrl = import.meta.env.VITE_REFERRAL_SUMMARY_URL as string | undefined;

function isReferralSummary(value: unknown): value is ReferralSummary {
  if (!value || typeof value !== "object") return false;

  const summary = value as Record<string, unknown>;
  return (
    (typeof summary.referralCode === "string" || summary.referralCode === null) &&
    typeof summary.invitedCount === "number" &&
    Number.isInteger(summary.invitedCount) &&
    summary.invitedCount >= 0 &&
    typeof summary.totalRewardsUsdt === "string"
  );
}

export async function fetchReferralSummary(signal?: AbortSignal): Promise<ReferralSummary> {
  if (!referralSummaryUrl) {
    throw new ReferralConfigurationError();
  }

  const response = await fetch(referralSummaryUrl, {
    method: "GET",
    credentials: "include",
    headers: { Accept: "application/json" },
    signal,
  });

  if (!response.ok) {
    throw new Error(`Referral summary request failed with status ${response.status}.`);
  }

  const payload: unknown = await response.json();
  if (!isReferralSummary(payload)) {
    throw new Error("Referral summary response did not match the expected contract.");
  }

  return payload;
}
