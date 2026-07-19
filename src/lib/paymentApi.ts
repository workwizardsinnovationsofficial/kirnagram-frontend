import { auth } from "@/firebase";

const API_BASE = "https://api.kirnagram.com";

export type PaymentTransaction = {
  id: string;
  type: string;
  category: "credits" | "ads" | "withdrawals";
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
  const user = auth.currentUser;
  if (!user) throw new Error("User not authenticated");
  return user.getIdToken();
};

export const fetchPaymentHistory = async (): Promise<PaymentHistory> => {
  const token = await getToken();
  const res = await fetch(`${API_BASE}/payment/history`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error("Failed to fetch payment history");
  return res.json();
};
