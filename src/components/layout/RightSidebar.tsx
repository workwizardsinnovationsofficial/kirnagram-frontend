import { useEffect, useMemo, useState } from "react";
import { Settings, Globe, ChevronDown, Bell, Coins } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useTheme } from "next-themes";
import { auth } from "@/firebase";
import { fetchCreditsSummary } from "@/lib/creditsApi";
import { useNotificationStore } from "@/store/notificationStore";
import { cn } from "@/lib/utils";

type ApprovedPrompt = {
  tags?: string[];
  remixes_count?: number;
};

const API_BASE = "https://api.kirnagram.com";

export function RightSidebar() {
  const navigate = useNavigate();
  const { theme, setTheme, resolvedTheme } = useTheme ? useTheme() : { theme: "system", resolvedTheme: "light", setTheme: () => {} };
  const { unreadCount } = useNotificationStore();
  const [approvedPrompts, setApprovedPrompts] = useState<ApprovedPrompt[]>([]);
  const [creditsBalance, setCreditsBalance] = useState<number | null>(null);

  useEffect(() => {
    const fetchApprovedPrompts = async () => {
      try {
        const res = await fetch(`${API_BASE}/ai-creator/prompts/approved?limit=200&skip=0`);
        if (!res.ok) throw new Error("Failed to load prompts");
        const data = await res.json();
        setApprovedPrompts(Array.isArray(data) ? data : []);
      } catch {
        setApprovedPrompts([]);
      }
    };

    fetchApprovedPrompts();
  }, []);

  useEffect(() => {
    let intervalId: number | null = null;

    const syncCredits = async () => {
      const user = auth.currentUser;
      if (!user) {
        setCreditsBalance(null);
        return;
      }
      try {
        const data = await fetchCreditsSummary();
        setCreditsBalance(data.balance ?? 0);
      } catch {
        setCreditsBalance(null);
      }
    };

    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      if (intervalId) {
        window.clearInterval(intervalId);
        intervalId = null;
      }

      if (!user) {
        setCreditsBalance(null);
        return;
      }

      await syncCredits();
      intervalId = window.setInterval(syncCredits, 30000);
    });

    return () => {
      if (intervalId) window.clearInterval(intervalId);
      unsubscribe();
    };
  }, []);

  const trendingTags = useMemo(() => {
    const counts = new Map<string, number>();

    approvedPrompts.forEach((prompt) => {
      const weight = Math.max(1, Number(prompt.remixes_count || 0));
      (prompt.tags || []).forEach((rawTag) => {
          const normalized = String(rawTag || "")
            .trim()
            .replace(/^#+/, "")
            .toLowerCase();

          if (!normalized) return;
          counts.set(normalized, (counts.get(normalized) || 0) + weight);
      });
    });

    return Array.from(counts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([tag]) => `#${tag}`);
  }, [approvedPrompts]);

  return (
    <aside className="w-full space-y-4 h-fit max-h-[calc(100vh-120px)] overflow-y-auto">

      {/* Settings, Credits, Notifications */}
      <div className="glass-card p-4">
        <button
          type="button"
          onClick={() => navigate("/settings")}
          className="w-full flex items-center justify-between mb-4 hover:opacity-80 transition-opacity"
          aria-label="Open settings"
        >
          <h3 className="font-display font-semibold text-sm">Settings</h3>
          <Settings className="w-4 h-4 text-muted-foreground" />
        </button>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground flex items-center gap-2">
              <Globe className="w-4 h-4" />
              English (US)
            </span>
            <ChevronDown className="w-4 h-4 text-muted-foreground" />
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Dark Mode</span>
            <div
              className={cn(
                "w-11 h-6 rounded-full relative cursor-pointer transition-colors",
                resolvedTheme === "dark" ? "bg-primary" : "bg-zinc-300 dark:bg-zinc-700"
              )}
              onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
              title="Toggle dark mode"
              role="switch"
              aria-checked={resolvedTheme === "dark"}
              aria-label="Toggle dark mode"
            >
              <div
                className={cn(
                  "absolute top-1 w-4 h-4 rounded-full transition-all",
                  resolvedTheme === "dark"
                    ? "right-1 bg-primary-foreground"
                    : "left-1 bg-white"
                )}
              />
            </div>
          </div>
          <div
            className="flex items-center justify-between gap-3 p-2 rounded-lg hover:bg-primary/10 transition cursor-pointer"
            onClick={() => navigate("/notifications")}
          >
            <span className="flex items-center gap-3">
              <Bell className="w-5 h-5 text-primary" />
              <span className="text-sm font-medium text-foreground">Notifications</span>
            </span>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-primary/15 text-primary min-w-[24px] text-center">
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          </div>
          <div
            className="flex items-center justify-between gap-3 p-2 rounded-lg hover:bg-primary/10 transition cursor-pointer"
            onClick={() => navigate("/credits")}
          >
            <span className="flex items-center gap-3">
              <Coins className="w-5 h-5 text-primary" />
              <span className="text-sm font-medium text-foreground">Credits</span>
            </span>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-primary/15 text-primary min-w-[24px] text-center">
              {creditsBalance ?? "--"}
            </span>
          </div>
        </div>
      </div>

      {/* Trending */}
      <div className="glass-card p-4">
        <h3 className="font-display font-semibold text-sm mb-3">Trending Now</h3>
        <p className="text-xs text-muted-foreground mb-2">Technology • Trending</p>
        <div className="flex flex-wrap gap-2">
          {trendingTags.map((tag) => (
            <button
              key={tag}
              type="button"
              onClick={() => navigate(`/explore?tag=${encodeURIComponent(tag.replace(/^#/, ""))}`)}
              className="px-3 py-1 text-sm bg-primary/10 text-primary rounded-full hover:bg-primary/20 transition-colors cursor-pointer"
            >
              {tag}
            </button>
          ))}
          {trendingTags.length === 0 && (
            <span className="text-xs text-muted-foreground">No trending tags yet</span>
          )}
        </div>
      </div>
    </aside>
  );
}
