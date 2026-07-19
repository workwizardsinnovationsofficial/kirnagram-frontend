import { getAuthToken } from "@/lib/auth-utils";

const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:8000";

export type CreditsActivity = {
  _id: string;
  type: string;
  amount: number;
  created_at?: string | null;
};

export type CreditsSummary = {
  balance: number;
  last_daily_claim_at?: string | null;
  welcome_bonus_claimed_at?: string | null;
  welcome_bonus: {
    enabled: boolean;
    credits: number;
    valid_days: number;
  };
  daily_claim: {
    enabled: boolean;
    credits: number;
    limit_per_day: number;
    remaining: number;
    next_available_at?: string | null;
  };
  paid_plans: Array<{ id: string; name: string; credits: number; price?: number; description?: string[] }>;
  burn_rates?: Record<string, Record<string, number>>;
  model_enabled?: Record<string, boolean>;
  recent_activity: CreditsActivity[];
};

const getToken = async () => {
  const token = await getAuthToken();
  if (!token) throw new Error("User not authenticated");
  return token;
};

export const fetchCreditsSummary = async (): Promise<CreditsSummary> => {
  const token = await getToken();
  const res = await fetch(`${API_BASE}/credits/summary`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error("Failed to load credits");
  return res.json();
};

export const claimDailyCredits = async (): Promise<{ amount: number; balance: number }> => {
  const token = await getToken();
  const res = await fetch(`${API_BASE}/credits/claim-daily`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error("Daily claim failed");
  return res.json();
};
