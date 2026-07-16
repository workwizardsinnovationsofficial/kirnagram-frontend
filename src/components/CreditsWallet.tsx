import { useCallback, useEffect, useMemo, useState } from "react";
import { Coins, Gift, Sparkles, Clock, ArrowUpRight } from "lucide-react";
import { getAuthToken } from "@/lib/auth-utils";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { claimDailyCredits, CreditsSummary, fetchCreditsSummary } from "@/lib/creditsApi";
import { toast } from "@/components/ui/use-toast";

const DAILY_BONUS_AD_SECONDS = 6;
const API_BASE = import.meta.env.VITE_API_BASE || "http://127.0.0.1:8000";
const RAZORPAY_KEY = import.meta.env.VITE_RAZORPAY_KEY || "";

const buyCredits = async (amount: number) => {
  if (!RAZORPAY_KEY) {
    alert("Razorpay configuration missing");
    return;
  }

  const token = await getAuthToken();
  if (!token) {
    alert("User not logged in");
    return;
  }

  try {
    const res = await fetch(`${API_BASE}/credits/create-order`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`
      },
      body: JSON.stringify({ amount })
    });

    if (!res.ok) {
      const error = await res.json();
      alert("Order creation failed: " + (error?.detail || "Unknown error"));
      return;
    }

    const order = await res.json();

    const options = {
      key: RAZORPAY_KEY,
      amount: order.amount,
      currency: "INR",
      name: "Kirnagram",
      description: "Buy Credits",
      order_id: order.order_id,

      handler: async function (response: any) {
        try {
          const verifyRes = await fetch(`${API_BASE}/credits/verify-payment`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${token}`
            },
            body: JSON.stringify({
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature
            })
          });

          if (!verifyRes.ok) {
            const error = await verifyRes.json();
            alert("Verification failed: " + (error?.detail || "Unknown error"));
            return;
          }

          alert("Payment Successful!");
          window.location.reload();
        } catch (err) {
          alert("Payment verification error: " + (err instanceof Error ? err.message : "Unknown error"));
        }
      },

      modal: {
        ondismiss: function () {
          alert("Payment Cancelled");
        }
      }
    };

    const rzp = new (window as any).Razorpay(options);
    rzp.open();
  } catch (err) {
    alert("Error: " + (err instanceof Error ? err.message : "Unknown error"));
  }
};

const formatDateTime = (value?: string | null) => {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString();
};

const formatAmount = (value: number) => `${value.toLocaleString()}`;

// You may need to get userId from context/store/auth
// For demo, we use a placeholderer
const userId = "USER_ID_PLACEHOLDER";

