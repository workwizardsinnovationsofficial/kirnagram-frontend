import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  CreditCard,
  ShoppingCart,
  Gift,
  Zap,
  Coins,
  Megaphone,
  Clock,
  CheckCircle2,
  XCircle,
  RefreshCw,
} from "lucide-react";
import { MainLayout } from "@/components/layout/MainLayout";
import { fetchPaymentHistory, type PaymentHistory } from "@/lib/paymentApi";
import { useToast } from "@/hooks/use-toast";

type FilterType = "all" | "credits" | "ads" | "withdrawals";

const PaymentHistory = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [paymentHistory, setPaymentHistory] = useState<PaymentHistory | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterType>("all");

  useEffect(() => {
    loadPaymentHistory();
  }, []);

  const loadPaymentHistory = async () => {
    setLoading(true);
    try {
      const data = await fetchPaymentHistory();
      setPaymentHistory(data);
    } catch (error) {
      console.error("Failed to load payment history", error);
      toast({
        title: "Error",
        description: "Could not load payment history",
        variant: "destructive",
        duration: 2000,
      });
    } finally {
      setLoading(false);
    }
  };

  const filteredTransactions = paymentHistory
    ? paymentHistory.transactions.filter(
        (tx) => filter === "all" || tx.category === filter
      )
    : [];

  const summary = (() => {
    if (!paymentHistory) {
      return {
        creditsPurchased: 0,
        adsSpent: 0,
        withdrawn: 0,
      };
    }

    const txs = Array.isArray(paymentHistory.transactions)
      ? paymentHistory.transactions
      : [];

    const creditsPurchased = Number(paymentHistory.totals?.credits_purchased || 0);
    const adsSpent = Number(paymentHistory.totals?.ads_spent || 0);

    // Treat approved and paid withdrawals as withdrawn for user-facing summary.
    const withdrawn = txs
      .filter(
        (tx) =>
          tx.category === "withdrawals" &&
          ["approved", "paid"].includes(String(tx.status || "").toLowerCase())
      )
      .reduce((sum, tx) => sum + Math.abs(Number(tx.amount || 0)), 0);

    return {
      creditsPurchased,
      adsSpent,
      withdrawn,
    };
  })();

  const getIconComponent = (iconName: string) => {
    switch (iconName) {
      case "ShoppingCart":
        return ShoppingCart;
      case "Gift":
        return Gift;
      case "Zap":
        return Zap;
      case "Coins":
        return Coins;
      case "Megaphone":
        return Megaphone;
      case "Clock":
        return Clock;
      case "CheckCircle2":
        return CheckCircle2;
      case "XCircle":
        return XCircle;
      default:
        return CreditCard;
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case "credits":
        return { bg: "bg-purple-500/20", icon: "text-purple-400", text: "text-purple-400" };
      case "ads":
        return { bg: "bg-blue-500/20", icon: "text-blue-400", text: "text-blue-400" };
      case "withdrawals":
        return { bg: "bg-green-500/20", icon: "text-green-400", text: "text-green-400" };
      default:
        return { bg: "bg-gray-500/20", icon: "text-gray-400", text: "text-gray-400" };
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed":
      case "paid":
        return "text-emerald-500";
      case "pending":
      case "approved":
        return "text-amber-500";
      case "rejected":
        return "text-rose-500";
      default:
        return "text-muted-foreground";
    }
  };

  const formatInr = (amount: number) => `₹${Math.abs(amount).toLocaleString("en-IN")}`;

  return (
    <MainLayout showRightSidebar={true}>
      <div className="max-w-4xl mx-auto pb-20 md:pb-0">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6 mt-4">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="p-2 rounded-xl hover:bg-muted/50 transition-colors"
            aria-label="Back"
          >
            <ArrowLeft className="w-5 h-5 text-foreground" />
          </button>
          <div className="flex-1">
            <h1 className="text-2xl font-display font-bold text-foreground">Payment History</h1>
            <p className="text-sm text-muted-foreground mt-1">All your transactions</p>
          </div>
          <button
            onClick={loadPaymentHistory}
            disabled={loading}
            className="p-2 rounded-xl hover:bg-muted/50 transition-colors disabled:opacity-50"
            aria-label="Refresh"
          >
            <RefreshCw className={`w-5 h-5 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>

        {/* Filter Tabs */}
        <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
          {["all", "credits", "ads", "withdrawals"].map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f as FilterType)}
              className={`px-4 py-2 rounded-lg font-medium whitespace-nowrap transition-colors ${
                filter === f
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted/40 text-foreground hover:bg-muted/60 border border-border"
              }`}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>

        {/* Content */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
            <RefreshCw className="w-12 h-12 mb-3 animate-spin opacity-50" />
            <p>Loading payment history...</p>
          </div>
        ) : !paymentHistory || paymentHistory.transactions.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-16 h-16 rounded-full bg-muted/30 flex items-center justify-center mb-4">
              <CreditCard className="w-8 h-8 text-muted-foreground opacity-50" />
            </div>
            <p className="text-foreground font-medium">No payment history yet</p>
            <p className="text-muted-foreground text-sm mt-1">
              Your transactions will appear here
            </p>
          </div>
        ) : filteredTransactions.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <p className="text-foreground font-medium">No {filter} transactions</p>
            <p className="text-muted-foreground text-sm mt-1">
              Try selecting a different filter
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredTransactions.map((tx) => {
              const IconComponent = getIconComponent(tx.icon);
              const categoryColor = getCategoryColor(tx.category);
              const statusColor = getStatusColor(tx.status);

              return (
                <div
                  key={tx.id}
                  className="bg-card border border-border rounded-xl p-4 hover:border-border/80 transition-colors"
                >
                  <div className="flex items-start gap-4">
                    {/* Icon */}
                    <div className={`flex-shrink-0 p-3 rounded-lg ${categoryColor.bg}`}>
                      <IconComponent className={`w-6 h-6 ${categoryColor.icon}`} />
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <h3 className="font-semibold text-foreground">{tx.type}</h3>
                          <p className="text-sm text-muted-foreground mt-1">{tx.description}</p>
                        </div>

                        {/* Amount and Status */}
                        <div className="text-right flex-shrink-0">
                          <p
                            className={`text-lg font-semibold ${
                              tx.amount > 0 ? "text-emerald-400" : "text-rose-400"
                            }`}
                          >
                            {tx.amount > 0 ? "+" : ""}
                            {tx.amount < 0 ? "-" : ""}
                            {formatInr(tx.amount)}
                          </p>
                          <p className={`text-xs font-medium mt-1 ${statusColor}`}>
                            {tx.status.charAt(0).toUpperCase() + tx.status.slice(1)}
                          </p>
                        </div>
                      </div>

                      {/* Timestamp */}
                      <div className="flex items-center gap-2 mt-3">
                        <Clock className="w-4 h-4 text-muted-foreground opacity-50" />
                        <p className="text-xs text-muted-foreground">
                          {tx.timestamp
                            ? new Date(tx.timestamp).toLocaleString("en-IN", {
                                year: "numeric",
                                month: "short",
                                day: "numeric",
                                hour: "2-digit",
                                minute: "2-digit",
                              })
                            : "—"}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Summary Cards */}
        {paymentHistory && paymentHistory.transactions.length > 0 && (
          <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-card border border-border rounded-xl p-5">
              <p className="text-sm text-muted-foreground mb-2">Credits Purchased</p>
              <p className="text-2xl font-display font-bold text-purple-400">
                ₹{summary.creditsPurchased.toLocaleString("en-IN")}
              </p>
            </div>
            <div className="bg-card border border-border rounded-xl p-5">
              <p className="text-sm text-muted-foreground mb-2">Ads Spent</p>
              <p className="text-2xl font-display font-bold text-blue-400">
                ₹{summary.adsSpent.toLocaleString("en-IN")}
              </p>
            </div>
            <div className="bg-card border border-border rounded-xl p-5">
              <p className="text-sm text-muted-foreground mb-2">Withdrawn</p>
              <p className="text-2xl font-display font-bold text-green-400">
                ₹{summary.withdrawn.toLocaleString("en-IN")}
              </p>
            </div>
          </div>
        )}
      </div>
    </MainLayout>
  );
};

export default PaymentHistory;
