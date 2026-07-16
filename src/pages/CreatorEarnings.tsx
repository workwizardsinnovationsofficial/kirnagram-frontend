import { MainLayout } from "@/components/layout/MainLayout";
import { ArrowLeft, TrendingUp, Users, IndianRupee, Eye, Clock, CheckCircle2, XCircle, AlertCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { auth } from "@/firebase";
import { useToast } from "@/hooks/use-toast";

const API_BASE = "http://127.0.0.1:8000";

const getPayoutPerRemix = (prompt: any) => Number(prompt?.payout_per_remix ?? 1) || 1;

const CreatorEarnings = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [prompts, setPrompts] = useState<any[]>([]);
  const [remixes, setRemixes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showWithdraw, setShowWithdraw] = useState(false);
  const [withdrawSuccess, setWithdrawSuccess] = useState(false);
  const [upiId, setUpiId] = useState("");
  const [amount, setAmount] = useState(100);
  const [withdrawLoading, setWithdrawLoading] = useState(false);
  const [totalEarnings, setTotalEarnings] = useState(0);
  const [totalWithdrawn, setTotalWithdrawn] = useState(0);
  const [summaryRemixCount, setSummaryRemixCount] = useState(0);
  const [minWithdraw, setMinWithdraw] = useState(100);
  const [withdrawHistory, setWithdrawHistory] = useState<any[]>([]);
  const [historyFilter, setHistoryFilter] = useState<"all" | "pending" | "approved" | "paid" | "rejected">("all");

  const fetchPrompts = async () => {
    try {
      setLoading(true);
      const user = auth.currentUser;
      if (!user) throw new Error("Not logged in");
      const token = await user.getIdToken();

      // 1️⃣ Get prompts
      const res = await fetch(`${API_BASE}/ai-creator/prompts/me?status=all`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Failed to load prompts");
      const data = await res.json();
      setPrompts(Array.isArray(data) ? data : []);

      // 2️⃣ Get remixes with historical payout values
      const remixesRes = await fetch(`${API_BASE}/remix/my-remixes`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (remixesRes.ok) {
        const remixesData = await remixesRes.json();
        setRemixes(remixesData.remixes || []);
      }

      // 3️⃣ Get earnings summary (includes dynamic minWithdrawAmount and accurate totalEarnings)
      const earningsRes = await fetch(`${API_BASE}/withdraw/summary`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (earningsRes.ok) {
        const earningsData = await earningsRes.json();
        setTotalEarnings(earningsData.totalEarnings || 0);
        setTotalWithdrawn(earningsData.totalWithdrawn || 0);
        setSummaryRemixCount(earningsData.totalRemixes || 0);
        setMinWithdraw(Number(earningsData.minWithdrawAmount ?? 100) || 100);
      }

      // 4️⃣ Get withdraw history
      const historyRes = await fetch(`${API_BASE}/withdraw/history`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (historyRes.ok) {
        const historyData = await historyRes.json();
        setWithdrawHistory(historyData.history || []);
      }
    } catch (e: any) {
      toast({
        title: "Failed to load data",
        description: e.message || String(e),
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPrompts();
  }, []);

  // Use summaryRemixCount if available, else count only remixes for user's prompts (like AICreator)
  const promptIds = new Set(prompts.map(p => p._id || p.id));
  const totalRemixes =
    summaryRemixCount > 0
      ? summaryRemixCount
      : remixes.filter(r => promptIds.has(r.prompt_id || r.promptId)).length;
  const uniquePrompts = new Set(remixes.map(r => r.prompt_id)).size;
  const totalViews = prompts.reduce((s, p) => s + (p.views?.length || 0), 0);
  const availableBalance = Math.max(0, totalEarnings - totalWithdrawn);
  const canWithdraw = availableBalance >= minWithdraw;
  const quickAmounts = [25, 50, 100]
    .map((pct) => Math.floor((availableBalance * pct) / 100))
    .filter((value, idx, arr) => value >= minWithdraw && arr.indexOf(value) === idx)
    .slice(0, 3);

  const normalizedHistory = Array.isArray(withdrawHistory) ? withdrawHistory : [];
  const historyStats = {
    all: normalizedHistory.length,
    pending: normalizedHistory.filter((item) => item.status === "pending").length,
    approved: normalizedHistory.filter((item) => item.status === "approved").length,
    paid: normalizedHistory.filter((item) => item.status === "paid").length,
    rejected: normalizedHistory.filter((item) => item.status === "rejected").length,
  };
  const filteredHistory =
    historyFilter === "all"
      ? normalizedHistory
      : normalizedHistory.filter((item) => item.status === historyFilter);

  const isValidUpi = /^[a-zA-Z0-9._-]{2,256}@[a-zA-Z]{2,64}$/.test(upiId.trim());

  useEffect(() => {
    if (showWithdraw) {
      setAmount(minWithdraw);
    }
  }, [showWithdraw, minWithdraw]);

  useEffect(() => {
    if (availableBalance < minWithdraw) {
      setShowWithdraw(false);
    }
  }, [availableBalance, minWithdraw]);

  return (
    <MainLayout showRightSidebar={true}>
      <div className="max-w-4xl mx-auto px-3 md:px-0 pb-24 md:pb-8 overflow-x-hidden">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <button
            onClick={() => navigate(-1)}
            className="p-2 rounded-xl hover:bg-muted/50 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-xl md:text-2xl font-display font-bold">Earnings</h1>
            <p className="text-sm text-muted-foreground">Track your creator revenue</p>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 gap-3 mb-6">
          <div className="p-4 bg-gradient-to-br from-green-500/10 to-emerald-500/10 border border-green-500/20 rounded-2xl">
            <div className="w-10 h-10 rounded-xl bg-green-500/20 flex items-center justify-center mb-3">
              <IndianRupee className="w-5 h-5 text-green-500" />
            </div>
            <p className="text-sm text-muted-foreground mb-1">Available Balance</p>
            <p className="text-2xl md:text-3xl font-bold text-green-500">₹{availableBalance}</p>
            <p className="text-xs text-muted-foreground mt-1">
              Lifetime Earnings: ₹{totalEarnings}
            </p>
            <p className="text-xs text-green-400 mt-1 flex items-center gap-1">
              <TrendingUp className="w-3 h-3" /> {totalRemixes} remixes
            </p>
          </div>
          
          <div className="p-4 bg-card border border-border rounded-2xl">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center mb-3">
              <TrendingUp className="w-5 h-5 text-primary" />
            </div>
            <p className="text-sm text-muted-foreground mb-1">Total Remixes</p>
            <p className="text-2xl md:text-3xl font-bold">{totalRemixes}</p>
            <p className="text-xs text-primary mt-1 flex items-center gap-1">
              <TrendingUp className="w-3 h-3" /> {totalRemixes} remixes
            </p>
          </div>

          <div className="p-4 bg-card border border-border rounded-2xl">
            <div className="w-10 h-10 rounded-xl bg-secondary/10 flex items-center justify-center mb-3">
              <Eye className="w-5 h-5 text-secondary" />
            </div>
            <p className="text-sm text-muted-foreground mb-1">Total Views</p>
            <p className="text-2xl md:text-3xl font-bold">{totalViews}</p>
          </div>
        </div>

        {/* Withdraw Button Section */}
        <div className="mb-6 bg-card border border-border rounded-2xl p-4 md:p-5">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-3">
            <div>
              <h2 className="font-semibold">Withdraw Money</h2>
              <p className="text-xs text-muted-foreground">
                Min withdraw ₹{minWithdraw} • Available ₹{availableBalance}
              </p>
            </div>
            <button
              onClick={() => {
                setShowWithdraw((v) => !v);
                setWithdrawSuccess(false);
              }}
              className={`px-4 py-2 rounded-xl text-sm font-semibold transition ${
                canWithdraw
                  ? "bg-green-500 text-white hover:bg-green-600"
                  : "bg-muted text-muted-foreground"
              }`}
            >
              {showWithdraw ? "Close" : "Withdraw"}
            </button>
          </div>

          {!canWithdraw && (
            <p className="text-xs text-yellow-500 bg-yellow-500/10 border border-yellow-500/20 px-3 py-2 rounded-lg mb-3">
              You need at least ₹{minWithdraw} available to submit a withdraw request.
            </p>
          )}

          {showWithdraw && !withdrawSuccess && (
            <div className="mt-2 space-y-3 bg-muted/30 rounded-xl p-4 border border-border/60">
              <div className="space-y-2">
                <label className="text-xs text-muted-foreground">UPI ID</label>
                <input
                  type="text"
                  placeholder="name@upi"
                  value={upiId}
                  onChange={(e) => setUpiId(e.target.value)}
                  className="w-full p-2.5 rounded-lg bg-muted border border-border"
                />
                {upiId.trim() && !isValidUpi && (
                  <p className="text-[11px] text-red-400">Enter a valid UPI ID (example: name@upi)</p>
                )}
              </div>

              {quickAmounts.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs text-muted-foreground">Quick Amount</p>
                  <div className="grid grid-cols-3 gap-2">
                    {quickAmounts.map((value) => (
                      <button
                        key={value}
                        type="button"
                        onClick={() => setAmount(value)}
                        className={`py-2 rounded-lg border text-sm ${
                          amount === value
                            ? "border-primary bg-primary/10 text-primary"
                            : "border-border bg-background/40 hover:bg-muted"
                        }`}
                      >
                        ₹{value}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <label className="text-xs text-muted-foreground">Amount</label>
                <input
                  type="number"
                  min={minWithdraw}
                  value={amount}
                  onChange={(e) => setAmount(Number(e.target.value))}
                  onWheel={(e) => (e.target as HTMLInputElement).blur()}
                  className="w-full p-2.5 rounded-lg bg-muted border border-border"
                />
                <p className="text-xs text-muted-foreground">
                  Withdraw range: ₹{minWithdraw} to ₹{availableBalance}
                </p>
              </div>

              <div className="flex gap-2 mt-1">
                <button
                  onClick={() => {
                    setShowWithdraw(false);
                    setUpiId("");
                    setAmount(minWithdraw);
                    setWithdrawSuccess(false);
                  }}
                  className="flex-1 py-2 rounded-lg bg-muted"
                >
                  Cancel
                </button>
                <button
                  disabled={
                    withdrawLoading ||
                    amount < minWithdraw ||
                    amount > availableBalance ||
                    !upiId.trim() ||
                    !isValidUpi
                  }
                  onClick={async () => {
                    setWithdrawLoading(true);
                    if (!upiId.trim()) {
                      toast({ title: "UPI ID Required", variant: "destructive" });
                      setWithdrawLoading(false);
                      return;
                    }
                    if (!isValidUpi) {
                      toast({ title: "Invalid UPI ID", variant: "destructive" });
                      setWithdrawLoading(false);
                      return;
                    }
                    if (amount < minWithdraw) {
                      toast({ title: `Minimum withdraw is ₹${minWithdraw}`, variant: "destructive" });
                      setWithdrawLoading(false);
                      return;
                    }
                    if (amount > availableBalance) {
                      toast({
                        title: "Insufficient balance",
                        description: "You cannot withdraw more than your earnings",
                        variant: "destructive",
                      });
                      setWithdrawLoading(false);
                      return;
                    }
                    try {
                      const user = auth.currentUser;
                      if (!user) return;

                      const token = await user.getIdToken();

                      const res = await fetch(`${API_BASE}/withdraw/request`, {
                        method: "POST",
                        headers: {
                          "Content-Type": "application/json",
                          Authorization: `Bearer ${token}`,
                        },
                        body: JSON.stringify({ upiId, amount }),
                      });

                      if (!res.ok) {
                        const errData = await res.json().catch(() => ({}));
                        toast({
                          title: "Error",
                          description: errData.detail || "Failed to submit withdraw",
                          variant: "destructive",
                        });
                        return;
                      }

                      setWithdrawSuccess(true);
                      await fetchPrompts();
                      setUpiId("");
                      setAmount(minWithdraw);
                    } catch (err) {
                      toast({
                        title: "Error",
                        description: "Failed to submit withdraw",
                        variant: "destructive",
                      });
                    } finally {
                      setWithdrawLoading(false);
                    }
                  }}
                  className="flex-1 py-2 rounded-lg bg-green-500 text-white hover:bg-green-600 disabled:opacity-50"
                >
                  {withdrawLoading ? "Submitting..." : "Submit Request"}
                </button>
              </div>
            </div>
          )}

          {showWithdraw && withdrawSuccess && (
            <div className="mt-3 bg-green-500/10 border border-green-500/20 rounded-xl p-4 flex flex-col items-center">
              <p className="text-sm font-medium mb-2 text-green-400">
                Withdraw request submitted. Admin will review within 24 hours.
              </p>
              <button
                className="mt-1 px-4 py-2 rounded-lg bg-green-500 text-white hover:bg-green-600"
                onClick={() => {
                  setWithdrawSuccess(false);
                  setShowWithdraw(false);
                }}
              >
                OK
              </button>
            </div>
          )}
        </div>

        {/* Withdraw History */}
        <div className="bg-card border border-border rounded-2xl p-4 mb-6">
          <h2 className="font-semibold mb-4 flex items-center gap-2">
            <IndianRupee className="w-4 h-4 text-green-500" />
            Withdraw History
          </h2>

          <div className="flex flex-wrap gap-2 mb-4">
            {([
              { key: "all", label: `All (${historyStats.all})` },
              { key: "pending", label: `Pending (${historyStats.pending})` },
              { key: "approved", label: `Approved (${historyStats.approved})` },
              { key: "paid", label: `Paid (${historyStats.paid})` },
              { key: "rejected", label: `Rejected (${historyStats.rejected})` },
            ] as const).map((item) => (
              <button
                key={item.key}
                type="button"
                onClick={() => setHistoryFilter(item.key)}
                className={`px-3 py-1.5 rounded-full text-xs border ${
                  historyFilter === item.key
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border bg-muted/40 text-muted-foreground"
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>

          {filteredHistory.length === 0 ? (
            <p className="text-sm text-muted-foreground">No withdraw records found for selected filter.</p>
          ) : (
            <div className="space-y-3">
              {filteredHistory.map((req) => {
                const statusIcon = req.status === "approved" || req.status === "paid"
                  ? <CheckCircle2 className="w-4 h-4 text-green-500" />
                  : req.status === "rejected"
                  ? <XCircle className="w-4 h-4 text-red-500" />
                  : <Clock className="w-4 h-4 text-yellow-500" />;

                const statusColor = req.status === "approved" || req.status === "paid"
                  ? "text-green-500 bg-green-500/10"
                  : req.status === "rejected"
                  ? "text-red-500 bg-red-500/10"
                  : "text-yellow-500 bg-yellow-500/10";

                const date = req.created_at ? new Date(req.created_at) : null;
                const dateStr = date
                  ? date.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })
                  : "";

                return (
                  <div key={req.id} className="flex items-center justify-between p-3 bg-muted/30 rounded-xl">
                    <div className="flex items-center gap-3">
                      <div className={`w-9 h-9 rounded-full flex items-center justify-center ${statusColor}`}>
                        {statusIcon}
                      </div>
                      <div>
                        <p className="font-semibold text-sm">₹{req.amount}</p>
                        <p className="text-xs text-muted-foreground">{req.upi_id}</p>
                        {req.reason && (
                          <p className="text-xs text-red-400 mt-0.5 flex items-center gap-1">
                            <AlertCircle className="w-3 h-3" /> {req.reason}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <span className={`text-xs font-medium px-2 py-1 rounded-full capitalize ${statusColor}`}>
                        {req.status}
                      </span>
                      <p className="text-xs text-muted-foreground mt-1">{dateStr}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Prompt Performance */}
        <div className="bg-card border border-border rounded-2xl p-4">
          <h2 className="font-semibold mb-4">Prompt Performance</h2>
          <div className="space-y-3">
            {loading && <div className="text-sm text-muted-foreground">Loading...</div>}
            {!loading && prompts.length === 0 && <div className="text-sm text-muted-foreground">No prompts yet.</div>}
            {!loading && prompts.map((p, i) => {
              // Prefer prompt's own remix count, else count from remixes array by matching prompt_id and _id as strings
              const remixCount =
                typeof p.historical_remix_count === 'number'
                  ? p.historical_remix_count
                  : remixes.filter(r => String(r.prompt_id) === String(p._id)).length;
              const historicalEarnings = Number(
                p.historical_earnings ?? remixCount * getPayoutPerRemix(p)
              );

              return (
                <div
                  key={p._id || i}
                  className="flex items-center justify-between p-3 bg-muted/30 rounded-xl hover:bg-muted/50 transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <img
                      src={p.image_url || ''}
                      alt={p.style_name}
                      className="w-14 h-14 rounded-lg object-cover flex-shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium text-sm truncate">{p.style_name}</h3>
                      <p className="text-xs text-muted-foreground mt-0.5 truncate">
                        {remixCount} remix{remixCount === 1 ? '' : 'es'} • ₹{historicalEarnings}
                      </p>
                      <p className="text-[10px] text-muted-foreground">Current rate: ₹{getPayoutPerRemix(p)} per remix</p>
                      {p.unit_id && <p className="text-[10px] text-muted-foreground mt-1">{p.unit_id}</p>}
                    </div>
                  </div>
                  <span className="text-xs font-medium text-green-500 bg-green-500/10 px-2 py-1 rounded-full">
                    {p.status}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    {/* Withdraw modal replaced with dropdown/collapsible */}
    </MainLayout>
  );
};

export default CreatorEarnings;