export function CreditsWalletPanel({ variant = "page" }: { variant?: "page" | "modal" }) {
  const [summary, setSummary] = useState<CreditsSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [claiming, setClaiming] = useState(false);
  const [claimAdOpen, setClaimAdOpen] = useState(false);
  const [claimAdError, setClaimAdError] = useState<string | null>(null);
  const [claimAdRenderKey, setClaimAdRenderKey] = useState(0);
  const [claimCountdown, setClaimCountdown] = useState(DAILY_BONUS_AD_SECONDS);
  const [claimAd, setClaimAd] = useState<any | null>(null);

  const dailyBonusAdSlot = (import.meta.env.VITE_DAILY_BONUS_AD_SLOT || "").trim();

  const loadSummary = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchCreditsSummary();
      setSummary(data);
    } catch (error) {
      toast({
        title: "Credits",
        description: error instanceof Error ? error.message : "Failed to load credits",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, []);

  const canClaim = Boolean(
    summary?.daily_claim?.enabled && (summary?.daily_claim?.remaining ?? 0) > 0,
  );

  const handleClaim = useCallback(async () => {
    if (!canClaim || claiming) return;
    setClaimAdError(null);
    setClaimCountdown(DAILY_BONUS_AD_SECONDS);
    setClaimAdRenderKey((prev) => prev + 1);
    setClaimAdOpen(true);
  }, [canClaim, claiming, dailyBonusAdSlot]);

  const completeClaim = useCallback(async () => {
    setClaiming(true);
    try {
      const result = await claimDailyCredits();
      toast({
        title: "Daily claim",
        description: `You earned ${result.amount} credits today`,
      });
      await loadSummary();
      setClaimAdOpen(false);
    } catch (error) {
      toast({
        title: "Daily claim",
        description: error instanceof Error ? error.message : "Daily claim failed",
        variant: "destructive",
      });
      setClaimAdOpen(false);
    } finally {
      setClaiming(false);
    }
  }, [loadSummary]);

  const paidPlans = useMemo(() => summary?.paid_plans ?? [], [summary]);

  useEffect(() => {
    loadSummary();
  }, [loadSummary]);

  useEffect(() => {
    if (!claimAdOpen) return;
    let intervalId: number | undefined;
    let claimTimerId: number | undefined;

    const loadAd = async () => {
      try {
        const res = await fetch(`${API_BASE}/ads/public/placement-ads?placement=daily_claim&limit=1`);
        if (!res.ok) {
          setClaimAdError("Failed to load ad");
          return;
        }
        const data = await res.json();
        const items = Array.isArray(data?.items) ? data.items : [];
        if (items.length === 0) {
          setClaimAdError("No ad available");
          setClaimAd(null);
        } else {
          setClaimAd(items[0]);
          setClaimAdError(null);
        }
      } catch (err) {
        setClaimAdError("Error loading ad");
        setClaimAd(null);
      }
    };

    // load Kirnagram ad for daily claim
    loadAd();

    setClaimCountdown(DAILY_BONUS_AD_SECONDS);

    intervalId = window.setInterval(() => {
      setClaimCountdown((prev) => {
        if (prev <= 1) {
          if (intervalId) window.clearInterval(intervalId);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    claimTimerId = window.setTimeout(() => {
      completeClaim();
    }, DAILY_BONUS_AD_SECONDS * 1000);

    return () => {
      if (intervalId) window.clearInterval(intervalId);
      if (claimTimerId) window.clearTimeout(claimTimerId);
    };
  }, [claimAdOpen, completeClaim]);

  return (
    <div className={cn("space-y-6", variant === "modal" && "pt-2")}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Credits Wallet</p>
          <h2 className="text-2xl font-display font-bold text-foreground">Your Balance</h2>
        </div>
        <Button variant="outline" size="sm" onClick={loadSummary} disabled={loading}>
          {loading ? "Refreshing..." : "Refresh"}
        </Button>
      </div>

      <Card className="glass-card border border-border/60 p-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-lg shadow-primary/20">
              <Coins className="w-6 h-6 text-primary-foreground" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Credits</p>
              <p className="text-3xl font-display font-bold text-foreground">
                {formatAmount(summary?.balance ?? 0)}
              </p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-xs text-muted-foreground">Last claimed</p>
            <p className="text-sm font-medium text-foreground">
              {formatDateTime(summary?.last_daily_claim_at)}
            </p>
          </div>
        </div>

        <Separator className="my-4" />

        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Clock className="w-4 h-4" />
            <span>
              {summary?.daily_claim?.enabled
                ? `${summary?.daily_claim?.credits ?? 0} credits per claim • ${summary?.daily_claim?.limit_per_day ?? 1} per 24h`
                : "Daily claim disabled"}
            </span>
          </div>
          <Button
            onClick={handleClaim}
            disabled={!canClaim || claiming}
            className="bg-gradient-to-r from-secondary to-accent text-secondary-foreground"
          >
            {claiming ? "Claiming..." : "Daily Claim"}
          </Button>
        </div>
        {summary?.daily_claim?.next_available_at && !canClaim && (
          <p className="mt-3 text-xs text-muted-foreground">
            Next available: {formatDateTime(summary.daily_claim.next_available_at)}
          </p>
        )}
      </Card>

      <Dialog open={claimAdOpen} onOpenChange={(open) => {
        if (!claiming) {
          setClaimAdOpen(open);
        }
      }}>
        <DialogContent className="max-w-3xl p-0 overflow-hidden bg-black border-border" showClose={!claiming}>
          <div className="relative h-[360px] md:h-[420px] p-4 md:p-6">
            <DialogHeader className="text-left space-y-2 mb-4">
              <DialogTitle className="text-xl md:text-2xl font-display font-bold text-gray-900 dark:text-white">
                Daily Bonus Ad
              </DialogTitle>
            </DialogHeader>

            <div className="h-[260px] md:h-[300px] rounded-lg bg-white overflow-hidden flex items-center justify-center">
              {claimAdError ? (
                <p className="px-4 text-center text-sm text-rose-700">{claimAdError}</p>
              ) : claimAd ? (
                claimAd.video_preview_url ? (
                  <video src={claimAd.video_preview_url} className="w-full h-full object-cover" autoPlay muted playsInline />
                ) : (
                  <img src={claimAd.photo_preview_url || '/hero-banner2.png'} alt={claimAd.ad_name || 'Kirnagram Ad'} className="w-full h-full object-cover" />
                )
              ) : (
                <div className="p-4 text-center text-sm">No ad available — using Kirnagram promotion.</div>
              )}
            </div>

            <p className="mt-4 text-xs md:text-sm text-gray-900 dark:text-white/85">
              {claimAdError
                ? "Unable to load ad. Close and try again."
                : claimCountdown > 0
                  ? `Watching ad to unlock daily credits... ${claimCountdown}s`
                  : "Finishing your daily claim..."}
            </p>
          </div>
        </DialogContent>
      </Dialog>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="glass-card border border-border/60 p-5">
          <div className="flex items-center gap-2">
            <Gift className="w-5 h-5 text-emerald-400" />
            <h3 className="font-display font-semibold text-foreground">Welcome Bonus</h3>
          </div>
          <p className="text-sm text-muted-foreground mt-2">
            {summary?.welcome_bonus?.enabled
              ? `New users get ${summary?.welcome_bonus?.credits ?? 0} credits.`
              : "Welcome bonus is currently disabled."}
          </p>
          <div className="mt-4 text-sm">
            <p className="text-muted-foreground">Claimed at</p>
            <p className="font-medium text-foreground">
              {formatDateTime(summary?.welcome_bonus_claimed_at)}
            </p>
          </div>
        </Card>

        <Card className="glass-card border border-border/60 p-5">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-purple-300" />
            <h3 className="font-display font-semibold text-foreground">Recent Activity</h3>
          </div>
          <div className="mt-4 space-y-3 text-sm">
            {(summary?.recent_activity || []).length === 0 && (
              <p className="text-muted-foreground">No activity yet.</p>
            )}
            {summary?.recent_activity?.map((tx) => (
              <div key={tx._id} className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-foreground capitalize">
                    {tx.type.replace(/_/g, " ")}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {formatDateTime(tx.created_at)}
                  </p>
                </div>
                <span className={cn("font-semibold", tx.amount >= 0 ? "text-emerald-400" : "text-rose-400")}>
                  {tx.amount >= 0 ? "+" : ""}
                  {tx.amount}
                </span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <Card className="glass-card border border-border/60 p-5">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-display font-semibold text-foreground">Paid Plans</h3>
            <p className="text-sm text-muted-foreground">Credits add instantly after payment.</p>
          </div>
          <Button variant="ghost" size="sm" className="gap-1 text-muted-foreground" disabled>
                buyCredits(plan.price);
            <ArrowUpRight className="w-4 h-4" />
          </Button>
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {paidPlans.map((plan) => {
            const priceLabel = typeof plan.price === "number" ? `₹${plan.price.toLocaleString()}` : "";
            const buyLabel = priceLabel ? `Buy ${priceLabel}` : "Buy";
            const onBuy = () => {
              if (typeof plan.price === "number") {
                buyCredits(plan.price);
              } else {
                toast({
                  title: "Purchase",
                  description: `Invalid plan price.`,
                });
              }
            };

            return (
              <div
                key={plan.id}
                className="border border-border/70 rounded-xl p-4 bg-background/70 flex flex-col gap-2 items-center text-center"
              >
                <p className="text-sm text-muted-foreground">{plan.name}</p>
                {priceLabel ? (
                  <p className="text-2xl font-display font-extrabold text-emerald-400">{priceLabel}</p>
                ) : null}
                <p className="text-lg font-display font-semibold text-foreground">
                  {formatAmount(plan.credits)} credits
                </p>
                {plan.description && plan.description.length > 0 && (
                  <div className="w-full mt-1">
                    <ul className="text-xs text-muted-foreground space-y-1 list-disc list-inside text-left">
                      {plan.description.slice(0, 4).map((d, i) => (
                        <li key={i}>{d || ""}</li>
                      ))}
                    </ul>
                  </div>
                )}
                <Button
                  size="sm"
                  onClick={onBuy}
                  className="w-full bg-gradient-to-r from-secondary to-accent text-secondary-foreground"
                >
                  {buyLabel}
                </Button>
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
}
