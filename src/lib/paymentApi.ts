import { getAuthToken } from "@/lib/auth-utils";

const API_BASE = import.meta.env.VITE_API_BASE || "http://127.0.0.1:8000";

export type PaymentTransaction = {
  id: string;
  type: string;
  category: "credits" | "ads" | "withdrawals" | "money";
  amount: number;
  timestamp: string;
  status: "completed" | "pending" | "approved" | "paid" | "rejected";
  icon: string;
  description: string;
};

export type PaymentHistory = {
  transactions: PaymentTransaction[];
  totals: {
    credits_purchased: number;
    ads_spent: number;
    withdrawn: number;
    withdrawable: number;
  };
  count: number;
};

const getToken = async () => {
  const token = await getAuthToken();
  if (!token) throw new Error("User not authenticated");
  return token;
};

export const fetchPaymentHistory = async (): Promise<PaymentHistory> => {
  const token = await getToken();
  const res = await fetch(`${API_BASE}/payment/history`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error("Failed to fetch payment history");
  return res.json();
};
